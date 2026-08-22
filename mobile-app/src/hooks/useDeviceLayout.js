import { useWindowDimensions } from 'react-native';

/**
 * Sumber kebenaran TUNGGAL untuk keputusan layout responsif (portrait vs landscape,
 * HP vs tablet, 1-panel vs 2-panel).
 *
 * Pakai `useWindowDimensions()` (bawaan RN) yang REAKTIF ke rotasi — beda dari
 * `Dimensions.get()` di module-scope yang statik & tidak update saat device diputar.
 *
 * Kenapa boolean JS, bukan breakpoint NativeWind (`md:`/`lg:`): switch keranjang
 * POS itu perubahan STRUKTUR pohon (sidebar dock vs modal bottom-sheet), bukan
 * sekadar tweak style. Dengan boolean, hanya satu cabang pohon yang di-mount.
 *
 * @returns {{
 *   width: number, height: number,
 *   isLandscape: boolean,   // orientasi saat ini
 *   isTablet: boolean,      // klasifikasi device (sisi terpendek >= 600dp)
 *   isWide: boolean,        // lebar layar cukup untuk layout 2-kolom (>= 768dp)
 *   showTwoPane: boolean,   // tampilkan panel keranjang dock (POS 2-panel)
 *   productColumns: number  // jumlah kolom grid produk (2 / 3 / 4)
 * }}
 */
export default function useDeviceLayout() {
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;
  // Sisi terpendek invarian terhadap rotasi → penanda device yang stabil.
  const shortestSide = Math.min(width, height);
  const isTablet = shortestSide >= 600;

  // isWide didasarkan pada lebar AKTUAL (reaktif), bukan device — jadi tablet
  // yang diputar ke portrait pun ikut turun ke 1-panel bila lebarnya < 768.
  const isWide = width >= 768;
  const showTwoPane = isWide;
  const productColumns = isWide ? (width >= 1100 ? 4 : 3) : 2;

  return { width, height, isLandscape, isTablet, isWide, showTwoPane, productColumns };
}
