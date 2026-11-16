import type { ContentUnit, FilterRule, RuleSet } from '../../rule-schema/src/index';

export interface FilterDecision { action: 'show' | 'collapse' | 'hide'; matchedRuleIds: string[] }

function normalize(value: string): string { return value.normalize('NFKC').toLocaleLowerCase(); }

function matches(unit: ContentUnit, rule: FilterRule): boolean {
  if (!rule.enabled || !rule.sites.includes(unit.site)) return false;
  const { field, operator, value } = rule.match;
  const actual = unit[field];
  if (actual === undefined || actual === 'unknown') return false;
  if (typeof actual === 'boolean') return operator === 'equals' && actual === value;
  if (typeof value !== 'string') return false;
  const normalizedActual = normalize(actual);
  const normalizedValue = normalize(value);
  return operator === 'contains' ? normalizedActual.includes(normalizedValue) : normalizedActual === normalizedValue;
}

export function evaluate(unit: ContentUnit, ruleSet: RuleSet): FilterDecision {
  if (!ruleSet.settings.enabled || !ruleSet.settings.sites[unit.site]) return { action: 'show', matchedRuleIds: [] };
  const matched = ruleSet.rules.filter((rule) => matches(unit, rule));
  const action = matched.some((rule) => rule.action === 'allow') ? 'show'
    : matched.some((rule) => rule.action === 'hide') ? 'hide'
      : matched.some((rule) => rule.action === 'collapse') ? 'collapse' : 'show';
  return { action, matchedRuleIds: matched.map((rule) => rule.id) };
}
