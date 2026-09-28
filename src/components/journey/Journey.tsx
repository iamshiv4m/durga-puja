"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { windowOpacity, type Window4 } from "@/lib/math";
import { isPortrait } from "@/lib/screen";
import { onScrollFrame, scroll, trackScroll } from "@/lib/scroll";
import { KITS } from "@/journeys/kits";
import { Player } from "@/journeys/player";
import type { Frame, JourneyContent, Kit, Scene } from "@/journeys/types";
import { GreetingCard } from "./GreetingCard";

const w = (value: Window4) => value.join(",");
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const PIXEL_RATIO_MAX = 2;

/**
 * One festival's scroll journey: a pinned canvas painted by the festival's scene, captions that
 * fade in and out with the scroll, a score, and after it the farewell and a greeting card.
 * It shares its layout and responsive styles with the Durga Puja journey (globals.css).
 */
export function Journey({ content }: { content: JourneyContent }) {
  const journey = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const rail = useRef<HTMLElement>(null);
  const [kit, setKit] = useState<Kit | null>(null);
  const [sound, setSound] = useState(false);
  const player = useRef<Player | null>(null);

  useEffect(() => {
    let live = true;
    void KITS[content.id]().then((loaded) => live && setKit(loaded));
    return () => {
      live = false;
    };
  }, [content.id]);

  // Captions, the rail, the counter and the hints follow the scroll directly, outside React.
  useEffect(() => {
    const section = journey.current;
    const root = stage.current;
    if (!section || !root) return;
    const stop = trackScroll(section);
    const captions = Array.from(root.querySelectorAll<HTMLElement>("[data-window]"));
    const windows = captions.map((el) => el.dataset.window!.split(",").map(Number) as unknown as Window4);
    const unsubscribe = onScrollFrame((p) => {
      captions.forEach((el, i) => {
        const o = windowOpacity(p, windows[i]);
        el.style.opacity = o.toFixed(3);
        el.style.transform = `translate3d(0, ${((1 - o) * 14).toFixed(2)}px, 0)`;
        el.style.visibility = o > 0.001 ? "visible" : "hidden";
      });
      const chapter = content.chapters.filter((c) => p >= c.window[0]).length;
      if (counter.current) counter.current.textContent = `${chapter} / ${content.chapters.length}`;
      rail.current?.style.setProperty("--progress", p.toFixed(4));
      root.dataset.started = p > 0.02 ? "yes" : "no";
      player.current?.update(p);
    });
    return () => {
      stop();
      unsubscribe();
    };
  }, [content]);

  // The scene: drawn every frame while the journey is on screen.
  useEffect(() => {
    const element = canvas.current;
    const section = journey.current;
    const context = element?.getContext("2d");
    if (!kit || !element || !section || !context) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene: Scene = kit.scene((event) => player.current?.on(event));
    const frame: Frame = { width: 0, height: 0, p: 0, dt: 0, seconds: 0, reduced, portrait: false };
    let visible = true;
    let last = performance.now();
    let raf = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_MAX);
      frame.width = element.clientWidth;
      frame.height = element.clientHeight;
      frame.portrait = isPortrait(frame.width, frame.height);
      element.width = Math.round(frame.width * ratio);
      element.height = Math.round(frame.height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      frame.dt = reduced ? 0 : dt;
      frame.seconds += frame.dt;
      frame.p = scroll.smooth;
      scene.draw(context, frame);
    };
    const pointer = (kind: "down" | "move" | "up") => (event: PointerEvent) => {
      if (!visible || !scene.pointer) return;
      const rect = element.getBoundingClientRect();
      scene.pointer(event.clientX - rect.left, event.clientY - rect.top, kind, frame);
    };
    const down = pointer("down");
    const move = pointer("move");
    const up = pointer("up");
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    observer.observe(section);
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [kit]);

  useEffect(() => () => player.current?.destroy(), []);

  // Reveal the verse and the farewell as they scroll into view.
  useEffect(() => {
    const items = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.35 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const toggleSound = async () => {
    if (!kit) return;
    if (sound) {
      player.current?.disable();
      setSound(false);
      return;
    }
    player.current ??= new Player(kit.score());
    try {
      await player.current.enable();
      player.current.update(scroll.smooth);
      setSound(true);
    } catch (error) {
      console.error(error);
    }
  };

  const top = () => window.scrollTo({ top: 0, behavior: "auto" });

  return (
    <main id="top" className="journey-page" data-journey={content.id} style={{ background: content.ink, "--ink": content.ink } as CSSProperties}>
      <section id="journey" ref={journey} aria-label={`${content.festival}, as you scroll`} style={{ height: `${content.length}vh` }}>
        <div id="stage" ref={stage} data-started="no" data-style="journey">
          <canvas ref={canvas} className="scene-canvas" aria-hidden="true" />

          <header className="corner corner-tl">
            <span className="wordmark">
              <Link href="/" className="parv-link">
                parv
              </Link>{" "}
              · {content.name}
            </span>
            <p className="style-note">
              <span className="deva" lang={content.lang}>
                {content.native}
              </span>{" "}
              <span className="style-name">{content.festival}</span>
            </p>
          </header>
          <div className="corner corner-tr small-caps" aria-hidden="true">
            <span className="native deva" lang={content.lang}>
              {content.greeting}
            </span>
            <span ref={counter}>0 / {content.chapters.length}</span>
          </div>
          <div id="rail" aria-hidden="true">
            <i ref={rail} />
          </div>

          <div id="captions">
            <div className="caption hero" data-window={w(content.hero)}>
              <p className="native deva hero-bangla" lang={content.lang}>
                {content.native}
              </p>
              <h1>{content.name}</h1>
              <p className="small-caps">{content.tagline}</p>
            </div>
            {content.chapters.map((chapter, i) => (
              <article key={chapter.title} className={`caption chapter ${chapter.side}`} data-window={w(chapter.window)}>
                <span className="numeral">{NUMERALS[i]}</span>
                <p className="small-caps tithi">{chapter.tithi}</p>
                <h2>
                  {chapter.title}
                  <span className="native deva" lang={content.lang}>
                    {chapter.native}
                  </span>
                </h2>
                <p>{chapter.body}</p>
              </article>
            ))}
            <div className="caption whisper" data-window={w(content.finale.window)}>
              <p className="native deva" lang={content.lang}>
                {content.finale.native}
              </p>
              <p className="small-caps">{content.finale.english}</p>
            </div>
          </div>

          <div id="hints" className="small-caps">
            <span className="hint-scroll">
              {content.hints.scroll}
              <i aria-hidden="true" />
            </span>
            {content.hints.touch?.map((hint) => (
              <span key={hint.text} className="hint-touch" data-window={w(hint.window)}>
                {hint.text}
              </span>
            ))}
          </div>

          <div id="loader" data-ready={kit ? "yes" : "no"} aria-live="polite">
            <span className="deva">ॐ</span>
            <span className="small-caps">{kit ? "here" : "lighting the lamp"}</span>
          </div>
        </div>
      </section>

      <section id="after" aria-label={`After ${content.festival}`}>
        {content.verse && (
          <figure className="verse reveal">
            <blockquote>
              <p className="verse-text deva" lang={content.verse.lang}>
                {content.verse.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
              <p className="verse-english">{content.verse.english}</p>
            </blockquote>
            <figcaption className="small-caps">{content.verse.source}</figcaption>
          </figure>
        )}
        <div className="farewell reveal">
          <p className="native deva" lang={content.lang}>
            {content.finale.native}
          </p>
          <GreetingCard content={content} kit={kit} />
          <a href="#top" className="small-caps" onClick={top}>
            {content.returnLink}
          </a>
          <Link href="/" className="small-caps">
            more festivals on parv
          </Link>
        </div>
        <footer className="credits">
          <p>
            {content.credits?.length ? (
              <>
                Recordings from Wikimedia Commons:{" "}
                {content.credits.map((credit, i) => (
                  <span key={credit.source}>
                    {i > 0 && "; "}
                    <a href={credit.source} target="_blank" rel="noreferrer">
                      {credit.what}
                    </a>{" "}
                    by {credit.by},{" "}
                    <a href={credit.licenseUrl} target="_blank" rel="license noreferrer">
                      {credit.license}
                    </a>
                  </span>
                ))}
                . Everything else you hear is synthesised.
              </>
            ) : (
              "Every sound here is synthesised in your browser. Every picture is painted in code."
            )}
          </p>
        </footer>
      </section>

      <button type="button" className="sound-toggle small-caps" aria-pressed={sound} onClick={toggleSound} disabled={!kit}>
        <span className="sound-bars" data-on={sound ? "yes" : "no"} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        {sound ? "sound on" : "sound off"}
        <span className="visually-hidden">: {content.soundLabel}</span>
      </button>
    </main>
  );
}
