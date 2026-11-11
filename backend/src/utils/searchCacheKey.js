const { getCacheKey } = require("./cache");

function present(value) {
  return value !== undefined && value !== "";
}

// Build the property-search cache key from the validated search rather than
// the raw query string. Each value is normalized the same way the SQL uses
// it, defaults are filled in, and unrelated parameters are ignored, so
// `?city=Portland&beds=3` and `?beds=3&city=portland&limit=20` share one
// entry while different filters, sorts, pages, and map bounds stay distinct.
function buildSearchCacheParams(query, { limit, offset }) {
  const hasBounds = ["north", "south", "east", "west"].some(
    (key) => query[key] !== undefined
  );
  const sortBy = present(query.sortBy) ? String(query.sortBy) : undefined;

  return {
    // City matching is LOWER(TRIM(...)) in SQL; free text is LOWER(...) only.
    city: present(query.city) ? String(query.city).trim().toLowerCase() : undefined,
    q: present(query.q) ? String(query.q).toLowerCase() : undefined,
    zipcode: present(query.zipcode) ? String(query.zipcode) : undefined,
    minPrice: present(query.minPrice) ? parseFloat(query.minPrice) : undefined,
    maxPrice: present(query.maxPrice) ? parseFloat(query.maxPrice) : undefined,
    beds: present(query.beds) ? parseInt(query.beds, 10) : undefined,
    baths: present(query.baths) ? parseFloat(query.baths) : undefined,
    bounds: hasBounds
      ? {
          north: Number(query.north),
          south: Number(query.south),
          east: Number(query.east),
          west: Number(query.west),
        }
      : undefined,
    excludeListingId: query.excludeListingId
      ? String(query.excludeListingId)
      : undefined,
    sortBy,
    sortOrder: sortBy
      ? String(query.sortOrder || "").toUpperCase() === "DESC"
        ? "DESC"
        : "ASC"
      : undefined,
    limit,
    offset,
    mapOnly: query.mapOnly === "true",
    includeAnalytics: query.includeAnalytics === "true",
  };
}

function searchCacheKey(query, pagination) {
  return getCacheKey("properties", buildSearchCacheParams(query, pagination));
}

module.exports = {
  buildSearchCacheParams,
  searchCacheKey,
};
