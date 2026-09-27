"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PRATIMA, ellipseUv, pixelToWorld } from "@/lib/pratima";
import { scroll } from "@/lib/scroll";
import { getState, setState, useStore } from "@/lib/store";
import { STYLES } from "@/lib/styles";
import { timeline, waterLevel } from "@/lib/timeline";
import { NOISE_GLSL } from "./glsl";
import { loadRelief, surfaceZ, type Relief } from "./relief";

const vertexShader = /* glsl */ `
  uniform float uSway, uTime;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Hanging cloth: pinned along the top edge, swaying more toward the hem.
    float hang = clamp((5.0 - p.y) / 10.0, 0.0, 1.0);
    p.z += uSway * hang * (sin(p.y * 0.55 + uTime * 0.9) * 0.16 + sin(p.x * 0.45 + uTime * 0.6) * 0.08);
    vec4 world = modelMatrix * vec4(p, 1.0);
    vWorld = world.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime, uReveal, uEyes, uThird, uWarm, uSindoor, uDissolve, uWaterY;
  uniform vec4 uEyeL, uEyeR, uEyeT, uSindoorR;
  uniform vec3 uThirdPos, uKeyDir, uLampPos, uBare;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vWorld;
  ${NOISE_GLSL}

  float ellipseMask(vec2 uv, vec4 e, float soft) {
    float d = length((uv - e.xy) / e.zw);
    return 1.0 - smoothstep(1.0 - soft, 1.0, d);
  }

  // A brush stroke sweeping across an ellipse as t goes 0 -> 1, with a ragged wet edge.
  float stroke(vec2 uv, vec4 e, float t, float vertical) {
    float s = mix((uv.x - (e.x - e.z)) / (2.0 * e.z), (e.y + e.w - uv.y) / (2.0 * e.w), vertical);
    float ragged = (noise3(vec3(uv * vec2(140.0, 220.0), 1.0)) - 0.5) * 0.18;
    return smoothstep(s - 0.03, s + 0.03, t * 1.12 - 0.06 + ragged);
  }

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.5) discard;

    // Bisarjan: the clay gives way to the water.
    float grain = fbm3(vWorld * 0.9 + vec3(0.0, uTime * 0.04, 0.0));
    float cut = uDissolve * 1.2 - 0.1;
    if (grain < cut) discard;
    float edge = (1.0 - smoothstep(0.0, 0.05, grain - cut)) * step(0.001, uDissolve);

    vec3 albedo = tex.rgb;

    // Chokkhu Daan: the eyes are bare (clay, mud wall or undyed cotton) until the brush reaches them.
    float clayGrain = noise3(vec3(vUv * 420.0, 3.0));
    vec3 clay = uBare * (0.8 + 0.4 * clayGrain);
    float tL = clamp(uEyes / 0.4, 0.0, 1.0);
    float tR = clamp((uEyes - 0.4) / 0.4, 0.0, 1.0);
    float tT = clamp((uEyes - 0.8) / 0.2, 0.0, 1.0);
    float bare = ellipseMask(vUv, uEyeL, 0.3) * (1.0 - stroke(vUv, uEyeL, tL, 0.0))
               + ellipseMask(vUv, uEyeR, 0.3) * (1.0 - stroke(vUv, uEyeR, tR, 0.0))
               + ellipseMask(vUv, uEyeT, 0.3) * (1.0 - stroke(vUv, uEyeT, tT, 1.0));
    albedo = mix(albedo, clay, clamp(bare, 0.0, 1.0));

    // Sindoor Khela: red drawn down the parting onto the forehead.
    float sTop = (uSindoorR.y + uSindoorR.w - vUv.y) / (2.0 * uSindoorR.w);
    float sindoor = ellipseMask(vUv, uSindoorR, 0.6) * smoothstep(sTop - 0.12, sTop, uSindoor * 1.15 + (clayGrain - 0.5) * 0.2);
    sindoor *= (1.0 - ellipseMask(vUv, uEyeT * vec4(1.0, 1.0, 1.5, 1.2), 0.4)) * (0.55 + 0.45 * noise3(vec3(vUv * 60.0, 5.0)));
    albedo = mix(albedo, vec3(0.55, 0.02, 0.01), sindoor * 0.92);

    vec3 N = normalize(vNormalW);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(cameraPosition - vWorld);

    float key = max(dot(N, normalize(uKeyDir)), 0.0);
    vec3 toLamp = uLampPos - vWorld;
    float lamp = max(dot(N, normalize(toLamp)), 0.0) / (1.0 + dot(toLamp, toLamp) * 0.01);
    float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);

    vec3 light = vec3(0.05, 0.03, 0.035)
               + vec3(1.0, 0.88, 0.76) * key * 0.85
               + vec3(1.0, 0.52, 0.18) * lamp * uWarm * 1.5;
    vec3 color = albedo * light * uReveal + albedo * 0.3 * uReveal * uReveal;
    color += vec3(0.9, 0.3, 0.1) * rim * 0.35 * uReveal;

    // The third eye: a small fire at the brow that lights the face around it.
    float d = length(vWorld.xy - uThirdPos.xy);
    float core = ellipseMask(vUv, uEyeT, 0.8) * uThird;
    color += albedo * vec3(1.0, 0.62, 0.3) * exp(-d * d * 2.2) * uThird * 0.9;
    color += vec3(1.0, 0.8, 0.5) * core * (2.4 + 0.4 * sin(uTime * 2.3));

    color += vec3(1.0, 0.42, 0.1) * edge * 4.0;

    // Below the waterline everything goes dark and green.
    float line = uWaterY + sin(vWorld.x * 1.4 + uTime * 1.3) * 0.06;
    float under = 1.0 - smoothstep(line - 0.3, line + 0.05, vWorld.y);
    color = mix(color, color * vec3(0.1, 0.2, 0.22), under * 0.9);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const THIRD = pixelToWorld(PRATIMA.eyes.third.x, PRATIMA.eyes.third.y);
export const THIRD_EYE_WORLD = new THREE.Vector3(
  THIRD[0],
  THIRD[1],
  surfaceZ(PRATIMA.eyes.third.x, PRATIMA.eyes.third.y),
);

const SWAP_FADE_MS = 280;

export function Pratima() {
  const style = useStore((s) => s.style);
  const [relief, setRelief] = useState<Relief | null>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  // Dims the figure while one painting is swapped for another.
  const fade = useRef({ value: 1, target: 1 });

  useEffect(() => {
    if (!style) return;
    let cancelled = false;
    const grid: number = window.innerWidth < 700 ? 220 : PRATIMA.grid;
    const first = !getState().ready;
    fade.current.target = first ? 1 : 0;
    // Building a painting blocks for a moment, so let the old one fade out first.
    const timer = setTimeout(
      () => {
        loadRelief(style, grid)
          .then((result) => {
            if (cancelled) return;
            setRelief(result);
            fade.current.target = 1;
            setState({ ready: true });
          })
          .catch((error) => {
            console.error(error);
            fade.current.target = 1;
            setState({ ready: true });
          });
      },
      first ? 0 : SWAP_FADE_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [style]);

  useEffect(
    () => () => {
      relief?.geometry.dispose();
      relief?.texture.dispose();
    },
    [relief],
  );

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uSway: { value: 0 },
      uBare: { value: new THREE.Color(...STYLES.bengal.bare) },
      uReveal: { value: 0 },
      uEyes: { value: 0 },
      uThird: { value: 0 },
      uWarm: { value: 0 },
      uSindoor: { value: 0 },
      uDissolve: { value: 0 },
      uWaterY: { value: -20 },
      uEyeL: { value: new THREE.Vector4(...ellipseUv(PRATIMA.eyes.left)) },
      uEyeR: { value: new THREE.Vector4(...ellipseUv(PRATIMA.eyes.right)) },
      uEyeT: { value: new THREE.Vector4(...ellipseUv(PRATIMA.eyes.third)) },
      uSindoorR: { value: new THREE.Vector4(...ellipseUv(PRATIMA.sindoor)) },
      uThirdPos: { value: THIRD_EYE_WORLD.clone() },
      uKeyDir: { value: new THREE.Vector3(-0.45, 0.7, 0.9) },
      uLampPos: { value: new THREE.Vector3(0, -5.5, 7) },
    }),
    [],
  );

  useFrame((state, delta) => {
    const m = material.current;
    if (!m || !relief) return;
    const t = timeline(scroll.smooth);
    const u = m.uniforms;
    const f = fade.current;
    f.value += (f.target - f.value) * (1 - Math.exp(-delta * 12));
    u.uMap.value = relief.texture;
    u.uTime.value = state.clock.elapsedTime;
    u.uSway.value += (STYLES[style ?? "bengal"].sway - u.uSway.value) * (1 - Math.exp(-delta * 3));
    u.uBare.value.setRGB(...STYLES[style ?? "bengal"].bare);
    u.uReveal.value = (0.18 + 0.82 * t.reveal) * f.value;
    u.uEyes.value = t.eyes;
    u.uWarm.value = t.warm * (0.6 + 0.4 * t.diyas) * (1 - t.water);
    u.uThird.value = t.third;
    u.uSindoor.value = t.sindoor;
    u.uDissolve.value = t.dissolve;
    u.uWaterY.value = waterLevel(t);
  });

  if (!relief) return null;

  return (
    <mesh geometry={relief.geometry}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
