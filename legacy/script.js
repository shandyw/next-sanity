(function () {
  "use strict";

  /* ---------- Header menu toggle (compact nav below 1024px) ---------- */
  const menuToggle = document.getElementById("menuToggle");
  const primaryNav = document.getElementById("primaryNav");

  function closeMenu() {
    primaryNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  }

  menuToggle.addEventListener("click", function () {
    const isOpen = primaryNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  primaryNav.querySelectorAll("a, button").forEach(function (el) {
    el.addEventListener("click", function () {
      if (window.innerWidth <= 1023 && !el.hasAttribute("data-open-dialog")) closeMenu();
    });
  });

  /* ---------- Mobile filter sheet ---------- */
  const filterToggle = document.getElementById("filterSheetToggle");
  const filterSheet = document.getElementById("filterSheet");

  filterToggle.addEventListener("click", function () {
    const isOpen = filterSheet.classList.toggle("is-open");
    filterToggle.setAttribute("aria-expanded", String(isOpen));
    filterToggle.setAttribute("aria-label", isOpen ? "Close filters" : "Open filters");
  });

  /* ---------- Filter controls ---------- */
  const clearFiltersBtn = document.getElementById("clearFilters");
  const priceSelect = document.getElementById("filterPrice");
  const sortSelect = document.getElementById("filterSort");
  const searchInput = document.getElementById("searchInput");
  const filterStatus = document.getElementById("filterStatus");

  let activePill = "all";

  function updateClearFiltersVisibility() {
    const hasActive =
      priceSelect.value !== "" ||
      sortSelect.value !== "" ||
      searchInput.value.trim() !== "" ||
      activePill !== "all";
    clearFiltersBtn.hidden = !hasActive;
    applyReviewFilters();
  }

  [priceSelect, sortSelect].forEach(function (el) {
    el.addEventListener("change", updateClearFiltersVisibility);
  });
  searchInput.addEventListener("input", updateClearFiltersVisibility);

  clearFiltersBtn.addEventListener("click", function () {
    priceSelect.value = "";
    sortSelect.value = "";
    searchInput.value = "";
    setActivePill("all");
    updateClearFiltersVisibility();
  });

  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    document.getElementById("trending").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  /* ---------- Filter pills ---------- */
  const pillRow = document.getElementById("pillRow");

  function setActivePill(slug) {
    activePill = slug;
    pillRow.querySelectorAll(".pill").forEach(function (btn) {
      btn.setAttribute("aria-selected", String(btn.dataset.slug === slug));
    });
  }

  if (pillRow && typeof FILTER_PILLS !== "undefined") {
    FILTER_PILLS.forEach(function (pill) {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pill";
      btn.dataset.slug = pill.slug;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(!!pill.active));
      btn.textContent = pill.label.replace(/&amp;/g, "&");
      li.appendChild(btn);
      pillRow.appendChild(li);
      if (pill.active) activePill = pill.slug;
    });

    pillRow.addEventListener("click", function (e) {
      const btn = e.target.closest(".pill");
      if (!btn) return;
      setActivePill(btn.dataset.slug);
      updateClearFiltersVisibility();
    });
  }

    /* ---------- Review cards ----------
      Bold title, short blurb, and an optional sale label.
     Title and image both link to the review page. Missing data is
     omitted rather than rendered as "undefined". */
  function safe(value) {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function buildMediaSlider(review) {
    const images = (review.images || []).filter(Boolean);
    const multiple = images.length > 1;
    const href = review.url || "#";
    const fitClass = review.fit === "product" ? " is-product" : "";

    if (images.length === 0) {
      return '<div class="review-card__media review-card__media--empty">' +
               '<span class="ph-label">No image yet</span>' +
             '</div>';
    }

    const slides = images.map(function (src, i) {
      return (
        '<li class="card-slider__slide" role="group" aria-roledescription="slide" ' +
        'aria-label="Image ' + (i + 1) + ' of ' + images.length + '">' +
          '<img src="' + src + '" alt="" loading="lazy" draggable="false" />' +
        '</li>'
      );
    }).join("");

    const dots = multiple
      ? '<div class="card-slider__dots" role="tablist" aria-label="Product images">' +
          images.map(function (src, i) {
            return (
              '<button type="button" class="card-slider__dot' + (i === 0 ? " is-active" : "") + '" ' +
              'role="tab" data-index="' + i + '" ' +
              'aria-selected="' + (i === 0 ? "true" : "false") + '" ' +
              'aria-label="Show image ' + (i + 1) + '"></button>'
            );
          }).join("") +
        '</div>'
      : "";

    const saleBadge = review.onSale === true && review.sale && review.sale.price
      ? '<span class="badge badge-sale">Sale</span>'
      : "";

    const playLink = review.type === "video"
      ? '<a class="play-control" href="' + href + '" aria-label="Watch the video review for ' +
        safe(review.title) + '">' +
          '<span class="play-control__icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>' +
          '</span>' +
        '</a>'
      : "";

    return (
      '<div class="review-card__media' + fitClass +
        (multiple ? " review-card__media--slider" : "") + '">' +
        '<a class="review-card__media-link" href="' + href + '" tabindex="-1" aria-hidden="true">' +
          '<div class="card-slider" data-slider>' +
            '<ul class="card-slider__track">' + slides + '</ul>' +
          '</div>' +
        '</a>' +
        saleBadge +
        playLink +
        dots +
      '</div>'
    );
  }

  function renderReviewCard(review) {
    const li = document.createElement("li");
    li.className = "review-card";
    li.dataset.category = safe(review.category).toLowerCase();
    li.dataset.price = review.priceValue == null ? "" : String(review.priceValue);
    li.dataset.search = [review.title, review.blurb, review.category].map(safe).join(" ").toLowerCase();

    const title = safe(review.title);
    const blurb = safe(review.blurb);

    const titleMarkup = title
      ? '<h3 class="review-card__title">' +
          '<a class="review-card__title-link" href="' + (review.url || "#") + '">' + title + '</a>' +
        '</h3>'
      : "";

    const blurbMarkup = blurb
      ? '<p class="review-card__blurb">' + blurb + '</p>'
      : "";

    let priceMarkup = "";
    if (review.onSale === true && review.sale && review.sale.price) {
      priceMarkup = '<p class="review-card__price">' +
        (review.sale.was ? '<s class="review-card__was">' + safe(review.sale.was) + '</s> ' : "") +
        '<span class="review-card__now">' + safe(review.sale.price) + '</span></p>';
    }

    li.innerHTML =
      '<article class="review-card__body">' +
        buildMediaSlider(review) +
        titleMarkup +
        blurbMarkup +
        priceMarkup +
      '</article>';

    return li;
  }

  function renderGrid(gridId, data) {
    const grid = document.getElementById(gridId);
    if (!grid || !data) return;
    data.forEach(function (review, index) {
      const card = renderReviewCard(review);
      card.dataset.originalOrder = String(index);
      grid.appendChild(card);
    });
  }

  function applyReviewFilters() {
    const cards = Array.from(document.querySelectorAll(".review-card"));
    const query = searchInput.value.trim().toLowerCase();
    const priceRanges = {
      "0-25": function (value) { return value >= 0 && value < 25; },
      "25-50": function (value) { return value >= 25 && value <= 50; },
      "50-100": function (value) { return value > 50 && value <= 100; },
      "100+": function (value) { return value > 100; }
    };
    const priceMatches = priceRanges[priceSelect.value];

    cards.forEach(function (card) {
      const hasPrice = card.dataset.price !== "";
      const price = Number(card.dataset.price);
      const categoryMatches = activePill === "all" ||
        (activePill === "on-sale" ? card.querySelector(".badge-sale") !== null : card.dataset.category === activePill);
      const searchMatches = !query || card.dataset.search.indexOf(query) !== -1;
      const priceMatchesCard = !priceMatches || (hasPrice && priceMatches(price));
      card.hidden = !(categoryMatches && searchMatches && priceMatchesCard);
    });

    const visibleCount = cards.filter(function (card) { return !card.hidden; }).length;
    filterStatus.hidden = visibleCount !== 0;
    filterStatus.textContent = visibleCount === 0 ? "No reviews match those filters." : "";

    document.querySelectorAll(".review-grid").forEach(function (grid) {
      const sorted = Array.from(grid.children).sort(function (a, b) {
        if (sortSelect.value === "price-low" || sortSelect.value === "price-high") {
          const aHasPrice = a.dataset.price !== "";
          const bHasPrice = b.dataset.price !== "";
          if (aHasPrice !== bHasPrice) return aHasPrice ? -1 : 1;
          const difference = Number(a.dataset.price) - Number(b.dataset.price);
          return sortSelect.value === "price-low" ? difference : -difference;
        }
        return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
      });
      sorted.forEach(function (card) { grid.appendChild(card); });
    });
  }

  if (typeof TRENDING_REVIEWS !== "undefined") renderGrid("trendingGrid", TRENDING_REVIEWS);
  applyReviewFilters();

  /* ---------- Swipeable card sliders ---------- */
  document.querySelectorAll("[data-slider]").forEach(function (slider) {
    const track = slider.querySelector(".card-slider__track");
    const dots = Array.prototype.slice.call(slider.querySelectorAll(".card-slider__dot"));
    if (!track || dots.length === 0) return;

    function slideWidth() { return track.clientWidth; }
    function activeIndex() {
      const w = slideWidth();
      return w ? Math.round(track.scrollLeft / w) : 0;
    }

    function syncDots() {
      const current = activeIndex();
      dots.forEach(function (dot, i) {
        const on = i === current;
        dot.classList.toggle("is-active", on);
        dot.setAttribute("aria-selected", String(on));
      });
    }

    let scrollTimer = null;
    track.addEventListener("scroll", function () {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(syncDots, 80);
    });

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        track.scrollTo({ left: i * slideWidth(), behavior: "smooth" });
      });
    });

    let dragging = false, startX = 0, startScroll = 0, moved = false;

    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true; moved = false;
      startX = e.clientX; startScroll = track.scrollLeft;
      track.classList.add("is-dragging");
    });

    track.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      const delta = e.clientX - startX;
      if (Math.abs(delta) > 4) moved = true;
      track.scrollLeft = startScroll - delta;
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove("is-dragging");
      const w = slideWidth();
      if (w) {
        const target = Math.round(track.scrollLeft / w) * w;
        track.scrollTo({ left: target, behavior: "smooth" });
      }
      window.setTimeout(syncDots, 220);
    }

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("pointerleave", endDrag);

    track.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);

    syncDots();
  });

  /* ---------- Request dialog ---------- */
  const dialogBackdrop = document.getElementById("dialogBackdrop");
  const dialog = document.getElementById("requestDialog");
  const dialogClose = document.getElementById("dialogClose");
  const requestForm = document.getElementById("requestForm");
  const requestStatus = document.getElementById("requestStatus");
  let lastTrigger = null;

  function getFocusable(container) {
    return Array.from(
      container.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
  }

  function openDialog(trigger) {
    lastTrigger = trigger;
    dialogBackdrop.hidden = false;
    document.body.style.overflow = "hidden";
    const focusables = getFocusable(dialog);
    if (focusables.length) focusables[0].focus();
    document.addEventListener("keydown", onDialogKeydown);
  }

  function closeDialog() {
    dialogBackdrop.hidden = true;
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onDialogKeydown);
    if (lastTrigger) lastTrigger.focus();
  }

  function onDialogKeydown(e) {
    if (e.key === "Escape") { closeDialog(); return; }
    if (e.key === "Tab") {
      const focusables = getFocusable(dialog);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  }

  document.querySelectorAll("[data-open-dialog]").forEach(function (btn) {
    btn.addEventListener("click", function () { openDialog(btn); });
  });
  dialogClose.addEventListener("click", closeDialog);
  dialogBackdrop.addEventListener("click", function (e) {
    if (e.target === dialogBackdrop) closeDialog();
  });

  requestForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const emailField = document.getElementById("reqEmail");
    const productField = document.getElementById("reqProduct");
    const emailError = document.getElementById("reqEmailError");
    const productError = document.getElementById("reqProductError");

    let valid = true;

    if (!emailField.value.trim() || !emailField.checkValidity()) {
      emailError.textContent = "Please enter a valid email address.";
      emailField.closest(".form-row").classList.add("has-error");
      valid = false;
    } else {
      emailError.textContent = "";
      emailField.closest(".form-row").classList.remove("has-error");
    }

    if (!productField.value.trim()) {
      productError.textContent = "Please tell me the product name or link.";
      productField.closest(".form-row").classList.add("has-error");
      valid = false;
    } else {
      productError.textContent = "";
      productField.closest(".form-row").classList.remove("has-error");
    }

    if (!valid) { requestStatus.textContent = ""; return; }

    requestStatus.textContent = "This page isn't connected to a request service yet. Nothing was sent.";
  });

  /* ---------- Newsletter form (footer) ---------- */
  const newsletterForm = document.getElementById("newsletterForm");
  const newsletterStatus = document.getElementById("newsletterStatus");

  if (newsletterForm && newsletterStatus) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const emailField = document.getElementById("newsletterEmail");
      if (!emailField.checkValidity()) {
        newsletterStatus.style.color = "var(--color-error)";
        newsletterStatus.textContent = "Please enter a valid email address.";
        return;
      }
      newsletterStatus.style.color = "var(--color-text-secondary)";
      newsletterStatus.textContent = "This page isn't connected to a mailing list yet. Nothing was submitted.";
    });
  }
})();
