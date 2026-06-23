"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import {
  buildRegisterPanel3D,
  updateRegisterPanel3D,
} from "@/components/landing/build-register-panel-3d";
import { bindPointerParallax, getSceneMobileScale } from "@/lib/pointer-parallax";
import { setLandingParallax } from "@/lib/landing-parallax";

interface ModalPanelScene3DProps {
  active: boolean;
}

export default function ModalPanelScene3D({ active }: ModalPanelScene3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    const registerPanel = buildRegisterPanel3D();
    registerPanel.panelGroup.position.set(0, 0, 0);
    registerPanel.panelGroup.visible = true;
    scene.add(registerPanel.panelGroup);

    scene.add(new THREE.AmbientLight(0x111122, 0.6));
    const pLight = new THREE.PointLight(0x8b5cf6, 1.4, 20);
    pLight.position.set(2, 2, 4);
    scene.add(pLight);
    const cLight = new THREE.PointLight(0x06b6d4, 1, 20);
    cLight.position.set(-2, -1, 3);
    scene.add(cLight);

    let panelParallaxX = 0;
    let panelParallaxY = 0;

    const applyLayout = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = parent?.clientHeight ?? window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      const scale = getSceneMobileScale(w);
      registerPanel.panelGroup.scale.setScalar(scale);
      camera.position.z = w < 480 ? 10 : w < 768 ? 9 : 8;
    };

    const unbindParallax = bindPointerParallax((x, y) => {
      const mobileFactor = window.innerWidth < 768 ? 0.5 : 1;
      panelParallaxX = x * mobileFactor;
      panelParallaxY = y * mobileFactor;
      setLandingParallax(panelParallaxX, panelParallaxY);
    });

    window.addEventListener("resize", applyLayout);
    applyLayout();

    const clock = new THREE.Clock();
    let frameId = 0;

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      updateRegisterPanel3D(registerPanel, t, panelParallaxX, panelParallaxY);
      pLight.intensity = 1.4 + Math.sin(t * 2) * 0.25;
      cLight.intensity = 1 + Math.cos(t * 1.7) * 0.2;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      unbindParallax();
      window.removeEventListener("resize", applyLayout);
      setLandingParallax(0, 0);
      renderer.dispose();
      registerPanel.dispose();
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      aria-hidden
    />
  );
}
