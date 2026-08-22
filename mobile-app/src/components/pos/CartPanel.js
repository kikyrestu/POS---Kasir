import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ModernSelect from '../ModernSelect';

// ─────────────────────────────────────────
// CART ITEM ROW
// ─────────────────────────────────────────
function CartItemRow({ item, onIncrease, onDecrease, onRemove, onUpdateNotes }) {
  const [showNotes, setShowNotes] = useState(false);
  return (
    <View className="bg-white border-b border-slate-100 py-4 px-2">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-bold text-slate-900">{item.name}</Text>
          <Text className="text-xs text-slate-500">Rp {(Number(item.price) || 0).toLocaleString('id-ID')}</Text>
          {item.modifier_names ? <Text className="text-[10px] text-slate-400 mt-1">{item.modifier_names}</Text> : null}
          {item.item_notes ? <Text className="text-[10px] text-amber-500 mt-1 italic">Catatan: {item.item_notes}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => onRemove(item)} className="p-1">
          <Feather name="x" size={18} color="#94A3B8" />
        </TouchableOpacity>
      </View>
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => onDecrease(item)} className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-lg items-center justify-center">
            <Feather name="minus" size={14} color="#64748B" />
          </TouchableOpacity>
          <Text className="text-sm font-bold text-slate-900 w-6 text-center">{item.qty}</Text>
          <TouchableOpacity onPress={() => onIncrease(item)} className="w-8 h-8 bg-blue-50 border border-blue-200 rounded-lg items-center justify-center">
            <Feather name="plus" size={14} color="#2563EB" />
          </TouchableOpacity>
        </View>
        <Text className="text-sm font-bold text-slate-900 font-mono">Rp {((Number(item.price) || 0) * item.qty).toLocaleString('id-ID')}</Text>
      </View>
      {!item.item_notes && !showNotes && (
         <TouchableOpacity onPress={() => setShowNotes(true)} className="mt-2">
           <Text className="text-[10px] text-blue-600 font-medium">+ Tambah Catatan</Text>
         </TouchableOpacity>
      )}
      {showNotes && (
        <TextInput placeholderTextColor="#94A3B8" className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs" placeholder="Catatan..." value={item.item_notes} onChangeText={(val) => onUpdateNotes(item, val)} autoFocus />
      )}
    </View>
  );
}
/**
 * Isi keranjang POS bersama — dipakai DUA konteks:
 *  - mode "modal": di dalam bottom-sheet HP (portrait).
 *  - mode "dock":  panel kanan yang selalu tampil di tablet (landscape, 2-panel).
 * Semua state POS tetap di parent (PosScreen); komponen ini murni terima props.
 */
