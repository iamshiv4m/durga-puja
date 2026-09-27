"use client";

import { useEffect, useRef } from "react";
import { ASTRAS } from "@/content/astras";
import { ROMAN } from "@/lib/math";
import { setState, useStore } from "@/lib/store";
import { SCRIPT_CLASS, STYLES } from "@/lib/styles";

export function AstraDialog() {
  const open = useStore((s) => s.open);
  const script = STYLES[useStore((s) => s.style) ?? "bengal"].script;
  const dialog = useRef<HTMLDialogElement>(null);
  const astra = open === null ? null : ASTRAS[open];

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open !== null && !node.open) node.showModal();
    if (open === null && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="astra-dialog"
      aria-labelledby="astra-title"
      onClose={() => setState({ open: null })}
      onClick={(event) => {
        if (event.target === event.currentTarget) setState({ open: null });
      }}
    >
      {astra && open !== null && (
        <div className="astra-card">
          <button className="astra-close" type="button" aria-label="Close" onClick={() => setState({ open: null })}>
            ×
          </button>
          <div className="astra-medallion" aria-hidden="true">
            <span>{ROMAN[open]}</span>
          </div>
          <p className={`native ${SCRIPT_CLASS[script]} astra-bangla`} lang={script}>
            {astra.native[script]}
          </p>
          <h3 id="astra-title">{astra.name}</h3>
          <p className="small-caps astra-meta">
            {astra.meaning} · {astra.giver}
          </p>
          <div className="astra-body">
            {astra.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <nav className="astra-steps" aria-label="Other astras">
            <button type="button" onClick={() => setState({ open: (open + ASTRAS.length - 1) % ASTRAS.length })}>
              ← {ASTRAS[(open + ASTRAS.length - 1) % ASTRAS.length].name}
            </button>
            <button type="button" onClick={() => setState({ open: (open + 1) % ASTRAS.length })}>
              {ASTRAS[(open + 1) % ASTRAS.length].name} →
            </button>
          </nav>
        </div>
      )}
    </dialog>
  );
}
