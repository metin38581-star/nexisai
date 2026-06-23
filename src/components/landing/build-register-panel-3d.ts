import * as THREE from "three";

const PURPLE = 0x8b5cf6;
const CYAN = 0x06b6d4;

export interface RegisterPanel3D {
  panelGroup: THREE.Group;
  logoGroup: THREE.Group;
  fieldGroups: THREE.Group[];
  buttonGroup: THREE.Group;
  nParticleTargets: Float32Array;
  nParticleStarts: Float32Array;
  nPoints: THREE.Points;
  dispose: () => void;
}

function sampleLine(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  count: number,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    pts.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
  }
  return pts;
}

function buildNLetterPoints(): Array<[number, number, number]> {
  const flat: Array<[number, number]> = [
    ...sampleLine(-0.45, -0.7, -0.45, 0.7, 8),
    ...sampleLine(-0.45, -0.7, 0.45, 0.7, 10),
    ...sampleLine(0.45, -0.7, 0.45, 0.7, 8),
  ];

  return flat.map(([x, y]) => [x * 0.55, y * 0.55, (Math.random() - 0.5) * 0.08]);
}

function createNeonFrame(
  width: number,
  height: number,
  depth: number,
  color: number,
): THREE.LineSegments {
  const geo = new THREE.BoxGeometry(width, height, depth);
  const edges = new THREE.EdgesGeometry(geo);
  geo.dispose();
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.LineSegments(edges, mat);
}

