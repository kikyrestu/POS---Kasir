import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, RefreshControl, Modal, Switch, ScrollView } from 'react-native';
import { ArrowLeft, Search, Plus, Edit2, Trash2, Users, X } from 'lucide-react-native';
import { getLocalCustomers, syncCustomers, createLocalCustomer, updateLocalCustomer, deleteLocalCustomer } from '../services/SyncService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ModernSelect from '../components/ModernSelect';
import ResponsiveContainer from '../components/ResponsiveContainer';

export default function CustomerListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState('umum');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await getLocalCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal memuat data pelanggan.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await syncCustomers();
    await loadCustomers();
    setRefreshing(false);
  };

  const openCreate = () => {
    setEditTarget(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setType('umum');
    setIsActive(true);
    setShowModal(true);
  };

  const openEdit = (customer) => {
    setEditTarget(customer.id);
    setName(customer.name);
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setType(customer.type || 'umum');
    setIsActive(customer.is_active ? true : false);
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert('Error', 'Nama pelanggan wajib diisi!');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload = { name, phone, email, address, type, is_active: isActive ? 1 : 0 };

      // Tulis lokal + antre outbox, lalu reload langsung (ga nunggu server).
      if (editTarget) {
        await updateLocalCustomer(editTarget, payload);
      } else {
        await createLocalCustomer(payload);
      }

      setShowModal(false);
      loadCustomers();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal menyimpan data pelanggan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Konfirmasi', 'Yakin ingin menghapus pelanggan ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
          try {
            await deleteLocalCustomer(id);
            loadCustomers();
          } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Gagal menghapus pelanggan.');
          }
      }}
    ]);
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  const getBadgeStyle = (type) => {
    switch(type) {
      case 'member': return { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' };
      case 'reseller': return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
      default: return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' }; // umum
    }
  };

  const renderItem = ({ item }) => {
    const typeBadge = getBadgeStyle(item.type);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleArea}>
            <View style={styles.avatarBox}>
              <Users size={20} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>{item.name}</Text>
              <View style={[styles.typeBadge, { backgroundColor: typeBadge.bg, borderColor: typeBadge.border }]}>
                <Text style={[styles.typeBadgeText, { color: typeBadge.text }]}>{item.type ? item.type.toUpperCase() : 'UMUM'}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusBadgeText, item.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
              {item.is_active ? 'Aktif' : 'Nonaktif'}
            </Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Telepon</Text>
            <Text style={styles.infoValue}>{item.phone || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{item.email || '-'}</Text>
          </View>
          {!!item.address && (
            <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={styles.infoLabel}>Alamat</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{item.address}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.btnAction} onPress={() => openEdit(item)}>
            <Edit2 size={16} color="#64748B" />
            <Text style={styles.btnActionText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnAction} onPress={() => handleDelete(item.id)}>
            <Trash2 size={16} color="#E11D48" />
            <Text style={[styles.btnActionText, { color: '#E11D48' }]}>Hapus</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.headerTitleContainer, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={{ marginRight: 12 }}>
            <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Pelanggan</Text>
            <Text style={styles.headerSubtitle}>Kelola data pelanggan</Text>
        </View>
        <TouchableOpacity style={styles.btnAdd} onPress={openCreate}>
            <Plus size={16} color="#fff" />
            <Text style={styles.btnAddText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
            <Search size={20} color="#94A3B8" />
            <TextInput placeholderTextColor="#94A3B8" 
                style={styles.searchInput}
                placeholder="Cari pelanggan..."
                value={search}
                onChangeText={setSearch}
            />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
      ) : (
        /* Cap lebar & tengahin list di layar lebar (tablet landscape) biar ga melar */
        <ResponsiveContainer fill maxWidth={900}>
          <FlatList
            data={filtered}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                  <Users size={40} color="#CBD5E1" />
                  <Text style={styles.emptyText}>Belum ada data pelanggan.</Text>
              </View>
            }
          />
        </ResponsiveContainer>
      )}

      {/* MODAL FORM PELANGGAN */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.btnClose}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nama Pelanggan <Text style={{color: 'red'}}>*</Text></Text>
              <TextInput placeholderTextColor="#94A3B8" style={styles.input} placeholder="Contoh: Budi Santoso" value={name} onChangeText={setName} />

              <Text style={styles.inputLabel}>Telepon</Text>
              <TextInput placeholderTextColor="#94A3B8" style={styles.input} placeholder="Contoh: 08123456789" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

              <Text style={styles.inputLabel}>Email</Text>
              <TextInput placeholderTextColor="#94A3B8" style={styles.input} placeholder="Contoh: budi@email.com" keyboardType="email-address" value={email} onChangeText={setEmail} autoCapitalize="none" />

              <Text style={styles.inputLabel}>Alamat</Text>
              <TextInput placeholderTextColor="#94A3B8" style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Alamat lengkap" multiline value={address} onChangeText={setAddress} />

              <Text style={styles.inputLabel}>Tipe Pelanggan</Text>
              <View style={{ marginBottom: 16 }}>
                <ModernSelect
                  title="Tipe Pelanggan"
                  accent="#3B82F6"
                  leftIcon="tag"
                  value={type}
                  onChange={setType}
                  options={[
                    { label: 'Umum', value: 'umum', icon: 'user' },
                    { label: 'Member', value: 'member', icon: 'star' },
                    { label: 'Reseller', value: 'reseller', icon: 'briefcase' },
                  ]}
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Status Pelanggan</Text>
                  <Text style={styles.switchSubLabel}>{isActive ? 'Pelanggan aktif' : 'Pelanggan dinonaktifkan'}</Text>
                </View>
                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: '#CBD5E1', true: '#93C5FD' }} thumbColor={isActive ? '#3B82F6' : '#F1F5F9'} />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowModal(false)}>
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnSubmit, isSubmitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnSubmitText}>Simpan</Text>}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
  
  btnAdd: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  btnAddText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  searchContainer: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, fontSize: 14, color: '#334155', marginLeft: 8 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleArea: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  customerName: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, marginTop: 4 },
  typeBadgeText: { fontSize: 10, fontWeight: 'bold' },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusActive: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  statusInactive: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  statusTextActive: { color: '#16A34A' },
  statusTextInactive: { color: '#DC2626' },
  
  infoBox: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8, marginBottom: 8 },
  infoLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  infoValue: { fontSize: 12, color: '#334155', flex: 1, textAlign: 'right', marginLeft: 16 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  btnAction: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 },
  btnActionText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 12, fontSize: 14 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: '80%', width: '100%', maxWidth: 480, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  btnClose: { padding: 4 },
  modalBody: { padding: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#334155', marginBottom: 16 },
  pickerContainer: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 16, height: 50, justifyContent: 'center' },
  picker: { width: '100%' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 20 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#334155' },
  switchSubLabel: { fontSize: 12, color: '#64748B', marginTop: 2 },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12, backgroundColor: '#F8FAFC' },
  btnCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  btnCancelText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  btnSubmit: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#3B82F6' },
  btnSubmitText: { fontSize: 14, fontWeight: '600', color: '#fff' }
});
