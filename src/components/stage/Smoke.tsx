"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/math";
import { scroll } from "@/lib/scroll";
import { timeline, waterLevel } from "@/lib/timeline";

const SMOKE_COUNT = 240;
const EMBER_COUNT = 360;
export const DHUNUCHI = [new THREE.Vector3(-7.2, -5.4, 2.4), new THREE.Vector3(7.2, -5.4, 2.4)];

const smokeVertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime, uAmount, uWaterY;
  uniform vec3 uLeft, uRight;
  varying float vAlpha;
  void main() {
    float life = fract(uTime * (0.045 + aSeed.x * 0.03) + aSeed.y);
    vec3 origin = aSeed.z < 0.5 ? uLeft : uRight;
    float sway = sin(life * 5.0 + aSeed.w * 6.28 + uTime * 0.3);
    vec3 p = origin + vec3(sway * life * 1.8 + (aSeed.w - 0.5) * 0.6, life * 11.0, cos(life * 4.0 + aSeed.x * 6.28) * life * 1.2);
    p.x += (origin.x < 0.0 ? 1.0 : -1.0) * life * life * 2.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vAlpha = sin(3.14159 * life) * uAmount * step(uWaterY, p.y) * 0.1;
    gl_PointSize = (180.0 + life * 900.0) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const smokeFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(1.0 - smoothstep(0.0, 0.5, d), 2.0) * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vec3(0.62, 0.55, 0.5) * a, a);
  }
`;

const emberVertex = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime, uAmount, uWaterY;
  varying float vAlpha;
  void main() {
    float life = fract(uTime * (0.02 + aSeed.x * 0.02) + aSeed.y);
    vec3 p = vec3((aSeed.z - 0.5) * 26.0 + sin(uTime * 0.4 + aSeed.w * 20.0) * 0.6, -6.0 + life * 16.0, (aSeed.w - 0.5) * 14.0 + 2.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.6 + 0.4 * sin(uTime * (2.0 + aSeed.x * 4.0) + aSeed.y * 30.0);
    vAlpha = sin(3.14159 * life) * twinkle * uAmount * step(uWaterY, p.y);
    gl_PointSize = (18.0 + aSeed.x * 30.0) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const emberFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.0, 0.5, d)) * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vec3(1.0, 0.62, 0.25) * a * 2.0, a);
  }
`;

function seeds(count: number, seed: number) {
  const random = mulberry32(seed);
  const data = new Float32Array(count * 4);
  for (let i = 0; i < data.length; i++) data[i] = random();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(data, 4));
  return geometry;
}

/** Dhunuchi: two clay censers of burning coconut husk, their smoke rising through the whole puja. */
export function Smoke() {
  const smokePoints = useRef<THREE.Points>(null);
  const emberPoints = useRef<THREE.Points>(null);
  const pot = useRef<THREE.Mesh>(null);
  const smokeGeometry = useMemo(() => seeds(SMOKE_COUNT, 7), []);
  const emberGeometry = useMemo(() => seeds(EMBER_COUNT, 11), []);
  const smoke = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAmount: { value: 0 },
          uWaterY: { value: -20 },
          uLeft: { value: DHUNUCHI[0] },
          uRight: { value: DHUNUCHI[1] },
        },
        vertexShader: smokeVertex,
        fragmentShader: smokeFragment,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const embers = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uWaterY: { value: -20 } },
        vertexShader: emberVertex,
        fragmentShader: emberFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const potMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#6e3a1e", roughness: 0.9, emissive: "#ff4a10", emissiveIntensity: 0 }),
    [],
  );

  useEffect(
    () => () => {
      [smokeGeometry, emberGeometry, smoke, embers, potMaterial].forEach((item) => item.dispose());
    },
    [smokeGeometry, emberGeometry, smoke, embers, potMaterial],
  );

  useFrame((state) => {
    const t = timeline(scroll.smooth);
    const water = waterLevel(t);
    const time = state.clock.elapsedTime;
    const amount = t.reveal * (0.35 + 0.65 * Math.max(t.warm, t.diyas)) * (1 - t.water * 0.8);
    const smokeU = (smokePoints.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    const emberU = (emberPoints.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    const coal = pot.current?.material as THREE.MeshStandardMaterial | undefined;
    if (!smokeU || !emberU || !coal) return;
    smokeU.uTime.value = time;
    smokeU.uAmount.value = amount;
    smokeU.uWaterY.value = water;
    emberU.uTime.value = time;
    emberU.uAmount.value = t.reveal * (0.4 + 0.6 * t.warm) * (1 - t.water);
    emberU.uWaterY.value = water;
    coal.emissiveIntensity = 0.3 + 1.6 * t.warm * (1 - t.water);
  });

  return (
    <group>
      <points ref={smokePoints} geometry={smokeGeometry} material={smoke} frustumCulled={false} />
      <points ref={emberPoints} geometry={emberGeometry} material={embers} frustumCulled={false} />
      {DHUNUCHI.map((p, i) => (
        <mesh key={p.x} ref={i === 0 ? pot : undefined} position={[p.x, p.y - 0.5, p.z]} material={potMaterial}>
          <cylinderGeometry args={[0.55, 0.28, 0.6, 20]} />
        </mesh>
      ))}
    </group>
  );
}
