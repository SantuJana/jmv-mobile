import { Platform } from "react-native";

const DEFAULT_API_BASE_URL = "http://localhost:5000/api/v1";

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

const toAndroidReachableUrl = (rawUrl: string) => {
  if (Platform.OS !== "android") {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.hostname = "10.0.2.2";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // Keep the raw value when it is not a valid URL.
  }

  return rawUrl;
};

const resolvedBaseUrl = configuredApiBaseUrl && configuredApiBaseUrl.length > 0
  ? configuredApiBaseUrl
  : DEFAULT_API_BASE_URL;

export const API_BASE_URL = toAndroidReachableUrl(resolvedBaseUrl);
