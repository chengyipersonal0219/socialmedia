import { DEFAULT_RULE_SET, parseRuleSet } from '../../packages/rule-schema/src/index';
import { adapterFor } from '../../packages/site-adapters/src/index';
import { DomRuntime } from '../../packages/dom-runtime/src/index';

declare global { interface Window { SocialFilter?: { updateRules(json: string): boolean; dispose(): void; diagnostics(): { candidateCount: number; hasText: number; hasAuthor: number } } } }

const adapter = window.top === window ? adapterFor(new URL(location.href)) : null;
let runtime: DomRuntime | null = null;
let rules = DEFAULT_RULE_SET;
function start(): void {
  if (adapter && !runtime) runtime = new DomRuntime(adapter, rules);
  if (adapter && 'SocialFilterBridge' in window) {
    const bridge = (window as Window & { SocialFilterBridge?: { postMessage(message: string): void; onmessage?: (event: MessageEvent) => void } }).SocialFilterBridge;
    if (bridge) {
      bridge.onmessage = (event) => { window.SocialFilter?.updateRules(String(event.data)); };
      bridge.postMessage('ready');
    }
  }
}
if (document.documentElement) start();
else document.addEventListener('DOMContentLoaded', start, { once: true });
window.SocialFilter = {
  updateRules(json: string): boolean {
    try {
      rules = parseRuleSet(JSON.parse(json) as unknown);
      runtime?.updateRules(rules);
      return true;
    } catch { return false; }
  },
  dispose(): void { runtime?.dispose(); runtime = null; },
  diagnostics(): { candidateCount: number; hasText: number; hasAuthor: number } {
    const units = adapter?.findCandidates(document).map((element) => adapter.extract(element)).filter((unit) => unit !== null) ?? [];
    return { candidateCount: units.length, hasText: units.filter((unit) => Boolean(unit.text)).length, hasAuthor: units.filter((unit) => Boolean(unit.authorHandle)).length };
  }
};
window.addEventListener('pagehide', () => window.SocialFilter?.dispose(), { once: true });
