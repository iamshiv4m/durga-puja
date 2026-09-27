"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ASTRAS } from "@/content/astras";
import { SOUND_CREDITS } from "@/content/credits";
import { MahishaShadow } from "./MahishaShadow";
import { Rituals } from "./Rituals";
import { ThirdEyePortal } from "./ThirdEyePortal";
import {
  CHAPTER_SIDES,
  CHAPTER_WINDOWS,
  HERO_WINDOW,
  MANTRA,
  MANTRA_WINDOW,
  NUMERALS,
  STORIES,
  TITLE,
  VERSES,
  WHISPER_WINDOW,
} from "@/content/chapters";
import { windowOpacity, type Window4 } from "@/lib/math";
import { onScrollFrame, trackScroll } from "@/lib/scroll";
import { getState, setState, useStore } from "@/lib/store";
import { SCRIPT_CLASS, STYLES, type PaintingStyle } from "@/lib/styles";
import { PHASES } from "@/lib/timeline";
import { AstraDialog } from "./AstraDialog";
import { BijoyaCard } from "./BijoyaCard";
import { SoundToggle } from "./SoundToggle";
import { StyleSwitcher } from "./StyleSwitcher";

const Stage = dynamic(() => import("./stage/Stage"), { ssr: false });

class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error(error);
    setState({ webglFailed: true, ready: true });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const w = (value: Window4) => value.join(",");

function hasWebGL() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

