import { DEFAULT_RULE_SET, parseRuleSet } from '../../../packages/rule-schema/src/index';
import { adapterFor } from '../../../packages/site-adapters/src/index';
import { DomRuntime } from '../../../packages/dom-runtime/src/index';

const adapter = adapterFor(new URL(location.href));
if (adapter) void (async () => {
  const candidates = adapter.findCandidates(document);
  const units = candidates.map((element) => adapter.extract(element)).filter((unit) => unit !== null);
  console.info('SocialFilter P0', { site: adapter.site, candidateCount: units.length,
    hasText: units.filter((unit) => Boolean(unit.text)).length,
    hasAuthor: units.filter((unit) => Boolean(unit.authorHandle)).length });
  const loaded = await chrome.storage.local.get('ruleSet');
  let rules = DEFAULT_RULE_SET;
  try { if (loaded.ruleSet !== undefined) rules = parseRuleSet(loaded.ruleSet); } catch { /* keep safe defaults */ }
  const runtime = new DomRuntime(adapter, rules);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.ruleSet) return;
    try { runtime.updateRules(parseRuleSet(changes.ruleSet.newValue)); } catch { /* preserve last valid rules */ }
  });
  window.addEventListener('pagehide', () => runtime.dispose(), { once: true });
})().catch(() => { /* leave site unmodified if storage is unavailable */ });
