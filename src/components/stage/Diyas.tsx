"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "@/lib/math";
import { scroll } from "@/lib/scroll";
import { timeline, waterLevel } from "@/lib/timeline";

const COUNT = 108;
const ROWS = [
  { radius: 4.6, count: 27 },
  { radius: 6.2, count: 36 },
  { radius: 7.8, count: 45 },
];
const FLOOR_Y = -5.6;
const FLOOR_Z = 1.2;

/** A small clay lamp: a shallow bowl on a foot. */
export function diyaGeometry() {
  const points = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.12, 0.0),
    new THREE.Vector2(0.14, 0.05),
    new THREE.Vector2(0.24, 0.1),
    new THREE.Vector2(0.3, 0.18),
    new THREE.Vector2(0.27, 0.19),
    new THREE.Vector2(0.18, 0.12),
    new THREE.Vector2(0.0, 0.1),
  ];
  return new THREE.LatheGeometry(points, 24);
}

const flameVertex = /* glsl */ `
  attribute float aSeed;
  attribute float aOrder;
  uniform float uTime, uLit, uWaterY, uScale;
  varying float vSeed;
  varying float vAlpha;
  void main() {
    vSeed = aSeed;
    float on = smoothstep(aOrder, aOrder + 0.02, uLit);
    vAlpha = on * step(uWaterY, position.y - 0.05);
    vec3 p = position + vec3(sin(uTime * 7.0 + aSeed * 40.0) * 0.012, 0.0, 0.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float flicker = 0.85 + 0.15 * sin(uTime * 13.0 + aSeed * 90.0) * sin(uTime * 5.3 + aSeed * 17.0);
    gl_PointSize = uScale * flicker * on / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const flameFragment = /* glsl */ `
  varying float vSeed;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    uv.y = -uv.y;
    // A teardrop: round at the base, pinched to a tip.
    float width = mix(0.5, 0.05, clamp((uv.y + 0.4) / 1.4, 0.0, 1.0));
    float body = 1.0 - smoothstep(width * 0.6, width, abs(uv.x)) ;
    body *= smoothstep(-0.75, -0.35, uv.y) * (1.0 - smoothstep(0.7, 1.0, uv.y));
    float core = body * (1.0 - smoothstep(0.0, 0.35, length(uv - vec2(0.0, -0.3))));
    vec3 color = mix(vec3(1.0, 0.32, 0.04), vec3(1.0, 0.8, 0.45), core) * (1.4 + core * 1.8);
    float alpha = body * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

export function useFlameMaterial(scale: number) {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uLit: { value: 0 },
          uWaterY: { value: -20 },
          uScale: { value: scale },
        },
        vertexShader: flameVertex,
        fragmentShader: flameFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [scale],
  );
}

export function Diyas() {
  const lamps = useRef<THREE.InstancedMesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const flamePoints = useRef<THREE.Points>(null);
  const flames = useFlameMaterial(520);
  const clayMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8a4a26", roughness: 0.85, emissive: "#3a0e02", emissiveIntensity: 0.4 }),
    [],
  );
  const geometry = useMemo(() => diyaGeometry(), []);

  const layout = useMemo(() => {
    const random = mulberry32(108);
    const positions: THREE.Vector3[] = [];
    ROWS.forEach(({ radius, count }) => {
      for (let i = 0; i < count; i++) {
        const a = Math.PI * (0.06 + (0.88 * (i + 0.5)) / count);
        positions.push(
          new THREE.Vector3(Math.cos(a) * radius, FLOOR_Y + (random() - 0.5) * 0.04, FLOOR_Z + Math.sin(a) * radius * 0.55),
        );
      }
    });
    // Light them from the centre outward, the way a priest works along the rows.
    const order = positions
      .map((p, i) => ({ i, key: Math.abs(Math.atan2(p.z - FLOOR_Z, p.x) - Math.PI / 2) + p.length() * 0.02 }))
      .sort((a, b) => a.key - b.key)
      .map((entry, rank) => ({ index: entry.i, rank }));
    const rankOf = new Float32Array(COUNT);
    order.forEach(({ index, rank }) => (rankOf[index] = rank / COUNT));

    const flamePositions = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    positions.forEach((p, i) => {
      flamePositions.set([p.x, p.y + 0.32, p.z], i * 3);
      seeds[i] = random();
    });
    const flameGeometry = new THREE.BufferGeometry();
    flameGeometry.setAttribute("position", new THREE.BufferAttribute(flamePositions, 3));
    flameGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    flameGeometry.setAttribute("aOrder", new THREE.BufferAttribute(rankOf, 1));
    return { positions, flameGeometry };
  }, []);

  useEffect(() => {
    const mesh = lamps.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    layout.positions.forEach((p, i) => {
      matrix.makeTranslation(p.x, p.y, p.z);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [layout]);

  useEffect(
    () => () => {
      flames.dispose();
      clayMaterial.dispose();
      geometry.dispose();
      layout.flameGeometry.dispose();
    },
    [flames, clayMaterial, geometry, layout],
  );

  useFrame((state) => {
    const t = timeline(scroll.smooth);
    const water = waterLevel(t);
    const flameMaterial = flamePoints.current?.material as THREE.ShaderMaterial | undefined;
    if (!flameMaterial) return;
    const u = flameMaterial.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uLit.value = t.diyas * 1.02;
    u.uWaterY.value = water;
    if (lamps.current) lamps.current.visible = t.reveal > 0.5 && water < FLOOR_Y + 0.4;
    if (light.current) {
      const flicker = 1 + 0.06 * Math.sin(state.clock.elapsedTime * 11);
      light.current.intensity = 40 * t.diyas * flicker * (water < FLOOR_Y ? 1 : 0);
    }
  });

  return (
    <group>
      <instancedMesh ref={lamps} args={[geometry, clayMaterial, COUNT]} />
      <points ref={flamePoints} geometry={layout.flameGeometry} material={flames} frustumCulled={false} />
      <pointLight ref={light} position={[0, FLOOR_Y + 1.2, FLOOR_Z + 4]} color="#ff8a3a" intensity={0} distance={22} decay={1.6} />
    </group>
  );
}
