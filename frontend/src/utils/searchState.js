const FILTER_KEYS = ['q', 'city', 'zipcode', 'minPrice', 'maxPrice', 'beds', 'baths'];

export function extractFiltersFromParams(searchParams) {
  return FILTER_KEYS.reduce((acc, key) => {
    const value = searchParams.get(key);
    if (value) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

export function extractUiStateFromParams(searchParams) {
  return {
    filters: extractFiltersFromParams(searchParams),
    page: Math.max(1, Number(searchParams.get('page')) || 1),
    sortBy: searchParams.get('sortBy') || '',
    sortOrder: searchParams.get('sortOrder') || 'ASC',
    viewMode: searchParams.get('view') === 'map' ? 'map' : 'list',
    showFavoritesOnly: searchParams.get('favorites') === '1',
    mapBounds: searchParams.get('bounds') || '',
    mapZoom: searchParams.get('zoom') || ''
  };
}

export function buildSearchParams({
  filters = {},
  page = 1,
  sortBy = '',
  sortOrder = 'ASC',
  viewMode = 'list',
  showFavoritesOnly = false,
  mapBounds = '',
  mapZoom = ''
}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value).trim());
    }
  });

  if (page > 1) {
    params.set('page', String(page));
  }

  if (sortBy) {
    params.set('sortBy', sortBy);
  }

  if (sortBy && sortOrder && sortOrder !== 'ASC') {
    params.set('sortOrder', sortOrder);
  }

  if (viewMode === 'map') {
    params.set('view', 'map');
  }

  if (showFavoritesOnly) {
    params.set('favorites', '1');
  }

  if (mapBounds) {
    params.set('bounds', mapBounds);
  }

  if (mapZoom) {
    params.set('zoom', mapZoom);
  }

  return params;
}

export function buildSavedSearchHref(savedSearch) {
  const filters = { ...(savedSearch?.filters || {}) };
  const sortBy = filters.sortBy || '';
  const sortOrder = filters.sortOrder || 'ASC';
  delete filters.sortBy;
  delete filters.sortOrder;

  const query = buildSearchParams({
    filters,
    sortBy,
    sortOrder
  }).toString();

  return query ? `/?${query}` : '/';
}
