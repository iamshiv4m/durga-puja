/** Where the third eye is on screen (0..1, y down), written by the camera every frame. */
export const thirdEyeScreen = { x: 0.5, y: 0.5 };

/**
 * Phones, and tablets held upright: captions go along the bottom and the scene is framed higher.
 * Keep in step with the `(max-width: 700px), (max-aspect-ratio: 4/5)` media queries in globals.css.
 */
export function isPortrait(width: number, height: number) {
  return width <= 700 || width / height <= 0.8;
}
