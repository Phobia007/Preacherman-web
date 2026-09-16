// Pre-rendered stories: one active player, no new realtime 3D scene.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const descriptions = {
  en: ['Pathfinder establishes a personal workspace with rules and a tool.',
    'Engine A is replaced by B; Pathfinder and its records remain.',
    'Pathfinder and its records travel together beyond their original workspace.',
    'Earlier memories remain while the timeline continues from its bookmark.'],
  zh: ['Pathfinder 建立自己的空间，规则与工具归位。',
    '引擎 A 换成 B，Pathfinder 的身份与记录保持不变。',
    'Pathfinder 与资料一起离开原有空间，作为完整资产被带走。',
    '原有经历保留，时间线从书签处继续延伸。'],
};
let suspended = false;
const theme = () => root.classList.contains('is-night-theme') ? 'dark' : 'light';
const language = () => root.dataset.language === 'zh' ? 'zh' : 'en';
const entries = [...document.querySelectorAll('[data-story-film]')].map((card, index) => {
  const video = card.querySelector('video');
  const poster = card.querySelector('img');
  const button = card.querySelector('button');
  const entry = { card, video, poster, button, index, time: 0, sourceTheme: '',
    done: false, userPaused: false, overrideMotion: false, loading: false, failed: false, timer: 0 };
  video.muted = true;
  const onReady = () => {
    if (video.readyState < 2 || !entry.loading) return;
    entry.loading = false;
    clearTimeout(entry.timer);
    if (Math.abs(video.currentTime - entry.time) > .15) {
      video.currentTime = Math.min(entry.time, Math.max(0, video.duration - .04));
    }
    if (video.seeking) return;
    card.dataset.filmReady = 'true';
    sync();
  };
  video.addEventListener('loadedmetadata', () => {
    video.currentTime = Math.min(entry.time, Math.max(0, video.duration - .04));
  });
  video.addEventListener('loadeddata', onReady);
  video.addEventListener('canplay', onReady);
  video.addEventListener('seeked', () => {
    if (!entry.loading && video.readyState >= 2) { card.dataset.filmReady = 'true'; sync(); }
  });
  video.addEventListener('ended', () => { entry.done = true; entry.time = video.duration - .04; sync(); });
  video.addEventListener('error', () => {
    entry.failed = true; entry.loading = false; clearTimeout(entry.timer);
    card.dataset.filmReady = 'false'; sync();
  });
  button.addEventListener('click', () => {
    if (entry.done) { entry.done = false; entry.time = 0; video.currentTime = 0; }
    else if (!video.paused) { entry.userPaused = true; sync(); return; }
    entry.userPaused = false;
    entry.overrideMotion = true;
    if (entry.failed) { entry.failed = false; entry.sourceTheme = ''; }
    sync();
  });
  return entry;
});

function active(entry) {
  if (suspended || document.hidden || !entry.card.closest('.is-active')) return false;
  if (document.body.matches('.is-navigation-workspace-open, .is-navigation-locked, .is-login-panel-open, .is-brand-profile-open')) return false;
  const box = entry.card.getBoundingClientRect();
  return box.bottom > 0 && box.top < innerHeight;
}

function sync() {
  const appearance = theme(), lang = language();
  for (const entry of entries) {
    const { card, video, poster, button } = entry;
    const stem = `/assets/films/${card.dataset.storyFilm}-${appearance}`;
    const allowMotion = !reduced.matches || entry.overrideMotion;
    const posterUrl = `${stem}-${allowMotion && !entry.done ? 'start' : 'end'}.webp`;
    if (poster.getAttribute('src') !== posterUrl) poster.src = posterUrl;
    card.setAttribute('aria-label', descriptions[lang][entry.index]);
    const visible = active(entry);
    // Freeze the exact displayed frame before replacing a theme or hiding a panel.
    if (!visible || entry.sourceTheme !== appearance || entry.userPaused || !allowMotion) {
      if (!entry.loading && entry.sourceTheme && !entry.done) entry.time = video.currentTime;
      video.pause();
    }
    if (entry.sourceTheme !== appearance) card.dataset.filmReady = 'false';
    if (visible && allowMotion && entry.sourceTheme !== appearance && !entry.failed) {
      entry.sourceTheme = appearance;
      entry.loading = true;
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => {
        entry.loading = false; entry.failed = true; video.pause(); card.dataset.filmReady = 'false'; sync();
      }, 25000);
      video.src = `${stem}.mp4`;
      video.load();
    }
    if (!allowMotion) card.dataset.filmReady = 'false';
    else if (entry.sourceTheme === appearance && !entry.loading && !entry.failed && !video.seeking && video.readyState >= 2) {
      card.dataset.filmReady = 'true';
    }
    if (visible && allowMotion && !entry.loading && !entry.failed && !entry.done && !entry.userPaused && video.readyState >= 2 && video.paused) {
      video.play().then(() => { card.dataset.filmReady = 'true'; updateButton(entry); }).catch(error => {
        if (error.name !== 'AbortError') { entry.userPaused = true; updateButton(entry); }
      });
    }
    updateButton(entry);
  }
}

function updateButton(entry) {
  const paused = entry.video.paused;
  const action = entry.done ? 'replay' : paused ? 'play' : 'pause';
  const labels = language() === 'zh' ? { replay:'重播影片', play:'播放影片', pause:'暂停影片' }
    : { replay:'Replay film', play:'Play film', pause:'Pause film' };
  entry.button.setAttribute('aria-label', labels[action]);
  entry.button.dataset.action = action;
}
const observer = new MutationObserver(sync);
observer.observe(root, { attributes:true, attributeFilter:['class','data-language'] });
observer.observe(document.body, { attributes:true, attributeFilter:['class'] });
for (const entry of entries) observer.observe(entry.card.closest('.showcase-sequence__panel'), { attributes:true, attributeFilter:['class'] });
let scrollFrame = 0;
window.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; sync(); });
}, { passive:true });
document.addEventListener('visibilitychange', sync);
window.addEventListener('resize', sync);
reduced.addEventListener('change', () => { for (const entry of entries) entry.overrideMotion = false; sync(); });
window.addEventListener('pagehide', () => {
  suspended = true; cancelAnimationFrame(scrollFrame); scrollFrame = 0;
  for (const entry of entries) { entry.video.pause(); clearTimeout(entry.timer); }
});
window.addEventListener('pageshow', () => {
  suspended = false;
  for (const entry of entries) {
    if (entry.loading) { entry.loading = false; entry.sourceTheme = ''; }
  }
  sync();
});
sync();
