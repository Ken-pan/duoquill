/* Public header disclosure. Native product components own their desktop layout. */
(() => {
  for (const header of document.querySelectorAll('[data-header-menu]')) {
    const toggle = header.querySelector('[data-header-toggle]');
    const panel = header.querySelector('[data-header-panel]');
    if (!toggle || !panel) continue;
    const compact = matchMedia('(max-width: 900px)');
    let open = false;
    function label() {
      const zh = document.documentElement.lang.startsWith('zh');
      toggle.setAttribute('aria-label', zh ? (open ? '关闭导航' : '打开导航') : (open ? 'Close navigation' : 'Open navigation'));
    }
    function render() {
      header.toggleAttribute('data-header-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      panel.inert = compact.matches && !open;
      label();
    }
    function close(returnFocus = false) {
      if (!open) return;
      open = false;
      render();
      if (returnFocus && compact.matches) toggle.focus({preventScroll: true});
    }
    toggle.hidden = false;
    header.setAttribute('data-menu-ready', '');
    toggle.addEventListener('click', () => { open = !open; render(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && open) { event.preventDefault(); close(true); }
    });
    document.addEventListener('pointerdown', event => {
      if (!header.contains(event.target)) close(panel.contains(document.activeElement));
    });
    header.addEventListener('focusout', event => {
      if (event.relatedTarget instanceof Node && header.contains(event.relatedTarget)) return;
      requestAnimationFrame(() => { if (!header.contains(document.activeElement)) close(); });
    });
    panel.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link || !open || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const url = new URL(link.href);
      const target = url.origin === location.origin && url.pathname === location.pathname && url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
      close(!target);
      if (target) {
        event.preventDefault();
        if (location.href !== url.href) history.pushState(history.state, '', url);
        target.scrollIntoView({block: 'start'});
        const focusTarget = target.querySelector('h1,h2,h3') || target;
        if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus({preventScroll: true});
      }
    });
    compact.addEventListener('change', () => {
      const hadFocus = panel.contains(document.activeElement);
      const toggleFocused = document.activeElement === toggle;
      open = false; render();
      if (compact.matches && hadFocus) toggle.focus({preventScroll: true});
      else if (!compact.matches && toggleFocused) header.querySelector('a')?.focus({preventScroll: true});
    });
    new MutationObserver(label).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
    render();
  }
})();
