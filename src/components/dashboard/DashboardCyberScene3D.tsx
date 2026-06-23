"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Dashboard arka planı — landing FuturisticScene3D'ye dokunulmaz. */
export default function DashboardCyberScene3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 0, 14);

    const group = new THREE.Group();
    scene.add(group);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2, 1),
      new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        wireframe: true,
        transparent: true,
        opacity: 0.2,
      }),
    );
    group.add(core);

    const count = 100;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const purple = new THREE.Color(0x8b5cf6);
    const cyan = new THREE.Color(0x06b6d4);

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = 2.5 + Math.random() * 2;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      const c = purple.clone().lerp(cyan, Math.random());
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const particles = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    group.add(particles);

    group.position.set(4, 0, 0);

    let targetRX = 0;
    let targetRY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetRY = (e.clientX / window.innerWidth - 0.5) * 0.25;
      targetRX = (e.clientY / window.innerHeight - 0.5) * 0.15;
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      group.position.x = w < 900 ? 0 : 4;
    };

    document.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", resize);
    resize();

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      core.rotation.y = t * 0.1;
      particles.rotation.y = t * 0.04;
      group.rotation.y += (targetRY - group.rotation.y) * 0.03;
      group.rotation.x += (targetRX - group.rotation.x) * 0.03;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      pGeo.dispose();
      core.geometry.dispose();
      (core.material as THREE.Material).dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-50"
      aria-hidden
    />
  );
}
