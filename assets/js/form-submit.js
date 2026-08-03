(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.JJFormSubmission = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function buildAjaxUrl(action, baseUrl) {
    const url = new URL(action, baseUrl);
    if (url.protocol !== "https:" || url.hostname !== "formsubmit.co") {
      throw new Error("Unsupported form endpoint.");
    }
    if (!url.pathname.startsWith("/ajax/")) {
      url.pathname = `/ajax${url.pathname.startsWith("/") ? "" : "/"}${url.pathname}`;
    }
    return url.toString();
  }

  function isSuccessfulPayload(payload) {
    return payload?.success === true || String(payload?.success).toLowerCase() === "true";
  }

  function renderSubmissionError(container, documentRef, email) {
    const message = documentRef.createTextNode("Your request could not be sent. Your entries are still here. Please try again or email ");
    const link = documentRef.createElement("a");
    link.href = `mailto:${email}`;
    link.textContent = email;
    container.replaceChildren(message, link, documentRef.createTextNode("."));
    container.focus({ preventScroll: true });
  }

  function setSubmittingState(overlay, submitButton, isSubmitting) {
    if (overlay) {
      overlay.classList.toggle("is-visible", isSubmitting);
      overlay.setAttribute("aria-hidden", String(!isSubmitting));
    }
    if (submitButton) submitButton.disabled = isSubmitting;
  }

  async function sendRequest(options) {
    const response = await options.fetchImpl(buildAjaxUrl(options.action, options.baseUrl), {
      method: "POST",
      body: options.formData,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("The request service returned an error.");
    const payload = await response.json();
    if (!isSuccessfulPayload(payload)) throw new Error("The request was not confirmed.");
    return payload;
  }

  function createSubmissionHandler(options) {
    let inFlight = false;

    return async function submit(submission) {
      if (!submission.validate()) return { status: "invalid" };
      if (inFlight) return { status: "duplicate" };
      inFlight = true;
      options.setSubmitting(true);

      try {
        const payload = await sendRequest({
          action: submission.action,
          baseUrl: submission.baseUrl,
          formData: submission.formData,
          fetchImpl: options.fetchImpl,
        });
        options.onSuccess(payload);
        return { status: "success", payload };
      } catch (error) {
        options.onError(error);
        options.setSubmitting(false);
        inFlight = false;
        return { status: "error", error };
      }
    };
  }

  return {
    buildAjaxUrl,
    isSuccessfulPayload,
    renderSubmissionError,
    setSubmittingState,
    sendRequest,
    createSubmissionHandler,
  };
});
