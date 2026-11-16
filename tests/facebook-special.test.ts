// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_RULE_SET, type FilterRule } from '../packages/rule-schema/src/index';
import { facebookAdapter } from '../packages/site-adapters/src/index';
import { DomRuntime } from '../packages/dom-runtime/src/index';

const sponsor: FilterRule = { id: 'sponsor', enabled: true, sites: ['facebook'],
  match: { field: 'isSponsored', operator: 'equals', value: true }, action: 'hide' };
const reel: FilterRule = { id: 'reel', enabled: true, sites: ['facebook'],
  match: { field: 'contentType', operator: 'equals', value: 'reel' }, action: 'hide' };
const tick = async (): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, 0)); };

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

it('hides a header-marked sponsor and Reel entry while preserving an ordinary post', async () => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const top = Number(this.getAttribute('data-top') ?? 0);
    const width = Number(this.getAttribute('data-width') ?? 0);
    const height = Number(this.getAttribute('data-height') ?? 0);
    return { top, left: 0, bottom: top + height, right: width, width, height, x: 0, y: top,
      toJSON: () => ({}) } as DOMRect;
  });
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(408);
  document.body.innerHTML = `
    <div role="tablist"><div id="home" role="tab" aria-label="首頁"></div><div id="reel-tab" role="tab" aria-label="Reels"></div></div>
    <div id="feed" data-width="408" data-height="1400">
      <div id="ad" data-width="408" data-height="674"><div></div><div data-top="0" data-width="408" data-height="64"><span data-top="38" data-width="23" data-height="15">贊助</span></div><p>商品內容</p></div>
      <div id="ordinary" data-top="674" data-width="408" data-height="500"><div data-top="674" data-width="408" data-height="64">一般貼文</div><p><span data-top="820">贊助</span>只是討論文字</p></div>
      <a id="reel-card" href="/reel/123" data-top="1200" data-width="180" data-height="200">影片</a>
    </div>`;
  const ad = document.getElementById('ad') as HTMLElement;
  const ordinary = document.getElementById('ordinary') as HTMLElement;
  const reelTab = document.getElementById('reel-tab') as HTMLElement;
  const reelCard = document.getElementById('reel-card') as HTMLElement;
  const runtime = new DomRuntime(facebookAdapter, { ...DEFAULT_RULE_SET, rules: [sponsor, reel] });
  await tick();
  expect(ad.style.display).toBe('none');
  expect((ad.previousElementSibling as HTMLElement).getAttribute('data-socialfilter-placeholder')).toBe('true');
  expect((ad.previousElementSibling as HTMLElement).style.height).toBe('674px');
  expect(ordinary.style.display).toBe('');
  expect(reelTab.style.display).toBe('none');
  expect(reelCard.style.display).toBe('none');
  const sponsorLabel = ad.querySelector('span') as HTMLElement;
  sponsorLabel.textContent = '一般';
  await tick();
  expect(ad.style.display).toBe('');
  expect(document.querySelector('[data-socialfilter-placeholder]')).toBeNull();
  sponsorLabel.textContent = '贊助';
  await tick();
  expect(ad.style.display).toBe('none');
  runtime.updateRules({ ...DEFAULT_RULE_SET, rules: [] });
  await tick();
  expect(ad.style.display).toBe('');
  expect(reelTab.style.display).toBe('');
  expect(reelCard.style.display).toBe('');
  runtime.dispose();
});

it('hints Facebook to load near the feed end without moving the viewport', async () => {
  document.body.innerHTML = '<div role="feed"><div role="article">一般貼文</div></div>';
  vi.spyOn(Date, 'now').mockReturnValue(10000);
  vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1000);
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(2600);
  const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
  const onScroll = vi.fn();
  window.addEventListener('scroll', onScroll);
  const runtime = new DomRuntime(facebookAdapter, { ...DEFAULT_RULE_SET, rules: [] });
  await tick();
  expect(onScroll).toHaveBeenCalledTimes(1);
  expect(scrollBy).not.toHaveBeenCalled();
  runtime.dispose();
  window.removeEventListener('scroll', onScroll);
});
