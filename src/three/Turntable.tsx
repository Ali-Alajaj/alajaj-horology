import { useEffect, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Studio, useWatch, prefersReducedMotion } from './r3f';
import type { WatchConfig } from './watch';

/** Small square-ish thumbnail (data URL) cropped from the centre of a canvas. */
export function thumbFrom(source: HTMLCanvasElement | HTMLImageElement, w = 152, h = 184): string {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const sw = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const sh = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.max(w / sw, h / sh) * 1.15;
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.fillStyle = '#0c1613';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh);
  try {
    return c.toDataURL('image/webp', 0.82);
  } catch {
    return '';
  }
}

interface RigProps {
  config: WatchConfig;
  target: RefObject<{ yaw: number; pitch: number; dragging: boolean }>;
  capture?: RefObject<(() => string) | null>;
  light: boolean;
  distance: number;
  lift: number;
}

function Rig({ config, target, capture, light, distance, lift }: RigProps) {
  const watch = useWatch(config, { detail: light ? 0.6 : 0.85, printSize: 1024 });
  const { gl, scene, camera } = useThree();
  const state = useRef({ yaw: target.current.yaw - 0.9, pitch: target.current.pitch, vy: 0, kick: 0 });
  const still = prefersReducedMotion();
  const first = useRef(true);

  useEffect(() => {
    if (!capture) return;
    capture.current = () => {
      gl.render(scene, camera);
      return thumbFrom(gl.domElement);
    };
    return () => {
      capture.current = null;
    };
  }, [capture, gl, scene, camera]);

  // a small flourish whenever the configuration changes
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!still) state.current.vy += 2.4;
  }, [config.caseFinish, config.dial, config.strap, config.numerals, still]);

  useFrame((s, dt) => {
    const d = Math.min(dt, 0.05);
    const t = s.clock.elapsedTime;
    const st = state.current;
    const sway = still || target.current.dragging ? 0 : Math.sin(t * 0.4) * 0.12;
    // critically damped spring towards the drag target
    const k = 26;
    const c = 9;
    st.vy += ((target.current.yaw + sway - st.yaw) * k - st.vy * c) * d;
    st.yaw += st.vy * d;
    st.pitch += (target.current.pitch - st.pitch) * (1 - Math.exp(-d * 8));
    if (still) {
      st.yaw = target.current.yaw;
      st.pitch = target.current.pitch;
    }
    watch.group.rotation.set(st.pitch, st.yaw, 0.03);
    watch.group.position.y = lift + (still ? 0 : Math.sin(t * 0.6) * 0.04);
    watch.setTime(new Date());
    watch.tick(still ? 0 : t);
    // at rest the studio matches the hero lighting; turning the watch lets highlights travel
    scene.environmentRotation.y = 0.1 + (st.yaw - 0.45) * 0.5;
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <Studio />
      <primitive object={watch.group} />
    </>
  );
}

interface Props {
  config: WatchConfig;
  label: string;
  capture?: RefObject<(() => string) | null>;
  distance?: number;
  lift?: number;
  className?: string;
}

/** A watch on a drag-to-rotate stand. Mounts its WebGL context only when near the viewport. */
export default function Turntable({ config, label, capture, distance = 12.6, lift = 0, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const target = useRef({ yaw: 0.45, pitch: -0.26, dragging: false });
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [light] = useState(() => window.matchMedia('(max-width: 767px)').matches);

  useEffect(() => {
    const el = box.current!;
    const a = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '700px 0px' });
    const b = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px 0px' });
    a.observe(el);
    b.observe(el);
    return () => {
      a.disconnect();
      b.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = box.current!;
    let lastX = 0;
    let lastY = 0;
    const down = (e: PointerEvent) => {
      target.current.dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');
    };
    const move = (e: PointerEvent) => {
      if (!target.current.dragging) return;
      target.current.yaw += (e.clientX - lastX) * 0.009;
      target.current.pitch = Math.min(0.55, Math.max(-0.9, target.current.pitch + (e.clientY - lastY) * 0.005));
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const up = () => {
      target.current.dragging = false;
      el.classList.remove('is-dragging');
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') target.current.yaw -= 0.35;
      else if (e.key === 'ArrowRight') target.current.yaw += 0.35;
      else if (e.key === 'ArrowUp') target.current.pitch = Math.max(-0.9, target.current.pitch - 0.15);
      else if (e.key === 'ArrowDown') target.current.pitch = Math.min(0.55, target.current.pitch + 0.15);
      else return;
      e.preventDefault();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('keydown', key);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('keydown', key);
    };
  }, []);

  return (
    <div
      className={`turntable ${className}`}
      ref={box}
      data-cursor="drag"
      tabIndex={0}
      role="img"
      aria-label={`${label}. اسحب أو استخدم مفاتيح الأسهم لتدوير الساعة.`}
    >
      {near && (
        <Canvas
          dpr={[1, light ? 1.5 : 2]}
          frameloop={visible ? 'always' : 'never'}
          camera={{ fov: 30, near: 0.1, far: 100, position: [0, 0, distance] }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <Rig config={config} target={target} capture={capture} light={light} distance={distance} lift={lift} />
        </Canvas>
      )}
    </div>
  );
}
