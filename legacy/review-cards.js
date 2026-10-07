(function () {
  "use strict";

  function text(value) {
    return value == null ? "" : String(value);
  }

  function makeLink(review, overrideHref) {
    const href = overrideHref || review.url || "/reviews/";
    const link = document.createElement("a");
    link.href = href;
    link.className = "review-card__media-link";
    link.tabIndex = -1;
    link.setAttribute("aria-hidden", "true");
    return link;
  }

  function createCard(review, options) {
    const config = options || {};
    const format = review.format || review.type;
    const card = document.createElement("li");
    card.className = "review-card";
    card.dataset.category = text(review.category).toLowerCase();
    card.dataset.search = [review.title, review.blurb, review.category, review.brand, review.sizeTried]
      .map(text).join(" ").toLowerCase();

    const article = document.createElement("article");
    article.className = "review-card__body";
    const media = document.createElement("div");
    media.className = "review-card__media" + (review.fit === "product" ? " is-product" : "");
    const images = Array.isArray(review.images) ? review.images.filter(Boolean) : [];

    if (images.length) {
      const slider = document.createElement("div");
      slider.className = "card-slider";
      slider.dataset.slider = "";
      const track = document.createElement("ul");
      track.className = "card-slider__track";

      images.forEach(function (src, index) {
        const slide = document.createElement("li");
        slide.className = "card-slider__slide";
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");
        slide.setAttribute("aria-label", "Image " + (index + 1) + " of " + images.length);
        const image = document.createElement("img");
        image.src = src;
        image.alt = "";
        image.loading = "lazy";
        image.draggable = false;
        slide.appendChild(image);
        track.appendChild(slide);
      });

      slider.appendChild(track);
      media.appendChild(makeLink(review, config.href));
      media.lastElementChild.appendChild(slider);

      if (images.length > 1) {
        const dots = document.createElement("div");
        dots.className = "card-slider__dots";
        dots.setAttribute("role", "group");
        dots.setAttribute("aria-label", "Product images");
        images.forEach(function (_, index) {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "card-slider__dot" + (index === 0 ? " is-active" : "");
          dot.dataset.index = String(index);
          dot.setAttribute("aria-pressed", String(index === 0));
          dot.setAttribute("aria-label", "Show image " + (index + 1));
          dots.appendChild(dot);
        });
        media.appendChild(dots);
        media.classList.add("review-card__media--slider");
      }
    } else {
      media.classList.add("review-card__media--empty");
      const placeholder = document.createElement("span");
      placeholder.className = "ph-label";
      placeholder.textContent = "Image unavailable";
      media.appendChild(placeholder);
    }

    if (review.onSale === true && review.sale && review.sale.price) {
      const badge = document.createElement("span");
      badge.className = "badge badge-sale";
      badge.textContent = "Sale";
      media.appendChild(badge);
    }
    if (format === "video") {
      const play = document.createElement("span");
      play.className = "play-control review-card__play-indicator";
      play.setAttribute("aria-hidden", "true");
      play.innerHTML = '<span class="play-control__icon"><svg viewBox="0 0 24 24" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"></path></svg></span>';
      media.appendChild(play);
    }
    article.appendChild(media);

    if (review.title) {
      const heading = document.createElement(config.headingLevel === 2 ? "h2" : "h3");
      heading.className = "review-card__title";
      const link = document.createElement("a");
      link.className = "review-card__title-link";
      link.href = config.href || review.url || "/reviews/";
      link.textContent = text(review.title);
      heading.appendChild(link);
      article.appendChild(heading);
    }

    if (review.brand || review.sizeTried) {
      const meta = document.createElement("p");
      meta.className = "review-card__meta";
      meta.textContent = [review.brand, review.sizeTried ? "Size: " + text(review.sizeTried) : ""].filter(Boolean).join(" · ");
      article.appendChild(meta);
    }

    if (review.category && config.showCategory !== false) {
      const category = document.createElement("p");
      category.className = "review-card__category";
      category.textContent = text(review.category);
      article.appendChild(category);
    }

    if (review.blurb) {
      const blurb = document.createElement("p");
      blurb.className = "review-card__blurb";
      blurb.textContent = text(review.blurb);
      article.appendChild(blurb);
    }

    const reviewedPrice = review.reviewedPrice == null ? review.priceValue : review.reviewedPrice;
    if (reviewedPrice != null && String(reviewedPrice).trim() !== "" && typeof reviewedPrice !== "boolean" && Number.isFinite(Number(reviewedPrice))) {
      const price = document.createElement("p");
      price.className = "review-card__price";
      price.textContent = "Price when reviewed: $" + Number(reviewedPrice).toFixed(2);
      article.appendChild(price);
    }

    if (format === "video" || format === "written" || review.title) {
      const cta = document.createElement("a");
      cta.className = "review-card__cta";
      cta.href = config.href || review.url || "/reviews/";
      cta.textContent = format === "video" ? "Watch Review" : format === "written" ? "Read Review" : "View Review";
      article.appendChild(cta);
    }

    if (review.onSale === true && review.sale && review.sale.price) {
      const price = document.createElement("p");
      price.className = "review-card__price";
      if (review.sale.was) {
        const was = document.createElement("s");
        was.className = "review-card__was";
        was.textContent = text(review.sale.was);
        price.appendChild(was);
        price.append(" ");
      }
      const now = document.createElement("span");
      now.className = "review-card__now";
      now.textContent = text(review.sale.price);
      price.appendChild(now);
      article.appendChild(price);
    }

    card.appendChild(article);
    return card;
  }

  function initializeSliders(root) {
    (root || document).querySelectorAll("[data-slider]").forEach(function (slider) {
      const track = slider.querySelector(".card-slider__track");
      const dots = Array.from(slider.closest(".review-card__media").querySelectorAll(".card-slider__dot"));
      if (!track || dots.length === 0) return;

      function slideWidth() { return track.clientWidth; }
      function syncDots() {
        const current = slideWidth() ? Math.round(track.scrollLeft / slideWidth()) : 0;
        dots.forEach(function (dot, index) {
          const active = index === current;
          dot.classList.toggle("is-active", active);
          dot.setAttribute("aria-pressed", String(active));
        });
      }
      let timer;
      track.addEventListener("scroll", function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(syncDots, 80);
      });
      dots.forEach(function (dot, index) {
        dot.addEventListener("click", function (event) {
          event.preventDefault();
          event.stopPropagation();
          track.scrollTo({ left: index * slideWidth(), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        });
      });

      let startX = 0;
      let startScroll = 0;
      let dragging = false;
      let moved = false;
      track.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        dragging = true;
        moved = false;
        startX = event.clientX;
        startScroll = track.scrollLeft;
        track.classList.add("is-dragging");
      });
      track.addEventListener("pointermove", function (event) {
        if (!dragging) return;
        const delta = event.clientX - startX;
        if (Math.abs(delta) > 4) moved = true;
        track.scrollLeft = startScroll - delta;
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        track.classList.remove("is-dragging");
        const width = slideWidth();
        if (width) track.scrollTo({ left: Math.round(track.scrollLeft / width) * width, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        window.setTimeout(syncDots, 220);
      }
      track.addEventListener("pointerup", endDrag);
      track.addEventListener("pointercancel", endDrag);
      track.addEventListener("pointerleave", endDrag);
      track.addEventListener("click", function (event) {
        if (moved) {
          event.preventDefault();
          event.stopPropagation();
          moved = false;
        }
      }, true);
      syncDots();
    });
  }

  window.CurvyReviewCards = { create: createCard, initializeSliders: initializeSliders };
})();
