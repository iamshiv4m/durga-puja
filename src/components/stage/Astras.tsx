"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { ASTRAS } from "@/content/astras";
import { TAU, clamp, easeOutBack } from "@/lib/math";
import { scroll } from "@/lib/scroll";
import { getState, setState } from "@/lib/store";
import { timeline } from "@/lib/timeline";
import { AstraShape } from "./astraMeshes";

const RADIUS = 6.3;
const CENTER: [number, number, number] = [0, 0.9, 1.6];
const AUTO_SPIN = 0.035;
const DRAG_SPEED = 0.004;
const CLICK_SLOP = 6;

export const astraVisibility = () => {
  const t = timeline(scroll.smooth);
  return t.astras * (1 - t.astrasOut);
};

export function Astras() {
  const ring = useRef<THREE.Group>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  const spin = useRef({ angle: 0, target: 0, dragging: false, moved: 0, lastX: 0 });
  const gl = useThree((state) => state.gl);
  const [materials] = useState(() =>
    ASTRAS.map(
      () =>
        new THREE.MeshStandardMaterial({
          color: "#d9a64a",
          metalness: 1,
          roughness: 0.3,
          emissive: "#ff9a3c",
          emissiveIntensity: 0,
        }),
    ),
  );

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  useEffect(() => {
    const canvas = gl.domElement;
    const s = spin.current;
    const down = (event: PointerEvent) => {
      if (astraVisibility() < 0.5) return;
      s.dragging = true;
      s.moved = 0;
      s.lastX = event.clientX;
    };
    const move = (event: PointerEvent) => {
      if (!s.dragging) return;
      const dx = event.clientX - s.lastX;
      s.lastX = event.clientX;
      s.moved += Math.abs(dx);
      s.target -= dx * DRAG_SPEED;
    };
    const up = () => {
      s.dragging = false;
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const group = ring.current;
    if (!group) return;
    const visible = astraVisibility();
    const t = timeline(scroll.smooth);
    const s = spin.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!s.dragging && !reduced) s.target += AUTO_SPIN * delta;
    s.angle += (s.target - s.angle) * (1 - Math.exp(-delta * 6));
    group.rotation.z = s.angle;
    group.visible = visible > 0.001;

    const hovered = getState().hovered;
    items.current.forEach((item, i) => {
      if (!item) return;
      // Staggered arrival: one astra after another, each with a small overshoot.
      const arrive = clamp(t.astras * 1.6 - (i / ASTRAS.length) * 0.6);
      const leave = 1 - t.astrasOut;
      const base = arrive > 0 ? easeOutBack(arrive) * leave : 0;
      const target = base * (hovered === i ? 1.18 : 1);
      const current = item.scale.x;
      item.scale.setScalar(current + (target - current) * (1 - Math.exp(-delta * 10)));
      const glow = hovered === i ? 0.35 : 0.04 + 0.1 * t.third;
      materials[i].emissiveIntensity += (glow - materials[i].emissiveIntensity) * (1 - Math.exp(-delta * 8));
      if (ASTRAS[i].kind === "chakra") item.children[0].rotation.z = state.clock.elapsedTime * 0.8;
    });
  });

  const over = (index: number) => (event: ThreeEvent<PointerEvent>) => {
    if (astraVisibility() < 0.5) return;
    event.stopPropagation();
    setState({ hovered: index });
    document.body.style.cursor = "pointer";
  };
  const out = (index: number) => () => {
    if (getState().hovered === index) setState({ hovered: null });
    document.body.style.cursor = "";
  };
  const click = (index: number) => (event: ThreeEvent<MouseEvent>) => {
    if (astraVisibility() < 0.5 || spin.current.moved > CLICK_SLOP) return;
    event.stopPropagation();
    setState({ open: index, hovered: null });
    document.body.style.cursor = "";
  };

  return (
    <group position={CENTER}>
      <group ref={ring}>
        {ASTRAS.map((astra, i) => {
          const angle = Math.PI / 2 + (i / ASTRAS.length) * TAU;
          return (
            <group
              key={astra.kind}
              position={[Math.cos(angle) * RADIUS, Math.sin(angle) * RADIUS, 0]}
              rotation={[0, 0, angle - Math.PI / 2]}
            >
              <group
                ref={(node) => {
                  items.current[i] = node;
                }}
                scale={0}
                onPointerOver={over(i)}
                onPointerOut={out(i)}
                onClick={click(i)}
              >
                <AstraShape kind={astra.kind} material={materials[i]} />
                {/* A generous invisible hit area, so thin astras are easy to touch. */}
                <mesh visible={false}>
                  <cylinderGeometry args={[0.6, 0.6, 2.6, 8]} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
}
