import { useEffect, useState } from 'react';
import {
  DEFAULT_PROFILE,
  fetchAuthSession,
  fetchCurrentUserState,
  getSessionToken,
  getStoredProfile,
  updateProfile
} from '../api/client';

const STORAGE_KEY = 'idxActiveProfile';

function readProfile() {
  if (typeof window === 'undefined') {
    return DEFAULT_PROFILE;
  }

  return getStoredProfile();
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
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        if (!getSessionToken()) {
          if (!cancelled) {
            setSessionUser(null);
            setAccountState({
              favorites: [],
              savedSearches: [],
              recentViews: [],
              alerts: []
            });
          }
          return;
        }

        const auth = await fetchAuthSession();
        const nextState = await fetchCurrentUserState();
        if (!cancelled) {
          setSessionUser(auth.user || null);
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

    function handleSessionChange() {
      setProfile(readProfile());
    }

    window.addEventListener('idx-session-change', handleSessionChange);

    return () => {
      cancelled = true;
      window.removeEventListener('idx-session-change', handleSessionChange);
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
    sessionUser,
    setSessionUser,
    accountState,
    setAccountState,
    loading
  };
}
