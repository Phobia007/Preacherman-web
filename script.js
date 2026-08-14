(() => {
  "use strict";

  window.lucide?.createIcons();

  const header = document.querySelector(".site-header");
  const brand = document.querySelector(".site-brand");
  const desktopNavigation = document.querySelector(".site-navigation");
  const desktopMenuToggle = document.querySelector(".site-menu-toggle");
  const desktopItems = [...document.querySelectorAll(".site-navigation__item")].filter(
    (item) =>
      item.querySelector(".site-navigation__trigger") &&
      item.querySelector(".site-navigation__dropdown"),
  );
  const mobileNavigation = document.querySelector(".mobile-navigation");
  const mobileToggle = document.querySelector(".mobile-navigation__toggle");
  const mobileToggleLabel = document.querySelector(".mobile-navigation__toggle-label");
  const mobileTriggers = [...document.querySelectorAll(".mobile-navigation__trigger")];
  const languageTriggers = [
    ...document.querySelectorAll(".site-utility-button--language"),
  ];
  const languageOptions = [...document.querySelectorAll(".site-language__option")];
  const loginPanel = document.querySelector(".site-login-panel");
  const loginTriggers = [
    ...document.querySelectorAll(
      ".site-utility-button--login, .navigation-workspace__login-link",
    ),
  ];
  const loginForm = document.querySelector(".login-form");
  const loginEmail = document.querySelector("#login-email");
  const loginPassword = document.querySelector("#login-password");
  const loginVisibility = document.querySelector(".login-form__visibility");
  const loginShowIcon = document.querySelector('[data-login-icon="show"]');
  const loginHideIcon = document.querySelector('[data-login-icon="hide"]');
  const macDownload = document.querySelector(".hero__platform-download--macos");
  const macDownloadTrigger = document.querySelector(".hero__platform-menu-trigger");
  const macDownloadMenu = document.querySelector("#hero-macos-download-menu");
  const macDownloadOptions = [...document.querySelectorAll(".hero__platform-option")];
  const navigationWorkspace = document.querySelector("#navigation-workspace");
  const workspaceMainMenu = navigationWorkspace?.querySelector(
    ".navigation-workspace__main-menu",
  );
  const workspaceMainItems = [
    ...(navigationWorkspace?.querySelectorAll(".navigation-workspace__main-item") || []),
  ];
  const workspaceRail = navigationWorkspace?.querySelector(
    ".navigation-workspace__rail",
  );
  const workspaceRailTitle = navigationWorkspace?.querySelector(
    ".navigation-workspace__title",
  );
  const workspaceMenu = navigationWorkspace?.querySelector(
    ".navigation-workspace__menu",
  );
  const workspaceContent = navigationWorkspace?.querySelector(
    ".navigation-workspace__content",
  );
  const workspaceClose = navigationWorkspace?.querySelector(
    ".navigation-workspace__close",
  );
  const workspaceRootClose = navigationWorkspace?.querySelector(
    ".navigation-workspace__root-close",
  );
  const showcaseSequence = document.querySelector("[data-showcase-sequence]");
  const showcasePanels = [
    ...(showcaseSequence?.querySelectorAll(".showcase-sequence__panel") || []),
  ];
  const revealSections = [
    ...document.querySelectorAll(".statement-section, .site-footer"),
  ];

  if (
    !header ||
    !brand ||
    !desktopNavigation ||
    !desktopMenuToggle ||
    !mobileNavigation ||
    !mobileToggle ||
    !loginPanel ||
    !loginForm ||
    !loginEmail ||
    !loginPassword ||
    !loginVisibility ||
    !macDownload ||
    !macDownloadTrigger ||
    !macDownloadMenu ||
    !navigationWorkspace ||
    !workspaceMainMenu ||
    workspaceMainItems.length === 0 ||
    !workspaceRail ||
    !workspaceRailTitle ||
    !workspaceMenu ||
    !workspaceContent ||
    !workspaceClose ||
    !workspaceRootClose
  ) {
    return;
  }

  let activeDesktopTrigger = null;
  let desktopCloseTimer = 0;
  let desktopMenuOpen = false;
  let mobileOpen = false;
  let currentLanguage = "en";
  let loginOpen = false;
  let activeLoginTrigger = null;
  let macDownloadOpen = false;
  let workspaceOpen = false;
  let workspaceSourceItem = null;
  let workspaceRestoreTrigger = null;
  let workspaceSelectedKey = "";
  let workspaceSectionKey = "";

  function syncHeaderScrollState() {
    header.classList.toggle("is-scrolled", window.scrollY > 4);
  }

  function closeMacDownloadMenu({ restoreFocus = false } = {}) {
    if (!macDownloadOpen) return;

    macDownloadOpen = false;
    macDownload.classList.remove("is-open");
    macDownloadTrigger.setAttribute("aria-expanded", "false");
    macDownloadMenu.setAttribute("aria-hidden", "true");
    macDownloadMenu.inert = true;

    if (restoreFocus) macDownloadTrigger.focus();
  }

  function openMacDownloadMenu() {
    closeDesktopNavigation();
    closeLoginPanel();
    macDownloadOpen = true;
    macDownload.classList.add("is-open");
    macDownloadTrigger.setAttribute("aria-expanded", "true");
    macDownloadMenu.setAttribute("aria-hidden", "false");
    macDownloadMenu.inert = false;
  }

  const translations = {
    en: {
      pageTitle: "Preacherman",
      metaDescription: "The opening scene of the new Preacherman website.",
      brandHome: "Preacherman home",
      primaryNavigation: "Primary navigation",
      mobileNavigation: "Mobile navigation",
      languageAndAccount: "Language and account",
      accountAndMenu: "Account and menu",
      languageOptions: "Language options",
      currentLanguage: "Current language: English",
      navigationWorkspace: "Navigation workspace",
      mainSections: "Main sections",
      sectionNavigation: "Section navigation",
      workspaceContent: "Content area",
      closeNavigationWorkspace: "Close navigation workspace",
      backToMainNavigation: "Back to main navigation",
      englishOption: "English",
      chineseOption: "Chinese",
      language: "LANGUAGE",
      startJourney: "Start Your Journey",
      product: "PRODUCT",
      avatar: "AVATAR",
      propertyList: "Property list",
      gallery: "Gallery",
      personalization: "Personalization",
      memory: "Memory",
      marketplace: "MARKETPLACE",
      characters: "Characters",
      motionPacks: "Motion packs",
      appearancePacks: "Appearance packs",
      newReleases: "New releases",
      featuredCreators: "Featured creators",
      adapters: "ADAPTERS",
      apiList: "API list",
      mcpList: "MCP list",
      cliList: "CLI list",
      subscribeList: "Subscribe list",
      logIn: "Log in",
      loginGateAction: "Log in",
      loginGateSuffix: " to see more.",
      signInDialog: "Sign in",
      email: "Email",
      emailPlaceholder: "Enter your Email",
      password: "Password",
      passwordPlaceholder: "Enter your Password",
      showPassword: "Show password",
      hidePassword: "Hide password",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password?",
      signIn: "Sign In",
      noAccount: "Don't have an account?",
      signUp: "Sign Up",
      orWith: "Or With",
      menuOpen: "MENU",
      menuClose: "CLOSE",
      tryPreacherman: "Try Preacherman",
      tagline: "A Much Easier Intelligence.",
      downloadOptions: "Download options",
      tryWindows: "Download Windows",
      tryMacOS: "Download macOS",
      macDownloadOptions: "macOS download options",
      downloadAppleSilicon: "Download for Apple Silicon",
      downloadIntelMac: "Download for Intel Mac",
      newUpdate: "New Update",
      interactionShowcase: "Interaction style showcase",
      newInteractionStyle: "Brand New Interaction Style",
      stateEngineDecoupled: "State and engine decoupled",
      completionShowcase: "Task completion showcase",
      propertyShowcase: "Digital property showcase",
      ownProperty: "Own Your Things as Property",
      highlyAdaptable: "Highly Adaptable",
      adaptabilityShowcase: "Adaptability showcase",
      statement: "Find and Build a Second You Here.",
      statementWords: ["Find", "and", "Build", "a", "Second", "You", "Here."],
      statementBreakBefore: 3,
      statementUsesSpaces: true,
      footerBrand: "PREACHERMAN",
      footerTagline: "A brand-new way to interact with artificial intelligence",
      copyright: "© 2026 Preacherman. All rights reserved.",
      legal: "Legal",
      privacy: "Privacy",
      terms: "Terms",
      creatorTerms: "Creator terms",
      marketplaceRules: "Marketplace rules",
    },
    zh: {
      pageTitle: "Preacherman｜官方网站",
      metaDescription: "Preacherman 新官方网站首页。",
      brandHome: "Preacherman 首页",
      primaryNavigation: "主导航",
      mobileNavigation: "移动端导航",
      languageAndAccount: "语言与账户",
      accountAndMenu: "账户与菜单",
      languageOptions: "语言选项",
      currentLanguage: "当前语言：中文",
      navigationWorkspace: "导航内容工作区",
      mainSections: "主板块",
      sectionNavigation: "板块导航",
      workspaceContent: "内容区域",
      closeNavigationWorkspace: "关闭导航内容工作区",
      backToMainNavigation: "返回主导航",
      englishOption: "英文",
      chineseOption: "中文",
      language: "语言",
      startJourney: "开启你的旅程",
      product: "产品",
      avatar: "虚拟角色",
      propertyList: "资产列表",
      gallery: "展示库",
      personalization: "个性化",
      memory: "记忆",
      marketplace: "市场",
      characters: "角色",
      motionPacks: "动作包",
      appearancePacks: "外观包",
      newReleases: "最新上架",
      featuredCreators: "精选创作者",
      adapters: "适配器",
      apiList: "API 列表",
      mcpList: "MCP 列表",
      cliList: "CLI 列表",
      subscribeList: "订阅列表",
      logIn: "登录",
      loginGateAction: "登录",
      loginGateSuffix: "查看更多内容。",
      signInDialog: "登录",
      email: "邮箱",
      emailPlaceholder: "请输入邮箱",
      password: "密码",
      passwordPlaceholder: "请输入密码",
      showPassword: "显示密码",
      hidePassword: "隐藏密码",
      rememberMe: "记住我",
      forgotPassword: "忘记密码？",
      signIn: "登录",
      noAccount: "还没有账户？",
      signUp: "注册",
      orWith: "或使用",
      menuOpen: "菜单",
      menuClose: "关闭",
      tryPreacherman: "试一试",
      tagline: "普利彻带来全新的人工智能交互方式",
      downloadOptions: "下载选项",
      tryWindows: "下载 Windows",
      tryMacOS: "下载 macOS",
      macDownloadOptions: "macOS 下载选项",
      downloadAppleSilicon: "下载 Apple Silicon 版本",
      downloadIntelMac: "下载 Intel Mac 版本",
      newUpdate: "全新更新",
      interactionShowcase: "全新交互方式展示",
      newInteractionStyle: "崭新的交互方式",
      stateEngineDecoupled: "状态与引擎解耦",
      completionShowcase: "任务完成方式展示",
      propertyShowcase: "数字资产展示",
      ownProperty: "真正拥有你的数字资产",
      highlyAdaptable: "高适配性",
      adaptabilityShowcase: "适配能力展示",
      statement: "在这里发现并构建第二个你",
      statementWords: ["在这里", "发现", "并", "构建", "第二个", "你"],
      statementBreakBefore: 4,
      statementUsesSpaces: false,
      footerBrand: "普利彻",
      footerTagline: "带来全新的人工智能交互方式",
      copyright: "© 2026 Preacherman。保留所有权利。",
      legal: "法律信息",
      privacy: "隐私政策",
      terms: "使用条款",
      creatorTerms: "创作者条款",
      marketplaceRules: "市场规则",
    },
  };

  function getStoredLanguage() {
    try {
      return window.localStorage.getItem("preacherman-language") === "zh" ? "zh" : "en";
    } catch {
      return "en";
    }
  }

  function storeLanguage(language) {
    try {
      window.localStorage.setItem("preacherman-language", language);
    } catch {
      // The language still changes for the current page when storage is unavailable.
    }
  }

  function renderStaggeredText(element, words, breakBefore, usesSpaces) {
    const fragment = document.createDocumentFragment();

    words.forEach((word, index) => {
      if (index > 0) {
        if (index === breakBefore) {
          const lineBreak = document.createElement("br");
          lineBreak.className = "statement-section__line-break";
          lineBreak.setAttribute("aria-hidden", "true");
          fragment.append(lineBreak);
        } else if (usesSpaces) {
          fragment.append(document.createTextNode(" "));
        }
      }

      const span = document.createElement("span");
      span.className = "statement-section__word";
      span.style.setProperty("--word-index", index);
      span.setAttribute("aria-hidden", "true");
      span.textContent = word;
      fragment.append(span);
    });

    element.replaceChildren(fragment);
  }

  function applyLanguage(language, { persist = true } = {}) {
    currentLanguage = language === "zh" ? "zh" : "en";
    const copy = translations[currentLanguage];

    document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.language = currentLanguage;
    document.title = copy.pageTitle;

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = copy[element.dataset.i18n];
      if (typeof value === "string") element.textContent = value;
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      const value = copy[element.dataset.i18nAriaLabel];
      if (typeof value === "string") element.setAttribute("aria-label", value);
    });

    document.querySelectorAll("[data-i18n-content]").forEach((element) => {
      const value = copy[element.dataset.i18nContent];
      if (typeof value === "string") element.setAttribute("content", value);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = copy[element.dataset.i18nPlaceholder];
      if (typeof value === "string") element.setAttribute("placeholder", value);
    });

    document.querySelectorAll("[data-i18n-stagger]").forEach((element) => {
      const words = copy[element.dataset.i18nStagger];
      if (Array.isArray(words)) {
        renderStaggeredText(
          element,
          words,
          copy.statementBreakBefore,
          copy.statementUsesSpaces,
        );
      }
    });

    languageTriggers.forEach((trigger) => {
      trigger.setAttribute("aria-label", copy.currentLanguage);
    });

    languageOptions.forEach((option) => {
      const isCurrent = option.dataset.language === currentLanguage;
      option.setAttribute("aria-pressed", String(isCurrent));
    });

    mobileToggleLabel.textContent = mobileOpen ? copy.menuClose : copy.menuOpen;
    loginVisibility.setAttribute(
      "aria-label",
      loginPassword.type === "password" ? copy.showPassword : copy.hidePassword,
    );

    if (workspaceOpen && workspaceSourceItem) {
      populateNavigationWorkspace(workspaceSourceItem, workspaceSelectedKey);
    } else if (workspaceOpen && workspaceSectionKey === "language") {
      populateLanguageWorkspace();
    }

    if (persist) storeLanguage(currentLanguage);
  }

  function closeDesktopMenus({ restoreFocus = false } = {}) {
    window.clearTimeout(desktopCloseTimer);
    desktopCloseTimer = 0;

    desktopItems.forEach((item) => {
      const trigger = item.querySelector(".site-navigation__trigger");
      const dropdown = item.querySelector(".site-navigation__dropdown");

      item.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      dropdown.setAttribute("aria-hidden", "true");
      dropdown.inert = true;
    });

    if (restoreFocus) activeDesktopTrigger?.focus();
    activeDesktopTrigger = null;
  }

  function closeDesktopNavigation({ restoreFocus = false } = {}) {
    if (!desktopMenuOpen) return;

    desktopMenuOpen = false;
    closeDesktopMenus();
    header.classList.remove("is-desktop-menu-open");
    desktopMenuToggle.setAttribute("aria-expanded", "false");
    desktopNavigation.setAttribute("aria-hidden", "true");
    desktopNavigation.inert = true;

    if (restoreFocus) desktopMenuToggle.focus();
  }

  function openDesktopNavigation() {
    closeLoginPanel();
    closeMacDownloadMenu();
    desktopMenuOpen = true;
    header.classList.add("is-desktop-menu-open");
    desktopMenuToggle.setAttribute("aria-expanded", "true");
    desktopNavigation.setAttribute("aria-hidden", "false");
    desktopNavigation.inert = false;
  }

  function setWorkspaceSelection(selectedKey) {
    workspaceSelectedKey = selectedKey;
    workspaceContent.dataset.selection = selectedKey;
    workspaceContent.classList.toggle(
      "has-login-gate",
      Boolean(selectedKey) &&
        selectedKey !== "product" &&
        workspaceSectionKey !== "language",
    );

    workspaceMenu.querySelectorAll(".navigation-workspace__item").forEach((item) => {
      const isActive = item.dataset.workspaceKey === selectedKey;
      item.classList.toggle("is-active", isActive);
      if (isActive) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
  }

  function setWorkspaceMainSelection(sectionKey) {
    workspaceSectionKey = sectionKey;

    workspaceMainItems.forEach((item) => {
      const isActive = item.dataset.workspaceSection === sectionKey;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-expanded", String(isActive && sectionKey !== "product"));
    });
  }

  function mountWorkspaceSectionRail(sectionKey = workspaceSectionKey) {
    if (window.matchMedia("(max-width: 960px)").matches) {
      navigationWorkspace.insertBefore(workspaceRail, workspaceContent);
      return;
    }

    const activeMainItem = workspaceMainItems.find(
      (item) => item.dataset.workspaceSection === sectionKey,
    );

    if (activeMainItem) activeMainItem.insertAdjacentElement("afterend", workspaceRail);
    else workspaceMainMenu.append(workspaceRail);
  }

  function restartWorkspaceItemStagger() {
    workspaceRail.classList.add("is-populating");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        workspaceRail.classList.remove("is-populating");
      });
    });
  }

  function findDesktopItemForSection(sectionKey) {
    return desktopItems.find(
      (item) =>
        item.querySelector(".site-navigation__trigger [data-i18n]")?.dataset.i18n ===
        sectionKey,
    );
  }

  function populateNavigationWorkspace(item, selectedKey) {
    const triggerLabel = item.querySelector(".site-navigation__trigger [data-i18n]");
    const dropdown = item.querySelector(".site-navigation__dropdown");
    const sectionKey = triggerLabel?.dataset.i18n;
    const links = [...dropdown.querySelectorAll("a[data-i18n]")];

    setWorkspaceMainSelection(sectionKey || "");
    mountWorkspaceSectionRail(sectionKey || "");

    workspaceRailTitle.dataset.i18n = sectionKey || "";
    workspaceRailTitle.textContent =
      translations[currentLanguage][sectionKey] || triggerLabel?.textContent || "";
    workspaceRail.classList.add("is-populating");
    workspaceMenu.replaceChildren();

    links.forEach((sourceLink, index) => {
      const key = sourceLink.dataset.i18n;
      const button = document.createElement("button");
      const label = document.createElement("span");
      const icon = document.createElement("i");

      button.className = "navigation-workspace__item";
      button.type = "button";
      button.dataset.workspaceKey = key;
      button.style.setProperty("--workspace-item-index", index);
      label.dataset.i18n = key;
      label.textContent = translations[currentLanguage][key] || sourceLink.textContent.trim();
      icon.dataset.lucide = "chevron-right";
      icon.setAttribute("aria-hidden", "true");
      button.append(label, icon);
      button.addEventListener("click", () => setWorkspaceSelection(key));
      workspaceMenu.append(button);
    });

    const hasExplicitSelection = links.some(
      (link) => link.dataset.i18n === selectedKey,
    );
    setWorkspaceSelection(hasExplicitSelection ? selectedKey : "");
    restartWorkspaceItemStagger();
    window.lucide?.createIcons();
  }

  function populateLanguageWorkspace() {
    const options = [
      { key: "englishOption", language: "en" },
      { key: "chineseOption", language: "zh" },
    ];

    workspaceSourceItem = null;
    setWorkspaceMainSelection("language");
    mountWorkspaceSectionRail("language");
    workspaceRailTitle.dataset.i18n = "language";
    workspaceRailTitle.textContent = translations[currentLanguage].language;
    workspaceRail.classList.add("is-populating");
    workspaceMenu.replaceChildren();

    options.forEach(({ key, language }, index) => {
      const button = document.createElement("button");
      const label = document.createElement("span");

      button.className = "navigation-workspace__item";
      button.type = "button";
      button.dataset.workspaceKey = language;
      button.style.setProperty("--workspace-item-index", index);
      label.dataset.i18n = key;
      label.textContent = translations[currentLanguage][key];
      button.append(label);

      if (language === currentLanguage) {
        const icon = document.createElement("i");
        icon.dataset.lucide = "check";
        icon.setAttribute("aria-hidden", "true");
        button.append(icon);
      }
      button.addEventListener("click", () => {
        applyLanguage(language);
        setWorkspaceSelection(language);
      });
      workspaceMenu.append(button);
    });

    setWorkspaceSelection("");
    restartWorkspaceItemStagger();
    window.lucide?.createIcons();
  }

  function showWorkspaceSection(sectionKey, selectedKey = "") {
    if (sectionKey === "product") {
      workspaceSourceItem = null;
      setWorkspaceMainSelection("product");
      setWorkspaceSelection("product");
      navigationWorkspace.classList.remove("has-section");
      workspaceMainMenu.append(workspaceRail);
      return;
    }

    if (sectionKey === "language") {
      populateLanguageWorkspace();
    } else {
      const item = findDesktopItemForSection(sectionKey);
      if (!item) return;
      workspaceSourceItem = item;
      populateNavigationWorkspace(item, selectedKey);
    }

    navigationWorkspace.classList.add("has-section");
  }

  function returnWorkspaceToRoot() {
    navigationWorkspace.classList.remove("has-section");
    workspaceSourceItem = null;
    workspaceSelectedKey = "";
    workspaceContent.dataset.selection = "";
    workspaceContent.classList.remove("has-login-gate");
    setWorkspaceMainSelection("");
    workspaceMainMenu.append(workspaceRail);
    window.requestAnimationFrame(() => workspaceMainItems[0]?.focus());
  }

  function closeNavigationWorkspace({ restoreFocus = false } = {}) {
    if (!workspaceOpen) return;

    workspaceOpen = false;
    navigationWorkspace.classList.remove("is-open", "has-section");
    navigationWorkspace.setAttribute("aria-hidden", "true");
    navigationWorkspace.inert = true;
    document.body.classList.remove("is-navigation-workspace-open");

    if (restoreFocus) workspaceRestoreTrigger?.focus();
    workspaceSourceItem = null;
    workspaceRestoreTrigger = null;
    workspaceSectionKey = "";
    workspaceSelectedKey = "";
    workspaceContent.dataset.selection = "";
    workspaceContent.classList.remove("has-login-gate");
    desktopMenuToggle.setAttribute("aria-expanded", "false");
  }

  function revealNavigationWorkspace(focusTarget) {
    closeDesktopNavigation();
    closeMobileMenu();
    closeLoginPanel();
    closeMacDownloadMenu();
    workspaceOpen = true;
    navigationWorkspace.setAttribute("aria-hidden", "false");
    navigationWorkspace.inert = false;
    document.body.classList.add("is-navigation-workspace-open");
    desktopMenuToggle.setAttribute("aria-expanded", "true");
    void navigationWorkspace.offsetWidth;
    navigationWorkspace.classList.add("is-open");
    window.requestAnimationFrame(() => focusTarget?.focus());
  }

  function openNavigationMenuWorkspace() {
    workspaceRestoreTrigger = desktopMenuToggle;
    returnWorkspaceToRoot();
    revealNavigationWorkspace(workspaceMainItems[0]);
  }

  function openNavigationWorkspace(item, selectedKey) {
    const trigger = item.querySelector(".site-navigation__trigger");

    workspaceSourceItem = item;
    workspaceRestoreTrigger = trigger;
    populateNavigationWorkspace(item, selectedKey);
    navigationWorkspace.classList.add("has-section");
    revealNavigationWorkspace(
      workspaceMainItems.find(
        (mainItem) => mainItem.dataset.workspaceSection === workspaceSectionKey,
      ),
    );
  }

  function closeLoginPanel({ restoreFocus = false } = {}) {
    if (!loginOpen) return;

    loginOpen = false;
    document.body.classList.remove("is-login-panel-open");
    loginPanel.classList.remove("is-open");
    loginPanel.setAttribute("aria-hidden", "true");
    loginPanel.inert = true;
    loginTriggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));

    if (restoreFocus) activeLoginTrigger?.focus();
    activeLoginTrigger = null;
  }

  function openLoginPanel(trigger) {
    closeDesktopNavigation();
    closeMobileMenu();
    closeMacDownloadMenu();
    loginOpen = true;
    document.body.classList.add("is-login-panel-open");
    activeLoginTrigger = trigger.closest(".mobile-navigation") ? mobileToggle : trigger;
    loginPanel.classList.add("is-open");
    loginPanel.setAttribute("aria-hidden", "false");
    loginPanel.inert = false;
    loginTriggers.forEach((loginTrigger) =>
      loginTrigger.setAttribute("aria-expanded", "true"),
    );
    window.requestAnimationFrame(() => loginEmail.focus());
  }

  function openDesktopMenu(trigger) {
    const item = trigger.closest(".site-navigation__item");
    const dropdown = item.querySelector(".site-navigation__dropdown");

    closeLoginPanel();
    closeMacDownloadMenu();
    closeDesktopMenus();
    item.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    dropdown.setAttribute("aria-hidden", "false");
    dropdown.inert = false;
    activeDesktopTrigger = trigger;
  }

  function scheduleDesktopClose() {
    window.clearTimeout(desktopCloseTimer);
    desktopCloseTimer = window.setTimeout(closeDesktopMenus, 130);
  }

  function closeMobileMenu({ restoreFocus = false } = {}) {
    if (!mobileOpen) return;

    mobileOpen = false;
    header.classList.remove("is-mobile-open");
    mobileToggle.setAttribute("aria-expanded", "false");
    mobileToggleLabel.textContent = translations[currentLanguage].menuOpen;
    mobileNavigation.setAttribute("aria-hidden", "true");
    mobileNavigation.inert = true;
    document.body.classList.remove("is-navigation-locked");
    document.body.style.removeProperty("top");

    mobileTriggers.forEach((trigger) => {
      const panel = document.getElementById(trigger.getAttribute("aria-controls"));
      trigger.setAttribute("aria-expanded", "false");
      panel.hidden = true;
    });

    if (restoreFocus) mobileToggle.focus();
  }

  function openMobileMenu() {
    closeDesktopNavigation();
    closeLoginPanel();
    closeMacDownloadMenu();
    mobileOpen = true;
    header.classList.add("is-mobile-open");
    mobileToggle.setAttribute("aria-expanded", "true");
    mobileToggleLabel.textContent = translations[currentLanguage].menuClose;
    mobileNavigation.setAttribute("aria-hidden", "false");
    mobileNavigation.inert = false;
    document.body.classList.add("is-navigation-locked");
  }

  applyLanguage(getStoredLanguage(), { persist: false });
  syncHeaderScrollState();

  window.addEventListener("scroll", syncHeaderScrollState, { passive: true });

  languageOptions.forEach((option) => {
    option.addEventListener("click", () => {
      applyLanguage(option.dataset.language === "zh" ? "zh" : "en");
      closeDesktopNavigation();
      option.blur();
    });
  });

  loginTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      if (trigger.classList.contains("navigation-workspace__login-link")) {
        event.stopPropagation();
        const headerLoginTrigger = loginTriggers.find(
          (candidate) =>
            candidate !== trigger &&
            candidate.classList.contains("site-utility-button--login") &&
            !candidate.closest(".mobile-navigation"),
        );

        closeNavigationWorkspace();
        openLoginPanel(headerLoginTrigger || trigger);
        return;
      }

      if (loginOpen) closeLoginPanel({ restoreFocus: true });
      else openLoginPanel(trigger);
    });
  });

  desktopMenuToggle.addEventListener("click", () => {
    if (workspaceOpen) closeNavigationWorkspace({ restoreFocus: true });
    else openNavigationMenuWorkspace();
  });

  macDownloadTrigger.addEventListener("click", () => {
    if (macDownloadOpen) closeMacDownloadMenu({ restoreFocus: true });
    else openMacDownloadMenu();
  });

  macDownloadOptions.forEach((option) => {
    option.addEventListener("click", () => closeMacDownloadMenu());
  });

  loginVisibility.addEventListener("click", () => {
    const shouldShow = loginPassword.type === "password";
    loginPassword.type = shouldShow ? "text" : "password";
    if (loginShowIcon) loginShowIcon.hidden = shouldShow;
    if (loginHideIcon) loginHideIcon.hidden = !shouldShow;
    loginVisibility.setAttribute(
      "aria-label",
      shouldShow
        ? translations[currentLanguage].hidePassword
        : translations[currentLanguage].showPassword,
    );
    loginPassword.focus();
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginForm.reportValidity();
  });

  desktopItems.forEach((item) => {
    const trigger = item.querySelector(".site-navigation__trigger");
    const dropdownLinks = [...item.querySelectorAll(".site-navigation__dropdown a")];

    item.addEventListener("mouseenter", () => openDesktopMenu(trigger));
    item.addEventListener("mouseleave", scheduleDesktopClose);
    item.addEventListener("focusout", (event) => {
      if (!item.contains(event.relatedTarget)) scheduleDesktopClose();
    });
    trigger.addEventListener("click", () => {
      if (trigger.getAttribute("aria-expanded") === "true") closeDesktopMenus();
      else openDesktopMenu(trigger);
    });

    dropdownLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openNavigationWorkspace(item, link.dataset.i18n || "");
      });
    });
  });

  document.querySelectorAll(".mobile-navigation__panel a[data-i18n]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const panel = link.closest(".mobile-navigation__panel");
      const desktopMenuId = panel?.id.replace("mobile-", "");
      const item = desktopItems.find(
        (desktopItem) =>
          desktopItem.querySelector(".site-navigation__dropdown")?.id === desktopMenuId,
      );

      if (!item) return;
      event.preventDefault();
      openNavigationWorkspace(item, link.dataset.i18n || "");
    });
  });

  workspaceMainItems.forEach((item) => {
    item.addEventListener("click", () => {
      const sectionKey = item.dataset.workspaceSection || "";
      const isCurrentSectionOpen =
        navigationWorkspace.classList.contains("has-section") &&
        workspaceSectionKey === sectionKey;

      if (isCurrentSectionOpen) {
        returnWorkspaceToRoot();
        item.focus();
        return;
      }

      showWorkspaceSection(sectionKey);
      if (navigationWorkspace.classList.contains("has-section")) {
        window.requestAnimationFrame(() =>
          workspaceMenu.querySelector(".navigation-workspace__item")?.focus(),
        );
      }
    });
  });

  workspaceClose.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 960px)").matches) {
      closeNavigationWorkspace({ restoreFocus: true });
    } else {
      returnWorkspaceToRoot();
    }
  });

  workspaceRootClose.addEventListener("click", () => {
    closeNavigationWorkspace({ restoreFocus: true });
  });

  window.addEventListener(
    "resize",
    () => {
      if (!workspaceOpen) return;
      mountWorkspaceSectionRail(workspaceSectionKey);
    },
    { passive: true },
  );

  mobileToggle.addEventListener("click", () => {
    if (mobileOpen) closeMobileMenu({ restoreFocus: true });
    else openMobileMenu();
  });

  mobileTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const panel = document.getElementById(trigger.getAttribute("aria-controls"));
      const shouldExpand = trigger.getAttribute("aria-expanded") !== "true";

      mobileTriggers.forEach((otherTrigger) => {
        const otherPanel = document.getElementById(otherTrigger.getAttribute("aria-controls"));
        otherTrigger.setAttribute("aria-expanded", "false");
        otherPanel.hidden = true;
      });

      trigger.setAttribute("aria-expanded", String(shouldExpand));
      panel.hidden = !shouldExpand;
    });
  });

  brand.addEventListener("click", (event) => {
    event.preventDefault();
    closeDesktopNavigation();
    closeMobileMenu();
  });

  document.addEventListener("click", (event) => {
    if (!desktopNavigation.contains(event.target)) closeDesktopMenus();
    if (
      desktopMenuOpen &&
      !desktopNavigation.contains(event.target) &&
      !desktopMenuToggle.contains(event.target)
    ) {
      closeDesktopNavigation();
    }
    if (macDownloadOpen && !macDownload.contains(event.target)) closeMacDownloadMenu();
    if (
      loginOpen &&
      !loginPanel.contains(event.target) &&
      !event.target.closest?.(
        ".site-utility-button--login, .navigation-workspace__login-link",
      )
    ) {
      closeLoginPanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (workspaceOpen && event.key === "Tab") {
      const focusable = [
        ...navigationWorkspace.querySelectorAll(
          "button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      ].filter((element) => !element.hidden);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (first && last) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }

    if (event.key !== "Escape") return;
    if (workspaceOpen) closeNavigationWorkspace({ restoreFocus: true });
    else if (macDownloadOpen) closeMacDownloadMenu({ restoreFocus: true });
    else if (loginOpen) closeLoginPanel({ restoreFocus: true });
    else if (mobileOpen) closeMobileMenu({ restoreFocus: true });
    else if (activeDesktopTrigger) closeDesktopMenus({ restoreFocus: true });
    else if (desktopMenuOpen) closeDesktopNavigation({ restoreFocus: true });
  });

  document
    .querySelectorAll(
      ".site-navigation__link, .site-navigation__dropdown a, .mobile-navigation__link, .mobile-navigation__panel a",
    )
    .forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        closeDesktopMenus();
        closeDesktopNavigation();
        closeMobileMenu({ restoreFocus: true });
      });
    });

  window.addEventListener("resize", () => {
    closeDesktopNavigation();
    closeMobileMenu();
    closeLoginPanel();
    closeMacDownloadMenu();
    closeNavigationWorkspace();
  });

  if (showcaseSequence && showcasePanels.length) {
    let activeShowcaseIndex = 0;
    let showcaseFrame = 0;

    const setActiveShowcase = (nextIndex) => {
      const clampedIndex = Math.min(
        showcasePanels.length - 1,
        Math.max(0, nextIndex),
      );

      if (clampedIndex === activeShowcaseIndex) return;

      showcasePanels[activeShowcaseIndex]?.classList.remove("is-active");
      showcasePanels[clampedIndex]?.classList.add("is-active");
      activeShowcaseIndex = clampedIndex;
    };

    const updateShowcaseSequence = () => {
      showcaseFrame = 0;

      const bounds = showcaseSequence.getBoundingClientRect();
      const scrollRange = Math.max(1, bounds.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -bounds.top / scrollRange));
      const nextIndex = Math.min(
        showcasePanels.length - 1,
        Math.floor(progress * showcasePanels.length),
      );

      setActiveShowcase(nextIndex);
    };

    const scheduleShowcaseUpdate = () => {
      if (showcaseFrame) return;
      showcaseFrame = window.requestAnimationFrame(updateShowcaseSequence);
    };

    window.addEventListener("scroll", scheduleShowcaseUpdate, { passive: true });
    window.addEventListener("resize", scheduleShowcaseUpdate);
    updateShowcaseSequence();
  }

  if (revealSections.length) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
      revealSections.forEach((section) => section.classList.add("is-reveal-ready"));

      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        {
          threshold: 0.22,
          rootMargin: "0px 0px -8% 0px",
        },
      );

      revealSections.forEach((section) => revealObserver.observe(section));
    } else {
      revealSections.forEach((section) => section.classList.add("is-visible"));
    }
  }
})();
