"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi, getAccessToken, setAccessToken } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (emailOrUsername: string, password: string) => Promise<User>;
  register: (data: { email: string; username: string; password: string; full_name?: string }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (getAccessToken()) {
          const me = await authApi.me();
          if (!cancelled) setUser(me);
        } else {
          // A refresh cookie may still be valid from a previous session.
          const res = await authApi.refresh();
          if (!cancelled) setUser(res.user);
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (emailOrUsername: string, password: string) => {
    const res = await authApi.login({ email_or_username: emailOrUsername, password });
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (data: { email: string; username: string; password: string; full_name?: string }) => {
      await authApi.register(data);
      const res = await authApi.login({ email_or_username: data.email, password: data.password });
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.me());
    } catch {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "admin",
      login,
      register,
      logout,
      setUser,
      refreshUser,
    }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
