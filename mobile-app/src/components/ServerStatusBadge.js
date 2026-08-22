import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useServerStatus } from '../utils/serverStatus';

// Small pill showing whether the app can reach the server:
//   green = Online  -> server up, changes auto-sync
//   red   = Offline -> running on local SQLite (still fully usable)
//   grey  = ...     -> first check still in flight
// Reads the single app-wide poll (ServerStatusProvider), so the dot on every
// screen flips together. Drop it into any header: <ServerStatusBadge />.
export default function ServerStatusBadge({ style }) {
  const online = useServerStatus();
  const s = online === false ? OFFLINE : online ? ONLINE : CHECKING;

  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }, style]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.label, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

// Exact same colors as the original POS pill (Tailwind emerald / rose / slate).
const ONLINE = { bg: '#ECFDF5', border: '#A7F3D0', dot: '#10B981', text: '#059669', label: 'Online' };
const OFFLINE = { bg: '#FFF1F2', border: '#FECDD3', dot: '#F43F5E', text: '#E11D48', label: 'Offline' };
const CHECKING = { bg: '#F1F5F9', border: '#E2E8F0', dot: '#94A3B8', text: '#64748B', label: '...' };

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 11, fontWeight: '600' },
});
