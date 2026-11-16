import { DEFAULT_RULE_SET, parseRuleSet } from '../../packages/rule-schema/src/index';
import { adapterFor } from '../../packages/site-adapters/src/index';
import { DomRuntime } from '../../packages/dom-runtime/src/index';

declare const browser: { runtime: { connectNative(name: string): { onMessage: { addListener(listener: (message: unknown) => void): void }; postMessage(message: unknown): void } } };

const adapter = adapterFor(new URL(location.href));
let filterRuntime: DomRuntime | null = null;
let rules = DEFAULT_RULE_SET;
const port = browser.runtime.connectNative('socialfilter');
port.onMessage.addListener((message) => {
  if (!message || typeof message !== 'object' || !('rules' in message) || typeof message.rules !== 'string') return;
  try {
    rules = parseRuleSet(JSON.parse(message.rules) as unknown);
    filterRuntime?.updateRules(rules);
    port.postMessage({ type: 'rules-applied' });
  } catch { /* Keep the last valid rules. */ }
});
function start(): void {
  if (adapter && !filterRuntime) filterRuntime = new DomRuntime(adapter, rules);
}
if (document.documentElement) start();
else document.addEventListener('DOMContentLoaded', start, { once: true });
window.addEventListener('pagehide', () => { filterRuntime?.dispose(); filterRuntime = null; }, { once: true });
