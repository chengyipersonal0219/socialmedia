export type Site = 'instagram' | 'facebook';
export type ContentType = 'post' | 'reel' | 'story' | 'unknown';
export type TriState = boolean | 'unknown';
export type RuleField = 'text' | 'authorHandle' | 'contentType' | 'isRecommended' | 'isSponsored';
export type RuleAction = 'allow' | 'collapse' | 'hide';

export interface ContentUnit {
  key: string;
  site: Site;
  contentType: ContentType;
  text?: string;
  authorHandle?: string;
  isRecommended: TriState;
  isSponsored: TriState;
}

export interface FilterRule {
  id: string;
  enabled: boolean;
  sites: Site[];
  match: { field: RuleField; operator: 'contains' | 'equals'; value: string | boolean };
  action: RuleAction;
}

export interface RuleSet {
  schemaVersion: 1;
  settings: { enabled: boolean; sites: Record<Site, boolean> };
  rules: FilterRule[];
}

export const DEFAULT_RULE_SET: RuleSet = {
  schemaVersion: 1,
  settings: { enabled: true, sites: { instagram: true, facebook: true } },
  rules: []
};

const sites: Site[] = ['instagram', 'facebook'];
const fields: RuleField[] = ['text', 'authorHandle', 'contentType', 'isRecommended', 'isSponsored'];
const actions: RuleAction[] = ['allow', 'collapse', 'hide'];

function record(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function site(value: unknown): Site {
  if (value === 'instagram' || value === 'facebook') return value;
  throw new Error('Invalid site');
}

export function parseRuleSet(input: unknown): RuleSet {
  const root = record(input, 'Rule set');
  if (root.schemaVersion !== 1) throw new Error('Unsupported schemaVersion');
  const rawSettings = root.settings === undefined ? DEFAULT_RULE_SET.settings : record(root.settings, 'settings');
  const rawSiteSettings = record(rawSettings.sites, 'settings.sites');
  if (typeof rawSettings.enabled !== 'boolean' || typeof rawSiteSettings.instagram !== 'boolean' || typeof rawSiteSettings.facebook !== 'boolean') {
    throw new Error('Invalid settings');
  }
  if (!Array.isArray(root.rules)) throw new Error('rules must be an array');
  const ids = new Set<string>();
  const rules: FilterRule[] = root.rules.map((item: unknown) => {
    const raw = record(item, 'rule');
    const match = record(raw.match, 'match');
    if (typeof raw.id !== 'string' || !raw.id.trim() || ids.has(raw.id)) throw new Error('Invalid or duplicate rule id');
    ids.add(raw.id);
    if (typeof raw.enabled !== 'boolean' || !Array.isArray(raw.sites) || raw.sites.length === 0) throw new Error('Invalid rule scope');
    const ruleSites = raw.sites.map(site);
    if (new Set(ruleSites).size !== ruleSites.length) throw new Error('Duplicate site in rule');
    if (!fields.includes(match.field as RuleField) || (match.operator !== 'contains' && match.operator !== 'equals')) throw new Error('Invalid match');
    if (!actions.includes(raw.action as RuleAction)) throw new Error('Invalid action');
    const field = match.field as RuleField;
    if (field === 'isRecommended' || field === 'isSponsored') {
      if (match.operator !== 'equals' || typeof match.value !== 'boolean') throw new Error('Boolean field requires equals and boolean value');
    } else if (typeof match.value !== 'string' || !match.value.trim()) throw new Error('Text field requires nonempty string');
    if (field === 'contentType' && !['post', 'reel', 'story'].includes(match.value as string)) throw new Error('Invalid content type');
    return {
      id: raw.id as string,
      enabled: raw.enabled as boolean,
      sites: ruleSites,
      match: { field, operator: match.operator as 'contains' | 'equals', value: match.value as string | boolean },
      action: raw.action as RuleAction
    };
  });
  return {
    schemaVersion: 1,
    settings: { enabled: rawSettings.enabled, sites: { instagram: rawSiteSettings.instagram, facebook: rawSiteSettings.facebook } },
    rules
  };
}

export function importRuleSet(json: string, previous: RuleSet): { ok: true; value: RuleSet } | { ok: false; value: RuleSet; error: string } {
  try {
    return { ok: true, value: parseRuleSet(JSON.parse(json) as unknown) };
  } catch (error) {
    return { ok: false, value: previous, error: error instanceof Error ? error.message : 'Invalid JSON' };
  }
}

export function exportRuleSet(input: RuleSet): string {
  return `${JSON.stringify(parseRuleSet(input), null, 2)}\n`;
}
