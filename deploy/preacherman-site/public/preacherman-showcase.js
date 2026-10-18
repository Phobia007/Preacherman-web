const showcase = document.querySelector('[data-combined-showcase]');
if (showcase) {
  const panels = [...showcase.querySelectorAll('.showcase-sequence__panel')];
  const navigation = showcase.querySelector('.pm-showcase__nav');
  const links = [...navigation.querySelectorAll('a')];
  const downloads = showcase.querySelector('.statement-section');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let currentIndex = -1;
  let syncFrame = 0;
  let initialRoutePending = links.some(link => link.hash === location.hash);

  // Each page keeps its own selected story and media slot.
  for (const panel of showcase.querySelectorAll('.pm-showcase')) {
    const triggers = [...panel.querySelectorAll('[data-showcase-trigger]')];
    const disclosures = [...panel.querySelectorAll('.pm-showcase__disclosure')];
    const films = [...panel.querySelectorAll('.pm-showcase__film')];
    function select(index) {
      triggers.forEach((trigger, i) => {
        const selected = index === i;
        trigger.setAttribute('aria-expanded', String(selected));
        disclosures[i].setAttribute('aria-hidden', String(!selected));
        disclosures[i].inert = !selected;
        films[i].hidden = !selected;
        films[i].inert = !selected;
      });
    }
    triggers.forEach((trigger, index) => {
      trigger.addEventListener('click', () => select(index));
      trigger.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowDown') next = (index + 1) % triggers.length;
        if (event.key === 'ArrowUp') next = (index + triggers.length - 1) % triggers.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = triggers.length - 1;
        if (next === undefined) return;
        event.preventDefault();
        triggers[next].focus();
      });
    });
    select(0);
  }

  // Match the canonical scroll controller's thresholds. Jumping the scroll
  // position lets that controller crossfade directly to the requested page.
  function goTo(index) {
    const bounds = showcase.getBoundingClientRect();
    const step = Math.max(1, bounds.height - innerHeight) / panels.length;
    window.scrollTo({top: scrollY + bounds.top + index * step + 1, behavior: 'instant'});
  }
  links.forEach((link, index) => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(history.state, '', link.hash);
      goTo(index);
    });
  });
  function restoreRoute() {
    const index = links.findIndex(link => link.hash === location.hash);
    if (index >= 0) goTo(index);
    else if (!location.hash) window.scrollTo({top: 0, behavior: 'instant'});
  }
  window.addEventListener('hashchange', restoreRoute);

  function sync() {
    syncFrame = 0;
    const activeIndex = panels.findIndex(page => page.classList.contains('is-active'));
    panels.forEach((page, index) => {
      const active = index === activeIndex;
      page.inert = !active;
      page.setAttribute('aria-hidden', String(!active));
    });
    downloads.classList.toggle('is-reveal-ready', !reduced.matches);
    downloads.classList.toggle('is-visible', downloads.classList.contains('is-active'));
    const visible = activeIndex >= 0 && showcase.getBoundingClientRect().bottom > innerHeight && !document.hidden;
    navigation.classList.toggle('is-visible', visible);
    navigation.inert = !visible;
    navigation.setAttribute('aria-hidden', String(!visible));
    links.forEach((link, index) => {
      if (index === activeIndex) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (activeIndex !== currentIndex) {
      currentIndex = activeIndex;
      if (activeIndex >= 0) {
        const link = links[activeIndex];
        const track = navigation.querySelector('.pm-showcase__nav-track');
        track.scrollTo({left: link.offsetLeft - track.clientWidth / 2 + link.offsetWidth / 2, behavior: 'instant'});
      }
      // Keep known section URLs truthful when the user continues by scrolling.
      if (!initialRoutePending && links.some(link => link.hash === location.hash)) {
        history.replaceState(history.state, '', activeIndex < 0 ? location.pathname + location.search : links[activeIndex].hash);
      }
    }
  }
  function scheduleSync() {
    if (!syncFrame) syncFrame = requestAnimationFrame(sync);
  }
  const observer = new MutationObserver(scheduleSync);
  panels.forEach(page => observer.observe(page, {attributes: true, attributeFilter: ['class']}));
  window.addEventListener('scroll', scheduleSync, {passive: true});
  window.addEventListener('resize', scheduleSync);
  document.addEventListener('visibilitychange', scheduleSync);
  reduced.addEventListener('change', scheduleSync);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(syncFrame);
    syncFrame = 0;
  });
  window.addEventListener('pageshow', scheduleSync);
  // Let native fragment positioning finish before applying our scroll sequence.
  // A sticky panel's physical position is different from its route position.
  if (initialRoutePending) {
    const restoreInitialRoute = () => requestAnimationFrame(() => {
      restoreRoute();
      requestAnimationFrame(() => {
        initialRoutePending = false;
        scheduleSync();
      });
    });
    if (document.readyState === 'complete') restoreInitialRoute();
    else window.addEventListener('load', restoreInitialRoute, {once: true});
  }
  scheduleSync();
}
