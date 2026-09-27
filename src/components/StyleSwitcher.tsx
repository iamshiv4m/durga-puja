"use client";

import { useEffect } from "react";
import { setState, useStore } from "@/lib/store";
import { SCRIPT_CLASS, STYLES, STYLE_ORDER, type PaintingStyle } from "@/lib/styles";

/** Bengal, Bihar or Gujarat: the same Durga, painted and told in each region's tradition. */
export function StyleSwitcher({ fallback }: { fallback: PaintingStyle }) {
  const style = useStore((s) => s.style) ?? fallback;
  const info = STYLES[style];

  const choose = (next: PaintingStyle) => {
    if (next === style) return;
    setState({ style: next });
    // Each region has its own page (and share preview); keep the address in step without a reload.
    window.history.replaceState(null, "", STYLES[next].path + window.location.hash);
  };

  useEffect(() => {
    document.title = STYLES[style].title;
  }, [style]);

  return (
    <div className="style-switcher">
      <div role="radiogroup" aria-label="Regional tradition" className="style-options small-caps">
        {STYLE_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={style === key}
            tabIndex={style === key ? 0 : -1}
            data-style={key}
            onClick={() => choose(key)}
            onKeyDown={(event) => {
              const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
              const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
              if (!forward && !back) return;
              event.preventDefault();
              const index = STYLE_ORDER.indexOf(style) + (forward ? 1 : -1);
              const next = STYLE_ORDER[(index + STYLE_ORDER.length) % STYLE_ORDER.length];
              choose(next);
              event.currentTarget.parentElement?.querySelector<HTMLElement>(`[data-style="${next}"]`)?.focus();
            }}
          >
            {STYLES[key].region}
          </button>
        ))}
      </div>
      <p className="style-note" aria-live="polite">
        <span className={SCRIPT_CLASS[info.script]} lang={info.script}>
          {info.native}
        </span>{" "}
        <span className="style-name">{info.name}</span>
        <span className="style-detail">{info.note}</span>
      </p>
    </div>
  );
}
