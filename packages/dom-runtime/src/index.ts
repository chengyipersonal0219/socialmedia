import { evaluate } from '../../filter-core/src/index';
import type { FilterDecision } from '../../filter-core/src/index';
import type { RuleSet } from '../../rule-schema/src/index';
import type { SiteAdapter } from '../../site-adapters/src/index';

interface ProcessState {
  signature: string;
  display: string;
  priority: string;
  placeholder?: HTMLElement;
  revealed: boolean;
  action: FilterDecision['action'];
}

export class DomRuntime {
  private readonly states = new Map<Element, ProcessState>();
  private readonly pending = new Set<Element>();
  private readonly observer: MutationObserver;
  private scheduled = false;
  private disposed = false;
  private version = 0;
  private counts = { collapse: 0, hide: 0 };

  constructor(private readonly adapter: SiteAdapter, private rules: RuleSet, private readonly root: Document = document) {
    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        const target = record.target instanceof Element ? record.target : record.target.parentElement;
        if (target && (record.type === 'characterData' || target.closest(this.adapter.site === 'instagram' ? 'main article' : '[role="feed"] [role="article"]'))) this.enqueue(target);
        if (target && this.adapter.site === 'facebook') {
          for (const [element, state] of this.states) {
            if (state.action !== 'show' && (element.contains(target) || target.contains(element))) this.pending.add(element);
          }
          if (this.pending.size) this.schedule();
        }
        for (const node of record.addedNodes) {
          if (node instanceof Element) this.enqueue(node);
          else if (this.adapter.site === 'facebook' && node instanceof Text && node.parentElement) this.enqueue(node.parentElement);
        }
        for (const node of record.removedNodes) if (node instanceof Element) {
          for (const element of this.states.keys()) {
            if (node === element || node.contains(element)) this.pending.add(element);
          }
          this.schedule();
        }
      }
    });
    this.observer.observe(root, { childList: true, characterData: true, subtree: true });
    this.enqueue(root.documentElement);
  }

  getStats(): { collapse: number; hide: number } { return { ...this.counts }; }

  updateRules(rules: RuleSet): void {
    this.rules = rules;
    this.version += 1;
    for (const element of this.states.keys()) this.pending.add(element);
    this.enqueue(this.root.documentElement);
    this.schedule();
  }

  private enqueue(node: Element): void {
    const before = this.pending.size;
    for (const element of this.adapter.findCandidates(node)) this.pending.add(element);
    const ancestor = node.closest(this.adapter.site === 'instagram' ? 'main article' : '[role="feed"] [role="article"]');
    if (ancestor) this.pending.add(ancestor);
    if (this.pending.size > before) this.schedule();
  }

  private schedule(): void {
    if (this.scheduled || this.disposed) return;
    this.scheduled = true;
    queueMicrotask(() => this.flush());
  }

  private flush(): void {
    this.scheduled = false;
    if (this.disposed) return;
    let processed = 0;
    for (const element of this.pending) {
      this.pending.delete(element);
      if (element.isConnected) this.process(element);
      else this.restore(element);
      processed += 1;
      if (processed >= 50) break;
    }
    if (this.pending.size) this.schedule();
  }

  private process(element: Element): void {
    const previous = this.states.get(element);
    const unit = this.adapter.extract(element);
    if (!unit) { if (previous) this.restore(element); return; }
    const signature = `${this.version}:${JSON.stringify(unit)}`;
    if (previous?.signature === signature) return;
    if (previous) this.restore(element);
    const decision = evaluate(unit, this.rules);
    const style = (element as HTMLElement).style;
    const state: ProcessState = { signature, display: style.getPropertyValue('display'), priority: style.getPropertyPriority('display'), revealed: false, action: 'show' };
    this.states.set(element, state);
    this.apply(element, state, decision);
  }

  private apply(element: Element, state: ProcessState, decision: FilterDecision): void {
    state.action = decision.action;
    if (decision.action === 'show' || state.revealed) return;
    (element as HTMLElement).style.setProperty('display', 'none', 'important');
    if (decision.action === 'hide') this.counts.hide += 1;
    if (decision.action === 'collapse') {
      this.counts.collapse += 1;
      const placeholder = element.ownerDocument.createElement('button');
      placeholder.type = 'button';
      placeholder.textContent = `SocialFilter：已折疊（規則 ${decision.matchedRuleIds.join(', ')}）。點擊暫時顯示`;
      placeholder.setAttribute('aria-label', '暫時顯示已折疊的貼文');
      placeholder.addEventListener('click', () => {
        state.revealed = true;
        this.restoreDisplay(element, state);
        placeholder.remove();
        state.placeholder = undefined;
      });
      element.before(placeholder);
      state.placeholder = placeholder;
    }
  }

  private restoreDisplay(element: Element, state: ProcessState): void {
    const style = (element as HTMLElement).style;
    if (state.display) style.setProperty('display', state.display, state.priority);
    else style.removeProperty('display');
  }

  private restore(element: Element): void {
    const state = this.states.get(element);
    if (!state) return;
    this.restoreDisplay(element, state);
    state.placeholder?.remove();
    this.states.delete(element);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.observer.disconnect();
    for (const element of this.states.keys()) this.restore(element);
    this.pending.clear();
  }
}
