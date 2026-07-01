import { create } from "zustand";

interface LayoutState {
  sidebarWidth: number;
  editorHeight: number; // query editor height in px
  windowWidth: number;
  windowHeight: number;
  setSidebarWidth: (w: number) => void;
  setEditorHeight: (h: number) => void;
  setWindowSize: (w: number, h: number) => void;
  save: () => void;
  load: () => void;
}

const STORAGE_KEY = "influxdb-gui.layout";
const DEFAULTS = { sidebarWidth: 288, editorHeight: 192, windowWidth: 1280, windowHeight: 800 };

function readStored(): Partial<LayoutState> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  ...DEFAULTS,

  setSidebarWidth: (w) => set({ sidebarWidth: w }),
  setEditorHeight: (h) => set({ editorHeight: h }),
  setWindowSize: (w, h) => set({ windowWidth: w, windowHeight: h }),

  save: () => {
    const { sidebarWidth, editorHeight, windowWidth, windowHeight } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sidebarWidth, editorHeight, windowWidth, windowHeight }));
  },

  load: () => {
    const stored = readStored();
    set({ ...DEFAULTS, ...stored });
  },
}));
