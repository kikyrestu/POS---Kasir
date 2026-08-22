import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * ModernSelect — a modern bottom-sheet dropdown replacement for the native Picker.
 *
 * Props:
 *  - value        : currently selected value
 *  - onChange     : (value) => void
 *  - options      : [{ label, value, sublabel?, icon?, disabled? }]
 *  - placeholder  : text shown when nothing is selected
 *  - title        : bottom-sheet header title
 *  - searchable   : show a search box (good for long lists)
 *  - leftIcon     : Feather icon name for the trigger
 *  - accent       : accent color (6-digit hex, default blue)
 *  - triggerStyle : extra style for the trigger container
 *  - disabled     : disable the whole control
 */
export default function ModernSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  title = 'Pilih Opsi',
  searchable = false,
  leftIcon,
  accent = '#2563EB',
  triggerStyle,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o.label).toLowerCase().includes(q));
  }, [query, options]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const pick = (opt) => {
    if (opt.disabled) return;
    onChange(opt.value);
    close();
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.trigger, disabled && { opacity: 0.5 }, triggerStyle]}
      >
        {leftIcon ? (
          <View style={[styles.triggerIcon, { backgroundColor: accent + '14' }]}>
            <Feather name={leftIcon} size={16} color={accent} />
          </View>
        ) : null}
        <Text
          numberOfLines={1}
          style={[styles.triggerText, { color: selected ? '#1E293B' : '#94A3B8' }]}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity activeOpacity={1} onPress={close} style={styles.backdrop}>
            <TouchableOpacity activeOpacity={1} style={styles.sheet}>
              <View style={styles.grabberWrap}>
                <View style={styles.grabber} />
              </View>

              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{title}</Text>
                <TouchableOpacity onPress={close} style={styles.closeBtn}>
                  <Feather name="x" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {searchable ? (
                <View style={styles.searchWrap}>
                  <Feather name="search" size={16} color="#94A3B8" />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Cari..."
                    placeholderTextColor="#94A3B8"
                    style={styles.searchInput}
                    autoCorrect={false}
                  />
                  {query.length > 0 ? (
                    <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                      <Feather name="x-circle" size={16} color="#CBD5E1" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              <ScrollView
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {filtered.length === 0 ? (
                  <View style={styles.empty}>
                    <Feather name="inbox" size={28} color="#CBD5E1" />
                    <Text style={styles.emptyText}>Tidak ada data</Text>
                  </View>
                ) : (
                  filtered.map((opt, i) => {
                    const active = opt.value === value;
                    return (
                      <TouchableOpacity
                        key={String(opt.value) + '_' + i}
                        activeOpacity={0.7}
                        disabled={opt.disabled}
                        onPress={() => pick(opt)}
                        style={[
                          styles.option,
                          active && { backgroundColor: accent + '12' },
                          opt.disabled && { opacity: 0.4 },
                        ]}
                      >
                        {opt.icon ? (
                          <View
                            style={[
                              styles.optionIcon,
                              { backgroundColor: active ? accent : '#F1F5F9' },
                            ]}
                          >
                            <Feather
                              name={opt.icon}
                              size={15}
                              color={active ? '#fff' : '#94A3B8'}
                            />
                          </View>
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Text
                            numberOfLines={1}
                            style={[styles.optionLabel, { color: active ? accent : '#1E293B' }]}
                          >
                            {opt.label}
                          </Text>
                          {opt.sublabel ? (
                            <Text
                              numberOfLines={1}
                              style={[styles.optionSub, active && { color: accent }]}
                            >
                              {opt.sublabel}
                            </Text>
                          ) : null}
                        </View>
                        {active ? <Feather name="check" size={18} color={accent} /> : null}
                      </TouchableOpacity>
                    );
                  })
                )}
                <View style={{ height: 12 }} />
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerText: { flex: 1, fontSize: 14, fontWeight: '600' },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '72%',
    paddingBottom: 10,
  },
  grabberWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1E293B' },

  list: { paddingHorizontal: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 4,
  },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { fontSize: 14, fontWeight: '600' },
  optionSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 8, fontSize: 13, color: '#94A3B8' },
});
