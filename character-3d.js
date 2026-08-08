(() => {
  "use strict";

  const canvas = document.querySelector(".character-system__canvas");
  const characterSystem = document.querySelector(".character-system");
  const modelSources = {
    hand: "./assets/cortana-hand-raising.web-v2.glb",
    tablet: "./assets/cortana-tablet.web-v2.glb",
  };

  if (!canvas || !characterSystem || !window.THREE?.GLTFLoader) {
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 1.05, -1.05, 0.1, 20);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
  });
  const loader = new THREE.GLTFLoader();
  const clock = new THREE.Clock();
  const loadedAssets = new Map();
  let characterState = null;
  let currentProgress = 0;
  let reducedMotion = false;
  let loadedModelCount = 0;
  let lastWidth = 0;
  let lastHeight = 0;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;

  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xd9efff, 0x020915, 0.24));

  const keyLight = new THREE.DirectionalLight(0xd7f3ff, 0.68);
  keyLight.position.set(2.5, 3.5, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x1f8fff, 0.38);
  rimLight.position.set(-3, 1.5, -2);
  scene.add(rimLight);

  const faceLight = new THREE.PointLight(0xc9edff, 0.72, 3.2, 2);
  faceLight.position.set(0, 0.72, 1.35);
  scene.add(faceLight);

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function ease(value) {
    const progress = clamp(value);
    return progress * progress * (3 - 2 * progress);
  }

  function segment(progress, start, end) {
    return clamp((progress - start) / (end - start));
  }

  function frameModel(model) {
    // Cortana's native rig faces +X in Blender; glTF keeps that orientation.
    // Turn her toward the website camera instead of showing the side profile.
    model.rotation.y = -Math.PI / 2;
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const targetHeight = 1.88;
    // The exported bind pose spans a rotated local axis, so use its longest
    // world-space bound as the reliable full-body measurement.
    const scale = targetHeight / Math.max(size.x, size.y, size.z, 0.001);

    model.scale.setScalar(scale);
    model.position.set(0, -0.96, 0);
    model.updateMatrixWorld(true);
  }

  function prepareMaterials(model) {
    model.traverse((object) => {
      if (!object.isMesh) {
        return;
      }

      object.frustumCulled = false;
      object.castShadow = false;
      object.receiveShadow = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        const materialName = material.name.toLowerCase();
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

        if (materialName.includes("hair")) {
          material.color.setHex(0x26344d);
          material.emissive.setHex(0x0a1a32);
          material.emissiveIntensity = 0.18;
          material.roughness = 0.78;
        } else if (materialName.includes("eyes")) {
          material.color.setHex(0x8cc9ff);
          material.emissive.setHex(0x55c7ff);
          material.emissiveIntensity = 1.35;
          material.roughness = 0.42;
        } else if (materialName.includes("face")) {
          material.color.setHex(0xffffff);
          material.emissive.setHex(0x8bd8ff);
          material.emissiveIntensity = 0.52;
          material.roughness = 0.84;
        } else {
          material.color.setHex(0x8abce9);
          material.emissive.setHex(0x32b9ff);
          material.emissiveIntensity = 2.8;
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
        material.customProgramCacheKey = () => "cortana-reference-scanlines-v1";
        material.needsUpdate = true;
      });
    });
  }

  function updateModelWeights() {
    if (!characterState) {
      return;
    }

    const transition = reducedMotion ? 1 : ease(segment(currentProgress, 0.46, 0.56));
    // Crossfade the two complete gestures with scroll instead of layering
    // partial poses that leave the shoulders and wrists in an A-pose.
    characterState.handAction.setEffectiveWeight(1 - transition);
    characterState.tabletAction.setEffectiveWeight(transition);
  }

  function resizeRenderer() {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));

    if (width === lastWidth && height === lastHeight) {
      return;
    }

    lastWidth = width;
    lastHeight = height;
    renderer.setSize(width, height, false);

    const aspect = width / height;
    camera.left = -1.05 * aspect;
    camera.right = 1.05 * aspect;
    camera.top = 1.05;
    camera.bottom = -1.05;
    camera.updateProjectionMatrix();
  }

  function render() {
    window.requestAnimationFrame(render);
    resizeRenderer();

    const delta = Math.min(clock.getDelta(), 0.05);
    if (!reducedMotion && !document.hidden) {
      characterState?.mixer.update(delta);
    }

    renderer.render(scene, camera);
  }

  function initializeCharacter() {
    const handAsset = loadedAssets.get("hand");
    const tabletAsset = loadedAssets.get("tablet");
    const model = handAsset.scene;
    const mixer = new THREE.AnimationMixer(model);
    const handAction = mixer.clipAction(handAsset.animations[0]);
    const tabletAction = mixer.clipAction(tabletAsset.animations[0]);

    // These are presentation gestures, not locomotion cycles. Ping-pong keeps
    // the hands and shoulders from snapping back to frame one at every loop.
    handAction.setLoop(THREE.LoopPingPong, Infinity).play();
    tabletAction.setLoop(THREE.LoopPingPong, Infinity).play();
    handAction.setEffectiveTimeScale(0.36);
    tabletAction.setEffectiveTimeScale(0.3);
    handAction.setEffectiveWeight(1);
    tabletAction.setEffectiveWeight(0);
    mixer.update(0);

    model.name = "AnimatedCortana";
    frameModel(model);
    prepareMaterials(model);
    scene.add(model);
    characterState = { model, mixer, handAction, tabletAction };
    updateModelWeights();
    characterSystem.classList.add("is-3d-ready");
    window.dispatchEvent(new CustomEvent("cortana-ready"));
  }

  function handleModelLoaded(key, gltf) {
    loadedAssets.set(key, gltf);
    loadedModelCount += 1;

    tryInitializeCharacter();
  }

  function tryInitializeCharacter() {
    if (loadedModelCount === 2 && !characterState) {
      initializeCharacter();
    }
  }

  function loadModel(key, source) {
    loader.load(
      source,
      (gltf) => handleModelLoaded(key, gltf),
      undefined,
      (error) => console.error(`Unable to load Cortana ${key} animation.`, error),
    );
  }

  window.CortanaCharacter = {
    setProgress(progress, shouldReduceMotion = false) {
      currentProgress = clamp(progress);
      reducedMotion = shouldReduceMotion;
      updateModelWeights();
    },
    resize: resizeRenderer,
  };

  Object.entries(modelSources).forEach(([key, source]) => loadModel(key, source));
  render();
})();
