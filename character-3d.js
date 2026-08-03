(() => {
  "use strict";

  const canvas = document.querySelector(".character-system__canvas");
  const characterSystem = document.querySelector(".character-system");
  const modelSources = {
    hand: "./assets/cortana-hand-raising.new.glb",
    tablet: "./assets/cortana-tablet.new.glb",
  };
  const textureSources = {
    body: "./assets/cortana-textures/cortana-body-diffuse.jpg",
    bodyNormal: "./assets/cortana-textures/cortana-body-normal.jpg",
    face: "./assets/cortana-textures/cortana-face-diffuse.jpg",
    faceNormal: "./assets/cortana-textures/cortana-face-normal.jpg",
    hair: "./assets/cortana-textures/cortana-hair-diffuse.jpg",
    hairNormal: "./assets/cortana-textures/cortana-hair-normal.jpg",
    eyes: "./assets/cortana-textures/cortana-eyes-diffuse.jpg",
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
  const cortanaTextures = new Map();
  let characterState = null;
  let currentProgress = 0;
  let reducedMotion = false;
  let loadedModelCount = 0;
  let loadedTextureCount = 0;
  let lastWidth = 0;
  let lastHeight = 0;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.LinearToneMapping;
  renderer.toneMappingExposure = 1.05;

  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x07111c, 0.45));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  keyLight.position.set(2.5, 3.5, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x2aaeff, 0.55);
  rimLight.position.set(-3, 1.5, -2);
  scene.add(rimLight);

  const faceLight = new THREE.PointLight(0xffffff, 0.2, 3.2, 2);
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
      const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const clonedMaterials = sourceMaterials.map((material) => {
        const clone = material.clone();
        const materialName = clone.name.toLowerCase();
        let colorRamp = "body";

        if (materialName.includes("hair")) {
          colorRamp = "hair";
          clone.color?.setHex(0xffffff);
          clone.emissive?.setHex(0x6556a8);
          clone.emissiveIntensity = 0.005;
          clone.roughness = 0.4;
          clone.map = cortanaTextures.get("hair");
          clone.emissiveMap = clone.map;
          clone.normalMap = cortanaTextures.get("hairNormal");
          clone.normalScale?.set(1, -1);
        } else if (materialName.includes("eyes")) {
          colorRamp = "eyes";
          clone.color?.setHex(0xffffff);
          clone.emissive?.setHex(0x0a5076);
          clone.emissiveIntensity = 0.05;
          clone.roughness = 0.4;
          clone.map = cortanaTextures.get("eyes");
          clone.emissiveMap = clone.map;
        } else if (materialName.includes("face")) {
          clone.color?.setHex(0xffffff);
          clone.emissive?.setHex(0x5caee8);
          clone.emissiveIntensity = 0.18;
          clone.roughness = 0.4;
          clone.map = cortanaTextures.get("face");
          clone.emissiveMap = clone.map;
          clone.normalMap = cortanaTextures.get("faceNormal");
          clone.normalScale?.set(0, 0);
        } else {
          clone.color?.setHex(0xffffff);
          clone.emissive?.setHex(0x318fd6);
          clone.emissiveIntensity = 0.36;
          clone.roughness = 0.4;
          clone.metalness = 0;
          clone.map = cortanaTextures.get("body");
          clone.emissiveMap = clone.map;
          clone.normalMap = cortanaTextures.get("bodyNormal");
          clone.normalScale?.set(1, -1);
        }

        clone.transparent = false;
        clone.depthWrite = true;
        clone.depthTest = true;
        clone.opacity = 1;
        const rampShader = colorRamp === "hair"
          ? `
              if (cortanaLuma < 0.409091) {
                cortanaColor = mix(
                  vec3(0.007262, 0.005700, 0.016609),
                  vec3(0.126619, 0.076711, 0.327264),
                  clamp(cortanaLuma / 0.409091, 0.0, 1.0)
                );
              } else if (cortanaLuma < 0.718182) {
                cortanaColor = mix(
                  vec3(0.126619, 0.076711, 0.327264),
                  vec3(0.624445, 0.601591, 1.0),
                  clamp((cortanaLuma - 0.409091) / 0.309091, 0.0, 1.0)
                );
              } else {
                cortanaColor = mix(
                  vec3(0.624445, 0.601591, 1.0),
                  vec3(0.464539, 0.387256, 0.638129),
                  clamp((cortanaLuma - 0.718182) / 0.127272, 0.0, 1.0)
                );
              }
            `
          : colorRamp === "eyes"
            ? `
                if (cortanaLuma < 0.304546) {
                  cortanaColor = mix(
                    vec3(0.091279, 0.109357, 0.160907),
                    vec3(0.170788, 0.237408, 0.434326),
                    clamp(cortanaLuma / 0.304546, 0.0, 1.0)
                  );
                } else {
                  cortanaColor = mix(
                    vec3(0.170788, 0.237408, 0.434326),
                    vec3(0.918895, 0.967038, 1.0),
                    clamp((cortanaLuma - 0.304546) / 0.695454, 0.0, 1.0)
                  );
                }
              `
            : `
                if (cortanaLuma < 0.481819) {
                  cortanaColor = mix(
                    vec3(0.006938, 0.020557, 0.059684),
                    vec3(0.117595, 0.407759, 1.0),
                    clamp((cortanaLuma - 0.1) / 0.381819, 0.0, 1.0)
                  );
                } else {
                  cortanaColor = mix(
                    vec3(0.117595, 0.407759, 1.0),
                    vec3(0.774782, 0.911569, 1.0),
                    clamp((cortanaLuma - 0.481819) / 0.518181, 0.0, 1.0)
                  );
                }
              `;
        clone.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `
              #ifdef USE_MAP
                vec4 texelColor = texture2D(map, vUv);
                texelColor = mapTexelToLinear(texelColor);
                float cortanaLuma = dot(texelColor.rgb, vec3(0.2126, 0.7152, 0.0722));
                vec3 cortanaColor = vec3(0.0);
                ${rampShader}
                diffuseColor *= vec4(cortanaColor, texelColor.a);
              #endif
            `,
          );
        };
        clone.customProgramCacheKey = () => `cortana-original-uv-v3-${colorRamp}`;
        clone.needsUpdate = true;
        return clone;
      });

      object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0];
    });
  }

  function updateModelWeights() {
    if (!characterState) {
      return;
    }

    const transition = reducedMotion ? 1 : ease(segment(currentProgress, 0.46, 0.56));
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

    handAction.setLoop(THREE.LoopRepeat, Infinity).play();
    tabletAction.setLoop(THREE.LoopRepeat, Infinity).play();
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
    if (loadedModelCount === 2 && loadedTextureCount === Object.keys(textureSources).length && !characterState) {
      initializeCharacter();
    }
  }

  function loadTexture(key, source) {
    new THREE.TextureLoader().load(
      source,
      (texture) => {
        texture.encoding = key.endsWith("Normal") ? THREE.LinearEncoding : THREE.sRGBEncoding;
        texture.flipY = false;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        texture.needsUpdate = true;
        cortanaTextures.set(key, texture);
        loadedTextureCount += 1;
        tryInitializeCharacter();
      },
      undefined,
      (error) => console.error(`Unable to load Cortana ${key} texture.`, error),
    );
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
  Object.entries(textureSources).forEach(([key, source]) => loadTexture(key, source));
  render();
})();
