'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);
const PUBLIC_PAGES = ['/login', '/register', '/verify'];

function isPublicRoute(pathname) {
  if (pathname === '/' || pathname.startsWith('/listings/')) return true;
  if (PUBLIC_PAGES.includes(pathname)) return true;
  return false;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const d = await api('/auth/me');
      setUser(d.user);
    } catch {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Not logged in (or session expired): if visiting a protected page, send them to login
  useEffect(() => {
    if (!loading && !user && !isPublicRoute(pathname)) {
      router.replace('/login?from=' + encodeURIComponent(pathname));
    }
  }, [loading, user, pathname, router]);

  // If already logged in and visiting login or register, redirect to home
  useEffect(() => {
    if (!loading && user && (pathname === '/login' || pathname === '/register')) {
      router.replace('/');
    }
  }, [loading, user, pathname, router]);

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    router.replace('/');
  };

  return <AuthContext.Provider value={{ user, setUser, loading, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
