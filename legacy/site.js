(function () {
  "use strict";

  const menuToggle = document.getElementById("menuToggle");
  const primaryNav = document.getElementById("primaryNav");
  if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", function () {
      const open = primaryNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    document.addEventListener("click", function (event) {
      if (window.innerWidth > 1023 || !primaryNav.classList.contains("is-open")) return;
      if (primaryNav.contains(event.target) || menuToggle.contains(event.target)) return;
      // Dialog interactions keep the menu trigger available for focus restoration.
      if (event.target.closest(".dialog-backdrop")) return;
      primaryNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open menu");
      if (primaryNav.contains(document.activeElement)) menuToggle.focus();
    });
    primaryNav.querySelectorAll("a, button").forEach(function (item) {
      item.addEventListener("click", function () {
        if (window.innerWidth <= 1023 && !item.hasAttribute("data-open-dialog") && !item.hasAttribute("data-open-contact")) {
          primaryNav.classList.remove("is-open");
          menuToggle.setAttribute("aria-expanded", "false");
          menuToggle.setAttribute("aria-label", "Open menu");
        }
      });
    });
  }

  window.CurvyInnerHero = {
    create: function (title, description, eyebrow) {
      const hero = document.createElement("header");
      hero.className = "inner-hero";
      const paper = document.createElement("div");
      paper.className = "inner-hero__paper";
      [["p", "inner-hero__eyebrow", eyebrow], ["h1", "inner-hero__title", title], ["p", "inner-hero__intro", description]].forEach(function (entry) {
        const node = document.createElement(entry[0]);
        node.className = entry[1];
        node.textContent = entry[2];
        paper.appendChild(node);
      });
      const note = document.createElement("span");
      note.className = "inner-hero__note";
      note.setAttribute("aria-hidden", "true");
      note.textContent = "No pretending.";
      hero.append(paper, note);
      return hero;
    }
  };

  function initializeVideos(root) {
    root.querySelectorAll('[data-video-player]').forEach(function (player) {
      if (player.dataset.initialized) return;
      player.dataset.initialized = "true";
      const video = player.querySelector("video");
      if (!video) return;
      function sizeToVideo() {
        if (video.videoWidth && video.videoHeight) {
          const sourceRatio = video.videoWidth / video.videoHeight;
          const maxRatio = Number(player.dataset.videoMaxAspect);
          video.style.aspectRatio = String(maxRatio > 0 ? Math.min(sourceRatio, maxRatio) : sourceRatio);
        }
      }
      video.preload = "metadata";
      video.addEventListener("loadedmetadata", sizeToVideo);
      video.addEventListener("resize", sizeToVideo);
      sizeToVideo();
      const button = document.createElement("button");
      button.type = "button";
      button.className = "video-player__toggle";
      button.setAttribute("aria-controls", video.id);
      const icon = document.createElement("span");
      icon.className = "play-control";
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
      const status = document.createElement("p");
      status.className = "video-player__status";
      status.setAttribute("role", "status");
      status.hidden = true;
      function sync() {
        const playing = !video.paused && !video.ended;
        player.classList.toggle("is-playing", playing);
        button.setAttribute("aria-label", playing ? "Pause video" : "Play video");
        icon.innerHTML = playing
          ? '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z" fill="currentColor"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
      }
      button.addEventListener("click", async function () {
        if (!video.paused && !video.ended) {
          video.pause();
          sync();
          return;
        }
        status.hidden = true;
        try {
          await video.play();
        } catch (_) {
          status.textContent = "The video couldn’t play. Please try again.";
          status.hidden = false;
        }
        sync();
      });
      ["play", "pause", "ended"].forEach(function (event) { video.addEventListener(event, sync); });
      video.controls = false;
      player.append(button, status);
      sync();
    });
  }
  window.CurvyVideoPlayer = { initialize: initializeVideos };
  initializeVideos(document);

  const latestGrid = document.getElementById("trendingGrid");
  if (latestGrid && Array.isArray(window.REVIEW_COLLECTION) && window.CurvyReviewCards) {
    latestGrid.replaceChildren();
    const reviews = window.REVIEW_COLLECTION.filter(function (review) { return review.published !== false; });
    const dated = reviews.length > 0 && reviews.every(function (review) {
      return Number.isFinite(Date.parse(review.publishedAt || ""));
    });
    if (dated) reviews.sort(function (a, b) { return Date.parse(b.publishedAt) - Date.parse(a.publishedAt); });
    reviews.slice(0, 3).forEach(function (review) {
      latestGrid.appendChild(window.CurvyReviewCards.create(review));
    });
    window.CurvyReviewCards.initializeSliders(latestGrid);
  }

  // Use native, keyboard-accessible validation for both search forms.
  document.querySelectorAll('#homeSearchInput, #reviewsSearchInput').forEach(function (input) {
    input.addEventListener("input", function () {
      input.setCustomValidity(input.value && !input.value.trim() ? "Enter a search term." : "");
    });
    input.addEventListener("invalid", function () {
      if (!input.value.trim()) input.setCustomValidity("Enter a search term.");
    });
  });

  const searchForm = document.getElementById("homeSearchForm");
  const homeSearch = document.getElementById("homeSearchInput");
  if (searchForm && homeSearch) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const query = homeSearch.value.trim();
      const url = new URL("/reviews", window.location.origin);
      if (query) url.searchParams.set("q", query);
      window.location.assign(url.pathname + url.search);
    });
  }

  const dialogBackdrop = document.getElementById("dialogBackdrop");
  const dialog = document.getElementById("requestDialog");
  const dialogClose = document.getElementById("dialogClose");
  const requestForm = document.getElementById("requestForm");
  const requestStatus = document.getElementById("requestStatus");
  let lastTrigger = null;

  function focusableElements(container) {
    return Array.from(container.querySelectorAll("a[href], button, input, textarea, select, [tabindex]:not([tabindex='-1'])"))
      .filter(function (element) { return !element.disabled && element.offsetParent !== null; });
  }

  function closeRequestDialog() {
    if (!dialogBackdrop || dialogBackdrop.hidden) return;
    dialogBackdrop.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", trapDialogFocus);
    if (lastTrigger) lastTrigger.focus();
  }

  function trapDialogFocus(event) {
    if (event.key === "Escape") {
      closeRequestDialog();
      return;
    }
    if (event.key !== "Tab" || !dialog) return;
    const items = focusableElements(dialog);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (dialogBackdrop && dialog && dialogClose) {
    document.querySelectorAll("[data-open-dialog]").forEach(function (button) {
      button.addEventListener("click", function () {
        lastTrigger = button;
        dialogBackdrop.hidden = false;
        document.body.style.overflow = "hidden";
        const items = focusableElements(dialog);
        if (items.length) items[0].focus();
        document.addEventListener("keydown", trapDialogFocus);
      });
    });
    dialogClose.addEventListener("click", closeRequestDialog);
    dialogBackdrop.addEventListener("click", function (event) {
      if (event.target === dialogBackdrop) closeRequestDialog();
    });
  }

  if (requestForm && requestStatus) {
    requestForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const email = document.getElementById("reqEmail");
      const product = document.getElementById("reqProduct");
      const emailError = document.getElementById("reqEmailError");
      const productError = document.getElementById("reqProductError");
      let valid = true;
      [[email, emailError, "Please enter a valid email address."],
       [product, productError, "Please tell me the product name or link."]].forEach(function (entry) {
        const field = entry[0];
        const error = entry[1];
        const message = entry[2];
        const fieldValid = field.value.trim() && field.checkValidity();
        error.textContent = fieldValid ? "" : message;
        field.closest(".form-row").classList.toggle("has-error", !fieldValid);
        if (!fieldValid) valid = false;
      });
      requestStatus.textContent = valid ? "This page isn't connected to a request service yet. Nothing was sent." : "";
    });
  }

  // Contact shares the request dialog's visual components and keyboard behavior.
  {
    const contactBackdrop = document.createElement("div");
    contactBackdrop.className = "dialog-backdrop";
    contactBackdrop.hidden = true;
    contactBackdrop.innerHTML = '<div class="dialog" role="dialog" aria-modal="true"></div>';
    contactBackdrop.id = "contactBackdrop";
    const contactDialog = contactBackdrop.querySelector(".dialog");
    contactDialog.id = "contactDialog";
    contactDialog.setAttribute("aria-labelledby", "contactTitle");
    contactDialog.innerHTML = `
      <button type="button" class="dialog-close" aria-label="Close contact dialog">×</button>
      <h2 id="contactTitle" class="headline-md">Contact</h2>
      <p class="body-md dialog-intro">Have a question or something to share? Leave me a message.</p>
      <form id="contactForm" novalidate>
        <div class="form-row"><label for="contactName">Name <span class="optional">(optional)</span></label><input id="contactName" name="name" autocomplete="name" type="text"></div>
        <div class="form-row"><label for="contactEmail">Email <span class="required">(required)</span></label><input id="contactEmail" name="email" autocomplete="email" type="email" required aria-describedby="contactEmailError contactDisclosure"><span class="field-error" id="contactEmailError" role="alert"></span></div>
        <div class="form-row"><label for="contactMessage">Message <span class="required">(required)</span></label><textarea id="contactMessage" name="message" rows="4" required aria-describedby="contactMessageError"></textarea><span class="field-error" id="contactMessageError" role="alert"></span></div>
        <p id="contactDisclosure" class="contact-disclosure">Your email is requested so I can reply to your message, not to subscribe you to marketing emails. This opens your email app with your details addressed to contact@curvygirlreviews.com. You must send the message there; this site does not store your form entries.</p>
        <div class="dialog-actions"><button type="submit" class="btn btn-accent">Continue to email</button></div>
        <p class="form-status" id="contactStatus" role="status" aria-live="polite"></p>
      </form>`;
    if (dialogClose) contactDialog.querySelector(".dialog-close").innerHTML = dialogClose.innerHTML;
    document.body.appendChild(contactBackdrop);
    let contactTrigger = null;
    let previousOverflow = "";
    function closeContact() {
      contactBackdrop.hidden = true;
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", contactKeys);
      if (contactTrigger) contactTrigger.focus();
    }
    function contactKeys(event) {
      if (event.key === "Escape") { event.preventDefault(); closeContact(); }
      if (event.key !== "Tab") return;
      const items = focusableElements(contactDialog);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.querySelectorAll("[data-open-contact]").forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        contactTrigger = trigger;
        previousOverflow = document.body.style.overflow;
        contactBackdrop.hidden = false;
        document.body.style.overflow = "hidden";
        contactDialog.querySelector(".dialog-close").focus();
        document.addEventListener("keydown", contactKeys);
      });
    });
    contactDialog.querySelector(".dialog-close").addEventListener("click", closeContact);
    contactBackdrop.addEventListener("click", function (event) { if (event.target === contactBackdrop) closeContact(); });
    contactDialog.querySelector("form").addEventListener("submit", function (event) {
      event.preventDefault();
      let firstInvalid = null;
      [["contactEmail", "Please enter a valid email address."], ["contactMessage", "Please enter a message."]].forEach(function (entry) {
        const field = document.getElementById(entry[0]);
        const valid = Boolean(field.value.trim()) && field.checkValidity();
        field.setAttribute("aria-invalid", String(!valid));
        field.closest(".form-row").classList.toggle("has-error", !valid);
        document.getElementById(entry[0] + "Error").textContent = valid ? "" : entry[1];
        if (!valid && !firstInvalid) firstInvalid = field;
      });
      const status = document.getElementById("contactStatus");
      status.textContent = "";
      if (firstInvalid) { firstInvalid.focus(); return; }
      const name = document.getElementById("contactName").value.trim();
      const email = document.getElementById("contactEmail").value.trim();
      const message = document.getElementById("contactMessage").value.trim();
      const body = (name ? "Name: " + name + "\n" : "") + "Reply to: " + email + "\n\n" + message;
      window.location.href = "mailto:contact@curvygirlreviews.com?subject=" + encodeURIComponent("CurvyGirlReviews contact") + "&body=" + encodeURIComponent(body);
      status.textContent = "Finish sending in your email app. If it didn't open, email contact@curvygirlreviews.com directly. Your message has not been sent by this site.";
    });
  }

  const newsletterForm = document.getElementById("newsletterForm");
  const newsletterStatus = document.getElementById("newsletterStatus");
  if (newsletterForm && newsletterStatus) {
    newsletterForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const email = document.getElementById("newsletterEmail");
      newsletterStatus.style.color = email.checkValidity() ? "var(--color-text-secondary)" : "var(--color-error)";
      newsletterStatus.textContent = email.checkValidity()
        ? "This page isn't connected to a mailing list yet. Nothing was submitted."
        : "Please enter a valid email address.";
    });
  }
})();
