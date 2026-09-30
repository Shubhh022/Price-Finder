
(() => {
  "use strict";

  const products = flattenProducts(storeData);
  const priceIndex = buildPriceIndex(products); // sorted by price
  const cheapest = priceIndex[0].price;
  const priciest = priceIndex[priceIndex.length - 1].price;

  const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
  const plainNumber = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

  const formatPrice = (n) => currency.format(n);
  const formatNumber = (n) => plainNumber.format(n);
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const discountOf = (p) => Math.round((1 - p.price / p.originalPrice) * 100);
  const humanize = (key) => {
    const spaced = key.replace(/([A-Z])/g, " $1").toLowerCase();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  /** "70,000" or "₹70,000" -> 70000. Returns null if it isn't a valid number. */
  function parsePrice(text) {
    const cleaned = String(text).replace(/[₹,\s]/g, "");
    if (!/^\d*\.?\d+$/.test(cleaned)) return null;
    return Number(cleaned);
  }

  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) {
      if (child != null && child !== false) node.append(child);
    }
    return node;
  }

  const $ = (selector) => document.querySelector(selector);
  const els = {
    modeInputs: document.querySelectorAll('input[name="mode"]'),
    form: $("#finderForm"),
    closestFields: $("#closestFields"),
    rangeFields: $("#rangeFields"),
    countField: $("#countField"),
    target: $("#targetPrice"),
    min: $("#minPrice"),
    max: $("#maxPrice"),
    count: $("#resultCount"),
    error: $("#formError"),
    submit: $("#submitBtn"),
    rulerTrack: $("#rulerTrack"),
    rulerAxis: $("#rulerAxis"),
    resultsTitle: $("#resultsTitle"),
    resultsMeta: $("#resultsMeta"),
    resultsStats: $("#resultsStats"),
    resultsBody: $("#resultsBody"),
    dialog: $("#productDialog"),
    dialogBody: $("#dialogBody"),
    catalogCount: $("#catalogCount"),
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let mode = "closest"; // "closest" | "range"

  const scale = { min: cheapest * 0.7, max: priciest * 1.2 };

  function priceToPercent(price) {
    const p = Math.min(Math.max(price, scale.min), scale.max);
    const span = Math.log(scale.max) - Math.log(scale.min);
    return ((Math.log(p) - Math.log(scale.min)) / span) * 100;
  }

  const compactPrice = (v) =>
    v >= 100000 ? `₹${v / 100000}L` : v >= 1000 ? `₹${v / 1000}K` : `₹${v}`;

  const ruler = { ticks: new Map() };

  function buildRuler() {
   
    for (const p of priceIndex) {
      const tick = h("span", { class: "tick", title: `${p.name}, ${formatPrice(p.price)}` });
      tick.style.left = `${priceToPercent(p.price)}%`;
      ruler.ticks.set(p.id, tick);
      els.rulerTrack.append(tick);
    }

    ruler.markerLabel = h("span", { class: "ruler__label" });
    ruler.marker = h("div", { class: "ruler__marker" }, ruler.markerLabel);
    ruler.bandLabel = h("span", { class: "ruler__label" });
    ruler.band = h("div", { class: "ruler__band", hidden: true }, ruler.bandLabel);
    els.rulerTrack.append(ruler.band, ruler.marker);

   
    const firstPower = Math.floor(Math.log10(scale.min));
    for (let power = firstPower; 10 ** power <= scale.max; power++) {
      for (const step of [1, 5]) {
        const value = step * 10 ** power;
        if (value < scale.min || value > scale.max) continue;
        const label = h("span", { class: "axis-label" }, compactPrice(value));
        label.style.left = `${priceToPercent(value)}%`;
        els.rulerAxis.append(label);
      }
    }
  }

  function alignLabel(label, percent) {
    label.dataset.align = percent < 12 ? "start" : percent > 88 ? "end" : "center";
  }

  function updateRuler(view) {
    const matchIds = new Set(view.matches.map((p) => p.id));
    ruler.ticks.forEach((tick, id) => tick.classList.toggle("is-match", matchIds.has(id)));

    const isClosest = view.mode === "closest";
    ruler.marker.hidden = !isClosest;
    ruler.band.hidden = isClosest;

    if (isClosest) {
      const percent = priceToPercent(view.target);
      ruler.marker.style.left = `${percent}%`;
      ruler.markerLabel.textContent = formatPrice(view.target);
      alignLabel(ruler.markerLabel, percent);
    } else {
      const from = priceToPercent(view.min);
      const to = priceToPercent(view.max);
      ruler.band.style.left = `${from}%`;
      ruler.band.style.width = `${to - from}%`;
      ruler.bandLabel.textContent = `${formatPrice(view.min)} to ${formatPrice(view.max)}`;
      alignLabel(ruler.bandLabel, (from + to) / 2);
    }
  }

  function describeGap(gap) {
    if (gap === 0) return "Exactly your price";
    return gap < 0
      ? `${formatPrice(-gap)} below your price`
      : `${formatPrice(gap)} above your price`;
  }

  function renderCard(product, view) {
    const isClosest = view.mode === "closest";
    const gap = isClosest ? product.price - view.target : 0;
    const isBest = isClosest && Math.abs(gap) === view.smallestGap;

    return h(
      "li",
      { class: isBest ? "card is-best" : "card" },
      h(
        "div",
        { class: "card__top" },
        h("span", { class: "monogram", "data-category": product.category, "aria-hidden": "true" }, product.brand.charAt(0)),
        h(
          "div",
          { class: "card__meta" },
          h("span", { class: "card__brand" }, product.brand),
          h("span", { class: "card__sub" }, product.subcategory)
        ),
        isBest && h("span", { class: "badge" }, "Closest match")
      ),
      h("h3", { class: "card__name" }, product.name),
      h(
        "p",
        { class: "rating" },
        h("span", { "aria-hidden": "true" }, "★"),
        h("span", { class: "sr-only" }, "Rating: "),
        h("strong", {}, product.rating.toFixed(1)),
        h("span", { class: "rating__reviews" }, `(${formatNumber(product.reviews)} reviews)`)
      ),
      h(
        "div",
        { class: "price-row" },
        h("span", { class: "price" }, formatPrice(product.price)),
        h("span", { class: "price-was" }, formatPrice(product.originalPrice)),
        h("span", { class: "price-off" }, `${discountOf(product)}% off`)
      ),
      isClosest && h("p", { class: "delta" }, describeGap(gap)),
      product.stock <= 5 && h("p", { class: "stock-low" }, `Only ${product.stock} left`),
      h(
        "button",
        {
          type: "button",
          class: "btn btn--secondary",
          "aria-label": `View product: ${product.name}`,
          onclick: () => openProduct(product),
        },
        "View product"
      )
    );
  }

  function renderEmptyRange(view) {
    // The range is empty, so lowerBound(min) points at the first product above
    // the range, and the one before it is the last product below the range.
    const at = lowerBound(priceIndex, view.min);
    const below = priceIndex[at - 1];
    const above = priceIndex[at];

    const nearby = [];
    if (below) nearby.push(`${below.name} (${formatPrice(below.price)}) just below`);
    if (above) nearby.push(`${above.name} (${formatPrice(above.price)}) just above`);

    return h(
      "div",
      { class: "empty" },
      h("p", { class: "empty__title" }, `No products between ${formatPrice(view.min)} and ${formatPrice(view.max)}`),
      h("p", {}, `Nearest products: ${nearby.join(" and ")}.`),
      h(
        "button",
        { type: "button", class: "btn btn--secondary", onclick: () => widenRange(view, below, above) },
        "Widen the range to include them"
      )
    );
  }

  // Stretch the range just far enough to reach the nearest product on each side.
  function widenRange(view, below, above) {
    els.min.value = formatNumber(below ? below.price : view.min);
    els.max.value = formatNumber(above ? above.price : view.max);
    runSearch();
  }

  function showResults(view) {
    const { matches } = view;
    const isClosest = view.mode === "closest";

    // In closest mode the best card(s) are the ones with the smallest gap.
    if (isClosest && matches.length) {
      view.smallestGap = Math.min(...matches.map((p) => Math.abs(p.price - view.target)));
    }

    els.resultsTitle.textContent = isClosest ? "Closest products" : "Products in this range";
    els.resultsMeta.textContent = isClosest
      ? `${plural(matches.length, "product")} nearest to ${formatPrice(view.target)}`
      : `${plural(matches.length, "product")} from ${formatPrice(view.min)} to ${formatPrice(view.max)}`;
    els.resultsStats.textContent =
      `Binary search used ${plural(view.stats.comparisons, "price comparison")}. ` +
      `Checking every product would take ${priceIndex.length}.`;

    els.resultsBody.replaceChildren(
      matches.length
        ? h("ul", { class: "grid" }, matches.map((p) => renderCard(p, view)))
        : renderEmptyRange(view)
    );

    updateRuler(view);
  }

  function openProduct(product) {
    els.dialogBody.replaceChildren(buildProductDetails(product));
    els.dialog.showModal();
  }

  function buildProductDetails(p) {
    const saving = p.originalPrice - p.price;
    return h(
      "div",
      { class: "dialog__body" },
      h(
        "div",
        { class: "dialog__head" },
        h(
          "div",
          {},
          h("h2", { class: "dialog__title", id: "dialogTitle" }, p.name),
          h("p", { class: "dialog__sub" }, `${p.brand} in ${p.category} / ${p.subcategory}`)
        ),
        h("button", { type: "button", class: "dialog__close", "aria-label": "Close", onclick: () => els.dialog.close() }, "×")
      ),
      h(
        "div",
        { class: "price-row" },
        h("span", { class: "price" }, formatPrice(p.price)),
        h("span", { class: "price-was" }, formatPrice(p.originalPrice)),
        h("span", { class: "price-off" }, `Save ${formatPrice(saving)} (${discountOf(p)}% off)`)
      ),
      h(
        "p",
        { class: "dialog__facts" },
        h("span", {}, `★ ${p.rating.toFixed(1)} from ${formatNumber(p.reviews)} reviews`),
        h("span", { class: p.stock <= 5 ? "stock-low" : "" }, p.stock <= 5 ? `Only ${p.stock} left` : `${p.stock} in stock`)
      ),
      h(
        "div",
        {},
        h("h3", {}, "Specifications"),
        h(
          "dl",
          { class: "specs" },
          Object.entries(p.specifications).flatMap(([key, value]) => [
            h("dt", {}, humanize(key)),
            h("dd", {}, String(value)),
          ])
        )
      ),
      h("div", {}, h("h3", {}, "Tags"), h("ul", { class: "tags" }, p.tags.map((t) => h("li", {}, t)))),
      h(
        "div",
        { class: "dialog__actions" },
        h("button", { type: "button", class: "btn btn--primary", onclick: () => findNear(p.price) }, "Find products near this price"),
        h("button", { type: "button", class: "btn btn--secondary", onclick: () => els.dialog.close() }, "Close")
      )
    );
  }

  function findNear(price) {
    els.dialog.close();
    setMode("closest");
    els.target.value = formatNumber(price);
    runSearch();
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
  }

  // Clicking the dimmed backdrop closes the dialog.
  els.dialog.addEventListener("click", (event) => {
    if (event.target === els.dialog) els.dialog.close();
  });

  function setMode(next) {
    mode = next;
    els.modeInputs.forEach((input) => (input.checked = input.value === next));
    els.closestFields.hidden = next !== "closest";
    els.rangeFields.hidden = next !== "range";
    els.countField.hidden = next !== "closest";
    els.submit.textContent = next === "closest" ? "Search" : "Find products in this range";
    showError("");
  }

  function showError(message) {
    els.error.textContent = message;
  }

  function runSearch() {
    showError("");

    if (mode === "closest") {
      const target = parsePrice(els.target.value);
      if (target === null || target <= 0) {
        showError("Enter a price above ₹0, for example 70,000.");
        return;
      }
      const { matches, stats } = findClosest(priceIndex, target, Number(els.count.value));
      showResults({ mode, target, matches, stats });
      return;
    }

    const min = parsePrice(els.min.value);
    const max = parsePrice(els.max.value);
    if (min === null || max === null) {
      showError("Enter both prices as numbers, for example 50,000 and 80,000.");
      return;
    }
    if (min > max) {
      showError("The minimum price can't be higher than the maximum. Swap the two values.");
      return;
    }
    const { matches, stats } = findInRange(priceIndex, min, max);
    showResults({ mode, min, max, matches, stats });
  }

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    runSearch();
  });

  els.modeInputs.forEach((input) =>
    input.addEventListener("change", () => {
      setMode(input.value);
      runSearch();
    })
  );

  els.count.addEventListener("change", runSearch);

  // Tidy the number when the user leaves a field: 70000 -> 70,000
  [els.target, els.min, els.max].forEach((input) =>
    input.addEventListener("blur", () => {
      const value = parsePrice(input.value);
      if (value !== null) input.value = formatNumber(value);
    })
  );

  els.catalogCount.textContent = `${plural(products.length, "product")} in the catalogue`;
  buildRuler();
  setMode("closest");
  runSearch();
})();
