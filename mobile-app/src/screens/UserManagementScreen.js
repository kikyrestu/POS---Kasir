import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernSelect from '../components/ModernSelect';
import ResponsiveContainer from '../components/ResponsiveContainer';
import AccessDenied from '../components/AccessDenied';
import { Feather, Ionicons } from '@expo/vector-icons';
import { getLocalUsers, getLocalRoles, createLocalUser, updateLocalUser, toggleLocalUser, deleteLocalUser } from '../services/SyncService';
import { useAuth } from '../utils/auth';

export default function UserManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { can } = useAuth();
  const allowed = can('users.manage');
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role_id: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!allowed) return; // role kasir: jangan fetch, langsung tampil AccessDenied
    fetchData();
    fetchRoles();
  }, [allowed]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getLocalUsers();
      setUsers(data);
    } catch (e) {
      Alert.alert('Error', e.message || 'Gagal mengambil data user.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await getLocalRoles();
      setRoles(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, role_id: data[0].id }));
      }
    } catch (e) {
      console.log('Failed to fetch roles', e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getLocalUsers();
      setUsers(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role_id: roles.length > 0 ? roles[0].id : '' });
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role_id: user.role_id });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.role_id) {
      Alert.alert('Error', 'Nama, email, dan peran harus diisi.');
      return;
    }

    if (!editingUser && !formData.password) {
      Alert.alert('Error', 'Password wajib diisi untuk karyawan baru.');
      return;
    }

    try {
      setSaving(true);
      if (editingUser) {
        await updateLocalUser(editingUser.id, formData);
      } else {
        await createLocalUser(formData);
      }
      setModalVisible(false);
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await toggleLocalUser(user.id);
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.message || 'Gagal mengubah status.');
    }
  };

  const deleteUser = (user) => {
    Alert.alert('Hapus Karyawan', `Yakin ingin menghapus ${user.name}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
          try {
            await deleteLocalUser(user.id);
            fetchData();
          } catch (e) {
            Alert.alert('Error', e.message || 'Gagal menghapus karyawan.');
          }
        } 
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>
        <View style={[styles.badge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.badgeText, item.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {item.is_active ? 'Aktif' : 'Nonaktif'}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.roleText}><Feather name="shield" size={14} /> {item.role?.display_name || 'Tanpa Peran'}</Text>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleActive(item)}>
          <Feather name={item.is_active ? "power" : "check-circle"} size={18} color={item.is_active ? "#F59E0B" : "#10B981"} />
          <Text style={[styles.actionText, { color: item.is_active ? "#F59E0B" : "#10B981" }]}>
            {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
          <Feather name="edit-2" size={18} color="#3B82F6" />
          <Text style={[styles.actionText, { color: "#3B82F6" }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteUser(item)}>
          <Feather name="trash-2" size={18} color="#EF4444" />
          <Text style={[styles.actionText, { color: "#EF4444" }]}>Hapus</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!allowed) {
    return <AccessDenied navigation={navigation} title="Manajemen Karyawan" />;
  }

  return (
    <View style={[styles.safe, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manajemen Karyawan</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#2563EB" /></View>
      ) : (
        /* Cap lebar & tengahin list di layar lebar (tablet landscape) biar ga melar */
        <ResponsiveContainer fill maxWidth={900}>
        <FlatList
          style={{ flex: 1 }}
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Feather name="users" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>Belum ada data karyawan.</Text>
            </View>
          }
        />
        </ResponsiveContainer>
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingUser ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nama Lengkap</Text>
              <TextInput placeholderTextColor="#94A3B8" style={styles.input} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="John Doe" />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput placeholderTextColor="#94A3B8" style={styles.input} value={formData.email} onChangeText={t => setFormData({...formData, email: t})} placeholder="staf@toko.com" keyboardType="email-address" autoCapitalize="none" />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{editingUser ? 'Password Baru (Opsional)' : 'Password'}</Text>
              <TextInput placeholderTextColor="#94A3B8" style={styles.input} value={formData.password} onChangeText={t => setFormData({...formData, password: t})} placeholder="Min. 6 karakter" secureTextEntry />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Peran (Role)</Text>
              <ModernSelect
                title="Pilih Peran"
                placeholder="Pilih peran..."
                leftIcon="shield"
                value={formData.role_id}
                onChange={(v) => setFormData({ ...formData, role_id: v })}
                options={roles.map(r => ({ label: r.display_name, value: r.id, icon: 'shield' }))}
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Simpan</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  backBtn: { padding: 4 },
  listContainer: { padding: 16, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#94A3B8', fontSize: 16 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#94A3B8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#2563EB', fontSize: 18, fontWeight: 'bold' },
  userName: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  userEmail: { fontSize: 13, color: '#64748B' },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeInactive: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextActive: { color: '#16A34A' },
  badgeTextInactive: { color: '#DC2626' },
  
  cardBody: { marginTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  roleText: { color: '#475569', fontSize: 14, fontWeight: '500' },
  
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#F8FAFC', borderRadius: 8, flex: 1, justifyContent: 'center', marginHorizontal: 4 },
  actionText: { marginLeft: 6, fontWeight: '600', fontSize: 13 },
  
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: '#F8FAFC' },
  pickerContainer: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, backgroundColor: '#F8FAFC', overflow: 'hidden' },
  
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '600', fontSize: 16 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#2563EB', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
