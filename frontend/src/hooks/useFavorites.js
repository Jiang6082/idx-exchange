import { useEffect, useState } from 'react';
import {
  addFavorite as addFavoriteRequest,
  fetchCurrentUserState,
  removeFavorite as removeFavoriteRequest
} from '../api/client';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      try {
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

    return () => {
      cancelled = true;
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
    addFavorite,
    removeFavorite,
    isFavorite,
    loading
  };
}
