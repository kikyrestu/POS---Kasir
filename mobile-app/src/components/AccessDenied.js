import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// Layar "akses ditolak" buat screen yang cuma boleh dibuka role tertentu.
// Ini lapisan UX; gerbang sebenernya tetep di backend (middleware permission:*).
export default function AccessDenied({ navigation, title = 'Akses Ditolak', message }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.safe}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>
      <View style={styles.centered}>
        <View style={styles.iconWrap}>
          <Feather name="lock" size={40} color="#94A3B8" />
        </View>
        <Text style={styles.bigText}>Tidak Punya Akses</Text>
        <Text style={styles.subText}>
          {message || 'Menu ini khusus untuk admin. Akun Anda tidak memiliki izin untuk membukanya.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  bigText: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 8 },
  subText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
});
