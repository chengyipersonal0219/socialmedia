import { evaluate } from '../../filter-core/src/index';
import type { FilterDecision } from '../../filter-core/src/index';
import type { RuleSet } from '../../rule-schema/src/index';
import type { SiteAdapter } from '../../site-adapters/src/index';

interface ProcessState {
  signature: string;
  display: string;
  priority: string;
  placeholder?: HTMLElement;
  placeholderObserver?: IntersectionObserver;
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
  private lastFeedHintAt = 0;
  private feedHintPending = false;
  private readonly onFeedScroll = (event: Event): void => {
    if (event.isTrusted) this.hintFeedLoad();
  };

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
    if (adapter.site === 'facebook') root.defaultView?.addEventListener('scroll', this.onFeedScroll, { passive: true });
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
    if (this.adapter.site === 'facebook') this.hintFeedLoad();
  }

  private hintFeedLoad(): void {
    const view = this.root.defaultView;
    const scroller = this.root.scrollingElement ?? this.root.documentElement;
    if (!view || this.disposed || this.feedHintPending || this.root.visibilityState === 'hidden') return;
    if (scroller.scrollHeight < view.innerHeight * 3) return;
    if (scroller.scrollHeight - (view.scrollY + view.innerHeight) > view.innerHeight * 2) return;
    const now = Date.now();
    if (now - this.lastFeedHintAt < 2500) return;
    this.lastFeedHintAt = now;
    this.feedHintPending = true;
    queueMicrotask(() => {
      this.feedHintPending = false;
      if (this.disposed) return;
      view.dispatchEvent(new Event('scroll'));
      this.root.dispatchEvent(new Event('scroll'));
    });
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
    const bounds = element.getBoundingClientRect();
    const view = element.ownerDocument.defaultView;
    const visibleLargeHide = this.adapter.site === 'facebook' && decision.action === 'hide' && view !== null &&
      bounds.height >= 120 && bounds.bottom > 0 && bounds.top < view.innerHeight;
    const anchor = visibleLargeHide ? null : this.viewportAnchor(element);
    if (visibleLargeHide) {
      const placeholder = element.ownerDocument.createElement('div');
      placeholder.textContent = 'SocialFilter：已隱藏內容';
      placeholder.setAttribute('data-socialfilter-placeholder', 'true');
      placeholder.style.cssText = `height:${Math.ceil(bounds.height)}px;box-sizing:border-box;padding:8px;color:#666`;
      element.before(placeholder);
      state.placeholder = placeholder;
      if (typeof IntersectionObserver === 'function') {
        const observer = new IntersectionObserver((entries) => {
          if (entries[0]?.isIntersecting || !state.placeholder) return;
          observer.disconnect();
          state.placeholderObserver = undefined;
          const currentAnchor = this.viewportAnchor(placeholder);
          placeholder.remove();
          state.placeholder = undefined;
          this.restoreViewport(currentAnchor);
        });
        state.placeholderObserver = observer;
        observer.observe(placeholder);
      }
    }
    (element as HTMLElement).style.setProperty('display', 'none', 'important');
    this.restoreViewport(anchor);
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

  private viewportAnchor(excluded: Element): { element: Element; top: number } | null {
    const view = this.root.defaultView;
    if (!view || typeof this.root.elementFromPoint !== 'function') return null;
    for (const fraction of [0.5, 0.75, 0.25]) {
      const element = this.root.elementFromPoint(view.innerWidth / 2, view.innerHeight * fraction);
      if (element && element !== excluded && !excluded.contains(element)) return { element, top: element.getBoundingClientRect().top };
    }
    return null;
  }

  private restoreViewport(anchor: { element: Element; top: number } | null): void {
    if (!anchor) return;
    const view = this.root.defaultView;
    view?.requestAnimationFrame(() => {
      if (!anchor.element.isConnected) return;
      const shift = anchor.element.getBoundingClientRect().top - anchor.top;
      if (Math.abs(shift) > 1) view.scrollBy(0, shift);
    });
  }

  private restoreDisplay(element: Element, state: ProcessState): void {
    const style = (element as HTMLElement).style;
    if (state.display) style.setProperty('display', state.display, state.priority);
    else style.removeProperty('display');
  }

  private restore(element: Element): void {
    const state = this.states.get(element);
    if (!state) return;
    state.placeholderObserver?.disconnect();
    this.restoreDisplay(element, state);
    state.placeholder?.remove();
    this.states.delete(element);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.observer.disconnect();
    this.root.defaultView?.removeEventListener('scroll', this.onFeedScroll);
    for (const element of this.states.keys()) this.restore(element);
    this.pending.clear();
  }
}
