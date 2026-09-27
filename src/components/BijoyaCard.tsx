"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { STORIES } from "@/content/chapters";
import { renderCard } from "@/lib/bijoya";
import { STYLES, type PaintingStyle } from "@/lib/styles";

type Card = { url: string; file: File };

/** After Bisarjan: the reader writes their name and gets a Bijoya card to send. */
export function BijoyaCard({ style }: { style: PaintingStyle }) {
  const [name, setName] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const previous = useRef<string | null>(null);
  const greeting = STORIES[style].bijoya;

  // A card made for one region shouldn't linger when the reader switches to another.
  useEffect(() => {
    queueMicrotask(() => setCard(null));
  }, [style]);

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
    setBusy(true);
    setError(false);
    // Painting her takes a moment and blocks the page, so let "painting…" show first.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 30)));
    try {
      const url = new URL(STYLES[style].path, window.location.origin);
      const link = `trinayanī · ${url.host}${url.pathname === "/" ? "" : url.pathname}`;
      const blob = await renderCard(style, name, link);
      const file = new File([blob], `${greeting.english.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });
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
    const page = new URL(STYLES[style].path, window.location.origin).toString();
    try {
      await navigator.share({ files: [card.file], title: greeting.english, text: `${greeting.english}! ${page}` });
    } catch {
      // Closing the share sheet rejects too; nothing to do.
    }
  };
  const canShare = Boolean(card && typeof navigator !== "undefined" && navigator.canShare?.({ files: [card.file] }));

  return (
    <div className="bijoya">
      <p className="small-caps">send a {greeting.english} card</p>
      <form onSubmit={make}>
        <label htmlFor="bijoya-name" className="visually-hidden">
          Your name
        </label>
        <input
          id="bijoya-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="your name"
          maxLength={32}
          autoComplete="given-name"
        />
        <button type="submit" className="small-caps" disabled={busy}>
          {busy ? "painting…" : card ? "make it again" : "make the card"}
        </button>
      </form>
      {error && <p className="bijoya-error">The card could not be made in this browser.</p>}
      {card && (
        <figure>
          {/* A blob URL made on the client, so next/image has nothing to optimise. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={card.url} width={540} height={675} alt={`${greeting.english} card with Durga's face${name ? `, from ${name}` : ""}`} />
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
