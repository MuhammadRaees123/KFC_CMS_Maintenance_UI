import type { User } from "@/types/auth";

const STORAGE_KEY = "user"; // keep same key you already use

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setTestUser(role: string) {
  const testUser: User = {
    id: 1,
    name: "Test User",
    role,
    token: "fake-token",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(testUser));
}

export function clearTestUser() {
  localStorage.removeItem(STORAGE_KEY);
}