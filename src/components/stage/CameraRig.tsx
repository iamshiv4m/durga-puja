"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clamp, smoothstep } from "@/lib/math";
import { scroll } from "@/lib/scroll";
import { isPortrait, thirdEyeScreen } from "@/lib/screen";
import { timeline } from "@/lib/timeline";
import { THIRD_EYE_WORLD } from "./Pratima";

const BASE_FOV = 35;
/** Where the camera ends up when it goes into the third eye: just in front of it, looking in. */
const INTO_EYE = THIRD_EYE_WORLD.clone().add(new THREE.Vector3(0, 0, 0.3));
const projected = new THREE.Vector3();
/** On a tall screen the captions take the bottom, so she is framed this much of the height higher. */
const PORTRAIT_LIFT = 0.1;

type Key = { at: number; pos: [number, number, number]; look: [number, number, number] };

// The camera dollies between these and eases to a stop at each one.
const KEYS: Key[] = [
  { at: 0.0, pos: [0, 0.4, 26], look: [0, 0.2, 0] },
  { at: 0.09, pos: [0, 0.5, 19], look: [0, 0.4, 0] },
  { at: 0.14, pos: [0, 0.55, 8.4], look: [0, 0.45, 2] }, // Chokkhu Daan: the eyes
  { at: 0.235, pos: [0.2, 0.95, 7.6], look: [0, 0.95, 2] },
  { at: 0.3, pos: [-3.6, 0.1, 15], look: [0, 0.2, 1] }, // Bodhon
  { at: 0.36, pos: [-2.2, 0.3, 18], look: [0, 0.3, 1] },
  { at: 0.43, pos: [0, 0.4, 30], look: [0, 0.4, 0] }, // the astras
  { at: 0.49, pos: [1.6, 0.2, 29], look: [0, 0.2, 0] },
  { at: 0.55, pos: [0, -1.6, 17.5], look: [0, -4.2, 3] }, // Sandhi: the lamps
  { at: 0.62, pos: [0, -0.8, 17], look: [0, -2.4, 2] },
  { at: 0.67, pos: [0, 1.2, 10], look: [0, 1.15, 2.2] },
  { at: 0.73, pos: [0, 1.1, 7.4], look: [0, 1.0, 2.2] }, // the third eye
  { at: 0.79, pos: [0, 1.0, 12], look: [0, 0.9, 1] }, // Sindoor Khela
  { at: 0.86, pos: [0, 4, 22], look: [0, 0, 0] }, // Bisarjan
  { at: 0.95, pos: [0, 6.6, 17], look: [0, 4, 2] },
  { at: 1.0, pos: [0, 6.9, 15], look: [0, 4.6, 3] },
];

function sample(p: number, out: { pos: THREE.Vector3; look: THREE.Vector3 }) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smoothstep(a.at, b.at, p);
  out.pos.set(...a.pos).lerp(new THREE.Vector3(...b.pos), t);
  out.look.set(...a.look).lerp(new THREE.Vector3(...b.look), t);
}

export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const pointer = useRef(new THREE.Vector2());
  const frame = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() }), []);

  useFrame((state, delta) => {
    sample(scroll.smooth, frame);
    // Pull back on narrow screens so the ring of astras still fits.
    const aspect = size.width / size.height;
    const pullBack = clamp(Math.pow(1.3 / aspect, 0.85), 1, 2.1);
    const offset = frame.pos.clone().sub(frame.look).multiplyScalar(pullBack);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const follow = 1 - Math.exp(-delta * 2.5);
    pointer.current.lerp(reduced ? new THREE.Vector2() : state.pointer, follow);
    const parallax = offset.length() * 0.018;
    camera.position
      .copy(frame.look)
      .add(offset)
      .add(new THREE.Vector3(pointer.current.x * parallax, pointer.current.y * parallax * 0.6, 0));

    // Into the third eye: the camera closes on it and the lens widens until it fills the view.
    const dive = timeline(scroll.smooth).dive;
    camera.position.lerp(INTO_EYE, dive);
    camera.lookAt(frame.look.lerp(THIRD_EYE_WORLD, dive));
    const lens = state.camera as THREE.PerspectiveCamera;
    const fov = BASE_FOV + 45 * dive * dive;
    if (Math.abs(lens.fov - fov) > 0.01) {
      lens.fov = fov;
      lens.updateProjectionMatrix();
    }
    // Going into the eye the lift eases off, so the tunnel opens in the middle of the screen.
    const lift = isPortrait(size.width, size.height) ? PORTRAIT_LIFT * (1 - dive) : 0;
    const shift = Math.round(lift * size.height);
    const view = lens.view?.enabled ? lens.view : null;
    if (shift !== (view?.offsetY ?? 0) || (view && (view.fullWidth !== size.width || view.fullHeight !== size.height))) {
      if (shift) lens.setViewOffset(size.width, size.height, 0, shift, size.width, size.height);
      else lens.clearViewOffset();
    }
    lens.updateMatrixWorld();
    projected.copy(THIRD_EYE_WORLD).project(lens);
    thirdEyeScreen.x = projected.x * 0.5 + 0.5;
    thirdEyeScreen.y = 0.5 - projected.y * 0.5;
  });

  return null;
}
