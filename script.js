(() => {
  "use strict";

  const narrativeState = {
    characterSystemProgress: 0,
    viewportHeight: window.innerHeight,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    frameRequested: false,
    brandMarked: false,
  };

  const navigationState = {
    activeDesktopTrigger: null,
    closeTimer: 0,
    mobileOpen: false,
    lockedScrollY: 0,
  };

  const characterSystem = document.querySelector(".character-system");
  const documentRoot = document.documentElement;
  const siteHeader = document.querySelector(".site-header");
  const siteBrand = document.querySelector(".site-brand");
  const desktopNavigation = document.querySelector(".site-navigation");
  const desktopNavigationItems = [...document.querySelectorAll(".site-navigation__item")];
  const mobileNavigation = document.querySelector(".mobile-navigation");
  const mobileNavigationToggle = document.querySelector(".mobile-navigation__toggle");
  const mobileNavigationToggleLabel = document.querySelector(".mobile-navigation__toggle-label");
  const mobileNavigationTriggers = [...document.querySelectorAll(".mobile-navigation__trigger")];
  const twoMindsTaskRing = document.querySelector(".two-minds-task-ring");
  const twoMindsTaskTrail = document.querySelector(".two-minds-task-trail");
  const twoMindsTaskSignal = document.querySelector(".two-minds-task-signal");
  const svgNamespace = "http://www.w3.org/2000/svg";
  const twoMindsTrailSegmentCount = 10;
  const twoMindsTrailLengthRatio = 0.055;
  const twoMindsRingResponseDuration = 500;
  const twoMindsTrailSegments = Array.from({ length: twoMindsTrailSegmentCount }, () => {
    const trailSegment = document.createElementNS(svgNamespace, "path");
    trailSegment.classList.add("two-minds-task-trail-segment");
    twoMindsTaskTrail.append(trailSegment);
    return trailSegment;
  });
  let twoMindsRingLength = 1;
  let twoMindsRingTargetProgress = 0;
  let twoMindsRingRenderedProgress = 0;
  let twoMindsRingAnimationFrom = 0;
  let twoMindsRingAnimationStartedAt = 0;
  let twoMindsRingAnimationFrame = 0;
  let twoMindsRingDirection = 1;
  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function segment(progress, start, end) {
    return clamp((progress - start) / (end - start));
  }

  function ease(progress) {
    const value = clamp(progress);
    return value * value * (3 - 2 * value);
  }

  function fadeBetween(progress, enterStart, enterEnd, exitStart, exitEnd, restingOpacity = 0) {
    const entrance = ease(segment(progress, enterStart, enterEnd));
    const exit = ease(segment(progress, exitStart, exitEnd));
    return entrance * (1 - exit * (1 - restingOpacity));
  }

  function calculateCharacterSystemProgress() {
    const rect = characterSystem.getBoundingClientRect();
    const scrollDistance = Math.max(
      1,
      characterSystem.offsetHeight - narrativeState.viewportHeight,
    );

    return clamp(-rect.top / scrollDistance);
  }

  function setStyleValue(property, value) {
    documentRoot.style.setProperty(property, value);
  }

  function applyCharacterOpeningState(progress) {
    const characterEntrance = ease(segment(progress, 0, 0.10));
    const headlineEntrance = ease(segment(progress, 0.08, 0.18));
    const headlineExit = ease(segment(progress, 0.30, 0.42));
    const moveEntrance = ease(segment(progress, 0.26, 0.33));
    const moveExit = ease(segment(progress, 0.46, 0.52));
    const respondEntrance = ease(segment(progress, 0.30, 0.37));
    const respondExit = ease(segment(progress, 0.56, 0.63));
    const remainEntrance = ease(segment(progress, 0.34, 0.41));
    const remainExit = ease(segment(progress, 0.46, 0.52));
    const mobileParallaxScale = window.innerWidth <= 780 ? 0.38 : 1;
    const firstActProgress = segment(progress, 0, 0.46);
    const characterDrift = (firstActProgress - 0.5) * -8 * mobileParallaxScale;

    setStyleValue("--character-opacity", (0.08 + characterEntrance * 0.92).toFixed(3));
    setStyleValue("--character-reveal", `${((1 - characterEntrance) * 100).toFixed(2)}%`);
    setStyleValue("--character-shift-y", `${((1 - characterEntrance) * 1.75).toFixed(3)}rem`);
    setStyleValue("--character-drift-y", `${characterDrift.toFixed(2)}px`);
    setStyleValue("--headline-opacity", (headlineEntrance * (1 - headlineExit)).toFixed(3));
    setStyleValue("--headline-shift", `${((1 - headlineEntrance) * 2).toFixed(3)}rem`);
    setStyleValue("--move-opacity", (moveEntrance * (1 - moveExit)).toFixed(3));
    setStyleValue("--move-shift", `${((1 - moveEntrance) * 1.25).toFixed(3)}rem`);
    setStyleValue("--respond-opacity", (respondEntrance * (1 - respondExit)).toFixed(3));
    setStyleValue("--respond-shift", `${((1 - respondEntrance) * 1.25).toFixed(3)}rem`);
    setStyleValue("--remain-opacity", (remainEntrance * (1 - remainExit)).toFixed(3));
    setStyleValue("--remain-shift", `${((1 - remainEntrance) * 1.25).toFixed(3)}rem`);
  }

  function applyTwoMindsState(progress) {
    const speakTitle = fadeBetween(progress, 0.56, 0.62, 0.76, 0.84, 0.48);
    const speakRequest = fadeBetween(progress, 0.60, 0.65, 0.69, 0.76, 0.3);
    const speakResponse = ease(segment(progress, 0.68, 0.73));
    const actTitle = ease(segment(progress, 0.73, 0.78));
    const actRequest = fadeBetween(progress, 0.79, 0.83, 0.87, 0.93, 0.34);
    const actResult = ease(segment(progress, 0.92, 0.96));

    setStyleValue("--speak-title-opacity", speakTitle.toFixed(3));
    setStyleValue("--speak-title-shift", `${((1 - ease(segment(progress, 0.56, 0.62))) * 1.4).toFixed(3)}rem`);
    setStyleValue("--speak-annotation-opacity", speakRequest.toFixed(3));
    setStyleValue("--speak-request-opacity", speakRequest.toFixed(3));
    setStyleValue("--speak-request-shift", `${((1 - ease(segment(progress, 0.60, 0.65))) * -1).toFixed(3)}rem`);
    setStyleValue("--speak-response-opacity", speakResponse.toFixed(3));
    setStyleValue("--speak-response-shift", `${((1 - speakResponse) * 1).toFixed(3)}rem`);
    setStyleValue("--act-title-opacity", actTitle.toFixed(3));
    setStyleValue("--act-title-shift", `${((1 - actTitle) * 1.4).toFixed(3)}rem`);
    setStyleValue("--act-annotation-opacity", actRequest.toFixed(3));
    setStyleValue("--act-request-opacity", actRequest.toFixed(3));
    setStyleValue("--act-request-shift", `${((1 - ease(segment(progress, 0.79, 0.83))) * -1).toFixed(3)}rem`);
    setStyleValue("--act-result-opacity", actResult.toFixed(3));
    setStyleValue("--act-result-shift", `${((1 - actResult) * 1).toFixed(3)}rem`);
  }

  function calculateTwoMindsRingProgress(progress) {
    if (progress < 0.60) {
      return 0;
    }

    if (progress < 0.65) {
      return 0.28 * segment(progress, 0.60, 0.65);
    }

    if (progress < 0.73) {
      return 0.28 + 0.22 * segment(progress, 0.65, 0.73);
    }

    if (progress < 0.79) {
      return 0.50;
    }

    if (progress < 0.83) {
      return 0.50 + 0.24 * segment(progress, 0.79, 0.83);
    }

    if (progress < 0.92) {
      return 0.74;
    }

    if (progress < 0.96) {
      return 0.74 + 0.18 * segment(progress, 0.92, 0.96);
    }

    return 0.92 + 0.08 * segment(progress, 0.96, 1);
  }

  function renderTwoMindsTaskSignal(progress, isActive) {
    const currentDistance = twoMindsRingLength * progress;
    const currentPoint = twoMindsTaskRing.getPointAtLength(currentDistance);
    const trailLength = twoMindsRingLength * twoMindsTrailLengthRatio;
    const completionFade = 1 - 0.9 * ease(segment(progress, 0.92, 1));

    twoMindsTaskSignal.style.left = `${(currentPoint.x / 10).toFixed(3)}%`;
    twoMindsTaskSignal.style.top = `${(currentPoint.y / 10).toFixed(3)}%`;
    twoMindsTaskSignal.style.opacity = isActive ? "1" : "0";

    twoMindsTrailSegments.forEach((trailSegment, index) => {
      const segmentStartRatio = index / twoMindsTrailSegmentCount;
      const segmentEndRatio = (index + 1) / twoMindsTrailSegmentCount;
      const segmentStartDistance = clamp(
        currentDistance - twoMindsRingDirection * trailLength * (1 - segmentStartRatio),
        0,
        twoMindsRingLength,
      );
      const segmentEndDistance = clamp(
        currentDistance - twoMindsRingDirection * trailLength * (1 - segmentEndRatio),
        0,
        twoMindsRingLength,
      );

      if (!isActive || Math.abs(segmentEndDistance - segmentStartDistance) < 0.01) {
        trailSegment.removeAttribute("d");
        trailSegment.style.opacity = "0";
        return;
      }

      const segmentStart = twoMindsTaskRing.getPointAtLength(segmentStartDistance);
      const segmentEnd = twoMindsTaskRing.getPointAtLength(segmentEndDistance);
      const opacityRamp = Math.pow(segmentEndRatio, 1.7);

      trailSegment.setAttribute(
        "d",
        `M ${segmentStart.x.toFixed(3)} ${segmentStart.y.toFixed(3)} L ${segmentEnd.x.toFixed(3)} ${segmentEnd.y.toFixed(3)}`,
      );
      trailSegment.style.opacity = (0.42 * opacityRamp * completionFade).toFixed(3);
    });

    setStyleValue("--two-minds-ring-progress", progress.toFixed(3));
  }

  function animateTwoMindsTaskRing(timestamp) {
    const animationProgress = clamp(
      (timestamp - twoMindsRingAnimationStartedAt) / twoMindsRingResponseDuration,
    );

    twoMindsRingRenderedProgress =
      twoMindsRingAnimationFrom +
      (twoMindsRingTargetProgress - twoMindsRingAnimationFrom) * animationProgress;
    renderTwoMindsTaskSignal(twoMindsRingRenderedProgress, true);

    if (animationProgress < 1) {
      twoMindsRingAnimationFrame = window.requestAnimationFrame(animateTwoMindsTaskRing);
    } else {
      twoMindsRingAnimationFrame = 0;
    }
  }

  function resetTwoMindsTaskSignal() {
    window.cancelAnimationFrame(twoMindsRingAnimationFrame);
    twoMindsRingAnimationFrame = 0;
    twoMindsRingTargetProgress = 0;
    twoMindsRingRenderedProgress = 0;
    twoMindsRingAnimationFrom = 0;
    twoMindsRingDirection = 1;
    renderTwoMindsTaskSignal(0, false);
  }

  function updateTwoMindsTaskRing(progress) {
    const sectionRect = characterSystem.getBoundingClientRect();
    const isActive = progress >= 0.60 && sectionRect.bottom > 0;
    const nextProgress = isActive ? calculateTwoMindsRingProgress(progress) : 0;

    characterSystem.classList.toggle("is-two-minds-active", isActive);

    if (!isActive) {
      resetTwoMindsTaskSignal();
      return;
    }

    if (Math.abs(nextProgress - twoMindsRingTargetProgress) < 0.0005) {
      renderTwoMindsTaskSignal(twoMindsRingRenderedProgress, true);
      return;
    }

    twoMindsRingDirection = nextProgress >= twoMindsRingRenderedProgress ? 1 : -1;
    twoMindsRingTargetProgress = nextProgress;
    twoMindsRingAnimationFrom = twoMindsRingRenderedProgress;
    twoMindsRingAnimationStartedAt = performance.now();
    window.cancelAnimationFrame(twoMindsRingAnimationFrame);
    twoMindsRingAnimationFrame = window.requestAnimationFrame(animateTwoMindsTaskRing);
  }

  function measureTwoMindsTaskRing() {
    twoMindsRingLength = twoMindsTaskRing.getTotalLength();
    renderTwoMindsTaskSignal(twoMindsRingRenderedProgress, false);
  }

  function handleCharacterShift(progress) {
    const shiftProgress = ease(segment(progress, 0.46, 0.56));
    const isMobile = window.innerWidth <= 780;
    const maximumShift = isMobile
      ? Math.min(12, window.innerWidth * 0.03)
      : Math.min(160, window.innerWidth * 0.09);

    setStyleValue("--character-system-shift-x", `${(-maximumShift * shiftProgress).toFixed(2)}px`);
  }

  function updateBrandTransition(progress) {
    const brandThreshold = narrativeState.brandMarked ? 0.08 : 0.12;
    const shouldShowLogo = progress >= brandThreshold;

    if (shouldShowLogo !== narrativeState.brandMarked) {
      narrativeState.brandMarked = shouldShowLogo;
      siteHeader.classList.toggle("is-brand-marked", shouldShowLogo);
    }

    siteHeader.classList.toggle("is-scrolled", progress > 0.015);
  }

  function updateCharacterSystemNarrative() {
    narrativeState.frameRequested = false;

    narrativeState.characterSystemProgress = calculateCharacterSystemProgress();
    window.CortanaCharacter?.setProgress(
      narrativeState.characterSystemProgress,
      narrativeState.reducedMotion,
    );
    const openingProgress = segment(narrativeState.characterSystemProgress, 0, 0.46);
    updateBrandTransition(openingProgress);

    if (narrativeState.reducedMotion) {
      characterSystem.classList.remove("is-two-minds-active");
      resetTwoMindsTaskSignal();
      return;
    }

    applyCharacterOpeningState(narrativeState.characterSystemProgress);
    applyTwoMindsState(narrativeState.characterSystemProgress);
    updateTwoMindsTaskRing(narrativeState.characterSystemProgress);
    handleCharacterShift(narrativeState.characterSystemProgress);
  }

  function requestCharacterSystemUpdate() {
    if (narrativeState.frameRequested) {
      return;
    }

    narrativeState.frameRequested = true;
    window.requestAnimationFrame(updateCharacterSystemNarrative);
  }

  function clearDesktopCloseTimer() {
    window.clearTimeout(navigationState.closeTimer);
    navigationState.closeTimer = 0;
  }

  function closeAllNavigationMenus({ restoreFocus = false } = {}) {
    clearDesktopCloseTimer();

    desktopNavigationItems.forEach((item) => {
      const trigger = item.querySelector(".site-navigation__trigger");
      const dropdown = item.querySelector(".site-navigation__dropdown");

      item.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      dropdown.setAttribute("aria-hidden", "true");
      dropdown.inert = true;
    });

    if (restoreFocus && navigationState.activeDesktopTrigger) {
      navigationState.activeDesktopTrigger.focus();
    }

    navigationState.activeDesktopTrigger = null;
  }

  function openDesktopNavigationMenu(trigger) {
    const item = trigger.closest(".site-navigation__item");
    const dropdown = item.querySelector(".site-navigation__dropdown");

    if (navigationState.activeDesktopTrigger === trigger) {
      clearDesktopCloseTimer();
      return;
    }

    closeAllNavigationMenus();
    item.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    dropdown.setAttribute("aria-hidden", "false");
    dropdown.inert = false;
    navigationState.activeDesktopTrigger = trigger;
  }

  function scheduleDesktopMenuClose() {
    clearDesktopCloseTimer();
    navigationState.closeTimer = window.setTimeout(() => {
      closeAllNavigationMenus();
    }, 130);
  }

  function lockPageScroll() {
    navigationState.lockedScrollY = window.scrollY;
    document.body.style.top = `-${navigationState.lockedScrollY}px`;
    document.body.classList.add("is-navigation-locked");
  }

  function unlockPageScroll() {
    const restoreScrollY = navigationState.lockedScrollY;

    document.body.classList.remove("is-navigation-locked");
    document.body.style.removeProperty("top");
    window.scrollTo(0, restoreScrollY);
  }

  function closeMobileNavigation({ restoreFocus = false } = {}) {
    if (!navigationState.mobileOpen) {
      return;
    }

    navigationState.mobileOpen = false;
    siteHeader.classList.remove("is-mobile-open");
    mobileNavigationToggle.setAttribute("aria-expanded", "false");
    mobileNavigationToggleLabel.textContent = "MENU";
    mobileNavigation.setAttribute("aria-hidden", "true");
    mobileNavigation.inert = true;

    mobileNavigationTriggers.forEach((trigger) => {
      const panel = document.getElementById(trigger.getAttribute("aria-controls"));
      trigger.setAttribute("aria-expanded", "false");
      panel.hidden = true;
    });

    unlockPageScroll();

    if (restoreFocus) {
      mobileNavigationToggle.focus();
    }
  }

  function openMobileNavigation() {
    closeAllNavigationMenus();
    navigationState.mobileOpen = true;
    siteHeader.classList.add("is-mobile-open");
    mobileNavigationToggle.setAttribute("aria-expanded", "true");
    mobileNavigationToggleLabel.textContent = "CLOSE";
    mobileNavigation.setAttribute("aria-hidden", "false");
    mobileNavigation.inert = false;
    lockPageScroll();
  }

  function initDesktopNavigation() {
    desktopNavigationItems.forEach((item) => {
      const trigger = item.querySelector(".site-navigation__trigger");

      item.addEventListener("mouseenter", () => openDesktopNavigationMenu(trigger));
      item.addEventListener("mouseleave", scheduleDesktopMenuClose);
      item.addEventListener("focusout", (event) => {
        if (!item.contains(event.relatedTarget)) {
          scheduleDesktopMenuClose();
        }
      });

      trigger.addEventListener("click", () => {
        if (trigger.getAttribute("aria-expanded") === "true") {
          closeAllNavigationMenus();
        } else {
          openDesktopNavigationMenu(trigger);
        }
      });
    });
  }

  function initMobileNavigation() {
    mobileNavigationToggle.addEventListener("click", () => {
      if (navigationState.mobileOpen) {
        closeMobileNavigation({ restoreFocus: true });
      } else {
        openMobileNavigation();
      }
    });

    mobileNavigationTriggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const panel = document.getElementById(trigger.getAttribute("aria-controls"));
        const shouldExpand = trigger.getAttribute("aria-expanded") !== "true";

        mobileNavigationTriggers.forEach((otherTrigger) => {
          const otherPanel = document.getElementById(otherTrigger.getAttribute("aria-controls"));
          otherTrigger.setAttribute("aria-expanded", "false");
          otherPanel.hidden = true;
        });

        trigger.setAttribute("aria-expanded", String(shouldExpand));
        panel.hidden = !shouldExpand;
      });
    });
  }

  function initBrandTransition() {
    siteBrand.addEventListener("click", (event) => {
      event.preventDefault();
      closeAllNavigationMenus();
      closeMobileNavigation();
      window.scrollTo({
        top: 0,
        behavior: narrativeState.reducedMotion ? "auto" : "smooth",
      });
    });
  }

  function handleNavigationKeydown(event) {
    if (event.key !== "Escape") {
      return;
    }

    if (navigationState.mobileOpen) {
      closeMobileNavigation({ restoreFocus: true });
    } else {
      closeAllNavigationMenus({ restoreFocus: true });
    }
  }

  function handleDocumentClick(event) {
    if (!desktopNavigation.contains(event.target)) {
      closeAllNavigationMenus();
    }
  }

  function handleSiteScroll() {
    requestCharacterSystemUpdate();
    closeAllNavigationMenus();
  }

  function initSiteHeader() {
    initBrandTransition();
    initDesktopNavigation();
    initMobileNavigation();

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleNavigationKeydown);

    document.querySelectorAll(".site-navigation__dropdown a, .mobile-navigation__panel a").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        closeAllNavigationMenus();
        closeMobileNavigation({ restoreFocus: true });
      });
    });
  }

  function handleResize() {
    narrativeState.viewportHeight = window.innerHeight;
    measureTwoMindsTaskRing();
    closeAllNavigationMenus();
    closeMobileNavigation();
    requestCharacterSystemUpdate();
    window.CortanaCharacter?.resize();
  }

  function handleMotionPreference(event) {
    narrativeState.reducedMotion = event.matches;

    if (!event.matches) {
      measureTwoMindsTaskRing();
      requestCharacterSystemUpdate();
    } else {
      resetTwoMindsTaskSignal();
      characterSystem.classList.remove("is-two-minds-active");
      documentRoot.removeAttribute("style");
    }
  }

  function initCharacterSystemNarrative() {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

    window.addEventListener("scroll", handleSiteScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("pageshow", requestCharacterSystemUpdate);
    motionPreference.addEventListener("change", handleMotionPreference);

    measureTwoMindsTaskRing();
    requestCharacterSystemUpdate();
  }

  initSiteHeader();
  initCharacterSystemNarrative();
})();
