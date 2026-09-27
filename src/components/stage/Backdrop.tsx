"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scroll";
import { timeline } from "@/lib/timeline";

function hazeTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(150, 30, 18, 0.75)");
  gradient.addColorStop(0.4, "rgba(80, 14, 10, 0.35)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A sindoor-red glow behind the figure and a dark floor for the lamps to light. */
export function Backdrop() {
  const haze = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => hazeTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    const t = timeline(scroll.smooth);
    if (haze.current) haze.current.opacity = (0.35 + 0.65 * t.reveal) * (0.7 + 0.3 * t.warm + 0.4 * t.third) * (1 - 0.85 * t.water);
  });

  return (
    <group>
      <mesh position={[0, 1.2, -5]}>
        <planeGeometry args={[40, 40]} />
        <meshBasicMaterial ref={haze} map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, -5.62, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[22, 48]} />
        <meshStandardMaterial color="#120806" roughness={1} />
      </mesh>
    </group>
  );
}
