import { captureProfileViewport } from './profile-capture.js';
import { TaskProfileLens } from './profile-lens.js';

const brand = document.querySelector('.site-brand');
const dialog = document.querySelector('#preacherman-profile');
const host = dialog.querySelector('.brand-profile__lens');
const closeButton = dialog.querySelector('.brand-profile__close');
const content = dialog.querySelector('.brand-profile__content');
const lines = [...content.querySelectorAll('span')];
const copy = {
  en: {
    title: 'About Preacherman', close: 'Close',
    lines: ['A vessel for intelligence',
      'Preacherman brings your virtual character assets together, connecting engines and real tools to get things done.',
      'Manage an AI that keeps learning, can be deployed, and takes action.',
      'Your trusted second identity in the virtual world'],
  },
  zh: {
    title: '关于 Preacherman', close: '关闭',
    lines: ['一个智能容器',
      'Preacherman 统一管理虚拟人物资产，兼容通用引擎、真实工具完成任务。',
      '在这里管理一位能持续学习、可部署、真正做事的人工智能。',
      '信任你在虚拟世界里的第二身份'],
  },
};
let lens = null, preparation = null, closing = false, savedScroll = 0;
let restoreFocus = true, warmupHandle = null, warmupCapture = null;

function translate() {
  const language = document.documentElement.dataset.language === 'zh' ? 'zh' : 'en';
  const text = copy[language];
  dialog.setAttribute('aria-label', text.title);
  brand.setAttribute('aria-label', text.title);
  closeButton.textContent = text.close;
  lines.forEach((line, index) => { line.textContent = text.lines[index]; });
}

function getLens() {
  if (!lens) {
    const empty = document.createElement('canvas');
    empty.width = empty.height = 1;
    lens = new TaskProfileLens(host, empty, (progress, settled) => {
      // The shader owns intermediate frames; avoid restyling the modal each frame.
      if (!settled) return;
      if (progress === 0 && closing) finish();
      else if (progress === 1 && dialog.dataset.phase !== 'open') {
        dialog.dataset.progress = '1.0000';
        dialog.dataset.phase = 'open';
      }
    });
  }
  return lens;
}

function releaseLens() {
  lens?.dispose(); lens = null;
  host.replaceChildren();
}

function cancelWarmup() {
  warmupCapture?.abort(); warmupCapture = null;
  if (warmupHandle === null) return;
  if (window.cancelIdleCallback) cancelIdleCallback(warmupHandle);
  else clearTimeout(warmupHandle);
  warmupHandle = null;
}

function queueWarmup() {
  if (warmupHandle !== null || lens || dialog.open || document.hidden) return;
  const warm = async () => {
    warmupHandle = null;
    if (dialog.open || document.hidden) return;
    let candidate;
    const operation = new AbortController();
    warmupCapture = operation;
    const deadline = setTimeout(() => operation.abort(), 5000);
    try {
      candidate = getLens();
      const [source] = await abortable(Promise.all([
        captureProfileViewport(operation.signal), candidate.prepare(),
      ]), operation.signal);
      if (!operation.signal.aborted && !dialog.open && lens === candidate) candidate.warmSource(source);
      // Load the overlay font without waiting for the first click.
      document.fonts.load('16.8px "Preacherman Profile"').catch(() => {});
    } catch {
      if (!operation.signal.aborted && !dialog.open && lens === candidate) releaseLens();
    } finally {
      clearTimeout(deadline);
      if (warmupCapture === operation) warmupCapture = null;
    }
  };
  warmupHandle = window.requestIdleCallback
    ? requestIdleCallback(warm, { timeout: 1200 }) : setTimeout(warm, 200);
}

function abortable(promise, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

function finish() {
  preparation?.abort(); preparation = null;
  lens?.suspend();
  if (dialog.open) dialog.close();
  document.body.classList.remove('is-brand-profile-open', 'is-brand-profile-active');
  brand.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('has-profile-scrollbar');
  dialog.dataset.phase = 'closed';
  dialog.dataset.progress = '0.0000';
  closing = false;
  window.scrollTo({ top: savedScroll, behavior: 'instant' });
  if (restoreFocus) brand.focus({ preventScroll: true });
}

function close() {
  if (!dialog.open || closing) return;
  closing = true;
  preparation?.abort(); preparation = null;
  dialog.dataset.phase = 'closing';
  if (lens?.active) lens.setOpen(false);
  else finish();
}

async function open() {
  if (dialog.open) { close(); return; }
  cancelWarmup();
  closing = false;
  restoreFocus = true;
  savedScroll = scrollY;
  translate();
  document.documentElement.classList.toggle('has-profile-scrollbar', innerWidth > document.documentElement.clientWidth);
  dialog.dataset.phase = 'preparing';
  dialog.dataset.progress = '0.0000';
  dialog.showModal();
  closeButton.focus({ preventScroll: true });
  brand.setAttribute('aria-expanded', 'true');
  document.body.classList.add('is-brand-profile-open');
  const operation = new AbortController();
  preparation = operation;
  const deadline = setTimeout(() => operation.abort(new Error('Profile preparation timed out')), 5000);
  try {
    const candidate = getLens();
    const [source] = await abortable(Promise.all([
      captureProfileViewport(operation.signal), candidate.prepare(),
    ]), operation.signal);
    if (!dialog.open || closing || operation.signal.aborted || candidate !== lens) return;
    candidate.setSource(source);
    document.body.classList.add('is-brand-profile-active');
    dialog.dataset.phase = 'opening';
    candidate.setOpen(true);
  } catch (error) {
    if (!dialog.open || closing || preparation !== operation) return;
    // A failed graphic must never hide the bilingual introduction or Close.
    releaseLens();
    document.body.classList.remove('is-brand-profile-active');
    dialog.dataset.phase = 'fallback';
    console.warn('Preacherman profile graphic unavailable; showing the introduction.', error.message);
  } finally {
    clearTimeout(deadline);
    if (preparation === operation) preparation = null;
  }
}

window.addEventListener('preacherman:profile-toggle', open);
closeButton.addEventListener('click', close);
dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
// Close is the dialog's only focusable control; keep Tab inside the modal.
dialog.addEventListener('keydown', event => {
  if (event.key === 'Tab') {
    event.preventDefault();
    closeButton.focus({ preventScroll: true });
  }
});
host.addEventListener('preacherman:profile-context-lost', () => {
  preparation?.abort(); preparation = null;
  releaseLens();
  if (!dialog.open) return;
  if (closing) { finish(); return; }
  document.body.classList.remove('is-brand-profile-active');
  dialog.dataset.phase = 'fallback';
});

dialog.addEventListener('click', event => {
  if (event.target === dialog) close();
});
window.addEventListener('resize', () => { if (dialog.open) lens?.resize(); });
window.addEventListener('pagehide', () => {
  restoreFocus = false;
  cancelWarmup();
  if (dialog.open) finish();
  releaseLens();
});
const languageObserver = new MutationObserver(translate);
languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-language'] });
translate();

if (document.readyState === 'complete') queueWarmup();
else window.addEventListener('load', queueWarmup, { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelWarmup();
  else queueWarmup();
});
window.addEventListener('pageshow', event => { if (event.persisted) queueWarmup(); });
