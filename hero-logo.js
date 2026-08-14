(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";
  const lockup = document.querySelector(".logo-lockup");
  const svg = lockup?.querySelector(".hero__logo-svg");

  if (!lockup || !svg) return;

  const makeSvg = (tag, attributes = {}) => {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes).forEach(([name, value]) => {
      node.setAttribute(name, value);
    });
    return node;
  };

  const setUseReference = (node, id) => {
    node.setAttribute("href", `#${id}`);
    node.setAttributeNS(XLINK_NS, "xlink:href", `#${id}`);
  };

  const clamp = (minimum, value, maximum) =>
    Math.max(minimum, Math.min(value, maximum));

  const getDimensions = (width) => {
    let fontSize = clamp(38, width * 0.048, 74.8);
    if (width <= 560) fontSize = clamp(22, width * 0.064, 32);

    return {
      fontSize,
      height: clamp(192, width * 0.21, 240),
      pmWidth: clamp(174, width * 0.251, 318),
    };
  };

  const initialize = async () => {
    const [glyphResponse, pmResponse] = await Promise.all([
      fetch("./assets/preacherman-glyphs.json?v=20260813-7"),
      fetch("./assets/preacherman-hero-logo.svg"),
    ]);

    if (!glyphResponse.ok || !pmResponse.ok) {
      throw new Error("Unable to load the Preacherman logo geometry.");
    }

    const glyphData = await glyphResponse.json();
    const pmDocument = new DOMParser().parseFromString(
      await pmResponse.text(),
      "image/svg+xml",
    );
    const pmCompoundPath = [...pmDocument.querySelectorAll("path")]
      .map((path) => path.getAttribute("d"))
      .filter(Boolean)
      .join("");

    const defs = makeSvg("defs");
    glyphData.glyphs.forEach((glyph, index) => {
      defs.append(
        makeSvg("path", {
          id: `hero-logo-glyph-${index}`,
          d: glyph.d,
          "fill-rule": "evenodd",
          "clip-rule": "evenodd",
        }),
      );
    });

    const pmGeometry = makeSvg("path", {
      id: "hero-logo-pm-geometry",
      d: pmCompoundPath,
      "fill-rule": "nonzero",
    });
    defs.append(pmGeometry);

    const grooveMask = makeSvg("mask", {
      id: "hero-logo-groove-mask",
      maskUnits: "userSpaceOnUse",
      maskContentUnits: "userSpaceOnUse",
      x: "0",
      y: "0",
      width: "212",
      height: "240",
      "mask-type": "alpha",
    });
    const grooveMaskShape = makeSvg("use", { fill: "white" });
    setUseReference(grooveMaskShape, "hero-logo-pm-geometry");
    grooveMask.append(grooveMaskShape);
    defs.append(grooveMask);

    const recessedTextMask = makeSvg("mask", {
      id: "hero-logo-text-recessed-mask",
      maskUnits: "userSpaceOnUse",
      maskContentUnits: "userSpaceOnUse",
      x: "0",
      y: "0",
      width: "1",
      height: "1",
      "mask-type": "alpha",
    });
    const recessedTextMaskShape = makeSvg("use", { fill: "white" });
    setUseReference(recessedTextMaskShape, "hero-logo-pm-geometry");
    recessedTextMask.append(recessedTextMaskShape);
    defs.append(recessedTextMask);

    const flatTextMask = makeSvg("mask", {
      id: "hero-logo-text-flat-mask",
      maskUnits: "userSpaceOnUse",
      maskContentUnits: "userSpaceOnUse",
      x: "0",
      y: "0",
      width: "1",
      height: "1",
      "mask-type": "luminance",
    });
    const flatTextMaskBackground = makeSvg("rect", {
      x: "0",
      y: "0",
      width: "1",
      height: "1",
      fill: "white",
    });
    const flatTextMaskShape = makeSvg("use", { fill: "black" });
    setUseReference(flatTextMaskShape, "hero-logo-pm-geometry");
    flatTextMask.append(flatTextMaskBackground, flatTextMaskShape);
    defs.append(flatTextMask);

    const textMaskSoftener = makeSvg("filter", {
      id: "hero-logo-text-mask-softener",
      filterUnits: "userSpaceOnUse",
      x: "-4",
      y: "-4",
      width: "220",
      height: "248",
      "color-interpolation-filters": "sRGB",
    });
    textMaskSoftener.append(
      makeSvg("feGaussianBlur", {
        stdDeviation: "0.55",
      }),
    );
    defs.append(textMaskSoftener);
    recessedTextMaskShape.setAttribute(
      "filter",
      "url(#hero-logo-text-mask-softener)",
    );
    flatTextMaskShape.setAttribute(
      "filter",
      "url(#hero-logo-text-mask-softener)",
    );

    const makeEdgeFilter = ({
      id,
      dx,
      dy,
      blur,
      color,
      opacity,
    }) => {
      const filter = makeSvg("filter", {
        id,
        filterUnits: "userSpaceOnUse",
        x: "-8",
        y: "-8",
        width: "228",
        height: "256",
        "color-interpolation-filters": "sRGB",
      });
      const softAlpha = makeSvg("feGaussianBlur", {
        in: "SourceAlpha",
        stdDeviation: String(blur),
        result: "soft-alpha",
      });
      const shiftedAlpha = makeSvg("feOffset", {
        in: "soft-alpha",
        dx: String(dx),
        dy: String(dy),
        result: "shifted-alpha",
      });
      const innerEdge = makeSvg("feComposite", {
        in: "SourceAlpha",
        in2: "shifted-alpha",
        operator: "out",
        result: "inner-edge",
      });
      const edgeColor = makeSvg("feFlood", {
        "flood-color": color,
        "flood-opacity": String(opacity),
        result: "edge-color",
      });
      const coloredEdge = makeSvg("feComposite", {
        in: "edge-color",
        in2: "inner-edge",
        operator: "in",
      });
      filter.append(
        softAlpha,
        shiftedAlpha,
        innerEdge,
        edgeColor,
        coloredEdge,
      );
      defs.append(filter);
      return filter;
    };

    makeEdgeFilter({
      id: "hero-logo-groove-dark-wall",
      dx: 2.35,
      dy: 2.35,
      blur: 1.15,
      color: "#403c36",
      opacity: 0.3,
    });
    makeEdgeFilter({
      id: "hero-logo-groove-light-wall",
      dx: -1.25,
      dy: -1.25,
      blur: 0.38,
      color: "#ffffff",
      opacity: 0.68,
    });
    makeEdgeFilter({
      id: "hero-logo-groove-occlusion",
      dx: 0.85,
      dy: 0.85,
      blur: 0.28,
      color: "#2d2a26",
      opacity: 0.22,
    });

    const floorFilter = makeSvg("filter", {
      id: "hero-logo-groove-floor",
      filterUnits: "userSpaceOnUse",
      x: "-8",
      y: "-8",
      width: "228",
      height: "256",
      "color-interpolation-filters": "sRGB",
    });
    const floorInset = makeSvg("feMorphology", {
      in: "SourceAlpha",
      operator: "erode",
      radius: "2.4",
      result: "floor-inset",
    });
    const floorColor = makeSvg("feFlood", {
      "flood-color": "#dedcd9",
      result: "floor-color",
    });
    const floorShape = makeSvg("feComposite", {
      in: "floor-color",
      in2: "floor-inset",
      operator: "in",
    });
    floorFilter.append(
      floorInset,
      floorColor,
      floorShape,
    );
    defs.append(floorFilter);

    const recessedTextFilter = makeSvg("filter", {
      id: "hero-logo-recessed-text-material",
      x: "-2%",
      y: "-8%",
      width: "104%",
      height: "116%",
      "color-interpolation-filters": "sRGB",
    });
    const recessedTextBaseColor = makeSvg("feFlood", {
      "flood-color": "#595650",
      "flood-opacity": "0.9",
      result: "recessed-base-color",
    });
    const recessedTextBase = makeSvg("feComposite", {
      in: "recessed-base-color",
      in2: "SourceAlpha",
      operator: "in",
      result: "recessed-base",
    });
    const recessedTextSoftAlpha = makeSvg("feGaussianBlur", {
      in: "SourceAlpha",
      stdDeviation: "0.34",
      result: "recessed-soft-alpha",
    });
    const recessedTextDarkOffset = makeSvg("feOffset", {
      in: "recessed-soft-alpha",
      dx: "0.9",
      dy: "0.9",
      result: "recessed-dark-offset",
    });
    const recessedTextDarkEdge = makeSvg("feComposite", {
      in: "SourceAlpha",
      in2: "recessed-dark-offset",
      operator: "out",
      result: "recessed-dark-edge",
    });
    const recessedTextDarkColor = makeSvg("feFlood", {
      "flood-color": "#151412",
      "flood-opacity": "0.64",
      result: "recessed-dark-color",
    });
    const recessedTextDarkWall = makeSvg("feComposite", {
      in: "recessed-dark-color",
      in2: "recessed-dark-edge",
      operator: "in",
      result: "recessed-dark-wall",
    });
    const recessedTextLightOffset = makeSvg("feOffset", {
      in: "recessed-soft-alpha",
      dx: "-0.7",
      dy: "-0.7",
      result: "recessed-light-offset",
    });
    const recessedTextLightEdge = makeSvg("feComposite", {
      in: "SourceAlpha",
      in2: "recessed-light-offset",
      operator: "out",
      result: "recessed-light-edge",
    });
    const recessedTextLightColor = makeSvg("feFlood", {
      "flood-color": "#ffffff",
      "flood-opacity": "0.74",
      result: "recessed-light-color",
    });
    const recessedTextLightWall = makeSvg("feComposite", {
      in: "recessed-light-color",
      in2: "recessed-light-edge",
      operator: "in",
      result: "recessed-light-wall",
    });
    const recessedTextMerge = makeSvg("feMerge");
    recessedTextMerge.append(
      makeSvg("feMergeNode", { in: "recessed-base" }),
      makeSvg("feMergeNode", { in: "recessed-dark-wall" }),
      makeSvg("feMergeNode", { in: "recessed-light-wall" }),
    );
    recessedTextFilter.append(
      recessedTextBaseColor,
      recessedTextBase,
      recessedTextSoftAlpha,
      recessedTextDarkOffset,
      recessedTextDarkEdge,
      recessedTextDarkColor,
      recessedTextDarkWall,
      recessedTextLightOffset,
      recessedTextLightEdge,
      recessedTextLightColor,
      recessedTextLightWall,
      recessedTextMerge,
    );
    defs.append(recessedTextFilter);

    const pmLayer = makeSvg("g", {
      id: "final-pm-monogram",
      mask: "url(#hero-logo-groove-mask)",
    });
    const makeGrooveUse = (className, attributes = {}) => {
      const use = makeSvg("use", { class: className, ...attributes });
      setUseReference(use, "hero-logo-pm-geometry");
      return use;
    };
    const grooveBase = makeGrooveUse("pm-groove-base", {
      fill: "var(--pm-groove-base)",
    });
    const grooveDarkWall = makeGrooveUse("pm-groove-dark-wall", {
      fill: "black",
      filter: "url(#hero-logo-groove-dark-wall)",
    });
    const grooveLightWall = makeGrooveUse("pm-groove-light-wall", {
      fill: "black",
      filter: "url(#hero-logo-groove-light-wall)",
    });
    const grooveFloor = makeGrooveUse("pm-groove-floor", {
      fill: "black",
      filter: "url(#hero-logo-groove-floor)",
    });
    const grooveOcclusion = makeGrooveUse("pm-groove-occlusion", {
      fill: "black",
      filter: "url(#hero-logo-groove-occlusion)",
    });
    pmLayer.append(
      grooveBase,
      grooveDarkWall,
      grooveLightWall,
      grooveFloor,
      grooveOcclusion,
    );

    const baseTrack = makeSvg("g", {
      id: "wordmark-base",
      class: "hero-logo__flat-track",
      fill: "var(--logo-ink)",
      "fill-rule": "evenodd",
    });
    const flatTextViewport = makeSvg("g", {
      id: "wordmark-flat-viewport",
      mask: "url(#hero-logo-text-flat-mask)",
    });
    flatTextViewport.append(baseTrack);

    const recessedTextViewport = makeSvg("g", {
      id: "wordmark-recessed-viewport",
      mask: "url(#hero-logo-text-recessed-mask)",
    });
    const recessedTrack = makeSvg("g", {
      id: "wordmark-recessed",
      class: "hero-logo__recessed-track",
      fill: "var(--logo-ink)",
      "fill-rule": "evenodd",
    });
    recessedTextViewport.append(recessedTrack);

    svg.replaceChildren(
      defs,
      pmLayer,
      flatTextViewport,
      recessedTextViewport,
    );
    svg.dataset.entrance = "static";
    svg.dataset.booleanMode = "recessed";

    let sequenceWidth = 0;
    let phaseOffset = 0;
    let animationFrame = 0;
    let animationStart = performance.now();
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const rebuild = () => {
      const width = lockup.clientWidth;
      const { fontSize, height, pmWidth } = getDimensions(width);
      const scale = fontSize / glyphData.unitsPerEm;
      const letterSpacing = fontSize * 0.045;
      const wordGap = fontSize * 1.8585;
      const baseline = height / 2 + fontSize * 0.8482142857;
      const recessedDepthX = width <= 560 ? 0.35 : 0.7;
      const recessedDepthY = width <= 560 ? 0.75 : 1.35;
      const recessedScaleY = width <= 560 ? 0.992 : 0.987;
      const pmHeight = (pmWidth * 240) / 212;
      const pmLeft = (width - pmWidth) / 2;
      const pmOffsetY = height * 0.16;
      const pmTop = (height - pmHeight) / 2 + pmOffsetY;
      const pmTransform = `translate(${pmLeft} ${pmTop}) scale(${pmWidth / 212} ${pmHeight / 240})`;

      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      pmLayer.setAttribute("transform", pmTransform);
      [recessedTextMask, flatTextMask].forEach((mask) => {
        mask.setAttribute("width", String(width));
        mask.setAttribute("height", String(height));
      });
      flatTextMaskBackground.setAttribute("width", String(width));
      flatTextMaskBackground.setAttribute("height", String(height));
      recessedTextMaskShape.setAttribute("transform", pmTransform);
      flatTextMaskShape.setAttribute("transform", pmTransform);
      baseTrack.replaceChildren();
      recessedTrack.replaceChildren();

      const wordAdvance =
        glyphData.glyphs.reduce((sum, glyph) => sum + glyph.advance * scale, 0) +
        glyphData.glyphs.length * letterSpacing;
      sequenceWidth = (wordAdvance + wordGap) * 6;
      phaseOffset = (width - wordAdvance) / 2;

      for (let sequence = 0; sequence < 2; sequence += 1) {
        for (let word = 0; word < 6; word += 1) {
          let cursor = sequence * sequenceWidth + word * (wordAdvance + wordGap);

          glyphData.glyphs.forEach((glyph, glyphIndex) => {
            [baseTrack, recessedTrack].forEach((track) => {
              const isRecessed = track === recessedTrack;
              const letter = makeSvg("use", {
                class: "hero-logo__letter",
                "data-letter": glyph.letter,
                "data-glyph-index": String(glyphIndex),
              });
              setUseReference(letter, `hero-logo-glyph-${glyphIndex}`);
              letter.setAttribute(
                "transform",
                `translate(${cursor + (isRecessed ? recessedDepthX : 0)} ${baseline + (isRecessed ? recessedDepthY : 0)}) scale(${scale} ${scale * (isRecessed ? recessedScaleY : 1)})`,
              );
              track.append(letter);
            });
            cursor += glyph.advance * scale + letterSpacing;
          });
        }
      }

      animationStart = performance.now();
    };

    const update = (timestamp) => {
      const duration = 400000;
      const progress = reducedMotion
        ? 0.5
        : ((timestamp - animationStart) % duration) / duration;
      const trackX = -sequenceWidth + phaseOffset + progress * sequenceWidth;
      baseTrack.setAttribute("transform", `translate(${trackX} 0)`);
      recessedTrack.setAttribute("transform", `translate(${trackX} 0)`);
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(update);
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    motionQuery.addEventListener("change", (event) => {
      reducedMotion = event.matches;
      window.cancelAnimationFrame(animationFrame);
      animationStart = performance.now();
      update(performance.now());
    });

    let resizeFrame = 0;
    window.addEventListener("resize", () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        rebuild();
      });
    });

    rebuild();
    update(performance.now());
  };

  initialize().catch((error) => {
    console.error(error);
  });
})();
