import { create } from "zustand";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /** Resolve the actual theme (light/dark) given the OS preference. */
  resolved: () => "light" | "dark";
  /** Apply the theme to <html> data-theme attribute. Call on mode change + OS change. */
  apply: () => void;
}

const STORAGE_KEY = "influxdb-gui.theme";

function readStored(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function writeStored(mode: ThemeMode) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, mode);
  }
}

function osDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: readStored(),

  setMode: (mode) => {
    writeStored(mode);
    set({ mode });
    get().apply();
  },

  resolved: () => {
    const mode = get().mode;
    if (mode === "system") return osDark() ? "dark" : "light";
    return mode;
  },

  apply: () => {
    if (typeof document === "undefined") return;
    const theme = get().resolved();
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  },
}));
