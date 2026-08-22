import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';
configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false });
import "./global.css";
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from './src/utils/storage';
import { initBaseUrl } from './src/utils/api';
import { ActivityIndicator, View, Alert, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from './src/screens/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';
import ProductListScreen from './src/screens/ProductListScreen';
import ProductFormScreen from './src/screens/ProductFormScreen';
import CategoryListScreen from './src/screens/CategoryListScreen';
import StockOpnameScreen from './src/screens/StockOpnameScreen';
import StockMovementScreen from './src/screens/StockMovementScreen';
import CustomerListScreen from './src/screens/CustomerListScreen';
import SupplierListScreen from './src/screens/SupplierListScreen';
import ReportSalesScreen from './src/screens/ReportSalesScreen';
import ReportItemsScreen from './src/screens/ReportItemsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import UserManagementScreen from './src/screens/UserManagementScreen';
import { initDB } from './src/utils/database';
import { seedOfflineData } from './src/services/SyncService';
import UpdateModal from './src/components/UpdateModal';
import ServerStatusBadge from './src/components/ServerStatusBadge';
import { ServerStatusProvider } from './src/utils/serverStatus';
import { AuthProvider } from './src/utils/auth';
import { checkForBinaryUpdate, checkAndFetchOta, applyOta } from './src/utils/updateChecker';

const Stack = createNativeStackNavigator();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some errors */
});

export default function App() {
  console.log("APP STARTED");
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  // Update binary (APK) yang ke-detect dari latest.json → dipajang di <UpdateModal>.
  const [pendingUpdate, setPendingUpdate] = useState(null);

  useEffect(() => {
    // Bootstrap sequentially: DB + seed MUST finish before we read the token and
    // render a screen, otherwise PosScreen can load an empty catalog before seeding.
    const bootstrap = async () => {
      // Kunci orientasi per-device SEBELUM splash ilang: tablet (sisi terpendek
      // >= 600dp) default LANDSCAPE, HP tetap PORTRAIT. app.json "default" cuma
      // ngebuka izin di native manifest; penguncian sebenarnya di sini (runtime).
      // Butuh APK baru krn dep native (expo-screen-orientation) — TIDAK bisa OTA.
      try {
        const { width, height } = Dimensions.get('screen');
        const isTablet = Math.min(width, height) >= 600;
        await ScreenOrientation.lockAsync(
          isTablet
            ? ScreenOrientation.OrientationLock.LANDSCAPE
            : ScreenOrientation.OrientationLock.PORTRAIT_UP
        );
      } catch (e) {
        console.warn('Gagal mengunci orientasi:', e);
      }

      try {
        await initBaseUrl(); // tarik baseURL per-tenant yg dipersist SEBELUM request/ping pertama
        await initDB();
        console.log("Offline Database Initialized");
        // Seed a starter cafe menu ONLY when the catalog is empty (idempotent).
        // Never clobbers real data synced from the server; self-heals when offline.
        const seed = await seedOfflineData();
        if (seed?.seeded) console.log("Seeded offline catalog:", seed);
      } catch (e) {
        console.error("Failed to init DB:", e);
      }

      // Check if user is logged in
      try {
        const token = await SecureStore.getItemAsync('userToken');
        setUserToken(token);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
        SplashScreen.hideAsync();
      }
    };
    bootstrap();
  }, []);

  // Cek update SETELAH app kebuka & splash ilang — non-blocking, ga ganggu kalau
  // offline. Dua jalur: (A) OTA buat perubahan JS → tawarin restart; (B) binary
  // APK buat perubahan native → popup download.
  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;

    const runUpdateChecks = async () => {
      // TIER B: update APK (butuh install ulang). Munculin popup kalau ada.
      try {
        const binary = await checkForBinaryUpdate();
        if (!cancelled && binary) setPendingUpdate(binary);
      } catch (e) { /* offline → skip */ }

      // TIER A: update OTA (JS). Kalau kedownload, tawarin restart sekarang.
      try {
        const otaReady = await checkAndFetchOta();
        if (!cancelled && otaReady) {
          Alert.alert(
            'Update Siap',
            'Pembaruan aplikasi sudah terunduh. Mulai ulang sekarang untuk memakainya?',
            [
              { text: 'Nanti', style: 'cancel' },
              { text: 'Mulai Ulang', onPress: () => applyOta() },
            ]
          );
        }
      } catch (e) { /* offline → skip */ }
    };

    runUpdateChecks();
    return () => { cancelled = true; };
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
        <ServerStatusProvider>
        <NavigationContainer>
        <Stack.Navigator 
          screenOptions={{ headerShown: false }} 
          initialRouteName={userToken == null ? "Login" : "MainApp"}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainApp" component={TabNavigator} />
          <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CategoryList" component={CategoryListScreen} options={{ headerShown: true, title: 'Manajemen Kategori', headerRight: () => <ServerStatusBadge style={{ marginRight: 4 }} /> }} />
          <Stack.Screen name="StockOpname" component={StockOpnameScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StockMovement" component={StockMovementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CustomerList" component={CustomerListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SupplierList" component={SupplierListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ReportSales" component={ReportSalesScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ReportItems" component={ReportItemsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Pengaturan', headerRight: () => <ServerStatusBadge style={{ marginRight: 4 }} /> }} />
          <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>

        <UpdateModal update={pendingUpdate} onClose={() => setPendingUpdate(null)} />
        </ServerStatusProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}


