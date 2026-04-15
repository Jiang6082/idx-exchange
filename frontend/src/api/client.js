const API_BASE = '';
const DEFAULT_PROFILE = {
  email: 'demo@idxexchange.local',
  name: 'Guest Buyer'
};

function getActiveProfile() {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  try {
    const saved = window.localStorage.getItem('idxActiveProfile');
    if (!saved) {
      return DEFAULT_PROFILE;
    }

    const parsed = JSON.parse(saved);
    return {
      email: parsed?.email || DEFAULT_PROFILE.email,
      name: parsed?.name || DEFAULT_PROFILE.name
    };
  } catch (error) {
    return DEFAULT_PROFILE;
  }
}

async function request(path, options = {}) {
  try {
    const profile = getActiveProfile();
    const mergedHeaders = {
      'Content-Type': 'application/json',
      'x-user-email': profile.email,
      'x-user-name': profile.name,
      ...(options.headers || {})
    };
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: mergedHeaders
    });

    if (!response.ok) {
      const text = typeof response.text === 'function' ? await response.text() : '';
      throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

export async function fetchProperties(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/properties${query ? `?${query}` : ''}`, {
    headers: {}
  });
}

export async function fetchMapProperties(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/properties?mapOnly=true${query ? `&${query}` : ''}`, {
    headers: {}
  });
}

export async function fetchCompareProperties(ids) {
  const query = new URLSearchParams({
    ids: ids.join(',')
  }).toString();

  return request(`/api/properties/compare?${query}`, {
    headers: {}
  });
}

export async function fetchPropertyDetail(listingId) {
  return request(`/api/properties/${listingId}`, {
    headers: {}
  });
}

export async function fetchOpenHouses(listingId) {
  return request(`/api/properties/${listingId}/openhouses`, {
    headers: {}
  });
}

export async function fetchCurrentUserState() {
  return request('/api/users/me');
}

export async function fetchFavoriteProperties(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/users/me/favorite-properties${query ? `?${query}` : ''}`);
}

export async function updateProfile(profile) {
  return request('/api/users/me', {
    method: 'PUT',
    body: JSON.stringify(profile)
  });
}

export async function addFavorite(listingId) {
  return request('/api/users/me/favorites', {
    method: 'POST',
    body: JSON.stringify({ listingId })
  });
}

export async function removeFavorite(listingId) {
  return request(`/api/users/me/favorites/${listingId}`, {
    method: 'DELETE'
  });
}

export async function saveSearch(payload) {
  return request('/api/users/me/saved-searches', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateSavedSearch(id, payload) {
  return request(`/api/users/me/saved-searches/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteSavedSearch(id) {
  return request(`/api/users/me/saved-searches/${id}`, {
    method: 'DELETE'
  });
}

export async function recordPropertyView(listingId) {
  return request('/api/users/me/views', {
    method: 'POST',
    body: JSON.stringify({ listingId })
  });
}

export async function markAlertRead(alertId) {
  return request(`/api/users/me/alerts/${alertId}/read`, {
    method: 'PATCH'
  });
}

export async function fetchWorkspace() {
  return request('/api/experience/workspace');
}

export async function createFolder(payload) {
  return request('/api/experience/folders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function addFolderListing(folderId, payload) {
  return request(`/api/experience/folders/${folderId}/listings`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateFolderListing(itemId, payload) {
  return request(`/api/experience/folder-items/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function scheduleTour(payload) {
  return request('/api/experience/tours', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateTour(id, payload) {
  return request(`/api/experience/tours/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function createChecklistItem(payload) {
  return request('/api/experience/checklist-items', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateChecklistItem(id, payload) {
  return request(`/api/experience/checklist-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function createBoard(payload) {
  return request('/api/experience/boards', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function addBoardItem(boardId, payload) {
  return request(`/api/experience/boards/${boardId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateNotificationPreferences(payload) {
  return request('/api/experience/preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function askAssistant(payload) {
  return request('/api/experience/assistant', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchAdminOverview() {
  return request('/api/admin/overview');
}

export async function fetchMarketInsights(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/insights/market${query ? `?${query}` : ''}`);
}

export async function fetchSellerEstimate(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(`/api/seller/estimate${query ? `?${query}` : ''}`);
}

export { getActiveProfile, DEFAULT_PROFILE };
