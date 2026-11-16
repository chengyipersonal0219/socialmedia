import type { ContentUnit, Site } from '../../rule-schema/src/index';

export interface SiteAdapter {
  site: Site;
  matches(url: URL): boolean;
  findCandidates(root: ParentNode): Element[];
  extract(element: Element): ContentUnit | null;
}

const keys = new WeakMap<Element, string>();
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
  findCandidates: (root) => candidates(root, '[role="feed"] [role="article"]'),
  extract(element) {
    if (!element.matches('[role="feed"] [role="article"]')) return null;
    const text = visibleText(element);
    return { key: key(element), site: 'facebook', contentType: 'unknown', text: text || undefined,
      isRecommended: 'unknown', isSponsored: 'unknown' };
  }
};

export function adapterFor(url: URL): SiteAdapter | null {
  return [instagramAdapter, facebookAdapter].find((adapter) => adapter.matches(url)) ?? null;
}
