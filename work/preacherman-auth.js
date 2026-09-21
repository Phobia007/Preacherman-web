(() => {
  "use strict";

  const form = document.querySelector(".login-form");
  if (!form || window.__preachermanAuthInitialized) return;
  window.__preachermanAuthInitialized = true;

  const email = form.querySelector("#login-email");
  const password = form.querySelector("#login-password");
  const emailField = email.closest(".login-form__field");
  const passwordField = password.closest(".login-form__field");
  const options = form.querySelector(".login-form__options");
  const remember = form.querySelector('input[name="remember"]');
  const forgot = options.querySelector(".login-form__text-action");
  const submit = form.querySelector(".login-form__submit");
  const prompt = form.querySelector(".login-form__prompt");
  const promptText = prompt.querySelector("span");
  const switchModeButton = prompt.querySelector("button");
  const divider = form.querySelector(".login-form__divider");
  const socials = form.querySelector(".login-form__socials");
  const socialButtons = socials.querySelectorAll(".login-form__social");
  const panel = document.querySelector("#site-login-panel");
  const triggers = [...document.querySelectorAll(".site-utility-button--login")];

  const confirmField = document.createElement("div");
  confirmField.className = "login-form__field login-form__confirm";
  confirmField.hidden = true;
  confirmField.innerHTML = `
    <label for="register-password-confirm">Confirm Password</label>
    <div class="login-form__input-shell">
      <svg class="login-form__input-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 13c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V5l8-3 8 3v8Z"/><path d="m9 12 2 2 4-4"/></svg>
      <input id="register-password-confirm" class="login-form__input" name="password_confirm" type="password" autocomplete="new-password" placeholder="Enter your Password again" minlength="15" maxlength="128" />
    </div>`;
  passwordField.after(confirmField);
  const confirmPassword = confirmField.querySelector("input");

  const countryDialCodes = `
CN|86
HK|852
MO|853
TW|886
US|1
CA|1
GB|44
AF|93
AL|355
DZ|213
AD|376
AO|244
AG|1268
AR|54
AM|374
AU|61
AT|43
AZ|994
BS|1242
BH|973
BD|880
BB|1246
BY|375
BE|32
BZ|501
BJ|229
BT|975
BO|591
BA|387
BW|267
BR|55
BN|673
BG|359
BF|226
BI|257
CV|238
KH|855
CM|237
CF|236
TD|235
CL|56
CO|57
KM|269
CG|242
CD|243
CR|506
CI|225
HR|385
CU|53
CY|357
CZ|420
DK|45
DJ|253
DM|1767
DO|1809
EC|593
EG|20
SV|503
GQ|240
ER|291
EE|372
SZ|268
ET|251
FJ|679
FI|358
FR|33
GA|241
GM|220
GE|995
DE|49
GH|233
GR|30
GD|1473
GT|502
GN|224
GW|245
GY|592
HT|509
HN|504
HU|36
IS|354
IN|91
ID|62
IR|98
IQ|964
IE|353
IL|972
IT|39
JM|1876
JP|81
JO|962
KZ|7
KE|254
KI|686
KP|850
KR|82
KW|965
KG|996
LA|856
LV|371
LB|961
LS|266
LR|231
LY|218
LI|423
LT|370
LU|352
MG|261
MW|265
MY|60
MV|960
ML|223
MT|356
MH|692
MR|222
MU|230
MX|52
FM|691
MD|373
MC|377
MN|976
ME|382
MA|212
MZ|258
MM|95
NA|264
NR|674
NP|977
NL|31
NZ|64
NI|505
NE|227
NG|234
MK|389
NO|47
OM|968
PK|92
PW|680
PS|970
PA|507
PG|675
PY|595
PE|51
PH|63
PL|48
PT|351
QA|974
RO|40
RU|7
RW|250
KN|1869
LC|1758
VC|1784
WS|685
SM|378
ST|239
SA|966
SN|221
RS|381
SC|248
SL|232
SG|65
SK|421
SI|386
SB|677
SO|252
ZA|27
SS|211
ES|34
LK|94
SD|249
SR|597
SE|46
CH|41
SY|963
TJ|992
TZ|255
TH|66
TL|670
TG|228
TO|676
TT|1868
TN|216
TR|90
TM|993
TV|688
UG|256
UA|380
AE|971
UY|598
UZ|998
VU|678
VA|39
VE|58
VN|84
YE|967
ZM|260
ZW|263
AI|1264
AW|297
BM|1441
VG|1284
KY|1345
CW|599
FK|500
FO|298
GF|594
PF|689
GI|350
GL|299
GP|590
GU|1671
IM|44
JE|44
GG|44
MQ|596
MS|1664
NC|687
MP|1670
PR|1787
RE|262
SX|1721
TC|1649
VI|1340
WF|681
YT|262
XK|383
`.trim().split("\n").map((entry) => entry.split("|"));
  const regionNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames([document.documentElement.lang || "en"], { type: "region" })
    : null;
  const regionLabel = (region) => {
    try {
      return regionNames?.of(region) || region;
    } catch {
      return region;
    }
  };

  const phoneField = document.createElement("div");
  phoneField.className = "login-form__field login-form__phone";
  phoneField.hidden = true;
  phoneField.innerHTML = `
    <label for="login-phone-number">Phone number</label>
    <div class="login-form__input-shell login-form__phone-shell">
      <span class="login-form__country-picker">
        <span class="login-form__country-prefix" aria-hidden="true">+86</span>
        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m6 8 4 4 4-4"/></svg>
        <select id="login-phone-country" aria-label="Country or region code"></select>
      </span>
      <span class="login-form__phone-divider" aria-hidden="true"></span>
      <input id="login-phone-number" class="login-form__input" name="phone" type="tel" autocomplete="tel-national" inputmode="tel" placeholder="Enter your phone number" pattern="[0-9 ()-]{4,20}" maxlength="20" />
    </div>`;

  const codeField = document.createElement("div");
  codeField.className = "login-form__field login-form__verification";
  codeField.hidden = true;
  codeField.innerHTML = `
    <label for="login-phone-code">Verification code</label>
    <div class="login-form__input-shell login-form__code-shell">
      <svg class="login-form__input-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
      <input id="login-phone-code" class="login-form__input" name="phone_code" type="text" autocomplete="one-time-code" inputmode="numeric" placeholder="Enter verification code" pattern="[0-9]{4,8}" maxlength="8" />
      <button class="login-form__get-code" type="button">Get code</button>
    </div>`;
  confirmField.after(phoneField, codeField);

  const countrySelect = phoneField.querySelector("select");
  const countryPrefix = phoneField.querySelector(".login-form__country-prefix");
  const phoneNumber = phoneField.querySelector("#login-phone-number");
  const verificationCode = codeField.querySelector("#login-phone-code");
  const getCode = codeField.querySelector(".login-form__get-code");
  for (const [region, dialCode] of countryDialCodes) {
    const option = document.createElement("option");
    option.value = `+${dialCode}`;
    option.dataset.region = region;
    option.textContent = `${regionLabel(region)} (+${dialCode})`;
    countrySelect.append(option);
  }

  const methodSwitch = document.createElement("p");
  methodSwitch.className = "login-form__method-switch";
  methodSwitch.innerHTML = '<button class="login-form__text-action" type="button">Use phone number</button>';
  const methodSwitchButton = methodSwitch.querySelector("button");

  const status = document.createElement("p");
  status.className = "login-form__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  submit.before(status);
  status.before(methodSwitch);

  const scanCorner = document.createElement("button");
  scanCorner.className = "login-scan-corner";
  scanCorner.type = "button";
  scanCorner.setAttribute("aria-label", "Use scan code sign in");
  scanCorner.setAttribute("aria-controls", "login-scan-panel");
  scanCorner.setAttribute("aria-expanded", "false");
  scanCorner.innerHTML = `
    <svg class="login-scan-corner__qr" aria-hidden="true" viewBox="0 0 40 40">
      <path d="M2 2h14v14H2V2Zm4 4v6h6V6H6Zm14-4h8v4h-4v4h-4V2Zm12 0h6v6h-6V2Zm-12 12h6v6h-6v-6Zm10-2h8v10h-4v-4h-4v-6Zm-14 12h6v6h-6v-6Zm10 0h4v4h-4v-4Zm8 2h4v12H26v-4h8v-8Z"/>
    </svg>`;

  const scanPanel = document.createElement("section");
  scanPanel.id = "login-scan-panel";
  scanPanel.className = "login-scan";
  scanPanel.hidden = true;
  scanPanel.setAttribute("aria-labelledby", "login-scan-title");
  scanPanel.innerHTML = `
    <p class="login-scan__eyebrow">Scan to sign in</p>
    <h2 id="login-scan-title" class="login-scan__title">Email</h2>
    <div class="login-scan__tabs" role="tablist" aria-label="Scan sign-in method">
      <button type="button" role="tab" aria-selected="true" data-scan-channel="email">Email</button>
      <button type="button" role="tab" aria-selected="false" data-scan-channel="wechat">WeChat</button>
    </div>
    <div class="login-scan__code" data-scan-code="email" aria-label="Local QR code placeholder">
      <svg aria-hidden="true" viewBox="0 0 120 120">
        <rect width="120" height="120" rx="5" fill="currentColor" opacity="0.04"/>
        <g fill="currentColor">
          <path fill-rule="evenodd" d="M8 8h32v32H8V8Zm6 6v20h20V14H14Zm5 5h10v10H19V19ZM80 8h32v32H80V8Zm6 6v20h20V14H86Zm5 5h10v10H91V19ZM8 80h32v32H8V80Zm6 6v20h20V86H14Zm5 5h10v10H19V91Z"/>
          <path d="M48 8h8v8h-8zM64 8h8v16h-8zM48 24h16v8H48zM56 40h8v8h-8zM72 48h8v8h-8zM88 48h24v8H88zM8 48h16v8H8zM32 48h8v16h-8zM16 64h16v8H16zM48 64h8v16h-8zM64 64h8v8h-8zM80 64h8v16h-8zM96 64h16v8H96zM48 88h8v24h-8zM64 80h16v8H64zM64 96h8v16h-8zM80 88h8v16h-8zM96 80h16v8H96zM96 96h8v16h-8z"/>
        </g>
        <rect x="45" y="45" width="30" height="30" rx="7" fill="var(--page-bg)"/>
        <text class="login-scan__code-mark" x="60" y="65" text-anchor="middle">@</text>
      </svg>
    </div>
    <p class="login-scan__instruction">Open your email app and scan this code to sign in.</p>
    <p class="login-scan__status" role="status" aria-live="polite">${unavailable()}</p>
    <button class="login-form__text-action login-scan__back" type="button">Use email and password</button>`;
  panel.append(scanCorner, scanPanel);

  const scanTitle = scanPanel.querySelector(".login-scan__title");
  const scanTabs = [...scanPanel.querySelectorAll('[role="tab"]')];
  const scanCode = scanPanel.querySelector(".login-scan__code");
  const scanCodeMark = scanPanel.querySelector(".login-scan__code-mark");
  const scanInstruction = scanPanel.querySelector(".login-scan__instruction");
  const scanStatus = scanPanel.querySelector(".login-scan__status");
  const scanBack = scanPanel.querySelector(".login-scan__back");

  let mode = "login";
  let currentUser = null;
  let phoneReturnMode = "login";
  let scanReturnMode = "login";
  let scanOpen = false;
  let client = null;
  let busy = false;
  let identityRevision = 0;
  let verificationTimer;
  function unavailable() {
    return document.documentElement.dataset.language === "zh"
      ? "本轮测试暂未开放。" : "Not available in this test.";
  }
  const temporaryError = "暂时无法连接认证服务，请检查网络后重试。 / Authentication service is temporarily unavailable. Please retry.";
  let setupError = "";

  remember.checked = true;
  remember.disabled = true;
  remember.parentElement.title = "Supabase persistent session; sign out to end this session.";

  function message(text, kind = "info") {
    status.textContent = text;
    status.dataset.kind = kind;
  }

  function setBusy(value) {
    busy = value;
    submit.disabled = value;
    switchModeButton.disabled = value;
    methodSwitchButton.disabled = value;
    getCode.disabled = value;
    scanCorner.disabled = value;
    submit.setAttribute("aria-busy", String(value));
  }

  function setScanChannel(channel) {
    const wechat = channel === "wechat";
    for (const tab of scanTabs) {
      tab.setAttribute("aria-selected", String(tab.dataset.scanChannel === channel));
    }
    scanTitle.textContent = wechat ? "WeChat" : "Email";
    scanCode.dataset.scanCode = channel;
    scanCodeMark.textContent = wechat ? "WX" : "@";
    scanInstruction.textContent = wechat
      ? "Open WeChat and scan this code to sign in."
      : "Open your email app and scan this code to sign in.";
    scanStatus.textContent = unavailable();
  }

  function setScanOpen(open) {
    scanOpen = open;
    form.hidden = open;
    scanPanel.hidden = !open;
    scanCorner.classList.toggle("is-scan-open", open);
    scanCorner.setAttribute("aria-expanded", String(open));
    scanCorner.setAttribute("aria-label", open ? "Return to email and password sign in" : "Use scan code sign in");
    if (open) {
      scanReturnMode = mode === "account" ? "login" : mode;
      panel.setAttribute("aria-label", "Scan to sign in");
      scanTabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.focus();
    } else {
      setMode(scanReturnMode);
      (scanReturnMode === "phone" ? phoneNumber : email).focus();
    }
  }

  function setMode(next, notice = "") {
    mode = next;
    const registering = next === "register";
    const account = next === "account";
    const phone = next === "phone";
    if (!phone && !account) phoneReturnMode = next;
    emailField.hidden = account || phone;
    passwordField.hidden = account || phone;
    confirmField.hidden = !registering;
    phoneField.hidden = !phone;
    codeField.hidden = !phone;
    options.hidden = registering || account || phone;
    divider.hidden = registering || account || phone;
    socials.hidden = registering || account || phone;
    prompt.hidden = phone;
    methodSwitch.hidden = account;
    scanCorner.hidden = account;
    email.disabled = account || phone;
    password.disabled = account || phone;
    phoneNumber.disabled = !phone;
    verificationCode.disabled = !phone;
    phoneNumber.required = phone;
    verificationCode.required = phone;
    password.autocomplete = registering ? "new-password" : "current-password";
    confirmPassword.required = registering;
    submit.textContent = account ? "Sign Out" : registering ? "Create Account" : phone ? "Continue" : "Sign In";
    methodSwitchButton.textContent = phone ? "Use email" : "Use phone number";
    promptText.textContent = account
      ? currentUser?.email || "Signed in"
      : registering
        ? "Already have an account?"
        : "Don't have an account?";
    switchModeButton.textContent = account ? "" : registering ? "Sign In" : "Sign Up";
    switchModeButton.hidden = account;
    if (!scanOpen) {
      panel.setAttribute("aria-label", account ? "Account" : registering ? "Create account" : phone ? "Phone verification" : "Sign in");
    }
    if (!registering) confirmPassword.value = "";
    message(notice, notice ? "success" : "info");
  }

  function setAuthenticated(user) {
    currentUser = user;
    if (scanOpen) {
      scanOpen = false;
      form.hidden = false;
      scanPanel.hidden = true;
      scanCorner.classList.remove("is-scan-open");
      scanCorner.setAttribute("aria-expanded", "false");
    }
    document.documentElement.dataset.authenticated = user ? "true" : "false";
    for (const trigger of triggers) {
      trigger.setAttribute("aria-label", user ? `Account: ${user.email}` : "Log in");
      trigger.dataset.authenticated = String(Boolean(user));
    }
    setMode(user ? "account" : "login");
  }

  function safeUser(user) {
    if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
      throw new Error("Missing verified user");
    }
    return { id: user.id, email: user.email };
  }

  function invalidateIdentity() {
    clearTimeout(verificationTimer);
    return ++identityRevision;
  }

  function isTemporary(error) {
    return error?.name === "AuthRetryableFetchError" || error instanceof TypeError ||
      error?.status === 0 || error?.status >= 500;
  }

  function failureMessage(error) {
    if (isTemporary(error)) return temporaryError;
    if (error?.status === 429 || error?.code === "over_request_rate_limit") {
      return "尝试过于频繁，请稍后重试。 / Too many attempts. Please try later.";
    }
    if (error?.code === "invalid_credentials") {
      return "邮箱或密码不正确。 / Invalid email or password.";
    }
    return "无法完成登录，请检查测试账号状态后重试。 / Unable to sign in. Check the test account and retry.";
  }

  async function restoreSession(revision) {
    try {
      // Local session is only a hint that verification is needed, never proof of identity.
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (revision !== identityRevision) return;
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        setAuthenticated(null);
        return;
      }
      const { data, error } = await client.auth.getUser();
      if (revision !== identityRevision) return;
      if (error) throw error;
      setAuthenticated(safeUser(data.user));
    } catch (error) {
      if (revision !== identityRevision) return;
      // Leave SDK storage intact on a transient failure, but do not display verified identity.
      setAuthenticated(null);
      message(isTemporary(error) ? temporaryError : "会话无法核验，请重新登录。 / Please sign in again.", "error");
    }
  }

  function scheduleVerification() {
    const revision = invalidateIdentity();
    // SDK calls must run outside the synchronous auth callback (which holds a session lock).
    verificationTimer = setTimeout(() => { void restoreSession(revision); }, 0);
  }

  switchModeButton.addEventListener("click", () => message(unavailable()));
  scanCorner.addEventListener("click", () => setScanOpen(!scanOpen));
  scanBack.addEventListener("click", () => setScanOpen(false));
  for (const tab of scanTabs) {
    tab.addEventListener("click", () => setScanChannel(tab.dataset.scanChannel));
  }
  methodSwitchButton.addEventListener("click", () => {
    setMode(mode === "phone" ? phoneReturnMode : "phone");
    message(unavailable());
    (mode === "phone" ? phoneNumber : email).focus();
  });
  countrySelect.addEventListener("change", () => {
    countryPrefix.textContent = countrySelect.value;
    phoneNumber.focus();
  });
  getCode.addEventListener("click", () => {
    message(unavailable());
  });
  forgot.addEventListener("click", () => message(unavailable()));
  for (const button of socialButtons) {
    button.addEventListener("click", () => message(unavailable()));
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) return;
    message("");

    if (mode === "phone" || mode === "register") {
      message(unavailable());
      return;
    }
    if (!client) {
      message(setupError, "error");
      return;
    }

    if (mode === "account") {
      invalidateIdentity();
      setBusy(true);
      try {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) throw error;
        invalidateIdentity();
        form.reset();
        remember.checked = true;
        setAuthenticated(null);
        message("You have been signed out.", "success");
      } catch (error) {
        message(isTemporary(error) ? temporaryError : "退出未完成，请重试。 / Sign out failed. Please retry.", "error");
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!form.reportValidity()) return;

    const revision = invalidateIdentity();
    setBusy(true);
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
      });
      if (revision !== identityRevision) return;
      if (error) throw error;
      const user = safeUser(data.user);
      setAuthenticated(user);
      document.dispatchEvent(new CustomEvent("preacherman:authenticated", { detail: user }));
      const openTrigger = triggers.find((trigger) => trigger.getAttribute("aria-expanded") === "true");
      if (openTrigger) openTrigger.click();
    } catch (error) {
      if (revision !== identityRevision) return;
      setAuthenticated(null);
      message(failureMessage(error), "error");
    } finally {
      password.value = "";
      setBusy(false);
    }
  }, true);

  try {
    const config = window.PREACHERMAN_AUTH_CONFIG;
    if (!config || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.SUPABASE_PUBLISHABLE_KEY || "")) {
      throw new Error("公开认证配置缺失或无效。 / Missing or invalid public auth configuration.");
    }
    let projectUrl;
    try { projectUrl = new URL(config.SUPABASE_URL); } catch { /* Report configuration error below. */ }
    if (!projectUrl || projectUrl.protocol !== "https:" || projectUrl.username || projectUrl.password ||
        projectUrl.pathname !== "/" || projectUrl.search || projectUrl.hash) {
      throw new Error("Supabase 项目地址无效。 / Invalid Supabase project URL.");
    }
    if (typeof window.supabase?.createClient !== "function") {
      throw new Error("认证组件加载失败，请刷新重试。 / Authentication SDK failed to load. Please reload.");
    }
    client = window.supabase.createClient(projectUrl.origin, config.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        invalidateIdentity();
        setAuthenticated(null);
      } else if (!busy && ["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
        scheduleVerification();
      }
    });
  } catch (error) {
    client = null;
    setupError = error.message || "认证初始化失败，请刷新重试。 / Authentication initialization failed.";
    setAuthenticated(null);
    message(setupError, "error");
  }
})();
