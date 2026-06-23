"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  bindPointerParallax,
  getSceneCameraDistance,
  getSceneMobileScale,
} from "@/lib/pointer-parallax";

export default function FuturisticScene3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 0, getSceneCameraDistance());

    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    const coreGeo = new THREE.IcosahedronGeometry(2.2, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    brainGroup.add(core);

    const innerGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    brainGroup.add(inner);

    const PARTICLE_COUNT = 180;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const purple = new THREE.Color(0x8b5cf6);
    const cyan = new THREE.Color(0x06b6d4);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = 3 + Math.random() * 2.5;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const mix = Math.random();
      const c = purple.clone().lerp(cyan, mix);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    brainGroup.add(particles);

    const linePositions: number[] = [];
    const threshold = 2.2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < threshold * threshold) {
          linePositions.push(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2],
            positions[j * 3],
            positions[j * 3 + 1],
            positions[j * 3 + 2],
          );
        }
      }
    }

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });
    brainGroup.add(new THREE.LineSegments(lineGeo, lineMat));

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(4.5, 0.015, 8, 120),
      new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.4,
      }),
    );
    ring1.rotation.x = Math.PI / 2.5;
    brainGroup.add(ring1);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.01, 8, 120),
      new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.25,
      }),
    );
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 4;
    brainGroup.add(ring2);

    scene.add(new THREE.AmbientLight(0x111122, 0.5));
    const pLight = new THREE.PointLight(0x8b5cf6, 1.2, 30);
    pLight.position.set(5, 3, 5);
    scene.add(pLight);
    const cLight = new THREE.PointLight(0x06b6d4, 1, 30);
    cLight.position.set(-5, -3, 3);
    scene.add(cLight);

    let targetRX = 0;
    let targetRY = 0;

    const applyLayout = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.position.z = getSceneCameraDistance(w);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      const scale = getSceneMobileScale(w);
      brainGroup.scale.setScalar(scale);
      brainGroup.position.x = w < 900 ? 0 : 3.5;
    };

    const unbindParallax = bindPointerParallax((x, y) => {
      const mobileFactor = window.innerWidth < 768 ? 0.55 : 1;
      targetRY = x * 0.4 * mobileFactor;
      targetRX = y * 0.25 * mobileFactor;
    });

    window.addEventListener("resize", applyLayout);
    applyLayout();

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      core.rotation.y = t * 0.15;
      core.rotation.x = t * 0.08;
      inner.rotation.y = -t * 0.2;
      inner.rotation.z = t * 0.1;
      particles.rotation.y = t * 0.05;
      ring1.rotation.z = t * 0.12;
      ring2.rotation.z = -t * 0.08;

      brainGroup.rotation.y += (targetRY - brainGroup.rotation.y) * 0.04;
      brainGroup.rotation.x += (targetRX - brainGroup.rotation.x) * 0.04;
      brainGroup.position.y = Math.sin(t * 0.5) * 0.15;

      pLight.intensity = 1.2 + Math.sin(t * 2) * 0.3;
      cLight.intensity = 1 + Math.cos(t * 1.7) * 0.25;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      unbindParallax();
      window.removeEventListener("resize", applyLayout);
      renderer.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="lf-canvas"
      aria-hidden
    />
  );
}
