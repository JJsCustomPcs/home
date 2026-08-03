(function () {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const header = document.querySelector("[data-header]");
  const progress = document.querySelector("[data-progress]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  const dropdown = document.querySelector("[data-dropdown]");
  const dropdownButton = document.querySelector("[data-dropdown-button]");
  const dropdownMenu = document.querySelector("[data-dropdown-menu]");
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(pointer: fine)");
  const desktopQuery = window.matchMedia("(min-width: 901px)");
  const assetVersion = "v=22";
  const assetRoot = body?.dataset.assetRoot || "";
  const logoPath = `${assetRoot}assets/logo.svg?${assetVersion}`;
  const faviconPath = `${assetRoot}assets/favicon.svg?${assetVersion}`;
  const draftKey = "jjCustomPcQuoteDraft";
  const submissionPendingKey = "jjQuoteSubmissionPending";

  function trackEvent(eventName, parameters = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, parameters);
      return;
    }

    const hasTagManager = Boolean(document.querySelector('script[src*="googletagmanager.com"]'));
    if (hasTagManager && Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...parameters });
    }
  }

  window.jjTrackEvent = trackEvent;

  if (body?.dataset.service) trackEvent("view_service", { service_id: body.dataset.service });
  if (body?.dataset.page === "packages") trackEvent("view_packages");
  if (body?.dataset.page === "build-detail") trackEvent("view_build", { build_id: body.dataset.build || "build-detail" });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link) return;
    if (link.href.startsWith("mailto:")) trackEvent("click_email");
    if (link.href.startsWith("tel:")) trackEvent("click_phone");
  });

  if (!reduceMotionQuery.matches && "IntersectionObserver" in window) {
    root.classList.add("motion-ready");
  }

  function upsertHeadLink(rel, href, type) {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = href;
    if (type) link.type = type;
  }

  function syncBrandAssets() {
    document.querySelectorAll(".brand-mark img").forEach((image) => {
      image.src = logoPath;
      image.width = 1024;
      image.height = 1024;
    });

    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((link) => link.remove());
    upsertHeadLink("icon", faviconPath, "image/svg+xml");
    upsertHeadLink("shortcut icon", faviconPath);
    upsertHeadLink("manifest", `${assetRoot}site.webmanifest?${assetVersion}`);
  }

  syncBrandAssets();

  let scrollFrame = 0;
  function updateScrollState() {
    const max = root.scrollHeight - window.innerHeight;
    const percent = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.setProperty("--scroll", percent.toFixed(4));
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
    scrollFrame = 0;
  }

  function requestScrollUpdate() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollState);
  }

  updateScrollState();
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });

  if (!reduceMotionQuery.matches && finePointerQuery.matches) {
    document.addEventListener("pointermove", (event) => {
      root.style.setProperty("--mx", `${event.clientX}px`);
      root.style.setProperty("--my", `${event.clientY}px`);
    }, { passive: true });
  }

  function closeMenu(options = {}) {
    if (!nav || !menuToggle) return;
    const wasOpen = nav.classList.contains("is-open");
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    if (wasOpen && options.restoreFocus) menuToggle.focus();
  }

  function openMenu() {
    if (!nav || !menuToggle) return;
    nav.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation");
    const firstLink = nav.querySelector("a");
    if (firstLink) firstLink.focus();
  }

  function setDropdown(open, options = {}) {
    if (!dropdown || !dropdownButton || !dropdownMenu) return;
    const wasOpen = dropdown.classList.contains("is-open");
    dropdown.classList.toggle("is-open", open);
    dropdownButton.setAttribute("aria-expanded", String(open));
    if (!open && wasOpen && options.restoreFocus) dropdownButton.focus();
    if (open && options.focusFirst) {
      const firstLink = dropdownMenu.querySelector("a");
      if (firstLink) firstLink.focus();
    }
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      if (nav.classList.contains("is-open")) closeMenu();
      else openMenu();
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        closeMenu();
        setDropdown(false);
      }
    });
  }

  if (dropdown && dropdownButton && dropdownMenu) {
    dropdownButton.addEventListener("click", (event) => {
      event.preventDefault();
      setDropdown(!dropdown.classList.contains("is-open"));
    });

    dropdownButton.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setDropdown(true, { focusFirst: true });
      }
    });

    dropdownMenu.addEventListener("keydown", (event) => {
      const links = Array.from(dropdownMenu.querySelectorAll("a"));
      const index = links.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        setDropdown(false, { restoreFocus: true });
      } else if (event.key === "Home" && links.length) {
        event.preventDefault();
        links[0].focus();
      } else if (event.key === "End" && links.length) {
        event.preventDefault();
        links[links.length - 1].focus();
      } else if (event.key === "ArrowDown" && index >= 0) {
        event.preventDefault();
        links[(index + 1) % links.length].focus();
      } else if (event.key === "ArrowUp" && index >= 0) {
        event.preventDefault();
        links[(index - 1 + links.length) % links.length].focus();
      }
    });

    if (finePointerQuery.matches) {
      dropdown.addEventListener("mouseenter", () => setDropdown(true));
      dropdown.addEventListener("mouseleave", () => {
        if (!dropdown.contains(document.activeElement)) setDropdown(false);
      });
    }

    dropdown.addEventListener("focusout", (event) => {
      if (!dropdown.contains(event.relatedTarget)) setDropdown(false);
    });
  }

  document.addEventListener("click", (event) => {
    if (dropdown && !dropdown.contains(event.target)) setDropdown(false);
    if (!desktopQuery.matches && nav?.classList.contains("is-open") &&
        !nav.contains(event.target) && !menuToggle?.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (dropdown?.classList.contains("is-open")) setDropdown(false, { restoreFocus: true });
    else if (nav?.classList.contains("is-open")) closeMenu({ restoreFocus: true });
  });

  desktopQuery.addEventListener("change", () => {
    closeMenu();
    setDropdown(false);
  });

  const reveals = document.querySelectorAll(".reveal-up");
  if (reduceMotionQuery.matches || !("IntersectionObserver" in window)) {
    reveals.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    reveals.forEach((item) => observer.observe(item));
  }

  if (!reduceMotionQuery.matches && finePointerQuery.matches) {
    document.querySelectorAll(".tilt-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--tilt-y", `${x * 5}deg`);
        card.style.setProperty("--tilt-x", `${y * -5}deg`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });

    document.querySelectorAll(".magnet").forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const rect = item.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.06;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.08;
        item.style.setProperty("--magnet-x", `${x}px`);
        item.style.setProperty("--magnet-y", `${y}px`);
      });
      item.addEventListener("pointerleave", () => {
        item.style.setProperty("--magnet-x", "0px");
        item.style.setProperty("--magnet-y", "0px");
      });
    });
  }

  const lightboxLinks = Array.from(document.querySelectorAll("[data-lightbox]"));
  if (lightboxLinks.length) {
    let activeIndex = 0;
    let openingLink = null;
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-labelledby", "lightbox-title");
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = `
      <div class="lightbox-dialog">
        <h2 class="visually-hidden" id="lightbox-title">Build photo viewer</h2>
        <button class="lightbox-close" type="button" aria-label="Close photo viewer">×</button>
        <button class="lightbox-prev" type="button" aria-label="Previous photo">‹</button>
        <div class="lightbox-frame">
          <img alt="">
        </div>
        <button class="lightbox-next" type="button" aria-label="Next photo">›</button>
        <p class="lightbox-position" aria-live="polite"></p>
        <p class="lightbox-caption"></p>
      </div>
    `;
    body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector("img");
    const lightboxCaption = lightbox.querySelector(".lightbox-caption");
    const lightboxPosition = lightbox.querySelector(".lightbox-position");
    const closeButton = lightbox.querySelector(".lightbox-close");
    const prevButton = lightbox.querySelector(".lightbox-prev");
    const nextButton = lightbox.querySelector(".lightbox-next");
    const focusable = [closeButton, prevButton, nextButton];

    function setBackgroundInert(inert) {
      Array.from(body.children).forEach((element) => {
        if (element !== lightbox && "inert" in element) element.inert = inert;
      });
    }

    function setLightboxImage(index) {
      activeIndex = (index + lightboxLinks.length) % lightboxLinks.length;
      const link = lightboxLinks[activeIndex];
      const image = link.querySelector("img");
      const caption = link.dataset.caption || image?.alt || "Build gallery photo";
      lightboxImage.src = link.dataset.fullWebp || link.href;
      lightboxImage.alt = image?.alt || caption;
      lightboxCaption.textContent = caption;
      lightboxPosition.textContent = `Photo ${activeIndex + 1} of ${lightboxLinks.length}`;
    }

    function openLightbox(index, link) {
      openingLink = link;
      setLightboxImage(index);
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      body.classList.add("lightbox-open");
      setBackgroundInert(true);
      closeButton.focus();
    }

    function closeLightbox() {
      if (!lightbox.classList.contains("is-open")) return;
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      body.classList.remove("lightbox-open");
      setBackgroundInert(false);
      lightboxImage.removeAttribute("src");
      if (openingLink?.isConnected) openingLink.focus();
    }

    lightboxLinks.forEach((link, index) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openLightbox(index, link);
      });
    });

    closeButton.addEventListener("click", closeLightbox);
    prevButton.addEventListener("click", () => setLightboxImage(activeIndex - 1));
    nextButton.addEventListener("click", () => setLightboxImage(activeIndex + 1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setLightboxImage(activeIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setLightboxImage(activeIndex + 1);
      } else if (event.key === "Tab") {
        const currentIndex = focusable.indexOf(document.activeElement);
        if (event.shiftKey && currentIndex <= 0) {
          event.preventDefault();
          focusable[focusable.length - 1].focus();
        } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
          event.preventDefault();
          focusable[0].focus();
        }
      }
    });
  }

  if (body?.dataset.page === "thankyou") {
    try {
      if (sessionStorage.getItem(submissionPendingKey) === "true") {
        trackEvent("generate_lead", { form_id: "quote-form" });
        localStorage.removeItem(draftKey);
        sessionStorage.removeItem(submissionPendingKey);
      }
    } catch (error) {
      // Storage may be unavailable in privacy-restricted browser modes.
    }
  }

  const form = document.querySelector("#quote-form");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll("[data-step]"));
  const stepDots = Array.from(form.querySelectorAll("[data-step-dot]"));
  const quoteProgress = form.querySelector(".quote-progress");
  const prevBtn = form.querySelector("[data-prev-step]");
  const nextBtn = form.querySelector("[data-next-step]");
  const submitBtn = form.querySelector("#submitBtn");
  const restoreBtn = form.querySelector("#restoreBtn");
  const resetDraftBtn = form.querySelector("#resetDraftBtn");
  const copySummaryBtn = form.querySelector("#copySummaryBtn");
  const draftHint = form.querySelector("#draftHint");
  const formStatus = form.querySelector("#form-status");
  const timestamp = form.querySelector("#ts");
  const summaryBox = form.querySelector("#quote-summary");
  const summaryInput = form.querySelector("#quote-summary-input");
  const nextInput = form.querySelector('input[name="_next"]');
  const contactMethod = form.querySelector("#contact-method");
  const contactEmail = form.querySelector("#contact-email");
  const contactPhone = form.querySelector("#contact-phone");
  const email = form.querySelector("#email");
  const phone = form.querySelector("#phone");
  const overlay = document.querySelector("#submittingOverlay");
  const draftMaxAge = 24 * 60 * 60 * 1000;
  let currentStep = 0;
  let saveTimer = 0;
  let draftPaused = false;
  let quoteStarted = false;

  if (quoteProgress) {
    quoteProgress.style.setProperty("--quote-step-count", String(stepDots.length || steps.length || 5));
  }

  function namedFields(name) {
    const fields = form.elements[name];
    if (!fields) return [];
    if (typeof RadioNodeList !== "undefined" && fields instanceof RadioNodeList) return Array.from(fields);
    if (fields.length !== undefined && !fields.tagName) return Array.from(fields);
    return [fields];
  }

  function fieldValues(name, options = {}) {
    return namedFields(name)
      .filter((field) => options.includeDisabled || !field.disabled)
      .filter((field) => field.checked || !["checkbox", "radio"].includes(field.type))
      .map((field) => String(field.value || "").trim())
      .filter(Boolean);
  }

  function singleValue(name, options) {
    return fieldValues(name, options)[0] || "";
  }

  function setDraftHint(message) {
    if (draftHint) draftHint.textContent = message;
  }

  function configureFormRedirect() {
    if (!nextInput) return;
    nextInput.value = "https://jjscustompcs.com/thankyou.html";
  }

  function announceFormError(field) {
    if (!formStatus || !field) return;
    const label = form.querySelector(`label[for="${field.id}"]`);
    const fieldName = label?.textContent?.replace("*", "").trim() || "This field";
    formStatus.textContent = `${fieldName} needs attention. ${field.validationMessage}`;
    formStatus.focus({ preventScroll: true });
  }

  function setSubmitting(isSubmitting) {
    if (typeof window.JJFormSubmission?.setSubmittingState === "function") {
      window.JJFormSubmission.setSubmittingState(overlay, submitBtn, isSubmitting);
      return;
    }
    if (overlay) {
      overlay.classList.toggle("is-visible", isSubmitting);
      overlay.setAttribute("aria-hidden", String(!isSubmitting));
    }
    if (submitBtn) submitBtn.disabled = isSubmitting;
  }

  function announceSubmissionError() {
    if (!formStatus) return;
    window.JJFormSubmission.renderSubmissionError(
      formStatus,
      document,
      "contact.jjscustompcs@gmail.com"
    );
  }

  function syncContactFields() {
    const method = contactMethod?.value || "";
    const wantsEmail = method === "email";
    const wantsPhone = method === "phone";

    if (contactEmail) {
      contactEmail.hidden = !wantsEmail;
      contactEmail.classList.toggle("is-visible", wantsEmail);
    }
    if (contactPhone) {
      contactPhone.hidden = !wantsPhone;
      contactPhone.classList.toggle("is-visible", wantsPhone);
    }
    if (email) {
      email.disabled = !wantsEmail;
      email.required = wantsEmail;
      email.setAttribute("aria-required", String(wantsEmail));
    }
    if (phone) {
      phone.disabled = !wantsPhone;
      phone.required = wantsPhone;
      phone.setAttribute("aria-required", String(wantsPhone));
    }
  }

  function generateSummaryText() {
    const method = singleValue("contact_method");
    const lines = [
      "JJ's Custom PCs Service / Quote Request",
      "",
      `Service needed: ${singleValue("project_type")}`,
      `Main goal or use: ${singleValue("use_case")}`,
      `Budget / expected range: ${singleValue("budget")}`,
      `Parts or device status: ${singleValue("existing_parts_status")}`,
      `Project details: ${singleValue("project_details")}`,
      "",
      "Contact",
      `Name: ${singleValue("name")}`,
      `Preferred contact method: ${method}`,
    ];

    if (method === "email") lines.push(`Email: ${singleValue("email")}`);
    if (method === "phone") lines.push(`Phone: ${singleValue("phone")}`);
    return lines.join("\n");
  }

  function updateSummary() {
    const text = generateSummaryText();
    if (summaryInput) summaryInput.value = text;
    if (summaryBox) {
      summaryBox.replaceChildren();
      text.split("\n").forEach((line) => {
        const item = document.createElement(line ? "p" : "div");
        item.textContent = line;
        summaryBox.appendChild(item);
      });
    }
    return text;
  }

  function showStep(index, options = {}) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => {
      const active = stepIndex === currentStep;
      step.classList.toggle("is-active", active);
      step.hidden = !active;
    });
    stepDots.forEach((dot, dotIndex) => {
      const active = dotIndex === currentStep;
      dot.classList.toggle("is-active", active);
      dot.classList.toggle("is-complete", dotIndex < currentStep);
      if (active) dot.setAttribute("aria-current", "step");
      else dot.removeAttribute("aria-current");
      dot.setAttribute("aria-label", `Step ${dotIndex + 1} of ${stepDots.length}`);
    });
    if (prevBtn) prevBtn.hidden = currentStep === 0;
    if (nextBtn) nextBtn.hidden = currentStep === steps.length - 1;
    if (submitBtn) submitBtn.hidden = currentStep !== steps.length - 1;
    if (currentStep === steps.length - 1) updateSummary();

    if (options.focusHeading) {
      const heading = steps[currentStep].querySelector("h2, h3");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
        steps[currentStep].scrollIntoView({
          behavior: reduceMotionQuery.matches ? "auto" : "smooth",
          block: "start",
        });
      }
    }
  }

  function firstInvalidField(step) {
    return Array.from(step.querySelectorAll("input, select, textarea"))
      .find((field) => !field.disabled && field.type !== "hidden" && !field.checkValidity());
  }

  function validateStep(index) {
    const invalid = firstInvalidField(steps[index]);
    if (!invalid) return true;
    invalid.setAttribute("aria-invalid", "true");
    announceFormError(invalid);
    trackEvent("form_error", { form_id: "quote-form", error_type: "validation", step_id: `step_${index + 1}` });
    invalid.reportValidity();
    invalid.focus();
    return false;
  }

  function validateWholeForm() {
    syncContactFields();
    for (let index = 0; index < steps.length; index += 1) {
      const invalid = firstInvalidField(steps[index]);
      if (!invalid) continue;
      showStep(index, { focusHeading: false });
      invalid.setAttribute("aria-invalid", "true");
      announceFormError(invalid);
      trackEvent("form_error", { form_id: "quote-form", error_type: "validation", step_id: `step_${index + 1}` });
      invalid.reportValidity();
      invalid.focus();
      return false;
    }
    return true;
  }

  form.addEventListener("invalid", (event) => {
    event.target.setAttribute("aria-invalid", "true");
  }, true);

  form.addEventListener("input", (event) => {
    if (event.target.matches("input, select, textarea") && event.target.checkValidity()) {
      event.target.removeAttribute("aria-invalid");
      if (formStatus) formStatus.textContent = "";
    }
  });

  function collectDraft() {
    const data = { savedAt: Date.now(), currentStep, fields: {} };
    Array.from(form.elements).forEach((field) => {
      if (!field.name || field.name.startsWith("_") ||
          ["quote_summary", "agree"].includes(field.name) ||
          ["button", "submit"].includes(field.type)) return;

      if (field.type === "checkbox") {
        if (!data.fields[field.name]) data.fields[field.name] = [];
        if (field.checked) data.fields[field.name].push(field.value);
      } else if (field.type === "radio") {
        if (field.checked) data.fields[field.name] = field.value;
      } else {
        data.fields[field.name] = field.value;
      }
    });
    return data;
  }

  function saveDraft() {
    window.clearTimeout(saveTimer);
    saveTimer = 0;
    if (draftPaused) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(collectDraft()));
      setDraftHint("Draft saved on this device for up to 24 hours.");
    } catch (error) {
      setDraftHint("Draft could not be saved in this browser.");
    }
  }

  function scheduleDraftSave() {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveDraft, 450);
  }

  function clearDraft(message, pauseSaving = false) {
    window.clearTimeout(saveTimer);
    saveTimer = 0;
    draftPaused = pauseSaving;
    try {
      localStorage.removeItem(draftKey);
      setDraftHint(message);
    } catch (error) {
      setDraftHint("Saved draft could not be reset.");
    }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        setDraftHint("No saved draft was found on this device.");
        return;
      }

      const data = JSON.parse(raw);
      if (!data.savedAt || Date.now() - data.savedAt > draftMaxAge) {
        clearDraft("The saved draft expired after 24 hours.");
        return;
      }

      Array.from(form.elements).forEach((field) => {
        if (!field.name || field.name.startsWith("_")) return;
        const saved = data.fields?.[field.name];
        if (field.type === "checkbox") field.checked = Array.isArray(saved) && saved.includes(field.value);
        else if (field.type === "radio") field.checked = saved === field.value;
        else if (saved !== undefined) field.value = saved;
      });

      draftPaused = false;
      syncContactFields();
      showStep(Number.isInteger(data.currentStep) ? data.currentStep : 0);
      updateSummary();
      setDraftHint("Draft restored from this device.");
    } catch (error) {
      setDraftHint("The saved draft could not be restored.");
    }
  }

  contactMethod?.addEventListener("change", () => {
    draftPaused = false;
    syncContactFields();
    updateSummary();
    saveDraft();
  });

  prevBtn?.addEventListener("click", () => {
    showStep(currentStep - 1, { focusHeading: true });
    saveDraft();
  });

  nextBtn?.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    showStep(currentStep + 1, { focusHeading: true });
    trackEvent("quote_step", { form_id: "quote-form", step_id: `step_${currentStep + 1}` });
    saveDraft();
  });

  restoreBtn?.addEventListener("click", restoreDraft);
  resetDraftBtn?.addEventListener("click", () => {
    form.reset();
    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute("aria-invalid"));
    syncContactFields();
    showStep(0, { focusHeading: true });
    updateSummary();
    clearDraft("Form and saved draft cleared.", true);
  });

  copySummaryBtn?.addEventListener("click", async () => {
    const text = updateSummary();
    try {
      await navigator.clipboard.writeText(text);
      setDraftHint("Summary copied.");
      trackEvent("copy_quote_summary", { form_id: "quote-form" });
    } catch (error) {
      const helper = document.createElement("textarea");
      helper.value = text;
      helper.setAttribute("readonly", "");
      helper.className = "clipboard-helper";
      body.appendChild(helper);
      helper.select();
      const copied = document.execCommand("copy");
      helper.remove();
      setDraftHint(copied ? "Summary copied." : "Copy was unavailable. You can select the summary above.");
    }
  });

  function markQuoteStarted() {
    if (quoteStarted) return;
    quoteStarted = true;
    trackEvent("start_quote", { form_id: "quote-form" });
  }

  form.addEventListener("input", () => {
    markQuoteStarted();
    draftPaused = false;
    updateSummary();
    scheduleDraftSave();
  });
  form.addEventListener("change", () => {
    markQuoteStarted();
    draftPaused = false;
    updateSummary();
    saveDraft();
  });
  window.addEventListener("pagehide", saveDraft);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveDraft();
  });

  configureFormRedirect();
  syncContactFields();
  showStep(0);
  updateSummary();

  const supportsAjaxSubmission = typeof window.fetch === "function" &&
    typeof window.FormData === "function" &&
    typeof window.JJFormSubmission?.createSubmissionHandler === "function" &&
    typeof window.JJFormSubmission?.renderSubmissionError === "function";
  const submitQuote = supportsAjaxSubmission
    ? window.JJFormSubmission.createSubmissionHandler({
      fetchImpl: window.fetch.bind(window),
      setSubmitting,
      onSuccess: () => {
        clearDraft("Request sent. Opening confirmation…", true);
        try {
          sessionStorage.setItem(submissionPendingKey, "true");
        } catch (error) {
          // Analytics can continue without session storage.
        }
        window.location.assign("/thankyou.html");
      },
      onError: () => {
        announceSubmissionError();
        trackEvent("form_error", { form_id: "quote-form", error_type: "submission" });
      },
    })
    : null;

  form.addEventListener("submit", (event) => {
    if (!validateWholeForm()) {
      event.preventDefault();
      return;
    }

    configureFormRedirect();
    if (timestamp) timestamp.value = String(Math.floor(Date.now() / 1000));
    updateSummary();
    saveDraft();
    if (!submitQuote) return;

    event.preventDefault();
    submitQuote({
      validate: () => true,
      action: form.action,
      baseUrl: window.location.href,
      formData: new FormData(form),
    });
  });

  window.addEventListener("pageshow", () => {
    setSubmitting(false);
    try {
      sessionStorage.removeItem(submissionPendingKey);
    } catch (error) {
      // No action needed.
    }
  });
})();
