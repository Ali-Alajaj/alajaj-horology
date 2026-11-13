import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Studio, useWatch } from './three/r3f';
import { DEFAULT_CONFIG, type WatchConfig } from './three/watch';

/**
 * Development bench for the 3D model: /?lab&e=1&rx=-0.3&ry=0.5&z=13&fade=1&strapFade=1
 * &case=steel|rose|pvd &dial=green|blue|ivory|black &strap=leather|bracelet|rubber &num=batons|arabic
 */
function Bench() {
  const q = new URLSearchParams(location.search);
  const num = (k: string, d: number) => (q.has(k) ? parseFloat(q.get(k)!) : d);
  const cfg: WatchConfig = {
    caseFinish: (q.get('case') as WatchConfig['caseFinish']) ?? DEFAULT_CONFIG.caseFinish,
    dial: (q.get('dial') as WatchConfig['dial']) ?? DEFAULT_CONFIG.dial,
    strap: (q.get('strap') as WatchConfig['strap']) ?? DEFAULT_CONFIG.strap,
    numerals: (q.get('num') as WatchConfig['numerals']) ?? DEFAULT_CONFIG.numerals,
  };
  const watch = useWatch(cfg);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useFrame((state) => {
    camera.position.set(num('cx', 0), num('cy', 0), num('z', 13));
    camera.lookAt(num('tx', 0), num('ty', 0), 0);
    watch.group.rotation.set(num('rx', -0.3), num('ry', 0.5), num('rz', 0));
    scene.environmentRotation.y = num('env', 1.15);
    watch.group.position.x = num('px', 0);
    watch.setExplode(num('e', 0));
    watch.setFade('face', num('fade', 1));
    watch.setFade('strap', num('strapFade', 1));
    watch.setTime(q.has('time') ? new Date(2026, 0, 1, 10, 9, 36) : new Date());
    watch.tick(state.clock.elapsedTime);
  });
  return <primitive object={watch.group} />;
}

export default function Lab() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#07110E' }}>
      <Canvas dpr={[1, 2]} camera={{ fov: 30, near: 0.1, far: 120, position: [0, 0, 13] }} gl={{ antialias: true }}>
        <Studio />
        <Bench />
      </Canvas>
    </div>
  );
}
