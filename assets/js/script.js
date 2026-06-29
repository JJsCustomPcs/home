(function () {
  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  const progress = document.querySelector("[data-progress]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-nav]");
  const dropdown = document.querySelector("[data-dropdown]");
  const dropdownButton = document.querySelector("[data-dropdown-button]");
  const dropdownMenu = document.querySelector("[data-dropdown-menu]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const assetVersion = "v=9";
  const assetRoot = document.body?.dataset.assetRoot || "";
  const logoPath = `${assetRoot}assets/logo.svg?${assetVersion}`;
  const faviconPath = `${assetRoot}assets/favicon.svg?${assetVersion}`;

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
    document.querySelectorAll(".brand-mark img").forEach((img) => {
      img.src = logoPath;
      img.width = 1024;
      img.height = 1024;
    });

    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((link) => link.remove());
    upsertHeadLink("icon", faviconPath, "image/svg+xml");
    upsertHeadLink("shortcut icon", faviconPath);
    upsertHeadLink("manifest", `${assetRoot}site.webmanifest?${assetVersion}`);

    if (!document.querySelector("[data-brand-asset-style]")) {
      const style = document.createElement("style");
      style.dataset.brandAssetStyle = "true";
      style.textContent = ".brand-mark{background:transparent!important;border:0!important;box-shadow:none!important;overflow:visible!important;padding:0!important;border-radius:0!important}.brand-mark img{border-radius:0!important;object-fit:contain!important;filter:drop-shadow(0 0 14px rgba(20,205,255,.55)) drop-shadow(0 0 22px rgba(160,40,255,.38))!important}";
      document.head.appendChild(style);
    }
  }

  syncBrandAssets();

  function updateScrollState() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percent = max > 0 ? window.scrollY / max : 0;
    if (progress) progress.style.setProperty("--scroll", percent.toFixed(4));
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  updateScrollState();
  window.addEventListener("scroll", updateScrollState, { passive: true });

  document.addEventListener("pointermove", (event) => {
    root.style.setProperty("--mx", `${event.clientX}px`);
    root.style.setProperty("--my", `${event.clientY}px`);
  }, { passive: true });

  function closeMenu() {
    if (!nav || !menuToggle) return;
    nav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu();
    });
  }

  function setDropdown(open) {
    if (!dropdown || !dropdownButton || !dropdownMenu) return;
    dropdown.classList.toggle("is-open", open);
    dropdownButton.setAttribute("aria-expanded", String(open));
  }

  if (dropdown && dropdownButton) {
    dropdownButton.addEventListener("click", (event) => {
      event.preventDefault();
      setDropdown(!dropdown.classList.contains("is-open"));
    });

    dropdown.addEventListener("mouseenter", () => setDropdown(true));
    dropdown.addEventListener("mouseleave", () => setDropdown(false));
  }

  document.addEventListener("click", (event) => {
    if (dropdown && !dropdown.contains(event.target)) setDropdown(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
      setDropdown(false);
    }
  });

  const reveals = document.querySelectorAll(".reveal-up");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    reveals.forEach((item) => observer.observe(item));
  } else {
    reveals.forEach((item) => item.classList.add("is-visible"));
  }

  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".tilt-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--tilt-y", `${x * 7}deg`);
        card.style.setProperty("--tilt-x", `${y * -7}deg`);
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });

    document.querySelectorAll(".magnet").forEach((item) => {
      item.addEventListener("pointermove", (event) => {
        const rect = item.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.08;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.12;
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
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Build photo viewer");
    lightbox.innerHTML = `
      <div class="lightbox-dialog">
        <button class="lightbox-close" type="button" aria-label="Close gallery">×</button>
        <button class="lightbox-prev" type="button" aria-label="Previous photo">‹</button>
        <div class="lightbox-frame">
          <img alt="">
        </div>
        <button class="lightbox-next" type="button" aria-label="Next photo">›</button>
        <p class="lightbox-caption"></p>
      </div>
    `;
    document.body.appendChild(lightbox);

    const lightboxImage = lightbox.querySelector("img");
    const lightboxCaption = lightbox.querySelector(".lightbox-caption");
    const closeButton = lightbox.querySelector(".lightbox-close");
    const prevButton = lightbox.querySelector(".lightbox-prev");
    const nextButton = lightbox.querySelector(".lightbox-next");

    function setLightboxImage(index) {
      activeIndex = (index + lightboxLinks.length) % lightboxLinks.length;
      const link = lightboxLinks[activeIndex];
      const image = link.querySelector("img");
      const caption = link.dataset.caption || image?.alt || "Build gallery photo";
      lightboxImage.src = link.href;
      lightboxImage.alt = image?.alt || caption;
      lightboxCaption.textContent = caption;
    }

    function openLightbox(index) {
      setLightboxImage(index);
      lightbox.classList.add("is-open");
      document.body.style.overflow = "hidden";
      closeButton.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    lightboxLinks.forEach((link, index) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openLightbox(index);
      });
    });

    closeButton.addEventListener("click", closeLightbox);
    prevButton.addEventListener("click", () => setLightboxImage(activeIndex - 1));
    nextButton.addEventListener("click", () => setLightboxImage(activeIndex + 1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowLeft") setLightboxImage(activeIndex - 1);
      if (event.key === "ArrowRight") setLightboxImage(activeIndex + 1);
    });
  }

  const form = document.querySelector("#quote-form");
  if (!form) return;

  const steps = Array.from(form.querySelectorAll("[data-step]"));
  const stepDots = Array.from(form.querySelectorAll("[data-step-dot]"));
  const prevBtn = form.querySelector("[data-prev-step]");
  const nextBtn = form.querySelector("[data-next-step]");
  const submitBtn = document.querySelector("#submitBtn");
  const restoreBtn = document.querySelector("#restoreBtn");
  const resetDraftBtn = document.querySelector("#resetDraftBtn");
  const copySummaryBtn = document.querySelector("#copySummaryBtn");
  const draftHint = document.querySelector("#draftHint");
  const timestamp = document.querySelector("#ts");
  const summaryBox = document.querySelector("#quote-summary");
  const summaryInput = document.querySelector("#quote-summary-input");
  const contactMethod = document.querySelector("#contact-method");
  const contactEmail = document.querySelector("#contact-email");
  const contactPhone = document.querySelector("#contact-phone");
  const email = document.querySelector("#email");
  const phone = document.querySelector("#phone");
  const overlay = document.querySelector("#submittingOverlay");
  const draftKey = "jjCustomPcQuoteDraft";
  const draftMaxAge = 24 * 60 * 60 * 1000;
  let currentStep = 0;

  function namedFields(name) {
    const fields = form.elements[name];
    if (!fields) return [];
    if (fields instanceof RadioNodeList || fields.length !== undefined) return Array.from(fields);
    return [fields];
  }

  function fieldValues(name) {
    return namedFields(name)
      .filter((field) => field.checked || !["checkbox", "radio"].includes(field.type))
      .map((field) => field.value.trim())
      .filter(Boolean);
  }

  function singleValue(name) {
    return fieldValues(name)[0] || "";
  }

  function setDraftHint(message) {
    if (draftHint) draftHint.textContent = message;
  }

  function syncContactFields() {
    const method = contactMethod ? contactMethod.value : "";
    if (contactEmail) contactEmail.classList.toggle("is-visible", method === "email");
    if (contactPhone) contactPhone.classList.toggle("is-visible", method === "phone");
    if (email) {
      email.required = method === "email";
      if (method !== "email") email.value = "";
    }
    if (phone) {
      phone.required = method === "phone";
      if (method !== "phone") phone.value = "";
    }
  }

  function generateSummaryText() {
    const lines = [
      "JJ's Custom PCs Quote Request",
      "",
      `Project type: ${singleValue("project_type") || "Not selected"}`,
      `Budget: ${singleValue("budget") || "Not selected"}`,
      `Use case: ${fieldValues("use_case").join(", ") || "Not selected"}`,
      `Use-case notes: ${singleValue("use_case_notes") || "None provided"}`,
      `Performance target: ${singleValue("performance_target") || "Not selected"}`,
      `Style/theme: ${singleValue("style_theme") || "Not selected"}`,
      `Existing parts: ${singleValue("existing_parts_status") || "Not selected"}`,
      `Parts list/details: ${singleValue("parts") || "None provided"}`,
      "",
      "Contact",
      `Name: ${singleValue("name") || "Not provided"}`,
      `Preferred contact method: ${singleValue("contact_method") || "Not selected"}`,
      `Email: ${singleValue("email") || "Not requested/provided"}`,
      `Phone: ${singleValue("phone") || "Not requested/provided"}`,
      `Additional notes: ${singleValue("message") || "None provided"}`,
    ];
    return lines.join("\n");
  }

  function updateSummary() {
    const text = generateSummaryText();
    if (summaryInput) summaryInput.value = text;
    if (summaryBox) {
      summaryBox.innerHTML = "";
      text.split("\n").forEach((line) => {
        const item = document.createElement(line ? "p" : "div");
        item.textContent = line;
        summaryBox.appendChild(item);
      });
    }
    return text;
  }

  function showStep(index) {
    currentStep = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === currentStep);
    });
    stepDots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentStep);
      dot.classList.toggle("is-complete", dotIndex < currentStep);
    });
    if (prevBtn) prevBtn.hidden = currentStep === 0;
    if (nextBtn) nextBtn.hidden = currentStep === steps.length - 1;
    if (submitBtn) submitBtn.hidden = currentStep !== steps.length - 1;
    if (currentStep === steps.length - 1) updateSummary();
  }

  function validateStep(index) {
    const step = steps[index];
    const fields = Array.from(step.querySelectorAll("input, select, textarea"));
    const radioNames = new Set();

    for (const field of fields) {
      if (field.disabled || field.type === "hidden") continue;
      if (field.type === "radio") {
        if (field.required) radioNames.add(field.name);
        continue;
      }
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    for (const name of radioNames) {
      if (!singleValue(name)) {
        const firstRadio = step.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]`);
        if (firstRadio) firstRadio.reportValidity();
        return false;
      }
    }

    return true;
  }

  function collectDraft() {
    const data = { savedAt: Date.now(), currentStep, fields: {} };
    Array.from(form.elements).forEach((field) => {
      if (!field.name || field.name.startsWith("_")) return;
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
    try {
      localStorage.setItem(draftKey, JSON.stringify(collectDraft()));
      setDraftHint("Draft saved locally for 24 hours.");
    } catch (error) {
      setDraftHint("Draft could not be saved.");
    }
  }

  function clearDraft(message) {
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
        setDraftHint("No saved draft found.");
        return;
      }

      const data = JSON.parse(raw);
      if (!data.savedAt || Date.now() - data.savedAt > draftMaxAge) {
        clearDraft("Saved draft expired after 24 hours.");
        return;
      }

      Array.from(form.elements).forEach((field) => {
        if (!field.name || field.name.startsWith("_")) return;
        const saved = data.fields[field.name];
        if (field.type === "checkbox") field.checked = Array.isArray(saved) && saved.includes(field.value);
        else if (field.type === "radio") field.checked = saved === field.value;
        else if (saved !== undefined) field.value = saved;
      });

      syncContactFields();
      showStep(data.currentStep || 0);
      updateSummary();
      setDraftHint("Draft restored.");
    } catch (error) {
      setDraftHint("Draft could not be restored.");
    }
  }

  if (contactMethod) {
    contactMethod.addEventListener("change", () => {
      syncContactFields();
      saveDraft();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => showStep(currentStep - 1));
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!validateStep(currentStep)) return;
      showStep(currentStep + 1);
      saveDraft();
    });
  }

  if (restoreBtn) restoreBtn.addEventListener("click", restoreDraft);
  if (resetDraftBtn) resetDraftBtn.addEventListener("click", () => clearDraft("Saved draft reset."));
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener("click", async () => {
      const text = updateSummary();
      try {
        await navigator.clipboard.writeText(text);
        setDraftHint("Summary copied.");
      } catch (error) {
        setDraftHint("Summary ready to select and copy.");
      }
    });
  }

  form.addEventListener("input", () => {
    syncContactFields();
    updateSummary();
    saveDraft();
  });

  syncContactFields();
  showStep(0);
  updateSummary();

  form.addEventListener("submit", (event) => {
    if (!validateStep(currentStep)) {
      event.preventDefault();
      return;
    }

    if (timestamp) timestamp.value = Math.floor(Date.now() / 1000);
    updateSummary();

    if (overlay) overlay.classList.add("is-visible");
    if (submitBtn) submitBtn.disabled = true;
    clearDraft("Quote submitted. Saved draft cleared.");

    setTimeout(() => {
      if (overlay) overlay.classList.remove("is-visible");
      if (submitBtn) submitBtn.disabled = false;
    }, 12000);
  });
})();
