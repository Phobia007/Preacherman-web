// Pre-rendered stories: one active player, no new realtime 3D scene.
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const authoredFilms = {
  '01': '/assets/films/vessel-gallery-23s',
  '02': '/assets/films/state-engine-24s',
  '03': '/assets/films/your-property-23s',
  '04': '/assets/films/continuity-28s',
  rediscover: '/assets/films/rediscover-1280x800',
  assemble: '/assets/films/assemble-1280x800',
  publish: '/assets/films/publish-concept-1280x800',
  perspective: '/assets/films/perspective-chat-1280x800',
  learning: '/assets/films/learning-1280x800',
  individuality: '/assets/films/individuality-dialogue-1280x800',
  collect: '/assets/films/collect-gallery-1280x800',
  'create-and-sell': '/assets/films/create-and-sell-1280x800',
  exchange: '/assets/films/exchange-1280x800',
};
const descriptions = {
  en: ['Vessel Your Intelligence — Preacherman Gallery film.',
    'State and engine decoupled — Settings, Execution Mode, and local agents.',
    'Your asset — digital humans, appearance, settings, API access and task lists.',
    'Continuity — your identity, memory and history persist beyond any single model.',
    'Rediscover — revisit past materials and ideas, and put them to work again.',
    'Assemble — combine past research, materials and tools to start a new task.',
    'Publish — a concept demonstration of publishing, pricing and licensing your work.',
    'Perspective — each character brings its own point of view to a conversation.',
    'Learning — shared conversations and experiences gradually shape a character’s perspective.',
    'Individuality — different shared histories lead the same character to distinct perspectives.',
    'Collect — explore Gallery and discover characters to collect, talk with or work alongside.',
    'Create and Sell — combine a character with skills and tools, and offer your creation within its license.',
    'Exchange — a concept demonstration of exchanging characters through mutually agreed offers.'],
  zh: ['圈地自“营” — Preacherman Gallery 展示影片。',
    '状态与引擎解耦 — 设置、执行模式与本地智能体。',
    '你的资产 — Gallery、数字身份与 Market 资产管理。',
    '持续延续 — 你的身份、记忆与历史，超越任何单一模型而持续存在。',
    'Rediscover — 找回过去的内容和思路，换个方向，接着做。',
    'Assemble — 组合过往的调研资料与工具，开展新的任务。',
    'Publish — 作品发布、定价与授权的概念演示。',
    'Perspective — 你带来一个话题，角色带来属于它自己的视角。',
    'Learning — 长期交流与共同经历，让角色的看法逐渐得到补充和重新审视。',
    'Individuality — 同一个角色，在不同的共同经历中积累不同的关注与判断。',
    'Collect — 浏览 Gallery，发现可以收藏、交流和一起工作的虚拟角色。',
    'Create and Sell — 将能力与工具和角色组合，在授权范围内上架你打造的版本。',
    'Exchange — 通过双方认可的方案交换虚拟角色的概念演示。'],
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
  video.loop = card.dataset.storyFilm === '01';
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
  if (suspended || document.hidden || entry.card.hidden || !entry.card.closest('.is-active')) return false;
  if (document.body.matches('.is-navigation-workspace-open, .is-navigation-locked, .is-login-panel-open, .is-brand-profile-open, .is-web-app-open')) return false;
  const box = entry.card.getBoundingClientRect();
  const viewport = entry.card.closest('.pm-showcase__body')?.getBoundingClientRect();
  const top = Math.max(0, viewport?.top ?? 0);
  const bottom = Math.min(innerHeight, viewport?.bottom ?? innerHeight);
  return box.bottom > top && box.top < bottom;
}

function sync() {
  const appearance = theme(), lang = language();
  for (const entry of entries) {
    const { card, video, poster, button } = entry;
    const authoredFilm = authoredFilms[card.dataset.storyFilm];
    const sourceTheme = authoredFilm || appearance;
    const stem = authoredFilm || `/assets/films/${card.dataset.storyFilm}-${appearance}`;
    const allowMotion = !reduced.matches || entry.overrideMotion;
    const posterUrl = `${stem}-${allowMotion && !entry.done ? 'start' : 'end'}.webp`;
    if (poster.getAttribute('src') !== posterUrl) poster.src = posterUrl;
    card.setAttribute('aria-label', descriptions[lang][entry.index]);
    const visible = active(entry);
    // Freeze the exact displayed frame before replacing a theme or hiding a panel.
    if (!visible || entry.sourceTheme !== sourceTheme || entry.userPaused || !allowMotion) {
      if (!entry.loading && entry.sourceTheme && !entry.done) entry.time = video.currentTime;
      video.pause();
    }
    if (entry.sourceTheme !== sourceTheme) card.dataset.filmReady = 'false';
    if (visible && allowMotion && entry.sourceTheme !== sourceTheme && !entry.failed) {
      entry.sourceTheme = sourceTheme;
      entry.loading = true;
      clearTimeout(entry.timer);
      entry.timer = setTimeout(() => {
        entry.loading = false; entry.failed = true; video.pause(); card.dataset.filmReady = 'false'; sync();
      }, 25000);
      video.src = `${stem}.mp4`;
      video.load();
    }
    if (!allowMotion) card.dataset.filmReady = 'false';
    else if (entry.sourceTheme === sourceTheme && !entry.loading && !entry.failed && !video.seeking && video.readyState >= 2) {
      card.dataset.filmReady = 'true';
    }
    if (visible && allowMotion && !entry.loading && !entry.failed && !entry.done && !entry.userPaused && video.readyState >= 2 && video.paused) {
      video.play().then(() => { if (!active(entry)) video.pause(); card.dataset.filmReady = 'true'; updateButton(entry); }).catch(error => {
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
for (const entry of entries) observer.observe(entry.card, { attributes:true, attributeFilter:['hidden'] });
let scrollFrame = 0;
window.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; sync(); });
}, { passive:true });
document.addEventListener('scroll', event => {
  if (event.target instanceof Element && event.target.matches('.pm-showcase__body')) sync();
}, { passive:true, capture:true });
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
