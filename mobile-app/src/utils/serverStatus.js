import React, { createContext, useContext, useState, useEffect } from 'react';
import { getBaseUrl } from './api';

// Returns true if the server responded at all (even 404/401/500 => it's UP),
// false only when there was NO response (network error / timeout => it's DOWN).
// Uses raw fetch on purpose: it bypasses the axios interceptors, so a stray 401
// here can never trigger the auto-logout, and no auth token is attached.
export const pingServer = async () => {
  const base = getBaseUrl();
  if (!base) return false; // tenant belum dipilih → anggap offline
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    // fetch resolves for ANY HTTP status and only rejects on a real network
    // failure/abort, which is exactly the online/offline signal we want.
    await fetch(base, { method: 'GET', signal: controller.signal });
    return true;
  } catch (e) {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

// `undefined` = no provider in the tree yet (lets the hook fall back to a
// local poll). `null` = provider mounted, first check still in flight.
const ServerStatusContext = createContext(undefined);

// ONE poll for the whole app. Wrap the app once (in App.js) and every screen
// reads the same online/offline value in sync — instead of each screen opening
// its own timer and pinging the server independently.
export const ServerStatusProvider = ({ children, intervalMs = 15000 }) => {
  const [online, setOnline] = useState(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const ok = await pingServer();
      if (mounted) setOnline(ok);
    };
    check();
    const id = setInterval(check, intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return (
    <ServerStatusContext.Provider value={online}>
      {children}
    </ServerStatusContext.Provider>
  );
};

// Reads the shared app-wide status. `online` is null while the first check is
// in flight, then true (server up) / false (server down). If ever used outside
// the provider it self-heals by polling locally, so no screen can crash.
export const useServerStatus = () => {
  const ctx = useContext(ServerStatusContext);
  const hasProvider = ctx !== undefined;
  const [local, setLocal] = useState(null);

  useEffect(() => {
    if (hasProvider) return; // provider already polling; nothing to do
    let mounted = true;
    const check = async () => {
      const ok = await pingServer();
      if (mounted) setLocal(ok);
    };
    check();
    const id = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [hasProvider]);

  return hasProvider ? ctx : local;
};
