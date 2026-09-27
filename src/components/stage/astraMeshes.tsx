"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { AstraKind } from "@/content/astras";

type Props = { material: THREE.Material };

// Each astra is built along local +y, roughly spanning y = -1.1 .. 1.4, so the ring can
// point every weapon outward from the goddess.

function Trishul({ material }: Props) {
  return (
    <group>
      <mesh material={material} position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 2.2, 10]} />
      </mesh>
      <mesh material={material} position={[0, 1.33, 0]}>
        <coneGeometry args={[0.08, 0.62, 10]} />
      </mesh>
      <mesh material={material} position={[0, 1.02, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.32, 0.035, 8, 28, Math.PI]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} material={material} position={[side * 0.32, 1.22, 0]} rotation={[0, 0, -side * 0.12]}>
          <coneGeometry args={[0.06, 0.42, 10]} />
        </mesh>
      ))}
      <mesh material={material} position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.09, 14, 10]} />
      </mesh>
    </group>
  );
}

function Khadga({ material }: Props) {
  const blade = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.07, 0);
    shape.lineTo(-0.08, 1.2);
    shape.quadraticCurveTo(-0.06, 1.72, 0.3, 1.95);
    shape.quadraticCurveTo(0.24, 1.45, 0.14, 1.18);
    shape.lineTo(0.07, 0);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
    geometry.translate(0, -0.55, -0.015);
    return geometry;
  }, []);
  return (
    <group>
      <mesh material={material} geometry={blade} />
      <mesh material={material} position={[0, -0.6, 0]}>
        <boxGeometry args={[0.46, 0.06, 0.08]} />
      </mesh>
      <mesh material={material} position={[0, -0.88, 0]}>
        <cylinderGeometry args={[0.045, 0.05, 0.5, 10]} />
      </mesh>
      <mesh material={material} position={[0, -1.16, 0]}>
        <sphereGeometry args={[0.08, 12, 10]} />
      </mesh>
    </group>
  );
}

function Chakra({ material }: Props) {
  return (
    <group position={[0, 0.3, 0]}>
      <mesh material={material}>
        <torusGeometry args={[0.6, 0.065, 12, 48]} />
      </mesh>
      <mesh material={material}>
        <torusGeometry args={[0.16, 0.05, 10, 24]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} material={material} rotation={[0, 0, (i / 8) * Math.PI]}>
          <boxGeometry args={[1.18, 0.035, 0.035]} />
        </mesh>
      ))}
      {Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        return (
          <mesh key={i} material={material} position={[Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0]} rotation={[0, 0, a - Math.PI / 2]}>
            <coneGeometry args={[0.05, 0.2, 6]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Baan({ material }: Props) {
  return (
    <group>
      <mesh material={material}>
        <cylinderGeometry args={[0.025, 0.025, 2.4, 8]} />
      </mesh>
      <mesh material={material} position={[0, 1.34, 0]}>
        <coneGeometry args={[0.1, 0.34, 4]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} material={material} position={[0, -1.02, 0]} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
          <boxGeometry args={[0.2, 0.34, 0.012]} />
        </mesh>
      ))}
    </group>
  );
}

function Shakti({ material }: Props) {
  const blade = useMemo(() => {
    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.1, 0.12),
      new THREE.Vector2(0.14, 0.32),
      new THREE.Vector2(0.09, 0.56),
      new THREE.Vector2(0, 0.78),
    ];
    const geometry = new THREE.LatheGeometry(points, 4);
    geometry.scale(1, 1, 0.3);
    return geometry;
  }, []);
  return (
    <group>
      <mesh material={material} position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 2.0, 10]} />
      </mesh>
      <mesh material={material} geometry={blade} position={[0, 0.82, 0]} />
      <mesh material={material} position={[0, 0.84, 0]}>
        <torusGeometry args={[0.07, 0.025, 8, 16]} />
      </mesh>
    </group>
  );
}

