/**
 * Cross-platform secure storage wrapper.
 * - Native (Android/iOS): uses expo-secure-store (encrypted)
 * - Web: falls back to localStorage (not encrypted, but functional)
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const getItemAsync = async (key) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
};

export const setItemAsync = async (key, value) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value);
};

export const deleteItemAsync = async (key) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key);
};
