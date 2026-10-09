const showcase = document.querySelector('[data-combined-showcase]');
if (showcase) {
  const panel = showcase.querySelector('.pm-showcase');
  const navigation = showcase.querySelector('.pm-showcase__nav');
  const triggers = [...showcase.querySelectorAll('[data-showcase-trigger]')];
  const disclosures = [...showcase.querySelectorAll('.pm-showcase__disclosure')];
  const films = [...showcase.querySelectorAll('[data-story-film]')];
  let navigationTimer = 0;
  let entered = false;

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

  function hideNavigation() {
    clearTimeout(navigationTimer);
    navigationTimer = 0;
    navigation.classList.remove('is-visible');
    navigation.inert = true;
    navigation.setAttribute('aria-hidden', 'true');
  }
  function syncEntrance() {
    const active = panel.classList.contains('is-active') && !document.hidden;
    panel.inert = !active;
    if (active === entered) return;
    entered = active;
    hideNavigation();
    if (!active) return;
    // Wait for the screen's existing fade to finish, then hold for 0.5 seconds.
    const durations = getComputedStyle(panel).transitionDuration.split(',').map(value =>
      parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000));
    const entryDuration = Math.max(0, ...durations);
    navigationTimer = setTimeout(() => {
      if (!entered || document.hidden) return;
      navigation.classList.add('is-visible');
      navigation.inert = false;
      navigation.setAttribute('aria-hidden', 'false');
    }, entryDuration + 500);
  }
  const observer = new MutationObserver(syncEntrance);
  observer.observe(panel, {attributes: true, attributeFilter: ['class']});
  document.addEventListener('visibilitychange', syncEntrance);
  window.addEventListener('pagehide', () => { entered = false; hideNavigation(); });
  window.addEventListener('pageshow', syncEntrance);
  navigation.querySelector('a').addEventListener('click', event => {
    event.preventDefault();
    panel.querySelector('.pm-showcase__body').scrollTo({top: 0, behavior: 'auto'});
    triggers.find(trigger => trigger.getAttribute('aria-expanded') === 'true').focus({preventScroll: true});
  });
  select(0);
  syncEntrance();
}
