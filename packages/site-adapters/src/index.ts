import type { ContentUnit, Site } from '../../rule-schema/src/index';

export interface SiteAdapter {
  site: Site;
  matches(url: URL): boolean;
  findCandidates(root: ParentNode): Element[];
  extract(element: Element): ContentUnit | null;
}

const keys = new WeakMap<Element, string>();
const facebookAppPrompts = new WeakSet<Element>();
const facebookSponsoredPosts = new WeakSet<Element>();
const facebookSponsorMarkers = new WeakMap<Element, Element>();
const facebookReels = new WeakSet<Element>();
let nextKey = 0;

function key(element: Element): string {
  const existing = keys.get(element);
  if (existing) return existing;
  const created = String(++nextKey);
  keys.set(element, created);
  return created;
}

function candidates(root: ParentNode, selector: string): Element[] {
  const found = Array.from(root.querySelectorAll(selector));
  if (root instanceof Element && root.matches(selector)) found.unshift(root);
  return found;
}

function visibleText(element: Element): string {
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent || parent.closest('[hidden], [aria-hidden="true"], script, style')) continue;
    if (parent !== element && parent instanceof HTMLElement && (parent.style.display === 'none' || parent.style.visibility === 'hidden')) continue;
    const value = node.textContent?.trim();
    if (value) parts.push(value);
  }
  return parts.join(' ');
}

function instagramAuthor(element: Element): string | undefined {
  for (const link of element.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href') ?? '';
    const match = /^\/([A-Za-z0-9._]+)\/?(?:\?.*)?$/.exec(href);
    if (match?.[1] && !['explore', 'reels', 'accounts', 'direct'].includes(match[1])) return match[1];
  }
  return undefined;
}

function facebookPostContainer(element: Element): Element | null {
  const viewportWidth = element.ownerDocument.defaultView?.innerWidth ?? 0;
  if (viewportWidth === 0) return null;
  for (let ancestor = element.parentElement; ancestor && ancestor !== element.ownerDocument.body; ancestor = ancestor.parentElement) {
    const parent = ancestor.parentElement;
    if (!parent) break;
    const bounds = ancestor.getBoundingClientRect();
    const parentBounds = parent.getBoundingClientRect();
    if (bounds.width >= viewportWidth * 0.88 && bounds.height >= 150 &&
        parentBounds.height >= bounds.height + 100 && parent.childElementCount >= 2) return ancestor;
  }
  return null;
}

function facebookSpecialUnit(element: Element, sponsored: boolean, reel: boolean): ContentUnit {
  return { key: key(element), site: 'facebook', contentType: reel ? 'reel' : 'unknown',
    isRecommended: 'unknown', isSponsored: sponsored ? true : 'unknown' };
}

function hasFacebookSponsorHeader(element: Element): boolean {
  const marker = facebookSponsorMarkers.get(element);
  return marker !== undefined && element.contains(marker) && /^(贊助|Sponsored)$/i.test((marker.textContent ?? '').trim());
}

function hasFacebookReelMarker(element: Element): boolean {
  if (element.getAttribute('role') === 'tab' && /reels?|短影音|連續短片/i.test(element.getAttribute('aria-label') ?? '')) return true;
  const links = [element, ...element.querySelectorAll('a[href]')];
  if (links.some((link) => link instanceof HTMLAnchorElement && /^\/(?:reel|reels)(?:\/|$)/.test(link.pathname))) return true;
  const labelled = [element, ...element.querySelectorAll('[aria-label]')];
  if (labelled.some((item) => /^(reels?|短影音|連續短片)$/i.test((item.getAttribute('aria-label') ?? '').trim()))) return true;
  const headings = element.querySelectorAll('h1,h2,h3,[role="heading"]');
  return [...headings].some((heading) => /^(reels?|短影音|連續短片)$/i.test((heading.textContent ?? '').trim()));
}

export const instagramAdapter: SiteAdapter = {
  site: 'instagram',
  matches: (url) => url.protocol === 'https:' && url.hostname === 'www.instagram.com',
  findCandidates: (root) => candidates(root, 'main article'),
  extract(element) {
    if (!element.matches('main article')) return null;
    const text = visibleText(element);
    const isReel = element.querySelector('a[href^="/reel/"]') !== null;
    return { key: key(element), site: 'instagram', contentType: isReel ? 'reel' : 'post', text: text || undefined,
      authorHandle: instagramAuthor(element), isRecommended: 'unknown', isSponsored: 'unknown' };
  }
};

