// Local DOM/canvas capture, adapted from desktop captureMarketFrame.
// No screen permission, remote renderer or desktop process is involved.
const visible = box => box.width > 0 && box.height > 0 && box.bottom > 0
  && box.right > 0 && box.top < innerHeight && box.left < innerWidth;
const clearColor = color => !color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)';

async function svgImage(svg, box, signal) {
  const clone = svg.cloneNode(true);
  const properties = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
    'stroke-linecap', 'stroke-linejoin', 'opacity', 'filter', 'flood-color', 'flood-opacity',
    'color', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor'];
  const originals = [svg, ...svg.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  originals.forEach((original, index) => {
    const style = getComputedStyle(original);
    for (const property of properties) {
      const value = style.getPropertyValue(property).replace(/url\(["']?[^)"']*#([^)'"\s]+)["']?\)/g, 'url(#$1)');
      copies[index].style.setProperty(property, value);
    }
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', box.width);
  clone.setAttribute('height', box.height);
  clone.style.opacity = '1';
  clone.style.overflow = 'visible';
  const image = new Image();
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  let timeout, abort;
  try {
    await new Promise((resolve, reject) => {
      abort = () => reject(new DOMException('Capture cancelled', 'AbortError'));
      signal.addEventListener('abort', abort, { once: true });
      timeout = setTimeout(() => reject(new Error('Vector capture timed out')), 2000);
      image.onload = resolve;
      image.onerror = () => reject(new Error('Vector capture unavailable'));
      image.src = url;
    });
    signal.throwIfAborted();
    return image;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
    URL.revokeObjectURL(url);
  }
}

export async function captureProfileViewport(signal) {
  signal.throwIfAborted();
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1600 / innerWidth, 1100 / innerHeight);
  canvas.width = Math.round(innerWidth * scale);
  canvas.height = Math.round(innerHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Viewport capture unavailable');
  ctx.scale(scale, scale);
  const rootStyle = getComputedStyle(document.documentElement);
  ctx.fillStyle = rootStyle.getPropertyValue('--page-bg').trim();
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  const hero = document.querySelector('.hero');
  if (hero && !hero.classList.contains('is-showcase-active')) {
    const stage = hero.querySelector('[data-pathfinder-stage]');
    const box = stage.getBoundingClientRect();
    let captured = false;
    ctx.save();
    ctx.filter = getComputedStyle(stage).filter;
    ctx.globalAlpha = Number(getComputedStyle(stage).opacity);
    window.dispatchEvent(new CustomEvent('preacherman:hero-capture', { detail: frame => {
      ctx.drawImage(frame, box.left, box.top, box.width, box.height);
      captured = true;
    } }));
    if (!captured) {
      const poster = stage.querySelector('img');
      if (poster?.complete && poster.naturalWidth) {
        const ratio = Math.min(box.width / poster.naturalWidth, box.height / poster.naturalHeight);
        const width = poster.naturalWidth * ratio, height = poster.naturalHeight * ratio;
        ctx.drawImage(poster, box.left + (box.width - width) / 2, box.top + (box.height - height) / 2, width, height);
      }
    }
    ctx.restore();
    ctx.fillStyle = getComputedStyle(hero.querySelector('.hero__frost')).backgroundColor;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
  }

  function text(node) {
    const value = node.textContent || '';
    if (!value.trim()) return;
    const style = getComputedStyle(node.parentElement);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'alphabetic';
    const metrics = ctx.measureText('Mg');
    const ascent = metrics.fontBoundingBoxAscent || parseFloat(style.fontSize) * .8;
    const descent = metrics.fontBoundingBoxDescent || parseFloat(style.fontSize) * .2;
    const range = document.createRange();
    for (let i = 0; i < value.length; i++) {
      if (/\s/.test(value[i])) continue;
      range.setStart(node, i); range.setEnd(node, i + 1);
      const box = range.getBoundingClientRect();
      if (!visible(box)) continue;
      const char = style.textTransform === 'uppercase' ? value[i].toUpperCase()
        : style.textTransform === 'lowercase' ? value[i].toLowerCase() : value[i];
      ctx.fillText(char, box.left, box.top + (box.height - ascent - descent) / 2 + ascent);
    }
  }

  async function paint(element) {
    signal.throwIfAborted();
    if (element.matches('script, style, canvas, .hero__backdrop, .site-brand, [hidden], .sr-only')) return;
    const style = getComputedStyle(element);
    const opacity = Number(style.opacity);
    const box = element.getBoundingClientRect();
    if (style.display === 'none' || style.visibility === 'hidden' || !opacity || !visible(box)) return;
    ctx.save();
    ctx.globalAlpha *= opacity;
    if (!clearColor(style.backgroundColor)) {
      ctx.fillStyle = style.backgroundColor;
      ctx.beginPath();
      ctx.roundRect(box.left, box.top, box.width, box.height, Math.min(parseFloat(style.borderRadius) || 0, box.width / 2, box.height / 2));
      ctx.fill();
    }
    const border = parseFloat(style.borderTopWidth);
    if (border && !clearColor(style.borderTopColor)) {
      ctx.strokeStyle = style.borderTopColor; ctx.lineWidth = border;
      ctx.beginPath(); ctx.roundRect(box.left, box.top, box.width, box.height, parseFloat(style.borderRadius) || 0); ctx.stroke();
    }
    if (style.overflow === 'hidden') {
      ctx.beginPath();
      ctx.roundRect(box.left, box.top, box.width, box.height, parseFloat(style.borderRadius) || 0);
      ctx.clip();
    }
    if (element instanceof HTMLVideoElement) {
      if (element.readyState >= 2 && element.videoWidth) {
        const ratio = Math.min(box.width / element.videoWidth, box.height / element.videoHeight);
        const width = element.videoWidth * ratio, height = element.videoHeight * ratio;
        ctx.drawImage(element, box.left + (box.width - width) / 2, box.top + (box.height - height) / 2, width, height);
      }
    } else if (element instanceof SVGElement) {
      ctx.drawImage(await svgImage(element, box, signal), box.left, box.top, box.width, box.height);
    } else if (element instanceof HTMLImageElement) {
      if (element.complete && element.naturalWidth) {
        ctx.filter = style.filter;
        ctx.drawImage(element, box.left, box.top, box.width, box.height);
      }
    } else {
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) text(node);
        else if (node.nodeType === Node.ELEMENT_NODE) await paint(node);
      }
    }
    ctx.restore();
  }
  await paint(document.querySelector('.site-content'));
  await paint(document.querySelector('.site-header'));
  signal.throwIfAborted();
  return canvas;
}
