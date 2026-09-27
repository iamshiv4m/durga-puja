"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Astras } from "./Astras";
import { Backdrop } from "./Backdrop";
import { CameraRig } from "./CameraRig";
import { Diyas } from "./Diyas";
import { Pratima } from "./Pratima";
import { Smoke } from "./Smoke";
import { Water } from "./Water";

/** Soft studio reflections so the gold astras read as metal. */
function Environment() {
  const get = useThree((state) => state.get);
  useEffect(() => {
    const { gl, scene } = get();
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    pmrem.dispose();
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [get]);
  return null;
}

export default function Stage({ active }: { active: boolean }) {
  return (
    <Canvas
      id="gl"
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ fov: 35, near: 0.1, far: 200, position: [0, 0.4, 26] }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onCreated={(state) => {
        state.gl.setClearColor("#070304");
        if (process.env.NODE_ENV !== "production") Object.assign(window, { __r3f: state });
      }}
      aria-label="A clay pratima of Durga whose eyes are painted as you scroll"
    >
      <Environment />
      <ambientLight intensity={0.08} color="#ffd9c0" />
      <directionalLight position={[-6, 9, 12]} intensity={1.4} color="#ffe6cc" />
      <directionalLight position={[8, 4, -4]} intensity={0.8} color="#ff6a3a" />
      <CameraRig />
      <Backdrop />
      <Pratima />
      <Astras />
      <Diyas />
      <Smoke />
      <Water />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
        <Noise opacity={0.035} premultiply />
        <Vignette offset={0.28} darkness={0.78} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
