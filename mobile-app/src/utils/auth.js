import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from './storage';
import api from './api';
import { pingServer } from './serverStatus';

// Identitas + role user, dipisah dari `userToken` (yang tetep dipegang api.js).
// - authUser : JSON user yang lagi login sekarang (buat gating menu).
// - authUsers: "buku telepon" per-email (lowercase) biar pas offline, user yang
//              pernah login di HP ini role-nya keinget lagi tanpa nanya server.
const AUTH_USER_KEY = 'authUser';
const AUTH_DIR_KEY = 'authUsers';

// Samain bentuk data dari mana pun sumbernya (login response pake camelCase,
// endpoint /user pake snake_case). Semua dinormalin ke satu bentuk.
const shape = (u = {}) => ({
  name: u.name ?? null,
  email: u.email ?? null,
  role: u.role ?? null,
  roleDisplay: u.roleDisplay ?? u.role_display ?? null,
  permissions: Array.isArray(u.permissions) ? u.permissions : [],
  isAdmin: u.isAdmin ?? u.is_admin ?? false,
});

export const loadDirectory = async () => {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_DIR_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// Simpan user aktif + daftarin ke buku telepon (by email) buat reuse offline.
export const saveAuth = async (user) => {
  const u = shape(user);
  await SecureStore.setItemAsync(AUTH_USER_KEY, JSON.stringify(u));
  if (u.email) {
    const dir = await loadDirectory();
    dir[String(u.email).toLowerCase()] = u;
    await SecureStore.setItemAsync(AUTH_DIR_KEY, JSON.stringify(dir));
  }
  return u;
};

export const loadAuth = async () => {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_USER_KEY);
    return raw ? shape(JSON.parse(raw)) : null;
  } catch (e) {
    return null;
  }
};

// Dipake LoginScreen pas offline: cari role user dari cache berdasarkan email.
export const findCachedByEmail = async (email) => {
  if (!email) return null;
  const dir = await loadDirectory();
  const hit = dir[String(email).toLowerCase()];
  return hit ? shape(hit) : null;
};

// Logout: hapus user aktif TAPI simpen buku teleponnya, biar login offline
// berikutnya (email yang sama) role-nya masih keinget.
export const clearAuth = async () => {
  await SecureStore.deleteItemAsync(AUTH_USER_KEY);
};

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = await loadAuth();
      if (mounted && cached) setAuth(cached);
      if (mounted) setReady(true);

      // Self-heal: sesi lama (login sebelum fitur role ada) punya token tapi
      // belum ada authUser. Kalau server lagi UP, tarik /user buat isi role +
      // permission. Kalau offline / token basi → dibiarin, gating fail-open.
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token && token !== 'OFFLINE_MODE' && !cached) {
          const online = await pingServer();
          if (online) {
            const res = await api.get('/user');
            const d = res.data || {};
            const saved = await saveAuth({
              name: d.user?.name,
              email: d.user?.email,
              role: d.role,
              role_display: d.role_display,
              permissions: d.permissions,
              is_admin: d.is_admin,
            });
            if (mounted) setAuth(saved);
          }
        }
      } catch (e) {
        /* offline / token invalid → biarin */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (user) => {
    const saved = await saveAuth(user);
    setAuth(saved);
    return saved;
  }, []);

  const signOut = useCallback(async () => {
    await clearAuth();
    setAuth(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('/user');
      const d = res.data || {};
      const saved = await saveAuth({
        name: d.user?.name,
        email: d.user?.email,
        role: d.role,
        role_display: d.role_display,
        permissions: d.permissions,
        is_admin: d.is_admin,
      });
      setAuth(saved);
      return saved;
    } catch (e) {
      return auth;
    }
  }, [auth]);

  const isAdmin = !!auth?.isAdmin;

  // Gating menu. FAIL-OPEN kalau role belum keketahui (auth === null): backend
  // yang jadi gerbang beneran (403), jadi jangan sampe ngunci owner pas transisi.
  // Kalau role udah ada: admin lolos semua, selain itu cek daftar permission.
  const can = useCallback(
    (perm) => {
      if (auth === null) return true;
      if (auth.isAdmin) return true;
      if (!perm) return true;
      return Array.isArray(auth.permissions) && auth.permissions.includes(perm);
    },
    [auth]
  );

  return (
    <AuthContext.Provider value={{ auth, ready, isAdmin, can, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    // Provider belum kepasang → fail-open biar ga ada screen yang crash.
    return {
      auth: null,
      ready: true,
      isAdmin: false,
      can: () => true,
      signIn: async () => {},
      signOut: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
};
