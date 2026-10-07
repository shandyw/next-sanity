(function () {
  "use strict";

  const favoritesOnly = document.body.dataset.collection === "favorites";
  const archivePath = favoritesOnly ? "/my-faves/" : "/reviews/";
  const archiveTitle = favoritesOnly ? "My Faves" : "Fashion Reviews";
  const archiveDescription = favoritesOnly
    ? "Explore Shandy’s favorite clothing reviews, with real-life fit notes and honest opinions from a size 16–18 perspective."
    : "Explore clothing reviews, real-life fit notes, and honest opinions from a size 16–18 perspective.";
  const pageSize = 12;
  const dataset = Array.isArray(window.REVIEW_COLLECTION) ? window.REVIEW_COLLECTION : [];
  const reviews = dataset.filter(function (review) { return review.published !== false && (!favoritesOnly || review.favorite === true); });
  const categories = Array.from(new Set(reviews.map(function (review) {
    return String(review.category || "").trim().toLowerCase();
  }).filter(Boolean))).sort();
  const brands = Array.from(new Set(reviews.map(function (review) { return String(review.brand || "").trim(); }).filter(Boolean))).sort();
  const sizes = Array.from(new Set(reviews.map(function (review) { return String(review.sizeTried || "").trim(); }).filter(Boolean))).sort();
  const prices = Array.from(new Set(reviews.map(function (review) {
    const value = review.reviewedPrice == null ? review.priceValue : review.reviewedPrice;
    return value == null || String(value).trim() === "" || typeof value === "boolean" || !Number.isFinite(Number(value)) ? "" : String(Number(value));
  }).filter(Boolean))).sort(function (a, b) { return Number(a) - Number(b); });
  const formats = Array.from(new Set(reviews.map(function (review) {
    return String(review.format || review.type || "").toLowerCase();
  }).filter(function (value) { return value === "video" || value === "written"; })));
  const supportsVinted = reviews.some(function (review) { return review.availableOnVinted === true; });
  const supportsSale = reviews.some(function (review) { return review.onSale === true && review.sale && review.sale.price; });
  const form = document.getElementById("reviewsSearchForm");
  const queryInput = document.getElementById("reviewsSearchInput");
  const sortControl = document.getElementById("reviewSort");
  const grid = document.getElementById("reviewsGrid");
  const count = document.getElementById("reviewsCount");
  const chips = document.getElementById("activeFilterChips");
  const clearAll = document.getElementById("clearAllFilters");
  const emptyState = document.getElementById("reviewsEmpty");
  const pagination = document.getElementById("reviewsPagination");
  const resultsView = document.getElementById("reviewsResultsView");
  const detailView = document.getElementById("reviewDetailView");
  const filtersDialog = document.getElementById("mobileFiltersDialog");
  const filterOpen = document.getElementById("openReviewFilters");
  const filterForm = document.getElementById("mobileFilterForm");
  const filterDone = document.getElementById("showReviewResults");
  const filterCancel = document.getElementById("cancelReviewFilters");
  const emptyClear = document.getElementById("emptyClearFilters");
  const desktopCategories = document.getElementById("desktopCategoryFilters");
  const mobileCategories = document.getElementById("mobileCategoryFilters");
  const desktopFilters = document.getElementById("desktopAttributeFilters");
  const mobileFilters = document.getElementById("mobileAttributeFilters");
  let triggerBeforeDialog = null;

  function normalizeQuery(value) {
    return String(value || "").trim();
  }

  function readState() {
    const params = new URLSearchParams(window.location.search);
    const page = Number(params.get("page") || "1");
    return {
      query: normalizeQuery(params.get("q")),
      categories: Array.from(new Set(params.getAll("category").map(function (value) {
        return value.trim().toLowerCase();
      }).filter(function (value) { return categories.includes(value); }))),
      brands: Array.from(new Set(params.getAll("brand").filter(function (value) { return brands.includes(value); }))),
      sizes: Array.from(new Set(params.getAll("size").filter(function (value) { return sizes.includes(value); }))),
      minPrice: prices.length && params.get("min_price")?.trim() && Number.isFinite(Number(params.get("min_price"))) ? Number(params.get("min_price")) : null,
      maxPrice: prices.length && params.get("max_price")?.trim() && Number.isFinite(Number(params.get("max_price"))) ? Number(params.get("max_price")) : null,
      formats: Array.from(new Set(params.getAll("format").filter(function (value) { return formats.includes(value); }))),
      vinted: supportsVinted && params.get("vinted") === "1",
      sale: supportsSale && params.get("sale") === "1",
      sort: ["newest", "price-low", "price-high"].includes(params.get("sort")) && (params.get("sort") === "newest" || prices.length)
        ? params.get("sort") : "newest",
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      reviewId: params.get("review") || ""
    };
  }

  function makeUrl(state, options) {
    const config = options || {};
    const params = new URLSearchParams();
    const query = normalizeQuery(state.query);
    if (query) params.set("q", query);
    if (state.sort && state.sort !== "newest") params.set("sort", state.sort);
    state.categories.forEach(function (category) { params.append("category", category); });
    state.brands.forEach(function (brand) { params.append("brand", brand); });
    state.sizes.forEach(function (size) { params.append("size", size); });
    if (prices.length && state.minPrice != null) params.set("min_price", String(state.minPrice));
    if (prices.length && state.maxPrice != null) params.set("max_price", String(state.maxPrice));
    state.formats.forEach(function (format) { params.append("format", format); });
    if (state.vinted) params.set("vinted", "1");
    if (supportsSale && state.sale) params.set("sale", "1");
    if (state.page > 1) params.set("page", String(state.page));
    if (config.reviewId) params.set("review", config.reviewId);
    const search = params.toString();
    return archivePath + (search ? "?" + search : "");
  }

  function updateUrl(state, replace) {
    const url = makeUrl(state);
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    const active = document.activeElement;
    const container = active.closest("#desktopCategoryFilters, #desktopAttributeFilters, #activeFilterChips");
    const identity = container && { id: container.id, category: active.dataset.category, name: active.name, value: active.value, label: active.getAttribute("aria-label") };
    render();
    if (identity) {
      const replacement = Array.from(document.getElementById(identity.id).querySelectorAll("button, input, select")).find(function (control) {
        return identity.category ? control.dataset.category === identity.category
          : identity.name ? control.name === identity.name && control.value === identity.value
            : control.getAttribute("aria-label") === identity.label;
      });
      (replacement || queryInput).focus();
    } else if (active === clearAll && clearAll.hidden) queryInput.focus();
  }

  function addCategoryButtons(container, selectedCategories) {
    if (!container) return;
    container.replaceChildren();
    categories.forEach(function (category) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "pill review-category-button";
      button.dataset.category = category;
      button.setAttribute("aria-pressed", String(selectedCategories.includes(category)));
      button.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      container.appendChild(button);
    });
  }

  function addFilterCheckboxes(container, selected) {
    if (!container) return;
    container.replaceChildren();
    function addChoices(name, legendText, choices, selectedValues) {
      if (!choices.length) return;
      const group = document.createElement("fieldset");
      group.className = "review-filter-group";
      const legend = document.createElement("legend");
      legend.textContent = legendText;
      group.appendChild(legend);
      choices.forEach(function (value) {
        const label = document.createElement("label");
        label.className = "review-filter-option";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = name;
        input.value = value;
        input.checked = selectedValues.includes(value);
        const text = document.createElement("span");
        text.textContent = value.charAt(0).toUpperCase() + value.slice(1);
        label.append(input, text);
        group.appendChild(label);
      });
      container.appendChild(group);
    }
    addChoices("brand", "Brand", brands, selected.brands);
    addChoices("size", "Size", sizes, selected.sizes);
    if (prices.length) {
      const group = document.createElement("fieldset");
      group.className = "review-filter-group review-filter-price";
      const legend = document.createElement("legend");
      legend.textContent = "Price when reviewed";
      group.appendChild(legend);
      [["min_price", "Minimum price", selected.minPrice], ["max_price", "Maximum price", selected.maxPrice]].forEach(function (entry) {
        const label = document.createElement("label");
        label.className = "review-price-bound";
        label.textContent = entry[1];
        const select = document.createElement("select");
        select.className = "filter-control";
        select.name = entry[0];
        const any = document.createElement("option");
        any.value = "";
        any.textContent = "Any";
        select.appendChild(any);
        prices.forEach(function (price) {
          const option = document.createElement("option");
          option.value = price;
          option.textContent = "$" + price;
          select.appendChild(option);
        });
        // Direct URLs may contain a valid bound between the known prices.
        if (entry[2] != null && !prices.includes(String(entry[2]))) {
          const bound = document.createElement("option");
          bound.value = String(entry[2]);
          bound.textContent = "$" + entry[2];
          select.appendChild(bound);
        }
        select.value = entry[2] == null ? "" : String(entry[2]);
        label.appendChild(select);
        group.appendChild(label);
      });
      container.appendChild(group);
    }
    addChoices("format", "Review format", formats, selected.formats);
    if (supportsVinted) {
      const group = document.createElement("fieldset");
      group.className = "review-filter-group";
      const label = document.createElement("label");
      label.className = "review-filter-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "vinted";
      input.checked = selected.vinted;
      const text = document.createElement("span");
      text.textContent = "Available on Vinted";
      label.append(input, text);
      group.appendChild(label);
      container.appendChild(group);
    }
    if (supportsSale) {
      const saleGroup = document.createElement("fieldset");
      saleGroup.className = "review-filter-group";
      const legend = document.createElement("legend");
      legend.textContent = "Sale";
      saleGroup.appendChild(legend);
      const label = document.createElement("label");
      label.className = "review-filter-option";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "sale";
      input.value = "1";
      input.checked = selected.sale;
      const text = document.createElement("span");
      text.textContent = "On sale";
      label.append(input, text);
      saleGroup.appendChild(label);
      container.appendChild(saleGroup);
    }
  }

  function readAttributeFilters(container) {
    return {
      brands: Array.from(container.querySelectorAll('input[name="brand"]:checked')).map(function (input) { return input.value; }),
      sizes: Array.from(container.querySelectorAll('input[name="size"]:checked')).map(function (input) { return input.value; }),
      minPrice: container.querySelector('select[name="min_price"]')?.value ? Number(container.querySelector('select[name="min_price"]').value) : null,
      maxPrice: container.querySelector('select[name="max_price"]')?.value ? Number(container.querySelector('select[name="max_price"]').value) : null,
      formats: Array.from(container.querySelectorAll('input[name="format"]:checked')).map(function (input) { return input.value; }),
      vinted: supportsVinted && !!container.querySelector('input[name="vinted"]:checked'),
      sale: supportsSale && !!container.querySelector('input[name="sale"]:checked')
    };
  }

  function filterReviews(state) {
    let matches = reviews.filter(function (review) {
      const category = String(review.category || "").trim().toLowerCase();
      const categoryMatch = state.categories.length === 0 || state.categories.includes(category);
      const brandMatch = state.brands.length === 0 || state.brands.includes(String(review.brand || "").trim());
      const sizeMatch = state.sizes.length === 0 || state.sizes.includes(String(review.sizeTried || "").trim());
      const priceValue = review.reviewedPrice == null ? review.priceValue : review.reviewedPrice;
      const numericPrice = priceValue == null || String(priceValue).trim() === "" || typeof priceValue === "boolean" ? NaN : Number(priceValue);
      const priceMatch = (state.minPrice == null || (Number.isFinite(numericPrice) && numericPrice >= state.minPrice)) &&
        (state.maxPrice == null || (Number.isFinite(numericPrice) && numericPrice <= state.maxPrice));
      const formatMatch = !state.formats.length || state.formats.includes(String(review.format || review.type || "").toLowerCase());
      const vintedMatch = !state.vinted || review.availableOnVinted === true;
      const saleMatch = !state.sale || (review.onSale === true && review.sale && !!review.sale.price);
      const haystack = [review.title, review.blurb, review.category, review.brand, review.sizeTried]
        .map(function (value) { return String(value || ""); }).join(" ").toLowerCase();
      const queryMatch = !state.query || haystack.includes(state.query.toLowerCase());
      return categoryMatch && brandMatch && sizeMatch && priceMatch && formatMatch && vintedMatch && saleMatch && queryMatch;
    });

    if (state.sort === "price-low" || state.sort === "price-high") {
      matches = matches.slice().sort(function (a, b) {
        function priceOf(review) {
          const value = review.reviewedPrice == null ? review.priceValue : review.reviewedPrice;
          return value == null || String(value).trim() === "" || typeof value === "boolean" ? NaN : Number(value);
        }
        const aValue = priceOf(a);
        const bValue = priceOf(b);
        const aHas = Number.isFinite(aValue);
        const bHas = Number.isFinite(bValue);
        if (aHas !== bHas) return aHas ? -1 : 1;
        if (!aHas) return 0;
        return state.sort === "price-low" ? aValue - bValue : bValue - aValue;
      });
      return matches;
    }

    const allHaveDates = matches.length > 0 && matches.every(function (review) {
      return Number.isFinite(Date.parse(review.publishedAt || ""));
    });
    if (allHaveDates) {
      matches = matches.slice().sort(function (a, b) { return Date.parse(b.publishedAt) - Date.parse(a.publishedAt); });
    }
    return matches;
  }

  function renderChips(state) {
    chips.replaceChildren();
    const active = state.categories.map(function (category) {
      return { label: category.charAt(0).toUpperCase() + category.slice(1), remove: function () {
        state.categories = state.categories.filter(function (value) { return value !== category; });
      } };
    });
    state.brands.forEach(function (brand) { active.push({ label: "Brand: " + brand, remove: function () {
      state.brands = state.brands.filter(function (value) { return value !== brand; });
    } }); });
    state.sizes.forEach(function (size) { active.push({ label: "Size: " + size, remove: function () {
      state.sizes = state.sizes.filter(function (value) { return value !== size; });
    } }); });
    if (state.minPrice != null || state.maxPrice != null) active.push({
      label: "Price: " + (state.minPrice != null ? "$" + state.minPrice : "Any") + "–" + (state.maxPrice != null ? "$" + state.maxPrice : "Any"),
      remove: function () { state.minPrice = null; state.maxPrice = null; }
    });
    state.formats.forEach(function (format) { active.push({ label: format === "video" ? "Video" : "Written", remove: function () {
      state.formats = state.formats.filter(function (value) { return value !== format; });
    } }); });
    if (state.vinted) active.push({ label: "Available on Vinted", remove: function () { state.vinted = false; } });
    if (state.sale) active.push({ label: "On sale", remove: function () { state.sale = false; } });
    active.forEach(function (item) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.setAttribute("aria-label", "Remove " + item.label + " filter");
      chip.textContent = item.label + " ×";
      chip.addEventListener("click", function () {
        item.remove();
        state.page = 1;
        updateUrl(state, false);
      });
      chips.appendChild(chip);
    });
    clearAll.hidden = active.length === 0;
  }

  function renderCount(total, state) {
    if (state.query) {
      count.textContent = total + " " + (total === 1 ? "review" : "reviews") + " for ‘" + state.query + "’";
    } else {
      count.textContent = total + " " + (total === 1 ? "review" : "reviews");
    }
  }

  function renderPagination(total, state) {
    pagination.replaceChildren();
    const pages = Math.ceil(total / pageSize);
    if (pages <= 1) return;
    for (let page = 1; page <= pages; page += 1) {
      const link = document.createElement("a");
      link.className = "page-link" + (page === state.page ? " is-current" : "");
      link.href = makeUrl(Object.assign({}, state, { page: page }));
      link.textContent = String(page);
      if (page === state.page) link.setAttribute("aria-current", "page");
      link.addEventListener("click", function (event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        updateUrl(Object.assign({}, state, { page: page }), false);
        count.focus();
      });
      pagination.appendChild(link);
    }
  }

  function renderDetail(state) {
    const review = reviews.find(function (item) { return String(item.id) === state.reviewId; });
    if (!state.reviewId) return false;

    resultsView.hidden = true;
    detailView.hidden = false;
    detailView.replaceChildren();
    if (!review) {
      detailView.appendChild(window.CurvyInnerHero.create("Review not found", "This review isn’t available. Browse the reviews archive to explore the current collection.", "CurvyGirlReviews"));
      return true;
    }

    function element(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text) node.textContent = text;
      return node;
    }
    const detail = element("article", "review-detail");
    const top = element("div", "review-detail__top");
    const copy = element("div", "review-detail__content");
    const breadcrumb = element("nav", "review-detail__breadcrumb");
    breadcrumb.setAttribute("aria-label", "Breadcrumb");
    const archive = element("a", "", favoritesOnly ? "My Faves" : "Reviews");
    archive.href = makeUrl(state);
    breadcrumb.appendChild(archive);
    if (review.category) {
      const category = element("a", "", String(review.category));
      category.href = archivePath + "?" + new URLSearchParams({ category: String(review.category).trim().toLowerCase() });
      const separator = element("span", "", "/");
      separator.setAttribute("aria-hidden", "true");
      breadcrumb.append(separator, category);
    }
    const productTitle = String(review.productTitle || review.title || "Review");
    detail.appendChild(window.CurvyInnerHero.create(productTitle, String(review.blurb || "Explore the photos and product information for this clothing review."), "CurvyGirlReviews · " + String(review.category || "Product review")));
    copy.appendChild(breadcrumb);
    const productInfo = element("dl", "review-detail__product-info");
    [["Brand", review.brand], ["Size", review.sizeTried], ["Color", review.color]].forEach(function (entry) {
      const value = String(entry[1] == null ? "" : entry[1]).trim();
      if (!value) return;
      const row = element("div");
      row.append(element("dt", "", entry[0]), element("dd", "", value));
      productInfo.appendChild(row);
    });
    if (productInfo.childElementCount) copy.appendChild(productInfo);
    copy.appendChild(element("h2", "headline-md review-detail__review-title", String(review.reviewTitle || (review.productTitle ? review.title : "The review") || "The review")));
    const paragraphs = Array.isArray(review.reviewCopy) ? review.reviewCopy : [review.reviewCopy || review.blurb];
    paragraphs.filter(Boolean).forEach(function (paragraph) {
      copy.appendChild(element("p", "body-lg review-detail__copy", String(paragraph)));
    });
    if (review.vintedUrl && /^https?:\/\//i.test(review.vintedUrl)) {
      const shop = element("a", "btn btn-accent review-detail__shop", (review.vintedPriceLabel ? String(review.vintedPriceLabel) + " · " : "") + "Buy Now On Vinted");
      shop.href = review.vintedUrl;
      shop.target = "_blank";
      shop.rel = "noopener noreferrer";
      copy.appendChild(shop);
    } else {
      copy.appendChild(element("p", "body-sm review-detail__shop-note", "Shopping link not available."));
    }
    top.appendChild(copy);

    const gallery = element("section", "review-detail__gallery");
    gallery.setAttribute("aria-label", "Review photographs");
    const images = (Array.isArray(review.images) ? review.images : []).filter(Boolean);
    if (images.length) {
      const mainImage = element("img", "review-detail__main-image");
      mainImage.src = images[0];
      mainImage.alt = "Illustrative photograph 1 of " + images.length + " for “" + productTitle + "”";
      mainImage.width = 600;
      mainImage.height = 650;
      if (review.fit === "product") gallery.classList.add("is-product");
      gallery.appendChild(mainImage);
      if (images.length > 1) {
        const thumbs = element("div", "review-detail__thumbnails");
        thumbs.setAttribute("role", "group");
        thumbs.setAttribute("aria-label", "Choose photograph");
        const status = element("p", "visually-hidden");
        status.setAttribute("role", "status");
        images.forEach(function (src, index) {
          const button = element("button", "review-detail__thumbnail");
          button.type = "button";
          button.setAttribute("aria-label", "Show photograph " + (index + 1));
          button.setAttribute("aria-pressed", String(index === 0));
          const thumb = element("img");
          thumb.src = src;
          thumb.alt = "";
          thumb.width = 80;
          thumb.height = 80;
          thumb.loading = "lazy";
          button.appendChild(thumb);
          button.addEventListener("click", function () {
            mainImage.src = src;
            mainImage.alt = "Illustrative photograph " + (index + 1) + " of " + images.length + " for “" + productTitle + "”";
            Array.from(thumbs.children).forEach(function (item) { item.setAttribute("aria-pressed", String(item === button)); });
            status.textContent = "Photograph " + (index + 1) + " of " + images.length;
          });
          thumbs.appendChild(button);
        });
        gallery.append(thumbs, status);
      }
    } else {
      gallery.appendChild(element("p", "body-sm", "Photographs not available yet."));
    }
    top.appendChild(gallery);
    detail.appendChild(top);

    function mediaUrl(value) {
      if (!String(value || "").trim()) return "";
      try {
        const url = new URL(String(value).trim(), window.location.origin + "/");
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
      } catch (_) {
        return "";
      }
    }
    const videoUrl = mediaUrl(review.videoUrl);
    if (videoUrl) {
      const section = element("section", "review-detail__video");
      section.setAttribute("aria-label", "Video review");
      const video = element("video", "review-detail__video-player");
      video.id = "reviewDetailVideo";
      video.controls = false;
      video.playsInline = true;
      video.preload = "metadata";
      video.src = videoUrl;
      video.setAttribute("aria-label", "Video review of " + productTitle);
      const poster = mediaUrl(review.videoPoster);
      if (poster) video.poster = poster;
      const captions = mediaUrl(review.videoCaptionsUrl);
      if (captions) {
        const track = element("track");
        track.kind = "captions";
        track.src = captions;
        track.srclang = "en";
        track.label = "English";
        track.default = true;
        video.appendChild(track);
      }
      const player = element("div", "video-player");
      player.dataset.videoPlayer = "";
      player.dataset.videoMaxAspect = String(4 / 3);
      player.appendChild(video);
      section.appendChild(player);
      const transcript = String(review.videoTranscript || "").trim();
      if (transcript) {
        const details = element("details", "review-detail__video-transcript");
        details.append(element("summary", "", "Read video transcript"), element("p", "body-md", transcript));
        section.appendChild(details);
      }
      detail.appendChild(section);
    }

    const guidance = element("section", "review-detail__guidance");
    guidance.setAttribute("aria-labelledby", "buyingGuidanceTitle");
    const guidanceTitle = element("h2", "headline-lg", "Should You buy it?");
    guidanceTitle.id = "buyingGuidanceTitle";
    const columns = element("div", "review-detail__guidance-columns");
    [["YES", review.buyIf, "yes"], ["No", review.skipIf, "no"]].forEach(function (entry) {
      const column = element("div");
      const heading = element("h3", "headline-md");
      heading.append("It’s a ", element("span", "review-detail__answer--" + entry[2], entry[0]), " if…");
      column.appendChild(heading);
      const points = Array.isArray(entry[1]) ? entry[1].filter(Boolean) : [];
      const list = element("ul", "review-detail__guidance-list");
      const items = points.length ? points : ["Buying guidance for this review is coming soon."];
      items.forEach(function (point) { list.appendChild(element("li", "", String(point))); });
      column.appendChild(list);
      columns.appendChild(column);
      if (entry[2] === "yes") {
        const portrait = element("img", "review-detail__guidance-photo");
        portrait.src = "/img/me2.jpg";
        portrait.alt = "A woman giving a thumbs-up and a thumbs-down";
        portrait.width = 896;
        portrait.height = 1200;
        portrait.loading = "lazy";
        const portraitFrame = element("div", "review-detail__guidance-portrait");
        portraitFrame.appendChild(portrait);
        columns.appendChild(portraitFrame);
      }
    });
    const paper = element("div", "review-detail__guidance-paper");
    paper.appendChild(columns);
    guidance.append(guidanceTitle, paper);
    detail.appendChild(guidance);

    const related = reviews.filter(function (item) { return String(item.id) !== state.reviewId; });
    related.sort(function (a, b) {
      return Number(b.category === review.category) - Number(a.category === review.category);
    });
    if (related.length) {
      const section = element("section", "review-detail__related");
      section.setAttribute("aria-labelledby", "relatedReviewsTitle");
      const heading = element("h2", "headline-lg", "You might also like");
      heading.id = "relatedReviewsTitle";
      const cards = element("ul", "review-grid");
      related.slice(0, 3).forEach(function (item) {
        cards.appendChild(window.CurvyReviewCards.create(item, {
          href: makeUrl(state, { reviewId: String(item.id) }), showCategory: false
        }));
      });
      section.append(heading, cards);
      detail.appendChild(section);
    }
    detailView.appendChild(detail);
    window.CurvyReviewCards.initializeSliders(detail);
    window.CurvyVideoPlayer.initialize(detail);
    return true;
  }

  function updateSearchMetadata(state) {
    const detail = state.reviewId && reviews.find(function (review) { return String(review.id) === state.reviewId; });
    const params = new URLSearchParams(window.location.search);
    document.title = detail
      ? String(detail.productTitle || detail.title || "Review") + " | CurvyGirlReviews"
      : state.reviewId ? "Review not found | CurvyGirlReviews" : state.query ? "Search results for “" + state.query + "” | " + archiveTitle + " | CurvyGirlReviews" : archiveTitle + " | CurvyGirlReviews";
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.content = params.size ? "noindex,follow" : "index,follow";
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.href = archivePath;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = detail
      ? String(detail.blurb || "Read this CurvyGirlReviews fashion review.")
      : state.reviewId ? "This review is not available. Browse the review collection." : state.query ? "Search CurvyGirlReviews for “" + state.query + "”. Real try-ons and honest opinions."
        : archiveDescription;
    ["og:title", "twitter:title"].forEach(function (key) {
      document.querySelector('meta[property="' + key + '"], meta[name="' + key + '"]').content = document.title;
    });
    ["og:description", "twitter:description"].forEach(function (key) {
      document.querySelector('meta[property="' + key + '"], meta[name="' + key + '"]').content = description.content;
    });
    document.querySelector('meta[property="og:url"]').content = window.location.pathname + window.location.search;
  }

  function render() {
    const state = readState();
    updateSearchMetadata(state);
    if (renderDetail(state)) return;
    resultsView.hidden = false;
    detailView.hidden = true;
    queryInput.value = state.query;
    queryInput.setCustomValidity("");
    if (prices.length) {
      [
        ["price-low", "Price: low to high"],
        ["price-high", "Price: high to low"]
      ].forEach(function (choice) {
        if (!sortControl.querySelector('option[value="' + choice[0] + '"]')) {
          const option = document.createElement("option");
          option.value = choice[0];
          option.textContent = choice[1];
          sortControl.appendChild(option);
        }
      });
    } else {
      Array.from(sortControl.querySelectorAll('option[value="price-low"], option[value="price-high"]')).forEach(function (option) {
        option.remove();
      });
    }
    sortControl.value = state.sort;
    document.getElementById("reviewSortNote").hidden = reviews.length > 0 && reviews.every(function (review) {
      return Number.isFinite(Date.parse(review.publishedAt || ""));
    });
    addCategoryButtons(desktopCategories, state.categories);
    addCategoryButtons(mobileCategories, state.categories);
    addFilterCheckboxes(desktopFilters, state);
    addFilterCheckboxes(mobileFilters, state);
    renderChips(state);

    const filtered = filterReviews(state);
    renderCount(filtered.length, state);
    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (state.page > pageCount) {
      state.page = pageCount;
      updateUrl(state, true);
      return;
    }
    const start = (state.page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    grid.replaceChildren();
    pageItems.forEach(function (review) {
      const href = makeUrl(state, { reviewId: String(review.id) });
      grid.appendChild(window.CurvyReviewCards.create(review, { href: href, headingLevel: 2, showCategory: false }));
    });
    window.CurvyReviewCards.initializeSliders(grid);
    emptyState.hidden = pageItems.length > 0;
    if (favoritesOnly) {
      document.getElementById("reviewsEmptyTitle").textContent = reviews.length ? "No favorites found" : "Favorites coming soon";
      emptyState.querySelector("p").textContent = reviews.length ? "Try another search or clear the selected filters." : "Shandy’s favorite reviews will appear here. Explore all reviews in the meantime.";
      emptyClear.hidden = !reviews.length;
      emptyState.querySelector('a[href="#reviewsSearchInput"]').hidden = !reviews.length;
    }
    renderPagination(filtered.length, state);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const state = readState();
    state.query = normalizeQuery(queryInput.value);
    state.page = 1;
    state.reviewId = "";
    updateUrl(state, false);
  });

  sortControl.addEventListener("change", function () {
    const state = readState();
    state.sort = sortControl.value || "newest";
    state.page = 1;
    updateUrl(state, false);
  });

  clearAll.addEventListener("click", function () {
    const state = readState();
    state.categories = [];
    state.brands = [];
    state.sizes = [];
    state.minPrice = null;
    state.maxPrice = null;
    state.formats = [];
    state.vinted = false;
    state.sale = false;
    state.page = 1;
    state.reviewId = "";
    updateUrl(state, false);
  });
  emptyClear.addEventListener("click", function () {
    const state = readState();
    state.categories = [];
    state.brands = [];
    state.sizes = [];
    state.minPrice = null;
    state.maxPrice = null;
    state.formats = [];
    state.vinted = false;
    state.sale = false;
    state.page = 1;
    state.reviewId = "";
    updateUrl(state, false);
    queryInput.focus();
  });

  desktopFilters.addEventListener("change", function (event) {
    if (!event.target.matches("input, select")) return;
    const state = readState();
    const selected = readAttributeFilters(desktopFilters);
    state.brands = selected.brands;
    state.sizes = selected.sizes;
    state.minPrice = selected.minPrice;
    state.maxPrice = selected.maxPrice;
    state.formats = selected.formats;
    state.vinted = selected.vinted;
    state.sale = selected.sale;
    state.page = 1;
    updateUrl(state, false);
  });
  desktopCategories.addEventListener("click", function (event) {
    const button = event.target.closest(".review-category-button");
    if (!button) return;
    const state = readState();
    state.categories = button.getAttribute("aria-pressed") === "true"
      ? state.categories.filter(function (category) { return category !== button.dataset.category; })
      : state.categories.concat(button.dataset.category);
    state.page = 1;
    updateUrl(state, false);
  });
  mobileCategories.addEventListener("click", function (event) {
    const button = event.target.closest(".review-category-button");
    if (!button) return;
    button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true"));
  });

  filterOpen.addEventListener("click", function () {
    triggerBeforeDialog = filterOpen;
    addCategoryButtons(mobileCategories, readState().categories);
    addFilterCheckboxes(mobileFilters, readState());
    filtersDialog.showModal();
    const firstControl = filtersDialog.querySelector("input, select, .review-category-button, button");
    if (firstControl) firstControl.focus();
  });
  filterDone.addEventListener("click", function () {
    const state = readState();
    state.categories = Array.from(mobileCategories.querySelectorAll('.review-category-button[aria-pressed="true"]'))
      .map(function (button) { return button.dataset.category; });
    const selected = readAttributeFilters(mobileFilters);
    state.brands = selected.brands;
    state.sizes = selected.sizes;
    state.minPrice = selected.minPrice;
    state.maxPrice = selected.maxPrice;
    state.formats = selected.formats;
    state.vinted = selected.vinted;
    state.sale = selected.sale;
    state.page = 1;
    filtersDialog.close("apply");
    updateUrl(state, false);
  });
  filterCancel.addEventListener("click", function () { filtersDialog.close("cancel"); });
  filtersDialog.addEventListener("close", function () {
    if (!filtersDialog.open && triggerBeforeDialog) triggerBeforeDialog.focus();
  });
  filtersDialog.addEventListener("keydown", function (event) {
    if (event.key !== "Tab") return;
    const controls = Array.from(filtersDialog.querySelectorAll("button, input, select"))
      .filter(function (control) { return !control.disabled && control.getClientRects().length; });
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  filterForm.addEventListener("submit", function (event) { event.preventDefault(); });
  window.addEventListener("popstate", function () {
    if (filtersDialog.open) filtersDialog.close("cancel");
    render();
  });

  render();
})();
