import { useEffect, useState } from 'react';

const STORAGE_KEY = 'favoriteProperties';

export function useFavorites() {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to parse favorites from localStorage:', error);
      }
    }
  }, []);

  const saveFavorites = (newFavorites) => {
    setFavorites(newFavorites);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
  };

  const addFavorite = (propertyId) => {
    if (!favorites.includes(propertyId)) {
      saveFavorites([...favorites, propertyId]);
    }
  };

  const removeFavorite = (propertyId) => {
    saveFavorites(favorites.filter((id) => id !== propertyId));
  };

  const isFavorite = (propertyId) => {
    return favorites.includes(propertyId);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite
  };
}