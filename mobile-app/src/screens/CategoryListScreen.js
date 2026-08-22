import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getLocalCategories, createLocalCategory, updateLocalCategory, deleteLocalCategory } from '../services/SyncService';
import ResponsiveContainer from '../components/ResponsiveContainer';

export default function CategoryListScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Baca kategori dari SQLite lokal (offline-first).
      const data = await getLocalCategories();
      setCategories(data || []);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal mengambil data kategori.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Validasi', 'Nama kategori harus diisi.');
      return;
    }
    
    try {
      // Tulis lokal + antre outbox (server nyusul pas idup).
      if (editCategory) {
        await updateLocalCategory(editCategory.id, { name, description, is_active: 1 });
      } else {
        await createLocalCategory({ name, description, is_active: 1 });
      }
      setShowModal(false);
      fetchCategories();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Gagal menyimpan kategori.');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Hapus', 'Yakin ingin menghapus kategori ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: async () => {
          try {
            await deleteLocalCategory(id);
            fetchCategories();
          } catch (err) {
            console.error(err);
            Alert.alert('Error', err.message || 'Gagal menghapus kategori.');
          }
      }}
    ]);
  };

  const openAddModal = () => {
    setEditCategory(null);
    setName('');
    setDescription('');
    setShowModal(true);
  };

  const openEditModal = (cat) => {
    setEditCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setShowModal(true);
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {item.description ? <Text style={styles.cardDesc}>{item.description}</Text> : null}
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(item)}>
          <Feather name="edit-2" size={18} color="#4F46E5" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.id)}>
          <Feather name="trash-2" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Feather name="search" size={20} color="#94A3B8" />
        <TextInput placeholderTextColor="#94A3B8" 
          style={styles.searchInput}
          placeholder="Cari Kategori..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={<Text style={styles.emptyText}>Tidak ada kategori ditemukan.</Text>}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={showModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <ResponsiveContainer maxWidth={420}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editCategory ? 'Edit Kategori' : 'Tambah Kategori'}</Text>
            
            <Text style={styles.label}>Nama Kategori</Text>
            <TextInput placeholderTextColor="#94A3B8" style={styles.input} value={name} onChangeText={setName} placeholder="Misal: Minuman Dingin" />
            
            <Text style={styles.label}>Keterangan (Opsional)</Text>
            <TextInput placeholderTextColor="#94A3B8" style={styles.input} value={description} onChangeText={setDescription} placeholder="Catatan tambahan" />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowModal(false)}>
                <Text style={styles.btnCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSave} onPress={handleSave}>
                <Text style={styles.btnSaveText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ResponsiveContainer>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, padding: 12, fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardDesc: { fontSize: 13, color: '#64748B', marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20 },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#4F46E5', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#4F46E5', shadowOpacity: 0.3, shadowRadius: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#0F172A' },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  btnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F1F5F9' },
  btnCancelText: { color: '#64748B', fontWeight: '600' },
  btnSave: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#4F46E5' },
  btnSaveText: { color: '#fff', fontWeight: '600' }
});
