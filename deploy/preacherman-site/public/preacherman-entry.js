// The destination remains the real browser app, with its own routes and preferences.
const trigger = document.querySelector('.hero__try-it');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const route = '#try-it';
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const copy = () => document.documentElement.lang.startsWith('zh') ? {
  opening: '正在打开 Preacherman…', unavailable: '暂时无法打开 Preacherman。请确认浏览器版已启动后重试。',
  unpublished: '网页版即将开放。', retry: '重试', back: '返回主页',
} : {
  opening: 'Opening Preacherman…', unavailable: 'Preacherman could not open. Check that the web app is running, then try again.',
  unpublished: 'The web app is coming soon.', retry: 'Try again', back: 'Back to website',
};

// Set data-web-app-url on the button to the deployed HTTPS app when publishing.
// The workstation fallback is intentionally restricted to local website previews.
function destination() {
  const configured = trigger?.dataset.webAppUrl?.trim();
  const local = localHosts.has(location.hostname);
  if (!configured && !local) return null;
  const url = new URL(configured || 'http://localhost:5173/');
  if (url.protocol !== 'https:' && !(local && localHosts.has(url.hostname) && url.protocol === 'http:')) return null;
  if (url.username || url.password || url.origin === location.origin) return null;
  return url;
}

let active = null;
let transition = null;
let loadController = null;
let titleBefore = document.title;
let background = [];

function animate(element, entering) {
  transition?.cancel();
  const small = { transform: 'scale(0.16)', borderRadius: '56px', opacity: 0 };
  const full = { transform: 'scale(1)', borderRadius: '0px', opacity: 1 };
  transition = element.animate(entering ? [{ ...small, opacity: 1 }, full] : [full, small], {
    duration: reducedMotion.matches ? 0 : entering ? 760 : 320,
    easing: entering ? 'cubic-bezier(0.16, 1, 0.3, 1)' : 'cubic-bezier(0.4, 0, 1, 1)',
  });
  return transition.finished.catch(() => {});
}

function returnToWebsite() {
  if (history.state?.preachermanEntry?.from) history.back();
  else {
    history.replaceState(history.state, '', location.pathname + location.search);
    void close();
  }
}

function showError(panel, message, retryable) {
  panel.dataset.state = 'error';
  panel.removeAttribute('aria-busy');
  panel.querySelector('iframe')?.remove();
  const status = panel.querySelector('[data-entry-status]');
  status.setAttribute('role', 'alert');
  status.textContent = message;
  panel.querySelector('[data-entry-retry]').hidden = !retryable;
  panel.querySelector('[data-entry-actions]').hidden = false;
  panel.focus({ preventScroll: true });
}

async function load(panel, target) {
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  const { signal } = controller;
  panel.querySelector('iframe')?.remove();
  panel.dataset.state = 'loading';
  panel.setAttribute('aria-busy', 'true');
  panel.querySelector('[data-entry-status]').textContent = copy().opening;
  panel.querySelector('[data-entry-status]').setAttribute('role', 'status');
  panel.querySelector('[data-entry-actions]').hidden = true;
  const deadline = setTimeout(() => {
    if (active === panel) showError(panel, copy().unavailable, true);
    controller.abort();
  }, 20000);
  try {
    // Vite's local root supports CORS. Verify availability before creating the
    // frame: browsers also dispatch iframe "load" for connection-error pages.
    if (localHosts.has(target.hostname)) {
      const response = await fetch(target, { method: 'HEAD', cache: 'no-store', signal });
      if (!response.ok) throw new Error('App is unavailable');
    }
    if (signal.aborted || active !== panel) return;
    const frame = document.createElement('iframe');
    frame.className = 'web-entry__app';
    frame.title = 'Preacherman Web';
    frame.allow = 'microphone; camera; clipboard-write; fullscreen';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    await new Promise((resolve, reject) => {
      const abort = () => reject(new DOMException('Cancelled', 'AbortError'));
      const finish = (callback) => {
        signal.removeEventListener('abort', abort);
        frame.onload = null;
        frame.onerror = null;
        callback();
      };
      frame.onload = () => finish(resolve);
      frame.onerror = () => finish(() => reject(new Error('App failed to load')));
      signal.addEventListener('abort', abort, { once: true });
      frame.src = target.href;
      panel.append(frame);
    });
    if (signal.aborted || active !== panel) return;
    panel.dataset.state = 'ready';
    panel.removeAttribute('aria-busy');
    await transition?.finished.catch(() => {});
    if (!signal.aborted && active === panel) frame.focus({ preventScroll: true });
  } catch {
    if (!signal.aborted && active === panel) showError(panel, copy().unavailable, true);
  } finally {
    clearTimeout(deadline);
  }
}

async function open() {
  if (!trigger || active) return;
  const text = copy();
  const panel = document.createElement('section');
  panel.id = 'preacherman-web-entry';
  panel.className = 'web-entry';
  panel.dataset.state = 'loading';
  panel.setAttribute('aria-label', 'Preacherman Web');
  panel.setAttribute('aria-busy', 'true');
  panel.tabIndex = -1;
  panel.innerHTML = `<div class="web-entry__status"><p data-entry-status role="status"></p>
    <div class="web-entry__actions" data-entry-actions hidden>
      <button type="button" data-entry-retry></button>
      <button type="button" data-entry-back></button>
    </div></div>`;
  panel.querySelector('[data-entry-status]').textContent = text.opening;
  panel.querySelector('[data-entry-retry]').textContent = text.retry;
  panel.querySelector('[data-entry-back]').textContent = text.back;
  panel.querySelector('[data-entry-back]').addEventListener('click', returnToWebsite);
  let target;
  try { target = destination(); } catch { target = null; }
  panel.querySelector('[data-entry-retry]').addEventListener('click', () => { if (target) void load(panel, target); });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); returnToWebsite(); }
  });
  // Keep the hidden marketing controls out of keyboard / assistive navigation.
  background = [...document.body.children].filter(element => !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName))
    .map(element => [element, element.inert]);
  background.forEach(([element]) => { element.inert = true; });
  titleBefore = document.title;
  document.title = 'Preacherman — Web';
  active = panel;
  document.body.append(panel);
  document.body.classList.add('is-web-app-open');
  trigger.setAttribute('aria-controls', panel.id);
  panel.focus({ preventScroll: true });
  const entrance = animate(panel, true);
  if (target) void load(panel, target);
  else showError(panel, text.unpublished, false);
  await entrance;
}

async function close() {
  const panel = active;
  if (!panel || panel.dataset.state === 'closing') return;
  loadController?.abort();
  panel.dataset.state = 'closing';
  // Removing the frame releases its WebGL context, media and service requests.
  panel.querySelector('iframe')?.remove();
  await animate(panel, false);
  panel.remove();
  active = null;
  document.title = titleBefore;
  document.body.classList.remove('is-web-app-open');
  background.forEach(([element, inert]) => { element.inert = inert; });
  background = [];
  trigger?.removeAttribute('aria-controls');
  trigger?.focus({ preventScroll: true });
  if (location.hash === route) void open();
}

trigger?.addEventListener('click', () => {
  if (active) return;
  history.pushState({ ...history.state, preachermanEntry: { from: location.href } }, '', route);
  void open();
});
window.addEventListener('popstate', () => { if (location.hash === route) void open(); else void close(); });
window.addEventListener('hashchange', () => { if (location.hash === route) void open(); else void close(); });
if (location.hash === route) void open();
