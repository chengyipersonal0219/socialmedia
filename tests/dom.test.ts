// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { DEFAULT_RULE_SET, type FilterRule } from '../packages/rule-schema/src/index';
import { instagramAdapter, facebookAdapter } from '../packages/site-adapters/src/index';
import { DomRuntime } from '../packages/dom-runtime/src/index';

const hide: FilterRule = { id: 'hide-draw', enabled: true, sites: ['instagram', 'facebook'], match: { field: 'text', operator: 'contains', value: '抽獎' }, action: 'collapse' };
const tick = async (): Promise<void> => { await new Promise((resolve) => setTimeout(resolve, 0)); };

describe('fixture DOM behavior', () => {
  it('P0 fixture hook hides only its marked node', () => {
    const html = readFileSync('tests/fixtures/p0.html', 'utf8');
    const prototype = readFileSync('apps/browser-extension/p0-content.js', 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only' });
    dom.window.eval(prototype);
    expect(dom.window.document.querySelector('[data-sf-fixture-hide]')?.hasAttribute('hidden')).toBe(true);
    expect(dom.window.document.querySelectorAll('article:not([hidden])')).toHaveLength(1);
  });
  it('extracts only explicit feed articles and fails open on unknown fields', () => {
    document.body.innerHTML = '<main><article id="ig"><a href="/alice/">alice</a><p>抽獎</p></article></main><nav>抽獎</nav>';
    const article = document.getElementById('ig')!;
    expect(instagramAdapter.findCandidates(document)).toEqual([article]);
    expect(instagramAdapter.extract(article)).toMatchObject({ authorHandle: 'alice', isRecommended: 'unknown', isSponsored: 'unknown' });
    document.body.innerHTML = '<div role="feed"><div role="article" id="fb">抽獎</div></div>';
    expect(facebookAdapter.findCandidates(document)).toHaveLength(1);
  });
  it('collapses, reveals, handles dynamic posts and restores on disable', async () => {
    document.body.innerHTML = '<main><article id="a" style="color:red">抽獎</article></main>';
    const runtime = new DomRuntime(instagramAdapter, { ...DEFAULT_RULE_SET, rules: [hide] });
    await tick();
    const article = document.getElementById('a')!;
    expect(article.style.display).toBe('none');
    expect(article.previousElementSibling?.tagName).toBe('BUTTON');
    (article.previousElementSibling as HTMLButtonElement).click();
    expect(article.style.display).toBe('');
    document.querySelector('main')!.insertAdjacentHTML('beforeend', '<article id="b">抽獎 again</article>');
    await tick();
    expect((document.getElementById('b') as HTMLElement).style.display).toBe('none');
    runtime.updateRules({ ...DEFAULT_RULE_SET, rules: [] });
    await tick();
    expect(article.style.display).toBe('');
    expect((document.getElementById('b') as HTMLElement).style.display).toBe('');
    expect(document.querySelectorAll('button')).toHaveLength(0);
    runtime.dispose();
  });
  it('rechecks reused nodes and processes a bounded batch of 200 fixtures', async () => {
    document.body.innerHTML = '<main><article id="reused">抽獎</article></main>';
    const runtime = new DomRuntime(instagramAdapter, { ...DEFAULT_RULE_SET, rules: [hide] });
    await tick();
    const reused = document.getElementById('reused') as HTMLElement;
    reused.textContent = '一般貼文';
    await tick();
    expect(reused.style.display).toBe('');
    const main = document.querySelector('main')!;
    const started = performance.now();
    main.insertAdjacentHTML('beforeend', Array.from({ length: 200 }, (_, index) => `<article>抽獎 ${index}</article>`).join(''));
    await tick();
    await tick();
    expect(main.querySelectorAll('article[style*="display: none"]')).toHaveLength(200);
    expect(runtime.getStats().collapse).toBe(201);
    console.info(`200 fixture posts: ${Math.round(performance.now() - started)} ms`);
    const first = main.querySelector('article:not(#reused)')!;
    const placeholder = first.previousElementSibling;
    first.remove();
    await tick();
    expect(placeholder?.isConnected).toBe(false);
    runtime.dispose();
  });
});
