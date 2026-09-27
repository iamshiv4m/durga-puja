"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scroll";
import { timeline, waterLevel } from "@/lib/timeline";
import { NOISE_GLSL } from "./glsl";
import { diyaGeometry, useFlameMaterial } from "./Diyas";

const FLOAT_AT = new THREE.Vector3(0, 0, 3.2);

const waterVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const waterFragment = /* glsl */ `
  uniform float uTime, uFloat;
  uniform vec3 uFloatAt;
  varying vec3 vWorld;
  ${NOISE_GLSL}
  void main() {
    vec2 p = vWorld.xz;
    // Slow river swell, plus rings spreading from the floating diya.
    float swell = fbm3(vec3(p * 0.35, uTime * 0.12));
    float r = length(p - uFloatAt.xz);
    float rings = sin(r * 5.0 - uTime * 1.6) * exp(-r * 0.22) * uFloat;
    float h = swell + rings * 0.25;
    vec3 V = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - clamp(V.y, 0.0, 1.0), 3.0);
    vec3 deep = vec3(0.004, 0.012, 0.014);
    vec3 sky = vec3(0.09, 0.05, 0.05);
    vec3 color = mix(deep, sky, fresnel * 0.8);
    // A warm streak on the water where the lamp's reflection falls.
    float streak = exp(-abs(vWorld.x - uFloatAt.x) * 1.4) * (1.0 - smoothstep(uFloatAt.z, uFloatAt.z + 16.0, vWorld.z));
    color += vec3(1.0, 0.5, 0.15) * streak * (0.25 + 0.6 * h) * uFloat * 0.6;
    color += vec3(0.25, 0.12, 0.08) * smoothstep(0.55, 0.8, h) * 0.3;
    float fade = 1.0 - smoothstep(18.0, 40.0, length(vWorld.xz - cameraPosition.xz));
    gl_FragColor = vec4(color, 0.94 * fade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Bisarjan: the river rises, and a single diya is left floating where she stood. */
export function Water() {
  const plane = useRef<THREE.Mesh>(null);
  const floating = useRef<THREE.Group>(null);
  const flamePoint = useRef<THREE.Points>(null);
  const flame = useFlameMaterial(900);
  const geometry = useMemo(() => diyaGeometry(), []);
  const flameGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0.32, 0]), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array([0.37]), 1));
    g.setAttribute("aOrder", new THREE.BufferAttribute(new Float32Array([0]), 1));
    return g;
  }, []);
  const clay = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8a4a26", roughness: 0.85, emissive: "#401000", emissiveIntensity: 0.6 }), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uFloat: { value: 0 }, uFloatAt: { value: FLOAT_AT.clone() } },
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
        transparent: true,
      }),
    [],
  );

  useEffect(
    () => () => {
      [flame, geometry, flameGeometry, clay, material].forEach((item) => item.dispose());
    },
    [flame, geometry, flameGeometry, clay, material],
  );

  useFrame((state) => {
    const t = timeline(scroll.smooth);
    const y = waterLevel(t);
    const time = state.clock.elapsedTime;
    const floatIn = THREE.MathUtils.smoothstep(t.dissolve, 0.55, 1);
    if (plane.current) {
      plane.current.position.y = y;
      plane.current.visible = t.water > 0.001;
    }
    const waterU = (plane.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    const flameU = (flamePoint.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    if (waterU) {
      waterU.uTime.value = time;
      waterU.uFloat.value = floatIn;
      waterU.uFloatAt.value.y = y;
    }
    if (flameU) {
      flameU.uTime.value = time;
      flameU.uLit.value = floatIn;
      flameU.uWaterY.value = -100;
    }
    if (floating.current) {
      floating.current.visible = floatIn > 0.01;
      floating.current.position.set(FLOAT_AT.x + Math.sin(time * 0.4) * 0.08, y - 0.06 + Math.sin(time * 1.3) * 0.03, FLOAT_AT.z);
      floating.current.rotation.z = Math.sin(time * 0.9) * 0.05;
      floating.current.scale.setScalar(1.3 * floatIn);
    }
  });

  return (
    <group>
      <mesh ref={plane} rotation={[-Math.PI / 2, 0, 0]} material={material} renderOrder={2}>
        <planeGeometry args={[90, 90, 1, 1]} />
      </mesh>
      <group ref={floating}>
        <mesh geometry={geometry} material={clay} />
        <points ref={flamePoint} geometry={flameGeometry} material={flame} frustumCulled={false} />
        <pointLight color="#ff9040" intensity={6} distance={9} decay={1.5} position={[0, 0.8, 0.4]} />
      </group>
    </group>
  );
}
