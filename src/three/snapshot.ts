import * as THREE from 'three';
import { createStudioEnv } from './env';
import { createWatch, type WatchConfig } from './watch';

const cache = new Map<string, string>();
let pending: Promise<Record<string, string>> | null = null;

const keyOf = (c: WatchConfig) => `${c.caseFinish}-${c.dial}-${c.strap}-${c.numerals}`;

/**
 * Renders still images of several watch configurations with one temporary
 * WebGL context (released afterwards). Results are cached for the session.
 */
export function renderSnapshots(
  items: { id: string; config: WatchConfig }[],
  w = 760,
  h = 950,
): Promise<Record<string, string>> {
  if (items.every((i) => cache.has(keyOf(i.config)))) {
    return Promise.resolve(Object.fromEntries(items.map((i) => [i.id, cache.get(keyOf(i.config))!])));
  }
  if (pending) return pending.then(() => renderSnapshots(items, w, h));
  pending = (async () => {
    const out: Record<string, string> = {};
    const canvas = document.createElement('canvas');
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    } catch {
      return out;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    const scene = new THREE.Scene();
    const env = createStudioEnv(renderer);
    scene.environment = env.texture;
    scene.environmentRotation.y = 0.1;
    const key = new THREE.DirectionalLight(0xfff3e0, 0.45);
    key.position.set(-5, 7, 9);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.2);
    fill.position.set(6, 2, 6);
    scene.add(key, fill);
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    camera.position.set(0, 0, 13.6);
    camera.lookAt(0, 0, 0);
    const watch = createWatch(items[0].config, { detail: 0.85, printSize: 1024 });
    watch.group.rotation.set(-0.3, 0.46, 0.04);
    watch.group.position.y = 0.05;
    scene.add(watch.group);
    // compile shaders without blocking the main thread before the first render
    await renderer.compileAsync(scene, camera).catch(() => undefined);
    const time = new Date(2026, 0, 1, 10, 9, 36);
    for (const item of items) {
      const k = keyOf(item.config);
      if (!cache.has(k)) {
        watch.setConfig(item.config);
        watch.setTime(time);
        watch.tick(0.4);
        renderer.render(scene, camera);
        cache.set(k, canvas.toDataURL('image/webp', 0.92));
        // let the main thread breathe between renders
        await new Promise((r) => setTimeout(r, 40));
      }
      out[item.id] = cache.get(k)!;
    }
    watch.dispose();
    env.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    return out;
  })();
  return pending.finally(() => {
    pending = null;
  });
}
