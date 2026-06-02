import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AuthUser } from "../types/api";

const AUTH_STORAGE_KEY = "jmv-mobile-auth";

export type StoredAuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export const readStoredAuthSession = async () => {
  const storedValue = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as StoredAuthSession;
  } catch {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const writeStoredAuthSession = async (session: StoredAuthSession | null) => {
  if (!session) {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};