export function Experience({ initialStyle }: { initialStyle: PaintingStyle }) {
  const journey = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const rail = useRef<HTMLElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const ready = useStore((s) => s.ready);
  const failed = useStore((s) => s.webglFailed);
  const hovered = useStore((s) => s.hovered);
  const style = useStore((s) => s.style) ?? initialStyle;
  const story = STORIES[style];
  const script = STYLES[style].script;
  const nativeClass = `native ${SCRIPT_CLASS[script]}`;

  useEffect(() => {
    if (getState().style === null) setState({ style: initialStyle });
  }, [initialStyle]);

  useEffect(() => {
    const supported = hasWebGL();
    queueMicrotask(() => setWebgl(supported));
    if (!supported) setState({ webglFailed: true, ready: true });
  }, []);

  // Scroll progress drives captions, the rail and the chapter counter directly, outside React.
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
      const chapter = CHAPTER_WINDOWS.filter((window) => p >= window[0]).length;
      if (counter.current) counter.current.textContent = `${chapter} / ${CHAPTER_WINDOWS.length}`;
      rail.current?.style.setProperty("--progress", p.toFixed(4));
      root.dataset.astras = p > PHASES.astras[1] && p < PHASES.third[0] ? "on" : "off";
      root.dataset.started = p > 0.02 ? "yes" : "no";
      root.dataset.dhunuchi = getState().style === "bengal" && p > PHASES.dhunuchi[0] && p < PHASES.dhunuchiOut[0] ? "on" : "off";
    });
    return () => {
      stop();
      unsubscribe();
    };
  }, []);

  // Stop rendering WebGL once the journey has scrolled away.
  useEffect(() => {
    const section = journey.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      if (tooltip.current) tooltip.current.style.transform = `translate3d(${event.clientX + 16}px, ${event.clientY + 16}px, 0)`;
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  // Reveal the verses after the journey as they scroll into view.
  useEffect(() => {
    const items = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.35 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  const hoveredAstra = hovered === null ? null : ASTRAS[hovered];

  return (
    <main id="top">
      <section id="journey" ref={journey} aria-label="Durga's eyes open as you scroll">
        <div id="stage" ref={stage} data-astras="off" data-dhunuchi="off" data-started="no" data-style={style}>
          {webgl && !failed && (
            <StageBoundary>
              <Stage active={active} />
            </StageBoundary>
          )}
          {failed && <div className="fallback" aria-hidden="true" />}
          <Rituals />
          <MahishaShadow />
          <ThirdEyePortal />

          <header className="corner corner-tl">
            <span className="wordmark">{TITLE}</span>
            <StyleSwitcher fallback={initialStyle} />
          </header>
          <div className="corner corner-tr small-caps" aria-hidden="true">
            <span className={nativeClass} lang={script}>
              {story.greeting}
            </span>
            <span ref={counter}>0 / {CHAPTER_WINDOWS.length}</span>
          </div>
          <div id="rail" aria-hidden="true">
            <i ref={rail} />
          </div>

          <div id="captions">
            <div className="caption hero" data-window={w(HERO_WINDOW)}>
              <p className={`${nativeClass} hero-bangla`} lang={script}>
                {story.native}
              </p>
              <h1>{TITLE}</h1>
              <p className="small-caps">{story.tagline}</p>
            </div>
            {story.chapters.map((chapter, i) => (
              <article key={NUMERALS[i]} className={`caption chapter ${CHAPTER_SIDES[i]}`} data-window={w(CHAPTER_WINDOWS[i])}>
                <span className="numeral">{NUMERALS[i]}</span>
                <p className="small-caps tithi">{chapter.tithi}</p>
                <h2>
                  {chapter.title}
                  <span className={nativeClass} lang={script}>
                    {chapter.native}
                  </span>
                </h2>
                <p>{chapter.body}</p>
              </article>
            ))}
            <div className="caption mantra" data-window={w(MANTRA_WINDOW)}>
              <p className="deva" lang="sa">
                {MANTRA.sanskrit}
              </p>
              <p className="small-caps">{MANTRA.english}</p>
            </div>
            <div className="caption whisper" data-window={w(WHISPER_WINDOW)}>
              <p className={nativeClass} lang={script}>
                {story.whisper.native}
              </p>
              <p className="small-caps">{story.whisper.english}</p>
            </div>
          </div>

          <div id="hints" className="small-caps">
            <span className="hint-scroll">
              scroll to wake her
              <i aria-hidden="true" />
            </span>
            <span className="hint-astras">drag the ring · touch an astra</span>
            <span className="hint-dhunuchi">move to wave the dhunuchi</span>
          </div>

          <div ref={tooltip} className="tooltip" role="tooltip" hidden={!hoveredAstra}>
            {hoveredAstra && (
              <>
                <span className={nativeClass} lang={script}>
                  {hoveredAstra.native[script]}
                </span>
                <span>{hoveredAstra.name}</span>
              </>
            )}
          </div>

          <div id="loader" data-ready={ready ? "yes" : "no"} aria-live="polite">
            <span className="deva">ॐ</span>
            <span className="small-caps">{ready ? "she is here" : "shaping the clay"}</span>
          </div>

          <nav className="visually-hidden" aria-label="The ten astras">
            <ul>
              {ASTRAS.map((astra, i) => (
                <li key={astra.kind}>
                  <button type="button" onClick={() => setState({ open: i })}>
                    {astra.name}, {astra.meaning}, {astra.giver}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <section id="after" aria-label="After the immersion">
        {VERSES.map((verse) => (
          <figure key={verse.source} className="verse reveal">
            <blockquote>
              <p className="deva verse-text" lang="sa">
                {verse.sanskrit.split("\n").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </p>
              <p className="verse-english">{verse.english}</p>
            </blockquote>
            <figcaption className="small-caps">{verse.source}</figcaption>
          </figure>
        ))}
        <div className="farewell reveal">
          <p className={nativeClass} lang={script}>
            {story.whisper.native}
          </p>
          <BijoyaCard style={style} />
          <a href="#top" className="small-caps" onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}>
            {story.returnLink}
          </a>
        </div>
        <footer className="credits">
          <p>
            Recordings from Wikimedia Commons, trimmed and looped:{" "}
            {SOUND_CREDITS.map((credit, i) => (
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
          </p>
        </footer>
      </section>

      <AstraDialog />
      <SoundToggle />
    </main>
  );
}
