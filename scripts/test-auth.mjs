// Isolated logic tests: fake DOM and SDK responses, never real accounts or tokens.
// These tests do not replace browser acceptance against Supabase.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = fs.readFileSync(new URL("../work/preacherman-auth.js", import.meta.url), "utf8");
const settle = () => new Promise((resolve) => setTimeout(resolve, 15));
const user = { id: "synthetic-user-id", email: "synthetic@example.invalid" };
function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture({ configured = true, sdkPresent = true, session = null, verify } = {}) {
  class Element {
    constructor() {
      this.children = new Map(); this.listeners = new Map(); this.attributes = {};
      this.dataset = {}; this.value = ""; this.textContent = ""; this.hidden = false;
      this.classList = { add() {}, remove() {}, toggle() {} };
    }
    get parentElement() { return this.querySelector("parent"); }
    querySelector(selector) {
      if (!this.children.has(selector)) this.children.set(selector, new Element());
      return this.children.get(selector);
    }
    querySelectorAll() { return []; }
    closest(selector) { return this.querySelector(selector); }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key] ?? null; }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(event, callback) { this.listeners.set(event, callback); }
    async fire(event) {
      await this.listeners.get(event)?.({ preventDefault() {}, stopImmediatePropagation() {} });
    }
    click() { this.setAttribute("aria-expanded", "false"); return this.fire("click"); }
    reportValidity() { return true; }
    append() {} before() {} after() {} focus() {} reset() {}
  }
  const document = new Element();
  document.documentElement = new Element();
  document.created = [];
  document.createElement = () => { const element = new Element(); document.created.push(element); return element; };
  const trigger = new Element();
  trigger.setAttribute("aria-expanded", "true");
  document.querySelectorAll = () => [trigger];
  const events = [];
  document.dispatchEvent = (event) => events.push(event);
  let subscriber;
  let inCallback = false;
  const calls = { clients: 0, subscriptions: 0, signIns: 0, signOuts: 0, verifications: 0 };
  const api = {
    getSession: async () => { assert.equal(inCallback, false); return { data: { session }, error: null }; },
    getUser: async () => {
      assert.equal(inCallback, false); calls.verifications++;
      return verify ? verify() : { data: { user }, error: null };
    },
    signInWithPassword: async (payload) => {
      calls.signIns++; calls.loginPayload = payload;
      return { data: { user: { ...user, access_token: "synthetic-only" } }, error: null };
    },
    signOut: async (options) => { calls.signOuts++; calls.logoutOptions = options; return { error: null }; },
    onAuthStateChange: (callback) => { calls.subscriptions++; subscriber = callback; return { data: {} }; },
  };
  const window = {
    PREACHERMAN_AUTH_CONFIG: configured ? {
      SUPABASE_URL: "https://synthetic.example.invalid", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
    } : undefined,
    supabase: sdkPresent ? { createClient: (url, key, options) => {
      calls.clients++; calls.clientOptions = options; return { auth: api };
    } } : undefined,
  };
  const context = vm.createContext({ window, document, URL, Intl, setTimeout, clearTimeout, TypeError,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
  });
  vm.runInContext(source, context);
  const form = document.querySelector(".login-form");
  return {
    document, form, calls, api, events, trigger,
    status: () => document.created.find((element) => element.className === "login-form__status").textContent,
    authenticated: () => document.documentElement.dataset.authenticated,
    emit: (event) => { inCallback = true; subscriber(event); inCallback = false; },
    runAgain: () => vm.runInContext(source, context),
    login: () => form.fire("submit"),
  };
}

test("missing public config or SDK fails safely; duplicate script creates only one client/subscription", () => {
  for (const options of [{ configured: false }, { sdkPresent: false }]) {
    const f = fixture(options); assert.equal(f.authenticated(), "false"); assert.ok(f.status());
    assert.equal(f.calls.clients, 0);
  }
  const f = fixture(); f.runAgain();
  assert.equal(f.calls.clients, 1); assert.equal(f.calls.subscriptions, 1);
  assert.equal(f.calls.clientOptions.auth.persistSession, true);
  assert.equal(f.calls.clientOptions.auth.autoRefreshToken, true);
});

test("no session stays signed out; stored session must be verified outside auth callback", async () => {
  const empty = fixture(); empty.emit("INITIAL_SESSION"); await settle();
  assert.equal(empty.authenticated(), "false"); assert.equal(empty.calls.verifications, 0);
  const f = fixture({ session: {} }); f.emit("INITIAL_SESSION"); await settle();
  assert.equal(f.authenticated(), "true"); assert.equal(f.calls.verifications, 1);
});