export function buildRegisterPanel3D(): RegisterPanel3D {
  const panelGroup = new THREE.Group();
  panelGroup.name = "registerPanel";

  const glassGeo = new THREE.PlaneGeometry(3.2, 4.4);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a12,
    transparent: true,
    opacity: 0.35,
    roughness: 0.15,
    metalness: 0.2,
    transmission: 0.55,
    thickness: 0.4,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  panelGroup.add(glass);

  const borderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.2, 4.4));
  const borderMat = new THREE.LineBasicMaterial({
    color: PURPLE,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
  });
  panelGroup.add(new THREE.LineSegments(borderGeo, borderMat));

  const logoGroup = new THREE.Group();
  logoGroup.position.set(0, 1.45, 0.12);
  panelGroup.add(logoGroup);

  const nTargets = buildNLetterPoints();
  const targetArr = new Float32Array(nTargets.length * 3);
  const startArr = new Float32Array(nTargets.length * 3);
  const nColors = new Float32Array(nTargets.length * 3);
  const purple = new THREE.Color(PURPLE);
  const cyan = new THREE.Color(CYAN);

  nTargets.forEach(([x, y, z], i) => {
    targetArr[i * 3] = x;
    targetArr[i * 3 + 1] = y;
    targetArr[i * 3 + 2] = z;
    startArr[i * 3] = x + (Math.random() - 0.5) * 3;
    startArr[i * 3 + 1] = y + (Math.random() - 0.5) * 3;
    startArr[i * 3 + 2] = z + (Math.random() - 0.5) * 2;
    const c = purple.clone().lerp(cyan, i / nTargets.length);
    nColors[i * 3] = c.r;
    nColors[i * 3 + 1] = c.g;
    nColors[i * 3 + 2] = c.b;
  });

  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute("position", new THREE.BufferAttribute(startArr.slice(), 3));
  nGeo.setAttribute("color", new THREE.BufferAttribute(nColors, 3));
  const nMat = new THREE.PointsMaterial({
    size: 0.07,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const nPoints = new THREE.Points(nGeo, nMat);
  logoGroup.add(nPoints);

  const nLinePositions: number[] = [];
  for (let i = 0; i < nTargets.length - 1; i++) {
    if (i % 4 === 3) continue;
    nLinePositions.push(
      targetArr[i * 3],
      targetArr[i * 3 + 1],
      targetArr[i * 3 + 2],
      targetArr[(i + 1) * 3],
      targetArr[(i + 1) * 3 + 1],
      targetArr[(i + 1) * 3 + 2],
    );
  }
  const nLineGeo = new THREE.BufferGeometry();
  nLineGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(nLinePositions, 3),
  );
  const nLineMat = new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
  });
  logoGroup.add(new THREE.LineSegments(nLineGeo, nLineMat));

  const logoRing1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.008, 8, 64),
    new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.45 }),
  );
  logoRing1.rotation.x = Math.PI / 2.2;
  logoGroup.add(logoRing1);

  const logoRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.88, 0.006, 8, 64),
    new THREE.MeshBasicMaterial({ color: PURPLE, transparent: true, opacity: 0.3 }),
  );
  logoRing2.rotation.y = Math.PI / 3;
  logoGroup.add(logoRing2);

  const fieldGroups: THREE.Group[] = [];
  const fieldYs = [0.55, -0.05, -0.65];
  fieldYs.forEach((y, index) => {
    const g = new THREE.Group();
    g.position.set(0, y, 0.08);
    const frame = createNeonFrame(2.6, 0.42, 0.04, index % 2 === 0 ? PURPLE : CYAN);
    g.add(frame);
    g.userData.frame = frame;
    g.userData.delay = 0.35 + index * 0.18;
    panelGroup.add(g);
    fieldGroups.push(g);
  });

  const buttonGroup = new THREE.Group();
  buttonGroup.position.set(0, -1.35, 0.1);
  const btnFrame = createNeonFrame(2.6, 0.48, 0.06, PURPLE);
  buttonGroup.add(btnFrame);
  buttonGroup.userData.frame = btnFrame;
  buttonGroup.userData.delay = 0.9;
  panelGroup.add(buttonGroup);

  panelGroup.rotation.y = -0.12;
  panelGroup.scale.setScalar(0.001);
  panelGroup.userData.introDone = false;

  const disposables: Array<THREE.BufferGeometry | THREE.Material> = [
    glassGeo,
    glassMat,
    borderGeo,
    borderMat,
    nGeo,
    nMat,
    nLineGeo,
    nLineMat,
  ];

  fieldGroups.forEach((g) => {
    const frame = g.userData.frame as THREE.LineSegments;
    disposables.push(frame.geometry, frame.material as THREE.Material);
  });
  disposables.push(btnFrame.geometry, btnFrame.material as THREE.Material);

  return {
    panelGroup,
    logoGroup,
    fieldGroups,
    buttonGroup,
    nParticleTargets: targetArr,
    nParticleStarts: startArr,
    nPoints,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function updateRegisterPanel3D(
  panel: RegisterPanel3D,
  elapsed: number,
  parallaxX: number,
  parallaxY: number,
): void {
  const introDuration = 1.1;
  const introT = Math.min(elapsed / introDuration, 1);
  const easeOut = 1 - Math.pow(1 - introT, 3);
  panel.panelGroup.scale.setScalar(0.001 + easeOut * 0.999);

  panel.panelGroup.rotation.y = -0.12 + parallaxX * 0.18;
  panel.panelGroup.rotation.x = parallaxY * 0.12;
  panel.panelGroup.rotation.z = parallaxX * 0.04;

  const posAttr = panel.nPoints.geometry.getAttribute(
    "position",
  ) as THREE.BufferAttribute;
  const logoEase = Math.min(Math.max((elapsed - 0.15) / 1.4, 0), 1);
  const logoT = 1 - Math.pow(1 - logoEase, 4);

  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setXYZ(
      i,
      THREE.MathUtils.lerp(
        panel.nParticleStarts[i * 3],
        panel.nParticleTargets[i * 3],
        logoT,
      ),
      THREE.MathUtils.lerp(
        panel.nParticleStarts[i * 3 + 1],
        panel.nParticleTargets[i * 3 + 1],
        logoT,
      ),
      THREE.MathUtils.lerp(
        panel.nParticleStarts[i * 3 + 2],
        panel.nParticleTargets[i * 3 + 2],
        logoT,
      ),
    );
  }
  posAttr.needsUpdate = true;

  panel.logoGroup.rotation.y = elapsed * 0.25;
  const rings = panel.logoGroup.children.filter(
    (c) => c instanceof THREE.Mesh,
  ) as THREE.Mesh[];
  if (rings[0]) rings[0].rotation.z = elapsed * 0.35;
  if (rings[1]) rings[1].rotation.x = elapsed * -0.28;

  const revealField = (group: THREE.Group, delay: number) => {
    const t = Math.min(Math.max((elapsed - delay) / 0.55, 0), 1);
    const frame = group.userData.frame as THREE.LineSegments | undefined;
    if (frame?.material instanceof THREE.LineBasicMaterial) {
      frame.material.opacity = t * 0.85;
    }
    group.position.z = 0.08 + (1 - t) * 0.35;
  };

  panel.fieldGroups.forEach((g) => {
    revealField(g, g.userData.delay as number);
  });
  revealField(panel.buttonGroup, panel.buttonGroup.userData.delay as number);

  const btnFrame = panel.buttonGroup.userData.frame as THREE.LineSegments;
  if (btnFrame.material instanceof THREE.LineBasicMaterial) {
    const revealT = Math.min(
      Math.max((elapsed - (panel.buttonGroup.userData.delay as number)) / 0.55, 0),
      1,
    );
    const baseOpacity = revealT * 0.85;
    btnFrame.material.opacity =
      baseOpacity * (0.82 + Math.sin(elapsed * Math.PI * 2) * 0.18);
  }
}
