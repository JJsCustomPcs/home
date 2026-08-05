import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const submission = require(join(root, "assets/js/form-submit.js"));

async function testConfirmedSuccess() {
  const calls = [];
  const states = [];
  let successPath = "";
  let errorCount = 0;
  const submit = submission.createSubmissionHandler({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, json: async () => ({ success: "true" }) };
    },
    setSubmitting: (state) => states.push(state),
    onSuccess: () => { successPath = "/thankyou.html"; },
    onError: () => { errorCount += 1; },
  });
  const formData = { mock: true };
  const result = await submit({
    validate: () => true,
    action: "https://formsubmit.co/token",
    baseUrl: "https://jjscustompcs.com/",
    formData,
  });

  assert.equal(result.status, "success");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://formsubmit.co/ajax/token");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.body, formData);
  assert.equal(calls[0].options.headers.Accept, "application/json");
  assert.deepEqual(states, [true]);
  assert.equal(successPath, "/thankyou.html");
  assert.equal(errorCount, 0);
}

async function testRejectedResponseResetsState() {
  const states = [];
  let errorCount = 0;
  const rendered = [];
  let focused = false;
  const overlayClasses = new Set();
  const overlayAttributes = {};
  const fakeOverlay = {
    classList: {
      toggle: (name, enabled) => enabled ? overlayClasses.add(name) : overlayClasses.delete(name),
    },
    setAttribute: (name, value) => { overlayAttributes[name] = value; },
  };
  const fakeSubmitButton = { disabled: false };
  const fakeDocument = {
    createTextNode: (text) => ({ type: "text", text }),
    createElement: (tag) => ({ type: tag, href: "", textContent: "" }),
  };
  const fakeStatus = {
    replaceChildren: (...nodes) => rendered.push(...nodes),
    focus: () => { focused = true; },
  };
  const submit = submission.createSubmissionHandler({
    fetchImpl: async () => ({ ok: true, json: async () => ({ success: false }) }),
    setSubmitting: (state) => {
      states.push(state);
      submission.setSubmittingState(fakeOverlay, fakeSubmitButton, state);
    },
    onSuccess: () => assert.fail("Unconfirmed response must not succeed."),
    onError: () => {
      errorCount += 1;
      submission.renderSubmissionError(fakeStatus, fakeDocument, "contact.jjscustompcs@gmail.com");
    },
  });
  const result = await submit({
    validate: () => true,
    action: "https://formsubmit.co/token",
    baseUrl: "https://jjscustompcs.com/",
    formData: {},
  });
  assert.equal(result.status, "error");
  assert.deepEqual(states, [true, false]);
  assert.equal(errorCount, 1);
  assert.equal(focused, true);
  assert.equal(rendered[1].href, "mailto:contact.jjscustompcs@gmail.com");
  assert.equal(rendered[1].textContent, "contact.jjscustompcs@gmail.com");
  assert.equal(overlayClasses.has("is-visible"), false);
  assert.equal(overlayAttributes["aria-hidden"], "true");
  assert.equal(fakeSubmitButton.disabled, false);
}

async function testNetworkFailureDoesNotRetry() {
  const states = [];
  let requests = 0;
  let errorCount = 0;
  const submit = submission.createSubmissionHandler({
    fetchImpl: async () => {
      requests += 1;
      throw new Error("network unavailable");
    },
    setSubmitting: (state) => states.push(state),
    onSuccess: () => assert.fail("A network failure must not succeed."),
    onError: () => { errorCount += 1; },
  });
  const result = await submit({
    validate: () => true,
    action: "https://formsubmit.co/token",
    baseUrl: "https://jjscustompcs.com/",
    formData: {},
  });
  assert.equal(result.status, "error");
  assert.equal(requests, 1);
  assert.equal(errorCount, 1);
  assert.deepEqual(states, [true, false]);
}

async function testHttpFailureIsRejected() {
  let errorCount = 0;
  const submit = submission.createSubmissionHandler({
    fetchImpl: async () => ({ ok: false, json: async () => ({ success: true }) }),
    setSubmitting: () => {},
    onSuccess: () => assert.fail("An unsuccessful HTTP response must not succeed."),
    onError: () => { errorCount += 1; },
  });
  const result = await submit({
    validate: () => true,
    action: "https://formsubmit.co/token",
    baseUrl: "https://jjscustompcs.com/",
    formData: {},
  });
  assert.equal(result.status, "error");
  assert.equal(errorCount, 1);
}

async function testValidationStopsRequest() {
  let requests = 0;
  const submit = submission.createSubmissionHandler({
    fetchImpl: async () => { requests += 1; },
    setSubmitting: () => assert.fail("Invalid forms must not enter the submitting state."),
    onSuccess: () => {},
    onError: () => {},
  });
  const result = await submit({ validate: () => false });
  assert.equal(result.status, "invalid");
  assert.equal(requests, 0);
}

async function testDoubleClickMakesOneRequest() {
  let resolveRequest;
  let requests = 0;
  const pending = new Promise((resolve) => { resolveRequest = resolve; });
  const submit = submission.createSubmissionHandler({
    fetchImpl: async () => {
      requests += 1;
      await pending;
      return { ok: true, json: async () => ({ success: true }) };
    },
    setSubmitting: () => {},
    onSuccess: () => {},
    onError: () => {},
  });
  const request = {
    validate: () => true,
    action: "https://formsubmit.co/token",
    baseUrl: "https://jjscustompcs.com/",
    formData: {},
  };
  const first = submit(request);
  const second = await submit(request);
  assert.equal(second.status, "duplicate");
  assert.equal(requests, 1);
  resolveRequest();
  assert.equal((await first).status, "success");
}

async function testStaticFallbackConfiguration() {
  const [home, thankyou, sitemap] = await Promise.all([
    readFile(join(root, "index.html"), "utf8"),
    readFile(join(root, "thankyou.html"), "utf8"),
    readFile(join(root, "sitemap.xml"), "utf8"),
  ]);
  assert.match(home, /<form[^>]+id="quote-form"[^>]+action="https:\/\/formsubmit\.co\/a3b58795bc0ec2a0644d6798de47715b"[^>]+method="POST"/);
  assert.match(home, /name="_next"[^>]+value="https:\/\/jjscustompcs\.com\/thankyou\.html"/);
  assert.match(home, /name="_url"[^>]+value="https:\/\/jjscustompcs\.com\/#quote-section"/);
  assert.match(home, /id="form-status"[^>]+role="alert"[^>]+aria-live="assertive"/);
  assert.match(home, /assets\/js\/form-submit\.js\?v=25/);
  assert.match(thankyou, /<meta name="robots" content="noindex,\s*follow">/);
  assert.doesNotMatch(sitemap, /thankyou\.html/);
}

await testConfirmedSuccess();
await testRejectedResponseResetsState();
await testNetworkFailureDoesNotRetry();
await testHttpFailureIsRejected();
await testValidationStopsRequest();
await testDoubleClickMakesOneRequest();
await testStaticFallbackConfiguration();
console.log("Form submission tests passed: success, response/network failure reset, validation, duplicate guard, and static fallback.");