test("login trims email only, emits minimal user and closes panel; duplicate submission blocked", async () => {
  const f = fixture(); const pending = deferred();
  f.api.signInWithPassword = async (payload) => { f.calls.signIns++; f.calls.loginPayload = payload; return pending.promise; };
  f.form.querySelector("#login-email").value = "  synthetic@example.invalid  ";
  f.form.querySelector("#login-password").value = "  synthetic unchanged input  ";
  const first = f.login(); await f.login();
  assert.equal(f.calls.signIns, 1);
  pending.resolve({ data: { user: { ...user, access_token: "synthetic-only" } }, error: null }); await first;
  assert.equal(f.calls.loginPayload.email, user.email);
  assert.equal(f.calls.loginPayload.password, "  synthetic unchanged input  ");
  assert.equal(f.form.querySelector("#login-password").value, "");
  assert.equal(f.authenticated(), "true"); assert.equal(f.trigger.getAttribute("aria-expanded"), "false");
  assert.equal(f.events[0].type, "preacherman:authenticated");
  assert.equal(JSON.stringify(Object.keys(f.events[0].detail).sort()), '["email","id"]');
});

test("invalid credentials cannot authenticate; network failure has a separate message", async () => {
  const f = fixture();
  f.api.signInWithPassword = async () => ({ data: {}, error: { code: "invalid_credentials", status: 400 } });
  await f.login(); assert.equal(f.authenticated(), "false"); assert.match(f.status(), /Invalid email or password/);
  f.api.signInWithPassword = async () => { throw new TypeError("synthetic network failure"); };
  await f.login(); assert.equal(f.authenticated(), "false"); assert.match(f.status(), /temporarily unavailable/);
});

test("temporary restore error does not call logout or claim verified identity", async () => {
  const f = fixture({ session: {}, verify: () => ({ data: {}, error: { name: "AuthRetryableFetchError" } }) });
  f.emit("INITIAL_SESSION"); await settle();
  assert.equal(f.authenticated(), "false"); assert.equal(f.calls.signOuts, 0);
  assert.match(f.status(), /temporarily unavailable/);
});

test("late verification cannot undo logout; local scope and failure/retry are respected", async () => {
  const pending = deferred();
  const f = fixture({ session: {}, verify: () => pending.promise });
  await f.login(); f.emit("TOKEN_REFRESHED"); await settle();
  f.api.signOut = async () => ({ error: { name: "AuthRetryableFetchError" } });
  await f.login(); assert.equal(f.authenticated(), "true"); assert.match(f.status(), /temporarily unavailable/);
  f.api.signOut = async (options) => { f.calls.logoutOptions = options; f.emit("SIGNED_OUT"); return { error: null }; };
  await f.login(); assert.equal(f.calls.logoutOptions.scope, "local"); assert.equal(f.authenticated(), "false");
  pending.resolve({ data: { user }, error: null }); await settle();
  assert.equal(f.authenticated(), "false");
});

test("a stale startup response cannot replace a newer login", async () => {
  const pending = deferred(); const f = fixture({ session: {}, verify: () => pending.promise });
  f.emit("INITIAL_SESSION"); await settle(); await f.login();
  pending.resolve({ data: { user: { id: "stale", email: "stale@example.invalid" } }, error: null }); await settle();
  assert.equal(f.trigger.getAttribute("aria-label"), `Account: ${user.email}`);
});

test("registration, recovery, Google, phone and scan actions never submit auth requests", async () => {
  const f = fixture();
  const controls = [
    f.form.querySelector(".login-form__prompt").querySelector("button"),
    f.form.querySelector(".login-form__options").querySelector(".login-form__text-action"),
    f.form.querySelector(".login-form__socials").querySelector(".login-form__social"),
    f.document.created.find((e) => e.className === "login-form__field login-form__verification").querySelector(".login-form__get-code"),
    f.document.created.find((e) => e.className === "login-form__method-switch").querySelector("button"),
  ];
  for (const control of controls) { await control.fire("click"); assert.match(f.status(), /暂未开放/); }
  await f.login();
  const corner = f.document.created.find((e) => e.className === "login-scan-corner");
  await corner.fire("click");
  assert.equal(f.calls.signIns, 0); assert.equal(f.calls.signOuts, 0);
});
