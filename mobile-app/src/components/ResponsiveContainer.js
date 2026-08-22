import React from 'react';
import { View } from 'react-native';
import useDeviceLayout from '../hooks/useDeviceLayout';

/**
 * Membungkus konten (biasanya form / detail) agar TIDAK melar absurd di layar
 * lebar (tablet landscape): lebar di-cap `maxWidth` dan di-tengah-kan. Di layar
 * sempit (HP) komponen ini transparan — konten tetap full-width seperti biasa.
 *
 * Pemakaian: bungkus isi ScrollView/konten form. Untuk layar yang mesti mengisi
 * tinggi penuh (mis. membungkus FlatList), set `fill`.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {number} [props.maxWidth=760]  Batas lebar saat layar lebar.
 * @param {boolean} [props.fill=false]   Tambahkan flex:1 agar mengisi tinggi.
 * @param {object} [props.style]         Override/tambahan style.
 */
export default function ResponsiveContainer({ children, maxWidth = 760, fill = false, style }) {
  const { isWide } = useDeviceLayout();

  return (
    <View
      style={[
        { width: '100%', alignSelf: 'center' },
        fill && { flex: 1 },
        isWide && { maxWidth },
        style,
      ]}
    >
      {children}
    </View>
  );
}