export const facebookAdapter: SiteAdapter = {
  site: 'facebook',
  matches: (url) => url.protocol === 'https:' && ['www.facebook.com', 'm.facebook.com'].includes(url.hostname),
  findCandidates(root) {
    const found = candidates(root, '[role="feed"] [role="article"]');
    const reelTabs = candidates(root, '[role="tab"]');
    if (root instanceof Element) {
      const parentTab = root.closest('[role="tab"]');
      if (parentTab) reelTabs.push(parentTab);
    }
    for (const tab of reelTabs) {
      if (!/reels?|短影音|連續短片/i.test(tab.getAttribute('aria-label') ?? '')) continue;
      facebookReels.add(tab);
      found.push(tab);
    }
    for (const control of candidates(root, '[aria-label]')) {
      if (control.getAttribute('role') === 'tab' || !/^(reels?|短影音|連續短片)$/i.test((control.getAttribute('aria-label') ?? '').trim())) continue;
      const item = facebookPostContainer(control) ?? control;
      facebookReels.add(item);
      found.push(item);
    }
    const anchors = candidates(root, 'a[href]');
    if (root instanceof Element) {
      const parentAnchor = root.closest('a[href]');
      if (parentAnchor) anchors.push(parentAnchor);
    }
    for (const anchor of anchors) {
      if (!/^\/(?:reel|reels)(?:\/|$)/.test((anchor as HTMLAnchorElement).pathname)) continue;
      const item = facebookPostContainer(anchor) ?? anchor;
      facebookReels.add(item);
      found.push(item);
    }
    const textNodes = root.ownerDocument?.createTreeWalker(root, NodeFilter.SHOW_TEXT) ?? document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (textNodes.nextNode()) {
      const node = textNodes.currentNode;
      const label = (node.textContent ?? '').trim();
      const element = node.parentElement;
      if (!element) continue;
      if (/^(贊助|Sponsored)$/i.test(label)) {
        const post = facebookPostContainer(element);
        if (!post) continue;
        const offset = element.getBoundingClientRect().top - post.getBoundingClientRect().top;
        if (offset < -10 || offset > 80) continue;
        facebookSponsoredPosts.add(post);
        facebookSponsorMarkers.set(post, element);
        found.push(post);
      } else if (/^(Reels?|短影音|連續短片)$/i.test(label) && element.closest('h1,h2,h3,[role="heading"]')) {
        const section = facebookPostContainer(element);
        if (section) { facebookReels.add(section); found.push(section); }
      }
    }
    const controls = candidates(root, 'a, button, [role="button"]');
    if (root instanceof Element) {
      const parentControl = root.closest('a, button, [role="button"]');
      if (parentControl) controls.push(parentControl);
    }
    for (const control of controls) {
      const label = (control.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (label !== '開啟應用程式') continue;
      const bounds = control.getBoundingClientRect();
      if (bounds.width < window.innerWidth * 0.6 || bounds.top < window.innerHeight * 0.65) continue;
      let container: Element = control;
      for (let ancestor = control.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
        const position = getComputedStyle(ancestor).position;
        if (position === 'fixed' || position === 'sticky') { container = ancestor; break; }
      }
      facebookAppPrompts.add(container);
      found.push(container);
    }
    return [...new Set(found)];
  },
  extract(element) {
    if (facebookAppPrompts.has(element)) {
      const hasPrompt = [...element.querySelectorAll('a, button, [role="button"]')].some((control) =>
        (control.textContent ?? '').replace(/\s+/g, ' ').trim() === '開啟應用程式');
      if (hasPrompt || (element.textContent ?? '').replace(/\s+/g, ' ').trim() === '開啟應用程式') {
        return { key: key(element), site: 'facebook', contentType: 'unknown', text: '開啟應用程式',
          isRecommended: 'unknown', isSponsored: 'unknown' };
      }
    }
    if (facebookReels.has(element) && hasFacebookReelMarker(element)) return facebookSpecialUnit(element, facebookSponsoredPosts.has(element) && hasFacebookSponsorHeader(element), true);
    if (facebookSponsoredPosts.has(element) && hasFacebookSponsorHeader(element)) return facebookSpecialUnit(element, true, false);
    if (!element.matches('[role="feed"] [role="article"]')) return null;
    const text = visibleText(element);
    return { key: key(element), site: 'facebook', contentType: 'unknown', text: text || undefined,
      isRecommended: 'unknown', isSponsored: 'unknown' };
  }
};

export function adapterFor(url: URL): SiteAdapter | null {
  return [instagramAdapter, facebookAdapter].find((adapter) => adapter.matches(url)) ?? null;
}
