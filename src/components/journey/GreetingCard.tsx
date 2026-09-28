"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { JourneyContent, Kit, Script } from "@/journeys/types";

const SIZE = { width: 1080, height: 1350 };

/** The next/font CSS variable for each script (see app/layout.tsx). */
const SCRIPT_FONTS: Record<Script, string> = {
  deva: "--font-deva",
  gujarati: "--font-gujarati",
  bangla: "--font-bangla",
  gurmukhi: "--font-gurmukhi",
  tamil: "--font-tamil",
  malayalam: "--font-malayalam",
};

function family(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

/** The reader types a name and gets the festival's greeting card as a PNG to save or send. */
export function GreetingCard({ content, kit }: { content: JourneyContent; kit: Kit | null }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [card, setCard] = useState<{ url: string; file: File } | null>(null);
  const previous = useRef<string | null>(null);
  const { english, native } = content.card;

  useEffect(() => {
    if (previous.current && previous.current !== card?.url) URL.revokeObjectURL(previous.current);
    previous.current = card?.url ?? null;
  }, [card]);
  useEffect(
    () => () => {
      if (previous.current) URL.revokeObjectURL(previous.current);
    },
    [],
  );

  const make = async (event: FormEvent) => {
    event.preventDefault();
    if (!kit) return;
    setBusy(true);
    setError(false);
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
    try {
      const fonts = {
        serif: family("--font-serif", "Georgia, serif"),
        sc: family("--font-sc", "Georgia, serif"),
        deva: family(SCRIPT_FONTS[content.script ?? "deva"], "serif"),
      };
      await Promise.all([
        document.fonts.load(`96px ${fonts.deva}`, native + content.finale.native),
        document.fonts.load(`italic 40px ${fonts.serif}`, name || "a"),
        document.fonts.load(`30px ${fonts.sc}`, english),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = SIZE.width;
      canvas.height = SIZE.height;
      const ctx = canvas.getContext("2d")!;
      const url = new URL(content.path, window.location.origin);
      await kit.card(ctx, SIZE, name.trim(), `parv · ${url.host}${url.pathname}`, fonts);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"),
      );
      const file = new File([blob], `${english.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });
      setCard({ url: URL.createObjectURL(blob), file });
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!card) return;
    const page = new URL(content.path, window.location.origin).toString();
    try {
      await navigator.share({ files: [card.file], title: english, text: `${english}! ${page}` });
    } catch {
      // Closing the share sheet rejects too; nothing to do.
    }
  };
  const canShare = Boolean(card && typeof navigator !== "undefined" && navigator.canShare?.({ files: [card.file] }));

  return (
    <div className="bijoya">
      <p className="small-caps">send a {english} card</p>
      <form onSubmit={make}>
        <label htmlFor="card-name" className="visually-hidden">
          Your name
        </label>
        <input
          id="card-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="your name"
          maxLength={32}
          autoComplete="given-name"
        />
        <button type="submit" className="small-caps" disabled={busy || !kit}>
          {busy ? "painting…" : card ? "make it again" : "make the card"}
        </button>
      </form>
      {error && <p className="bijoya-error">The card could not be made in this browser.</p>}
      {card && (
        <figure>
          {/* A blob URL made on the client, so next/image has nothing to optimise. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.url} width={540} height={675} alt={`${english} card${name ? `, from ${name}` : ""}`} />
          <figcaption>
            <a href={card.url} download={card.file.name} className="small-caps">
              download
            </a>
            {canShare && (
              <button type="button" className="small-caps" onClick={share}>
                share
              </button>
            )}
          </figcaption>
        </figure>
      )}
    </div>
  );
}
