(() => {
  const site = location.hostname.includes('instagram') ? 'instagram' : 'facebook';
  const selector = site === 'instagram' ? 'main article' : '[role="feed"] [role="article"]';
  const candidates = document.querySelectorAll(selector);
  const diagnostics = { site, candidateCount: candidates.length, hasText: 0, hasLink: 0 };
  for (const candidate of candidates) {
    if (candidate.textContent?.trim()) diagnostics.hasText += 1;
    if (candidate.querySelector('a[href]')) diagnostics.hasLink += 1;
  }
  console.info('SocialFilter P0', diagnostics);
  // This prototype fixture hook never runs on a platform page.
  if (location.hostname === 'localhost') {
    document.querySelectorAll('[data-sf-fixture-hide]').forEach((node) => { node.hidden = true; });
  }
})();
