(() => {
  "use strict";

  const stage = document.querySelector(".update-card__model-stage");
  const canvas = document.querySelector(".update-card__canvas");

  if (!stage || !canvas || !window.THREE?.GLTFLoader) {
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.56, -0.56, 0.1, 20);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
  });
  const loader = new THREE.GLTFLoader();
  const clock = new THREE.Clock(false);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let mixer = null;
  let isVisible = false;
  let animationFrame = 0;
  let visibilityFrame = 0;
  let lastWidth = 0;
  let lastHeight = 0;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;

  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xdff5ff, 0x111827, 0.46));

  const keyLight = new THREE.DirectionalLight(0xe8f8ff, 0.86);
  keyLight.position.set(2.5, 3.5, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.58);
  rimLight.position.set(-3, 2, -2);
  scene.add(rimLight);

  const faceLight = new THREE.PointLight(0xb9e9ff, 0.58, 4, 2);
  faceLight.position.set(0, 0.55, 1.5);
  scene.add(faceLight);

  function prepareMaterials(model) {
    model.traverse((object) => {
      if (!object.isMesh) return;

      object.frustumCulled = false;
      object.castShadow = false;
      object.receiveShadow = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];

      materials.forEach((material) => {
        if (!material) return;
        const name = material.name.toLowerCase();

        if (material.map) material.map.encoding = THREE.sRGBEncoding;
        if (material.emissiveMap) material.emissiveMap.encoding = THREE.sRGBEncoding;
        if (material.normalMap) material.normalMap.encoding = THREE.LinearEncoding;
        if (material.roughnessMap) material.roughnessMap.encoding = THREE.LinearEncoding;
        if (material.metalnessMap) material.metalnessMap.encoding = THREE.LinearEncoding;

        material.transparent = false;
        material.opacity = 1;
        material.alphaTest = 0;
        material.depthWrite = true;
        material.metalness = 0;
        if ("clearcoat" in material) material.clearcoat = 0;

        if (name.includes("hair")) {
          material.emissiveIntensity = 0.7;
          material.roughness = 0.78;
        } else if (name.includes("eyes")) {
          material.emissiveIntensity = 1.2;
          material.roughness = 0.42;
        } else if (name.includes("face")) {
          material.emissiveIntensity = 1;
          material.roughness = 0.84;
        } else {
          material.emissiveIntensity = 1.15;
          material.roughness = 0.72;
        }

        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <dithering_fragment>",
            `
              float cortanaScanlinePhase = mod(gl_FragCoord.y, 8.0);
              float cortanaScanlineBand = 1.0 - smoothstep(1.1, 2.6, cortanaScanlinePhase);
              gl_FragColor.rgb *= mix(1.0, 0.58, cortanaScanlineBand);
              #include <dithering_fragment>
            `,
          );
        };
        material.customProgramCacheKey = () => "cortana-update-scanlines-v3";
        material.needsUpdate = true;
      });
    });
  }

  function frameHalfBody(model) {
    // Cortana's native rig faces +X. Rotate her toward the website camera.
    model.rotation.y = -Math.PI / 2;
    model.updateMatrixWorld(true);

    const initialBounds = new THREE.Box3().setFromObject(model);
    const initialSize = initialBounds.getSize(new THREE.Vector3());
    const fullBodyHeight = Math.max(initialSize.y, 0.001);
    const scale = 2.48 / fullBodyHeight;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const targetTop = 0.53;

    model.position.x -= center.x;
    model.position.y += targetTop - bounds.max.y;
    model.position.z -= center.z;
    model.updateMatrixWorld(true);
  }

  function resizeRenderer() {
    const bounds = stage.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));

    if (width === lastWidth && height === lastHeight) return;

    lastWidth = width;
    lastHeight = height;
    renderer.setSize(width, height, false);

    const aspect = width / height;
    const viewHeight = 1.12;
    camera.left = (-viewHeight * aspect) / 2;
    camera.right = (viewHeight * aspect) / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }

  function renderFrame() {
    animationFrame = 0;
    if (!isVisible || document.hidden) return;

    resizeRenderer();
    const delta = Math.min(clock.getDelta(), 0.05);
    if (mixer && !reducedMotion.matches) mixer.update(delta);
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(renderFrame);
  }

  function startRendering() {
    if (animationFrame || !isVisible || document.hidden) return;
    clock.start();
    animationFrame = window.requestAnimationFrame(renderFrame);
  }

  function stopRendering() {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    clock.stop();
  }

  function setVisible(visible) {
    if (visible === isVisible) return;
    isVisible = visible;
    if (isVisible) startRendering();
    else stopRendering();
  }

  function checkVisibility() {
    visibilityFrame = 0;
    const bounds = stage.getBoundingClientRect();
    setVisible(bounds.bottom > 0 && bounds.top < window.innerHeight);
  }

  function scheduleVisibilityCheck() {
    if (visibilityFrame) return;
    visibilityFrame = window.requestAnimationFrame(checkVisibility);
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "12% 0px", threshold: 0.01 },
    );
    observer.observe(stage);
  } else {
    window.addEventListener("scroll", scheduleVisibilityCheck, { passive: true });
    checkVisibility();
  }

  window.addEventListener("resize", () => {
    resizeRenderer();
    scheduleVisibilityCheck();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopRendering();
    else if (isVisible) startRendering();
  });

  loader.load(
    "./assets/cortana-update-retargeted.web.glb?v=20260804-1",
    (gltf) => {
      const model = gltf.scene;
      frameHalfBody(model);
      prepareMaterials(model);
      scene.add(model);

      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(model);
        const action = mixer.clipAction(gltf.animations[0]);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.setEffectiveTimeScale(0.62);
        action.play();
        mixer.update(0);
      }

      resizeRenderer();
      renderer.render(scene, camera);
      stage.classList.add("is-ready");
      if (isVisible) startRendering();
    },
    undefined,
    (error) => console.error("Unable to load the Cortana update model.", error),
  );
})();
