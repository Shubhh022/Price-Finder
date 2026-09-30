function flattenProducts(store) {
  const all = [];
  for (const category of store.categories) {
    for (const subcategory of category.subcategories) {
      for (const product of subcategory.products) {
        all.push(product);
      }
    }
  }
  return all;
}

function buildPriceIndex(products) {
  return [...products].sort(
    (a, b) => a.price - b.price || a.name.localeCompare(b.name)
  );
}

function lowerBound(sorted, target, stats = { comparisons: 0 }) {
  let lo = 0;
  let hi = sorted.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    stats.comparisons++;

    if (sorted[mid].price < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

function upperBound(sorted, target, stats = { comparisons: 0 }) {
  let lo = 0;
  let hi = sorted.length;

  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    stats.comparisons++;

    if (sorted[mid].price <= target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  return lo;
}

function findClosest(sorted, target, k = 3) {
  const stats = { comparisons: 0 };
  const matches = [];
  const wanted = Math.min(Math.max(0, Math.floor(k)), sorted.length);

  let right = lowerBound(sorted, target, stats);
  let left = right - 1;

  while (matches.length < wanted) {
    if (left < 0) {
      matches.push(sorted[right++]);
    } else if (right >= sorted.length) {
      matches.push(sorted[left--]);
    } else {
      stats.comparisons++;

      const gapBelow = target - sorted[left].price;
      const gapAbove = sorted[right].price - target;

      matches.push(
        gapBelow <= gapAbove ? sorted[left--] : sorted[right++]
      );
    }
  }

  matches.sort(
    (a, b) => a.price - b.price || a.name.localeCompare(b.name)
  );

  return { matches, stats };
}

function findInRange(sorted, min, max) {
  const stats = { comparisons: 0 };

  const start = lowerBound(sorted, min, stats);
  const end = upperBound(sorted, max, stats);

  return {
    matches: sorted.slice(start, Math.max(start, end)),
    stats,
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    flattenProducts,
    buildPriceIndex,
    lowerBound,
    upperBound,
    findClosest,
    findInRange,
  };
}