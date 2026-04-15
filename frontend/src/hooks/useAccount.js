import { useEffect, useState } from 'react';
import { DEFAULT_PROFILE, fetchCurrentUserState, updateProfile } from '../api/client';

const STORAGE_KEY = 'idxActiveProfile';

function readProfile() {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
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

export function useAccount() {
  const [profile, setProfile] = useState(readProfile);
  const [accountState, setAccountState] = useState({
    favorites: [],
    savedSearches: [],
    recentViews: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const nextState = await fetchCurrentUserState();
        if (!cancelled) {
          setAccountState({
            favorites: nextState.favorites || [],
            savedSearches: nextState.savedSearches || [],
            recentViews: nextState.recentViews || [],
            alerts: nextState.alerts || []
          });
          if (nextState.user?.name || nextState.user?.email) {
            const nextProfile = {
              email: nextState.user.email || profile.email,
              name: nextState.user.name || profile.name
            };
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
            setProfile(nextProfile);
          }
        }
      } catch (error) {
        console.error('Failed to load account state:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadState();

    return () => {
      cancelled = true;
    };
  }, [profile.email, profile.name]);

  const saveProfile = async (nextProfile) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
    setProfile(nextProfile);
    await updateProfile(nextProfile);
  };

  return {
    profile,
    setProfile: saveProfile,
    accountState,
    setAccountState,
    loading
  };
}
