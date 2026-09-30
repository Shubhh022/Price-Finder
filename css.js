function flattenProducts(store) {
  const allProducts = [];

  for (const category of store.categories) {
    for (const subcategory of category.subcategories) {
      for (const product of subcategory.products) {
    allProducts.push(product);
    }
    }
  }

  return allProducts;
}

function buildPriceIndex(products) {
  const sortedProducts = [...products];

  sortedProducts.sort(function (a, b) {
    if (a.price !== b.price) {
      return a.price - b.price;
    }
   return a.name.localeCompare(b.name);
  });

  return sortedProducts;
}

function lowerBound(sortedProducts, target, stats = { comparisons: 0 }) {
  let left = 0;
  let right = sortedProducts.length;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    stats.comparisons++;

    if (sortedProducts[middle].price < target) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
}

function upperBound(sortedProducts, target, stats = { comparisons: 0 }) {
  let left = 0;
  let right = sortedProducts.length;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);

    stats.comparisons++;

    if (sortedProducts[middle].price <= target) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
}

function findClosest(sortedProducts, target, k = 3) {
  const stats = { comparisons: 0 };
  const matches = [];

  let wanted = Math.floor(Number(k));

  if (!Number.isFinite(wanted) || wanted < 0) {
    wanted = 0;
  }

  wanted = Math.min(wanted, sortedProducts.length);

  let right = lowerBound(sortedProducts, target, stats);
  let left = right - 1;

  while (matches.length < wanted) {
    if (left < 0) {
      matches.push(sortedProducts[right]);
      right++;
    } 
    else if (right >= sortedProducts.length) {
      matches.push(sortedProducts[left]);
      left--;
    } 
    else {
      stats.comparisons++;

      const gapBelow = target - sortedProducts[left].price;
      const gapAbove = sortedProducts[right].price - target;

      if (gapBelow <= gapAbove) {
        matches.push(sortedProducts[left]);
        left--;
      } else {
        matches.push(sortedProducts[right]);
        right++;
      }
    }
  }

  matches.sort(function (a, b) {
    if (a.price !== b.price) {
      return a.price - b.price;
    }

    return a.name.localeCompare(b.name);
  });

  return {
    matches: matches,
    stats: stats
  };
}

function findInRange(sortedProducts, min, max) {
  const stats = { comparisons: 0 };

  const start = lowerBound(sortedProducts, min, stats);
  const end = upperBound(sortedProducts, max, stats);

  return {
    matches: sortedProducts.slice(start, end),
    stats: stats
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    flattenProducts,
    buildPriceIndex,
    lowerBound,
    upperBound,
    findClosest,
    findInRange
  };
}