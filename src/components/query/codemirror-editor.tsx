import { useEffect, useRef, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { basicSetup } from "codemirror";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onCtrlEnter?: () => void;
  onCtrlShiftEnter?: () => void;
}

/** Minimal CodeMirror 6 editor for InfluxQL. */
export function CodeMirrorEditor({ value, onChange, onCtrlEnter, onCtrlShiftEnter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Extra keybindings for Ctrl+Enter and Ctrl+Shift+Enter
  const extraKeys = useCallback(() => keymap.of([
    {
      key: "Ctrl-Enter",
      run: () => {
        onCtrlEnter?.();
        return true;
      },
    },
    {
      key: "Ctrl-Shift-Enter",
      run: () => {
        onCtrlShiftEnter?.();
        return true;
      },
    },
  ]), [onCtrlEnter, onCtrlShiftEnter]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        sql({ dialect: PostgreSQL }), // Closest to InfluxQL syntax
        placeholder("输入 InfluxQL 查询..."),
        keymap.of(defaultKeymap),
        keymap.of([indentWithTab]),
        extraKeys(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => view.destroy();
  // Only re-create if extraKeys change (deps are stable callbacks)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraKeys]);

  // Sync external value changes (e.g. tab switch) back into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-48 overflow-hidden border-b border-border" />;
}
