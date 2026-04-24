import { useEffect, useState } from 'react';
import {
  addFavorite as addFavoriteRequest,
  fetchCurrentUserState,
  getSessionToken,
  removeFavorite as removeFavoriteRequest
} from '../api/client';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      try {
        if (!getSessionToken()) {
          if (!cancelled) {
            setFavorites([]);
          }
          return;
        }

        const state = await fetchCurrentUserState();
        if (!cancelled) {
          setFavorites(state.favorites || []);
        }
      } catch (error) {
        console.error('Failed to load favorites:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFavorites();

    function handleSessionChange() {
      setLoading(true);
      loadFavorites();
    }

    window.addEventListener('idx-session-change', handleSessionChange);

    return () => {
      cancelled = true;
      window.removeEventListener('idx-session-change', handleSessionChange);
    };
  }, []);

  const addFavorite = async (propertyId) => {
    if (favorites.includes(propertyId)) {
      return;
    }

    const nextFavorites = [...favorites, propertyId];
    setFavorites(nextFavorites);

    try {
      await addFavoriteRequest(propertyId);
    } catch (error) {
      setFavorites(favorites);
      throw error;
    }
  };

  const removeFavorite = async (propertyId) => {
    const nextFavorites = favorites.filter((id) => id !== propertyId);
    setFavorites(nextFavorites);

    try {
      await removeFavoriteRequest(propertyId);
    } catch (error) {
      setFavorites(favorites);
      throw error;
    }
  };

  const isFavorite = (propertyId) => favorites.includes(propertyId);

  return {
    favorites,
    isSessionReady: Boolean(getSessionToken()),
    addFavorite,
    removeFavorite,
    isFavorite,
    loading
  };
}