function Khetaka({ material }: Props) {
  return (
    <group position={[0, 0.2, 0]}>
      <mesh material={material} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.07, 40]} />
      </mesh>
      <mesh material={material} position={[0, 0, 0.05]}>
        <torusGeometry args={[0.56, 0.03, 8, 40]} />
      </mesh>
      <mesh material={material} position={[0, 0, 0.06]}>
        <sphereGeometry args={[0.14, 16, 12]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} material={material} position={[Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0.05]}>
            <sphereGeometry args={[0.06, 10, 8]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Dhanush({ material }: Props) {
  const arc = 2.3;
  const r = 1.15;
  const endX = Math.cos(arc / 2) * r;
  const endY = Math.sin(arc / 2) * r;
  return (
    <group position={[-endX + 0.1, 0.1, 0]}>
      <mesh material={material} rotation={[0, 0, -arc / 2]}>
        <torusGeometry args={[r, 0.045, 8, 48, arc]} />
      </mesh>
      <mesh material={material} position={[endX, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, endY * 2, 4]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} material={material} position={[endX, side * endY, 0]}>
          <sphereGeometry args={[0.06, 10, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function Naagpaash({ material }: Props) {
  const body = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const loop = t * Math.PI * 2 * 1.6;
      const radius = 0.45 * (1 - t * 0.35);
      points.push(new THREE.Vector3(Math.sin(loop) * radius, -0.9 + t * 1.9 + Math.cos(loop) * 0.18, Math.cos(loop) * 0.15));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 160, 0.055, 8, false);
  }, []);
  return (
    <group>
      <mesh material={material} geometry={body} />
      <mesh material={material} position={[0.02, 1.08, 0.1]} scale={[1, 0.7, 1.4]}>
        <sphereGeometry args={[0.13, 14, 10]} />
      </mesh>
      <mesh material={material} position={[0, 1.2, -0.05]} rotation={[-0.3, 0, 0]} scale={[1.6, 1, 0.3]}>
        <sphereGeometry args={[0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

function Ankush({ material }: Props) {
  return (
    <group>
      <mesh material={material} position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 1.9, 10]} />
      </mesh>
      <mesh material={material} position={[0, 0.98, 0]}>
        <coneGeometry args={[0.06, 0.4, 10]} />
      </mesh>
      <mesh material={material} position={[0.22, 0.62, 0]} rotation={[0, 0, Math.PI * 0.95]}>
        <torusGeometry args={[0.22, 0.035, 8, 24, Math.PI * 1.15]} />
      </mesh>
      <mesh material={material} position={[0.43, 0.48, 0]} rotation={[0, 0, Math.PI * 0.9]}>
        <coneGeometry args={[0.045, 0.2, 8]} />
      </mesh>
    </group>
  );
}

function Ghanta({ material }: Props) {
  const bell = useMemo(() => {
    const points = [
      new THREE.Vector2(0.0, 0.62),
      new THREE.Vector2(0.12, 0.6),
      new THREE.Vector2(0.2, 0.5),
      new THREE.Vector2(0.24, 0.3),
      new THREE.Vector2(0.3, 0.1),
      new THREE.Vector2(0.42, 0.0),
      new THREE.Vector2(0.4, -0.03),
    ];
    const geometry = new THREE.LatheGeometry(points, 32);
    geometry.translate(0, -0.7, 0);
    return geometry;
  }, []);
  return (
    <group rotation={[0, 0, Math.PI]} position={[0, 0.2, 0]}>
      <mesh material={material} geometry={bell} />
      <mesh material={material} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.7, 10]} />
      </mesh>
      <mesh material={material} position={[0, 0.66, 0]}>
        <sphereGeometry args={[0.1, 14, 10]} />
      </mesh>
      <mesh material={material} position={[0, -0.72, 0]}>
        <sphereGeometry args={[0.07, 12, 10]} />
      </mesh>
    </group>
  );
}

const SHAPES: Record<AstraKind, (props: Props) => React.JSX.Element> = {
  trishul: Trishul,
  khadga: Khadga,
  chakra: Chakra,
  baan: Baan,
  shakti: Shakti,
  khetaka: Khetaka,
  dhanush: Dhanush,
  naagpaash: Naagpaash,
  ankush: Ankush,
  ghanta: Ghanta,
};

export function AstraShape({ kind, material }: { kind: AstraKind; material: THREE.Material }) {
  const Shape = SHAPES[kind];
  return <Shape material={material} />;
}
