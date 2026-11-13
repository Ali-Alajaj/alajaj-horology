import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { createStudioEnv } from './env';
import { createWatch, type WatchConfig, type WatchHandle } from './watch';

/** Installs the procedural studio environment on the current scene. */
export function Studio({ intensity = 1 }: { intensity?: number }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const env = createStudioEnv(gl);
    scene.environment = env.texture;
    return () => {
      scene.environment = null;
      env.dispose();
    };
  }, [gl, scene]);
  useEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);
  return (
    <>
      <directionalLight position={[-5, 7, 9]} intensity={0.45} color="#fff3e0" />
      <directionalLight position={[6, 2, 6]} intensity={0.2} color="#dfe8ff" />
    </>
  );
}

/**
 * Creates one watch for the lifetime of the component and keeps it in sync
 * with `config`. The watch stays hidden until its shaders have been compiled
 * off the main thread (KHR_parallel_shader_compile), so the first frame does
 * not freeze the page; `onReady` fires when it becomes visible.
 * Must be used next to <Studio/>, whose effect installs the environment first.
 */
export function useWatch(
  config: WatchConfig,
  opts?: { detail?: number; printSize?: number },
  onReady?: () => void,
): WatchHandle {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const ready = useRef(onReady);
  ready.current = onReady;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const watch = useMemo(() => {
    const w = createWatch(config, opts);
    w.group.visible = false;
    return w;
  }, []);
  useEffect(() => {
    let alive = true;
    const show = () => {
      if (!alive) return;
      watch.group.visible = true;
      ready.current?.();
    };
    // one macrotask later, so sibling effects (the environment) are in place
    const t = setTimeout(() => {
      gl.compileAsync(scene, camera).then(show, show);
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
      watch.dispose();
    };
  }, [watch, gl, scene, camera]);
  const { caseFinish, dial, strap, numerals } = config;
  useEffect(() => {
    const c = watch.config;
    if (c.caseFinish !== caseFinish || c.dial !== dial || c.strap !== strap || c.numerals !== numerals) {
      watch.setConfig({ caseFinish, dial, strap, numerals });
    }
  }, [watch, caseFinish, dial, strap, numerals]);
  return watch;
}

export const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
