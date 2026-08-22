import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api, { setTenant, getStoreCode, hasBaseUrl } from '../utils/api';
import * as SecureStore from '../utils/storage';
import { useAuth } from '../utils/auth';
import { verifyLocalUser, rememberOnlineLogin } from '../services/SyncService';

export default function LoginScreen({ navigation }) {
  const [storeCode, setStoreCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  // Prefill kode toko terakhir biar ga ngetik ulang tiap login.
  useEffect(() => {
    (async () => {
      try {
        const code = await getStoreCode();
        if (code) setStoreCode(code);
      } catch (_) {}
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Silakan isi email dan password.');
      return;
    }

    setLoading(true);
    try {
      // 1) Tentuin server dari KODE TOKO → https://{kode}.buildypos.store/api.
      //    Wajib ada, kecuali .env override / sesi sebelumnya udah simpen baseURL.
      const code = storeCode.trim();
      if (code) {
        try {
          await setTenant(code);
        } catch (_) {
          Alert.alert('Error', 'Kode toko tidak valid.');
          return;
        }
      } else if (!hasBaseUrl()) {
        Alert.alert('Kode Toko Kosong', 'Masukkan kode toko dulu (contoh: namatoko).');
        return;
      }

      // 2) Login ONLINE ke Laravel/Sanctum → bearer token + role/permissions.
      try {
        const response = await api.post('/login', { email: email.trim(), password });
        const data = response.data || {};
        if (data.token) await SecureStore.setItemAsync('userToken', data.token);

        // Simpen kredensial buat login OFFLINE berikutnya (hash lokal salt=email).
        await rememberOnlineLogin({
          id: data.user?.id,
          name: data.user?.name,
          email: data.user?.email || email.trim(),
          role_id: data.user?.role_id,
          role_name: data.role,
          is_active: data.user?.is_active,
          password,
        });

        await signIn({
          name: data.user?.name,
          email: data.user?.email || email.trim(),
          role: data.role,
          roleDisplay: data.role_display,
          permissions: data.permissions,
          isAdmin: data.is_admin,
        });
        navigation.replace('MainApp');
        return;
      } catch (error) {
        // Server NOLAK (ada response) → kredensial salah / akun nonaktif / rate-limit.
        // JANGAN jatuh ke offline: ini penolakan beneran, bukan "ga kejangkau".
        if (error.response) {
          const status = error.response.status;
          const msg =
            error.response?.data?.message ||
            (status === 429
              ? 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.'
              : 'Login gagal. Periksa email & password.');
          Alert.alert('Login Gagal', msg);
          return;
        }

        // Server GA KEJANGKAU (network error) → coba login OFFLINE lawan hash lokal.
        // Cuma jalan kalau user ini PERNAH login online di HP ini (rememberOnlineLogin
        // udah nyimpen hash) ATAU kasir yg dibikin owner lokal di HP ini.
        try {
          const localUser = await verifyLocalUser(email.trim(), password);
          if (localUser) {
            await SecureStore.setItemAsync('userToken', 'OFFLINE_MODE');
            await signIn(localUser);
            navigation.replace('MainApp');
            return;
          }
        } catch (_) {
          /* tabel users belum siap → lanjut ke pesan error */
        }

        Alert.alert(
          'Tidak Bisa Terhubung',
          'Server tidak terjangkau dan kredensial ini belum tersimpan di HP ini. Sambungkan internet dulu untuk login pertama kali.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32, backgroundColor: '#f8fafc' }} className="flex-1 justify-center px-8 bg-slate-50">
      <View className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 w-full max-w-md self-center">
        <View className="items-center mb-8">
          <Text className="text-3xl font-black text-slate-900 tracking-tight">BuildyPOS</Text>
          <Text className="text-sm text-slate-500 mt-2">Cashier App - Log in</Text>
        </View>

        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-2">Kode Toko</Text>
          <TextInput
            className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white text-slate-800 focus:border-blue-500"
            placeholder="namatoko"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            value={storeCode}
            onChangeText={setStoreCode}
          />
          <Text className="text-xs text-slate-400 mt-1">Alamat toko: {(storeCode.trim() || 'namatoko')}.buildypos.store</Text>
        </View>

        <View className="mb-5">
          <Text className="text-sm font-medium text-slate-700 mb-2">Email Address</Text>
          <TextInput
            className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white text-slate-800 focus:border-blue-500"
            placeholder="kasir@toko.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View className="mb-8">
          <Text className="text-sm font-medium text-slate-700 mb-2">Password</Text>
          <TextInput
            className="border border-slate-200 rounded-xl px-4 py-3.5 bg-white text-slate-800 focus:border-blue-500"
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          className={`bg-blue-600 rounded-xl py-4 flex-row justify-center items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-sm tracking-wide">LOG IN</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
