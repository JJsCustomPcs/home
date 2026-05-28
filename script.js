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

  const form = document.querySelector("#quote-form");
  if (!form) return;

  const contactMethod = document.querySelector("#contact-method");
  const contactEmail = document.querySelector("#contact-email");
  const contactPhone = document.querySelector("#contact-phone");
  const email = document.querySelector("#email");
  const phone = document.querySelector("#phone");
  const buildType = document.querySelector("#build-type");
  const budgetField = document.querySelector("#budget-field");
  const useCaseField = document.querySelector("#use-case-field");
  const specificFields = document.querySelector("#specific-fields");
  const overlay = document.querySelector("#submittingOverlay");
  const submitBtn = document.querySelector("#submitBtn");
  const restoreBtn = document.querySelector("#restoreBtn");
  const draftHint = document.querySelector("#draftHint");
  const timestamp = document.querySelector("#ts");
  const draftKey = "jjCustomPcQuoteDraft";

  function syncContactFields() {
    const method = contactMethod.value;
    contactEmail.classList.toggle("is-visible", method === "email");
    contactPhone.classList.toggle("is-visible", method === "phone");
    email.required = method === "email";
    phone.required = method === "phone";
  }

  function syncBuildFields() {
    const specific = buildType.value === "specific";
    budgetField.hidden = specific;
    useCaseField.hidden = specific;
    specificFields.hidden = !specific;
  }

  function syncDynamicFields() {
    syncContactFields();
    syncBuildFields();
  }

  function formDataObject() {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (!key.startsWith("_")) data[key] = value;
    });
    data.agree = document.querySelector("#agree").checked;
    return data;
  }

  function saveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify(formDataObject()));
      if (draftHint) draftHint.textContent = "Draft saved locally.";
    } catch (error) {
      if (draftHint) draftHint.textContent = "Draft could not be saved.";
    }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) {
        if (draftHint) draftHint.textContent = "No saved draft found.";
        return;
      }
      const data = JSON.parse(raw);
      Object.entries(data).forEach(([key, value]) => {
        const field = form.elements[key];
        if (!field) return;
        if (field.type === "checkbox") field.checked = Boolean(value);
        else field.value = value;
      });
      syncContactFields();
      syncBuildFields();
      if (draftHint) draftHint.textContent = "Draft restored.";
    } catch (error) {
      if (draftHint) draftHint.textContent = "Draft could not be restored.";
    }
  }

  contactMethod.addEventListener("change", () => {
    syncContactFields();
    saveDraft();
  });
  buildType.addEventListener("change", () => {
    syncBuildFields();
    saveDraft();
  });
  form.addEventListener("input", saveDraft);
  if (restoreBtn) restoreBtn.addEventListener("click", restoreDraft);

  syncDynamicFields();
  requestAnimationFrame(syncDynamicFields);
  window.addEventListener("pageshow", syncDynamicFields);

  form.addEventListener("submit", (event) => {
    if (timestamp) timestamp.value = Math.floor(Date.now() / 1000);

    if (!contactMethod.value) {
      event.preventDefault();
      contactMethod.focus();
      if (draftHint) draftHint.textContent = "Choose Email or Phone before submitting.";
      return;
    }

    if (overlay) overlay.classList.add("is-visible");
    if (submitBtn) submitBtn.disabled = true;

    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      // FormSubmit still handles the real submission.
    }

    setTimeout(() => {
      if (overlay) overlay.classList.remove("is-visible");
      if (submitBtn) submitBtn.disabled = false;
    }, 12000);
  });
})();
