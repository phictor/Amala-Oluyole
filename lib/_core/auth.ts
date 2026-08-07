import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { OAUTH_BINDING_KEY, REFRESH_TOKEN_KEY, SESSION_TOKEN_KEY } from "@/constants/oauth";

export type User = {
  id: number;
  openId?: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
  role?: string | null;
};

let currentUser: User | null = null;

export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try { return await SecureStore.getItemAsync(SESSION_TOKEN_KEY); } catch { return null; }
}

export async function setSessionToken(token: string): Promise<void> {
  if (Platform.OS !== "web") await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try { return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY); } catch { return null; }
}

export async function setRefreshToken(token: string): Promise<void> {
  if (Platform.OS !== "web") await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getOAuthBinding(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try { return await SecureStore.getItemAsync(OAUTH_BINDING_KEY); } catch { return null; }
}

export async function removeSessionToken(): Promise<void> {
  if (Platform.OS === "web") return;
  await Promise.allSettled([
    SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function getUserInfo(): Promise<User | null> {
  return currentUser;
}

export async function setUserInfo(user: User): Promise<void> {
  currentUser = user;
}

export async function clearUserInfo(): Promise<void> {
  currentUser = null;
}
