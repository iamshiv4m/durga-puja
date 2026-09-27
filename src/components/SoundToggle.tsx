"use client";

import { useEffect } from "react";
import { audio } from "@/lib/audio";
import { onScrollFrame } from "@/lib/scroll";
import { setState, useStore } from "@/lib/store";

export function SoundToggle() {
  const sound = useStore((s) => s.sound);
  const open = useStore((s) => s.open);
  const style = useStore((s) => s.style);

  useEffect(() => {
    if (style) audio.setStyle(style);
  }, [style]);

  useEffect(() => onScrollFrame((p) => audio.update(p)), []);

  useEffect(() => {
    if (open !== null) audio.ghanta();
  }, [open]);

  const toggle = async () => {
    if (sound) {
      audio.disable();
      setState({ sound: false });
      return;
    }
    try {
      await audio.enable();
      setState({ sound: true });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <button type="button" className="sound-toggle small-caps" aria-pressed={sound} onClick={toggle}>
      <span className="sound-bars" data-on={sound ? "yes" : "no"} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {sound ? "sound on" : "sound off"}
      <span className="visually-hidden">: music, drums, shankh and ghanta</span>
    </button>
  );
}
