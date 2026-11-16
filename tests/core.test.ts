import { describe, expect, it } from 'vitest';
import { DEFAULT_RULE_SET, exportRuleSet, importRuleSet, parseRuleSet, type ContentUnit, type FilterRule, type RuleSet } from '../packages/rule-schema/src/index';
import { evaluate } from '../packages/filter-core/src/index';

const unit: ContentUnit = { key: '1', site: 'instagram', contentType: 'post', text: '抽獎 Coffee', isRecommended: 'unknown', isSponsored: false };
const rule = (id: string, action: FilterRule['action']): FilterRule => ({ id, action, enabled: true, sites: ['instagram'], match: { field: 'text', operator: 'contains', value: '抽獎' } });
const set = (...rules: FilterRule[]): RuleSet => ({ ...DEFAULT_RULE_SET, rules });

describe('rule validation and pure decisions', () => {
  it('passes through unmatched, missing and unknown data', () => {
    expect(evaluate(unit, set()).action).toBe('show');
    expect(evaluate({ ...unit, text: undefined }, set(rule('x', 'hide'))).action).toBe('show');
    expect(evaluate(unit, set({ ...rule('x', 'hide'), match: { field: 'isRecommended', operator: 'equals', value: true } })).action).toBe('show');
  });
  it('uses allow then hide then collapse regardless of rule order', () => {
    expect(evaluate(unit, set(rule('c', 'collapse')))).toEqual({ action: 'collapse', matchedRuleIds: ['c'] });
    expect(evaluate(unit, set(rule('c', 'collapse'), rule('h', 'hide'))).action).toBe('hide');
    expect(evaluate(unit, set(rule('h', 'hide'), rule('a', 'allow'), rule('c', 'collapse'))).action).toBe('show');
  });
  it('respects site and enabled switches', () => {
    expect(evaluate({ ...unit, site: 'facebook' }, set(rule('x', 'hide'))).action).toBe('show');
    expect(evaluate(unit, set({ ...rule('x', 'hide'), enabled: false })).action).toBe('show');
    expect(evaluate(unit, { ...set(rule('x', 'hide')), settings: { enabled: false, sites: { instagram: true, facebook: true } } }).action).toBe('show');
    expect(evaluate(unit, { ...set(rule('x', 'hide')), settings: { enabled: true, sites: { instagram: false, facebook: true } } }).action).toBe('show');
  });
  it('normalizes Unicode and case for equals and contains', () => {
    expect(evaluate(unit, set({ ...rule('x', 'hide'), match: { field: 'text', operator: 'contains', value: 'ＣＯＦＦＥＥ' } })).action).toBe('hide');
    expect(evaluate({ ...unit, authorHandle: 'Alice' }, set({ ...rule('x', 'hide'), match: { field: 'authorHandle', operator: 'equals', value: 'ALICE' } })).action).toBe('hide');
  });
  it('keeps previous data on invalid import and round trips valid JSON', () => {
    const previous = set(rule('x', 'hide'));
    expect(importRuleSet('{', previous)).toMatchObject({ ok: false, value: previous });
    expect(importRuleSet('{"schemaVersion":2,"rules":[]}', previous)).toMatchObject({ ok: false, value: previous });
    expect(importRuleSet(JSON.stringify(set(rule('x', 'hide'), rule('x', 'allow'))), previous)).toMatchObject({ ok: false, value: previous });
    expect(importRuleSet(exportRuleSet(previous), DEFAULT_RULE_SET)).toEqual({ ok: true, value: previous });
    expect(() => parseRuleSet(set({ ...rule('x', 'hide'), match: { field: 'text', operator: 'contains', value: '' } }))).toThrow();
  });
});
