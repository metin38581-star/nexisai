"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface NeonCyberRangeProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export default function NeonCyberRange({
  min,
  max,
  step,
  value,
  onChange,
}: NeonCyberRangeProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const prevValueRef = useRef(value);

  const spawnParticles = useCallback((ratio: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const x = ratio * wrap.clientWidth;
    const y = wrap.clientHeight / 2;
    for (let i = 0; i < 6; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        life: 1,
      });
    }
  }, []);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      const ratio = (value - min) / (max - min);
      spawnParticles(ratio);
      prevValueRef.current = value;
    }
  }, [value, min, max, spawnParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;

    const resize = () => {
      canvas.width = wrap.clientWidth;
      canvas.height = wrap.clientHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const tick = () => {
      frameId = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.04;
        if (p.life <= 0) return false;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
        ctx.fillStyle =
          p.life > 0.5
            ? `rgba(6, 182, 212, ${p.life})`
            : `rgba(139, 92, 246, ${p.life})`;
        ctx.fill();
        return true;
      });

      if (isDragging && Math.random() < 0.35) {
        const ratio = (value - min) / (max - min);
        spawnParticles(ratio);
      }
    };

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [isDragging, value, min, max, spawnParticles]);

  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div ref={wrapRef} className="dc-neon-range-wrap relative pt-1">
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden
      />
      <div
        className="dc-neon-range-track"
        style={
          {
            "--range-pct": `${pct}%`,
          } as React.CSSProperties
        }
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          onPointerLeave={() => setIsDragging(false)}
          className="cyber-range-neon relative z-10 w-full"
        />
      </div>
    </div>
  );
}
