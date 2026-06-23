export interface ParallaxState {
  x: number;
  y: number;
}

let parallax: ParallaxState = { x: 0, y: 0 };

export function setLandingParallax(x: number, y: number): void {
  parallax = { x, y };
}

export function getLandingParallax(): ParallaxState {
  return parallax;
}
