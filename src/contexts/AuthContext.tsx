import React, { createContext, useCallback, useContext, useState } from 'react';
import { apiFetch, setAuthToken } from '../lib/api.ts';
import type { UserProfile } from '../types/ecommerce.ts';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (payload: { full_name: string; email: string; phone?: string; password: string }) => Promise<UserProfile>;
  claimAdmin: (payload: { full_name: string; email: string; password: string; passcode?: string }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserState: (user: UserProfile) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const applySession = useCallback((newToken: string | null, newUser: UserProfile | null) => {
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        applySession(res.token, res.user);
        return res.user;
      } finally {
        setLoading(false);
      }
    },
    [applySession]
  );

  const register = useCallback(
    async (payload: { full_name: string; email: string; phone?: string; password: string }) => {
      setLoading(true);
      try {
        const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        applySession(res.token, res.user);
        return res.user;
      } finally {
        setLoading(false);
      }
    },
    [applySession]
  );

  const claimAdmin = useCallback(
    async (payload: { full_name: string; email: string; password: string; passcode?: string }) => {
      setLoading(true);
      try {
        const res = await apiFetch<{ token: string; user: UserProfile }>('/api/auth/claim-admin', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        applySession(res.token, res.user);
        return res.user;
      } finally {
        setLoading(false);
      }
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore if session already expired
    } finally {
      applySession(null, null);
    }
  }, [applySession]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/me');
      setUser(res.user);
    } catch {
      applySession(null, null);
    }
  }, [token, applySession]);

  const updateUserState = useCallback((updated: UserProfile) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, claimAdmin, logout, refreshUser, updateUserState }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
