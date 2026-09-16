// Decorative, independently packaged copy of the desktop companion scene.
import {
  ACESFilmicToneMapping, AmbientLight, AnimationMixer, LoopRepeat,
  PerspectiveCamera, RectAreaLight, Scene, SRGBColorSpace, WebGLRenderer,
  GLTFLoader, RectAreaLightUniformsLib,
} from './vendor/three-pathfinder-0.185.1.js';

const hero = document.querySelector('[data-hero-depth]');
const stage = hero?.querySelector('[data-pathfinder-stage]');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const modelUrl = new URL('./assets/pathfinder/pathfinder-runtime.glb', import.meta.url);
const clipName = 'apex-legend-pathfinder.idle.happy.v2';

if (stage) {
  const lifetime = new AbortController();
  const scene = new Scene();
  // Same portrait camera and authored cinematic lights as desktop Settings.
  const camera = new PerspectiveCamera(30, 1, 0.01, 100);
  let renderer, mixer, model, frame = 0, lastFrame = 0, disposed = false;
  let ready = false, contextLost = false;
  const textures = new Set();
  const geometries = new Set();
  const materials = new Set();
  const skeletons = new Set();
  const shouldRender = () => ready && !disposed && !contextLost && !document.hidden
    && !hero.classList.contains('is-showcase-active')
    && !document.body.classList.contains('is-navigation-locked')
    && !document.body.classList.contains('is-navigation-workspace-open')
    && hero.getBoundingClientRect().bottom > 0;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = 0;
    stage.dataset.renderActive = 'false';
  }

  function render(now) {
    frame = 0;
    if (!shouldRender()) return stop();
    // Draw each display frame; elapsed time keeps the authored action speed
    // identical on 60Hz and high-refresh displays without a low-FPS gate.
    if (lastFrame) mixer.update(Math.min((now - lastFrame) / 1000, 0.1));
    renderer.render(scene, camera);
    lastFrame = now;
    frame = requestAnimationFrame(render);
  }

  function sync() {
    stop();
    if (!shouldRender()) return;
    renderer.render(scene, camera);
    if (!motion.matches) {
      stage.dataset.renderActive = 'true';
      frame = requestAnimationFrame(render);
    }
  }

  function resize() {
    if (!renderer || disposed) return;
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.set(0, 1.29, 2.21 * Math.max(1, 0.95 / camera.aspect));
    camera.lookAt(0, 1.29, 0);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(1, 1000 / width, 850 / height));
    renderer.setSize(width, height, false);
    sync();
  }

  function releaseModel(root) {
    root?.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.skeleton) skeletons.add(object.skeleton);
      for (const material of [].concat(object.material || [])) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    for (const texture of textures) { texture.dispose(); texture.source?.data?.close?.(); }
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
    for (const skeleton of skeletons) skeleton.dispose();
    textures.clear(); materials.clear(); geometries.clear(); skeletons.clear();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    lifetime.abort();
    observer.disconnect();
    resizing.disconnect();
    mixer?.stopAllAction();
    if (model) { mixer?.uncacheRoot(model); releaseModel(model); }
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }

  const observer = new MutationObserver(sync);
  observer.observe(hero, { attributes: true, attributeFilter: ['class'] });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  const resizing = new ResizeObserver(resize);
  resizing.observe(stage);
  document.addEventListener('visibilitychange', sync, { signal: lifetime.signal });
  motion.addEventListener('change', sync, { signal: lifetime.signal });
  window.addEventListener('pagehide', event => event.persisted ? stop() : dispose(), { signal: lifetime.signal });
  window.addEventListener('pageshow', sync, { signal: lifetime.signal });

  async function load() {
    let timeout;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.82;
      renderer.setClearColor(0x010409, 0);
      renderer.domElement.setAttribute('aria-hidden', 'true');
      stage.append(renderer.domElement);
      renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault(); contextLost = true; stop(); stage.dataset.state = 'fallback';
      }, { signal: lifetime.signal });
      renderer.domElement.addEventListener('webglcontextrestored', () => {
        contextLost = false;
        if (ready) { stage.dataset.state = 'ready'; resize(); }
      }, { signal: lifetime.signal });
      RectAreaLightUniformsLib.init();
      scene.add(new AmbientLight('#07111d', 0.015));
      const lights = [
        ['#d7f1ff', 11.5, 0.46, 1.55, [-1.35, 1.75, 1.35], [-0.08, 1.18, 0]],
        ['#1676df', 7.4, 0.32, 1.7, [1.18, 1.55, -0.42], [0.08, 1.15, 0.08]],
        ['#5baee8', 0.72, 0.42, 0.5, [0.2, 1.52, 1.75], [0, 1.35, 0]],
        ['#36a9e6', 0.32, 1.8, 1.8, [0, -0.12, 0.12], [0, 0.75, 0]],
      ];
      for (const [color, intensity, width, height, position, target] of lights) {
        const light = new RectAreaLight(color, intensity, width, height);
        light.position.set(...position); light.lookAt(...target); scene.add(light);
      }
      resize();
      const download = new AbortController();
      timeout = setTimeout(() => download.abort(), 45000);
      const response = await fetch(modelUrl, { signal: AbortSignal.any([download.signal, lifetime.signal]) });
      if (!response.ok) throw new Error(`Pathfinder asset HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      clearTimeout(timeout);
      const gltf = await new GLTFLoader().parseAsync(bytes, new URL('.', modelUrl).href);
      if (disposed) { releaseModel(gltf.scene); return; }
      model = gltf.scene;
      const clip = gltf.animations.find(animation => animation.name === clipName);
      if (!clip) throw new Error('Pathfinder authored idle animation is missing');
      mixer = new AnimationMixer(model);
      mixer.clipAction(clip).setLoop(LoopRepeat, Infinity).play();
      mixer.update(0);
      scene.add(model);
      await renderer.compileAsync(scene, camera);
      if (disposed) return;
      ready = true;
      stage.dataset.animation = clipName;
      stage.dataset.state = 'ready';
      sync();
    } catch (error) {
      if (!disposed) {
        stage.dataset.state = 'fallback';
        console.warn('Pathfinder background unavailable; keeping the static backdrop.', error.message);
        dispose();
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  // Synchronous local capture: draw before the browser clears the WebGL buffer.
  window.addEventListener('preacherman:hero-capture', event => {
    if (!ready || disposed || contextLost || typeof event.detail !== 'function') return;
    renderer.render(scene, camera);
    event.detail(renderer.domElement);
  }, { signal: lifetime.signal });
  void load();
}
