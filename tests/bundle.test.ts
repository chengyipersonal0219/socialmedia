// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { DEFAULT_RULE_SET, exportRuleSet, type FilterRule } from '../packages/rule-schema/src/index';
import { evaluate } from '../packages/filter-core/src/index';

const rule: FilterRule = { id: 'same-decision', enabled: true, sites: ['instagram'], match: { field: 'text', operator: 'contains', value: '抽獎' }, action: 'hide' };
const json = exportRuleSet({ ...DEFAULT_RULE_SET, rules: [rule] });
const html = '<!doctype html><html><body><main><article>抽獎</article></main></body></html>';
const tick = async (): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, 0)); };

it('uses the same JSON decision in Node, Chrome content bundle and Android JS bundle', async () => {
  const expected = evaluate({ key: 'x', site: 'instagram', contentType: 'post', text: '抽獎', isRecommended: 'unknown', isSponsored: 'unknown' }, JSON.parse(json));
  expect(expected.action).toBe('hide');

  const browser = new JSDOM(html, { url: 'https://www.instagram.com/', runScripts: 'outside-only' });
  Object.assign(browser.window, { chrome: { storage: { local: { get: async () => ({ ruleSet: JSON.parse(json) }) }, onChanged: { addListener: () => undefined } } } });
  browser.window.eval(readFileSync('Build/browser-extension/content.js', 'utf8'));
  await tick();
  expect((browser.window.document.querySelector('article') as HTMLElement).style.display).toBe('none');

  const android = new JSDOM(html, { url: 'https://www.instagram.com/', runScripts: 'outside-only' });
  android.window.eval(readFileSync('apps/android/app/src/main/assets/filter.js', 'utf8'));
  (android.window as unknown as { SocialFilter: { updateRules(json: string): boolean } }).SocialFilter.updateRules(json);
  await tick();
  expect((android.window.document.querySelector('article') as HTMLElement).style.display).toBe('none');
});
