// src/components/CursorTrail.js
import React, { useEffect, useRef, useState } from 'react';

const PEN_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <g transform="rotate(-45, 16, 16)">
    <rect x="13" y="2" width="6" height="14" rx="1" fill="%23111827" stroke="%23374151" stroke-width="0.5"/>
    <polygon points="13,16 19,16 16,26" fill="%231a1a2e" stroke="%23374151" stroke-width="0.5"/>
    <rect x="13" y="2" width="6" height="4" rx="1" fill="%23d97706"/>
    <rect x="14.5" y="26" width="3" height="3" rx="0.5" fill="%23f59e0b"/>
    <line x1="16" y1="29" x2="16" y2="31" stroke="%230f766e" stroke-width="1.5" stroke-linecap="round"/>
  </g>
</svg>`;

const CURSOR_URL = `data:image/svg+xml,${PEN_CURSOR_SVG}`;

export default function CursorTrail({ enabled, darkMode }) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const animFrameRef = useRef(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const ctx = canvas.getContext('2d');

    const onMouseMove = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      if (isDrawingRef.current && currentStrokeRef.current) {
        currentStrokeRef.current.points.push({ x, y, t: Date.now() });
      }
    };

    const onMouseDown = (e) => {
      isDrawingRef.current = true;
      currentStrokeRef.current = {
        points: [{ x: e.clientX, y: e.clientY, t: Date.now() }],
        createdAt: Date.now(),
        opacity: 1
      };
      strokesRef.current.push(currentStrokeRef.current);
    };

    const onMouseUp = () => {
      isDrawingRef.current = false;
      currentStrokeRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    const inkColor = darkMode ? '15, 118, 110' : '15, 118, 110'; // teal ink

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();
      const FADE_DURATION = 1800;

      strokesRef.current = strokesRef.current.filter(stroke => {
        const age = now - stroke.createdAt;
        return age < FADE_DURATION + 500;
      });

      strokesRef.current.forEach(stroke => {
        if (stroke.points.length < 2) return;

        const age = now - stroke.createdAt;
        const fadeProgress = Math.min(age / FADE_DURATION, 1);
        const opacity = Math.max(0, 1 - fadeProgress * fadeProgress);

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = `rgba(${inkColor}, 1)`;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

        for (let i = 1; i < stroke.points.length - 1; i++) {
          const prev = stroke.points[i - 1];
          const curr = stroke.points[i];
          const next = stroke.points[i + 1];

          // Vary line width based on speed for organic ink feel
          const dx = curr.x - prev.x;
          const dy = curr.y - prev.y;
          const speed = Math.sqrt(dx * dx + dy * dy);
          const width = Math.max(0.5, Math.min(2.5, 8 / (speed + 1)));

          ctx.lineWidth = width;

          const cpX = (prev.x + curr.x) / 2;
          const cpY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(cpX, cpY, curr.x, curr.y);
        }

        const last = stroke.points[stroke.points.length - 1];
        ctx.lineTo(last.x, last.y);
        ctx.stroke();

        // Ink blot at start of stroke
        if (stroke.points.length > 0) {
          const first = stroke.points[0];
          ctx.beginPath();
          ctx.arc(first.x, first.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${inkColor}, ${opacity * 0.6})`;
          ctx.fill();
        }

        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [enabled, darkMode]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}