export default function CartPanel({
  invoiceNumber,
  cartCount,
  cart,
  customers,
  selectedCustomer, setSelectedCustomer,
  orderType, setOrderType,
  selectedTable, setSelectedTable,
  tables, occupiedTableIds,
  discount, setDiscount,
  tax, setTax,
  cartSubtotal, cartTotal,
  onIncrease, onDecrease, onRemove, onUpdateNotes,
  onClearCart,
  onHold, onPay,
  onClose,               // modal: tutup sheet; dock: undefined (sembunyikan tombol X)
  bottomInset = 0,
}) {
  const confirmClear = () =>
    Alert.alert('Hapus Semua', 'Yakin ingin mengosongkan keranjang?', [
      { text: 'Batal' },
      { text: 'Ya, Kosongkan', onPress: onClearCart },
    ]);

  return (
    <View className="flex-1 flex-col">
      {/* Header */}
      <View className="px-6 py-5 border-b border-slate-100 flex-row justify-between items-center bg-slate-50/80">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Feather name="shopping-cart" size={20} color="#2563EB" />
          </View>
          <View>
            <Text className="font-bold text-slate-900 text-lg">Keranjang ({cartCount})</Text>
            <Text className="text-xs text-slate-500 font-medium">{invoiceNumber}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          {cart.length > 0 && (
            <TouchableOpacity onPress={confirmClear} className="p-2 bg-rose-50 rounded-xl">
              <Feather name="trash-2" size={18} color="#E11D48" />
            </TouchableOpacity>
          )}
          {onClose && (
            <TouchableOpacity onPress={onClose} className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
              <Feather name="x" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* BODY_PLACEHOLDER */}
      <ScrollView className="flex-1 px-4 py-2">
        {/* Customer Select */}
        <View className="mb-4 mt-2">
          <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Pelanggan</Text>
          <ModernSelect
            title="Pilih Pelanggan"
            placeholder="Umum (Walk-in)"
            leftIcon="user"
            searchable
            value={selectedCustomer}
            onChange={(val) => setSelectedCustomer(val)}
            options={[
              { label: 'Umum (Walk-in)', value: null, icon: 'users' },
              ...customers.map(c => ({ label: c.name, value: c.id, icon: 'user', sublabel: c.phone || undefined })),
            ]}
          />
        </View>

        {/* Order Type */}
        <View className="mb-4">
          <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Tipe Pesanan</Text>
          <View className="flex-row gap-2">
            {[{ v: 'dine_in', label: 'Dine In', icon: 'coffee' }, { v: 'takeaway', label: 'Takeaway', icon: 'shopping-bag' }].map(opt => (
              <TouchableOpacity
                key={opt.v}
                onPress={() => { setOrderType(opt.v); if (opt.v !== 'dine_in') setSelectedTable(''); }}
                className={`flex-1 flex-row items-center justify-center gap-2 p-3 rounded-xl border-2 ${orderType === opt.v ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
              >
                <Feather name={opt.icon} size={16} color={orderType === opt.v ? '#2563EB' : '#64748B'} />
                <Text className={`text-sm font-semibold ${orderType === opt.v ? 'text-blue-600' : 'text-slate-600'}`}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Table Picker (dine-in only) */}
        {orderType === 'dine_in' && (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-500 mb-1.5 ml-1 uppercase tracking-wider">Meja</Text>
            <ModernSelect
              title="Pilih Meja"
              placeholder="Pilih meja..."
              leftIcon="grid"
              value={selectedTable}
              onChange={(val) => setSelectedTable(val)}
              options={[
                { label: 'Tanpa meja', value: '', icon: 'slash' },
                ...tables.map(t => ({
                  label: t.name,
                  value: t.id,
                  icon: 'square',
                  sublabel: occupiedTableIds.includes(t.id) ? 'Terisi' : 'Kosong',
                })),
              ]}
            />
          </View>
        )}
        {/* CARTLIST_PLACEHOLDER */}
        {cart.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20 opacity-60">
            <Feather name="shopping-cart" size={60} color="#CBD5E1" />
            <Text className="text-slate-400 mt-4 font-semibold text-lg">Keranjang Kosong</Text>
          </View>
        ) : (
          cart.map(item => (
            <CartItemRow
              key={item.cart_id}
              item={item}
              onIncrease={onIncrease}
              onDecrease={onDecrease}
              onRemove={onRemove}
              onUpdateNotes={onUpdateNotes}
            />
          ))
        )}
      </ScrollView>
      {/* FOOTER_PLACEHOLDER */}
      <View className="border-t border-slate-200 bg-slate-50/50 px-5 pt-4" style={{ paddingBottom: 16 + bottomInset }}>
        <View className="flex-row gap-2 mb-3">
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-500 mb-1">Diskon (Rp)</Text>
            <TextInput placeholderTextColor="#94A3B8" value={discount.toString()} onChangeText={setDiscount} keyboardType="numeric" placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-blue-500" />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-500 mb-1">Pajak (Rp)</Text>
            <TextInput placeholderTextColor="#94A3B8" value={tax.toString()} onChangeText={setTax} keyboardType="numeric" placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:border-blue-500" />
          </View>
        </View>
        <View className="flex-row justify-between mb-1">
          <Text className="text-slate-500 text-sm">Subtotal</Text>
          <Text className="font-mono text-sm">Rp {cartSubtotal.toLocaleString('id-ID')}</Text>
        </View>
        <View className="flex-row justify-between mt-2 pt-2 border-t border-slate-200">
          <Text className="text-lg font-bold text-slate-900">Total</Text>
          <Text className="text-lg font-bold text-blue-600 font-mono">Rp {cartTotal.toLocaleString('id-ID')}</Text>
        </View>
        <View className="flex-row gap-2 mt-4">
          <TouchableOpacity onPress={onHold} disabled={cart.length === 0} className="flex-1 bg-amber-500 p-3 rounded-xl flex-row items-center justify-center gap-2 opacity-100 disabled:opacity-50">
            <Feather name="clock" size={16} color="#fff" />
            <Text className="text-white font-bold">Simpan</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onPay} disabled={cart.length === 0} className="flex-[2] bg-blue-600 p-3 rounded-xl flex-row items-center justify-center gap-2 opacity-100 disabled:opacity-50">
            <Feather name="credit-card" size={16} color="#fff" />
            <Text className="text-white font-bold">Bayar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
