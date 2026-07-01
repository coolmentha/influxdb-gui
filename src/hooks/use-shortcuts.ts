import { useEffect } from "react";

export interface ShortcutHandlers {
  onNewTab?: () => void;
  onCloseTab?: () => void;
  onRunQuery?: () => void;
  onRunAll?: () => void;
  onFocusTreeFilter?: () => void;
  onToggleTheme?: () => void;
  onToggleErrorLog?: () => void;
}

/** Global keyboard shortcuts hook. */
export function useShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      // Ctrl+T: new tab (but not when browser might intercept)
      if (e.key === "t" && !e.shiftKey) {
        e.preventDefault();
        handlers.onNewTab?.();
      }
      // Ctrl+W: close tab
      else if (e.key === "w" && !e.shiftKey) {
        e.preventDefault();
        handlers.onCloseTab?.();
      }
      // Ctrl+Enter: run query (handled in editor, but also here as fallback)
      else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handlers.onRunQuery?.();
      }
      // Ctrl+Shift+Enter: run all
      else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        handlers.onRunAll?.();
      }
      // Ctrl+/: focus tree filter
      else if (e.key === "/") {
        e.preventDefault();
        handlers.onFocusTreeFilter?.();
      }
      // Ctrl+Shift+L: toggle theme
      else if (e.key === "L" && e.shiftKey) {
        e.preventDefault();
        handlers.onToggleTheme?.();
      }
      // Ctrl+E: toggle error log panel
      else if (e.key === "e" && !e.shiftKey) {
        e.preventDefault();
        handlers.onToggleErrorLog?.();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlers]);
}
