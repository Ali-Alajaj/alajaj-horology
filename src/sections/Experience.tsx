import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { navigate } from '../lib/router';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { Studio, useWatch } from '../three/r3f';
import { DEFAULT_CONFIG, LAYER_INFO } from '../three/watch';
import { PARTS } from '../data';
import { gsap, ScrollTrigger, reducedMotion, scrollToTarget } from '../lib/scroll';
import { useStore } from '../store';
import Magnetic from '../components/Magnetic';
import Media from '../components/Media';

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);
const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

interface Pose {
  px: number;
  py: number;
  rx: number;
  ry: number;
  rz: number;
  cam: number;
  tx: number;
  ty: number;
}
const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  px: mix(a.px, b.px, t),
  py: mix(a.py, b.py, t),
  rx: mix(a.rx, b.rx, t),
  ry: mix(a.ry, b.ry, t),
  rz: mix(a.rz, b.rz, t),
  cam: mix(a.cam, b.cam, t),
  tx: mix(a.tx, b.tx, t),
  ty: mix(a.ty, b.ty, t),
});

const FOV = 30;
const TAN = Math.tan((FOV / 2) * (Math.PI / 180));

/** Key poses: hero, exploded, final. */
function keyPoses(aspect: number) {
  const vertical = aspect < 1;
  if (vertical) {
    // watch diameter ≈ 72% of the width, but never more than 36% of the height
    const camH = Math.max(4.4 / (0.72 * 2 * TAN * aspect), 4.4 / (0.36 * 2 * TAN));
    const fitW = camH / 1.42;
    // exploded: the stack fills the height, the discs keep to the left 56% and the notes take the rest
    const camX = Math.max(16.4 / (2 * TAN), 4.1 / 0.56 / (2 * TAN * aspect));
    const visW = 2 * TAN * camX * aspect;
    return {
      vertical,
      // centred about 30% from the top, leaving the lower half for the copy
      H: { px: 0, py: 0.2 * 2 * TAN * camH, rx: -0.3, ry: 0.42, rz: 0.04, cam: camH, tx: 0, ty: 0 },
      X: { px: -visW / 2 + 2.4, py: -0.35, rx: -1.1, ry: 0, rz: 0, cam: camX, tx: 0, ty: 0 },
      F: { px: 0, py: 0.09 * 2 * TAN * camH, rx: -0.2, ry: -0.3, rz: 0, cam: Math.max(18, fitW * 1.3), tx: 0, ty: 0 },
    };
  }
  return {
    vertical,
    H: { px: -2.55, py: 0.05, rx: -0.3, ry: 0.5, rz: 0.05, cam: 13.4, tx: 0, ty: 0 },
    // slightly smaller than before so every part can carry its note
    X: { px: -0.7, py: 0, rx: 0.06, ry: 1.08, rz: 0, cam: Math.max(20, 20.5 / (2 * TAN * aspect)), tx: 0, ty: 0 },
    F: { px: 0, py: 0.35, rx: -0.2, ry: -0.36, rz: 0, cam: 15, tx: 0, ty: 0 },
  };
}

function Dust({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    let s = 9;
    const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 26;
      pos[i * 3 + 1] = (r() - 0.5) * 14;
      pos[i * 3 + 2] = (r() - 0.5) * 14 - 2;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.012;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.3;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#f6ae4a"
        size={0.035}
        sizeAttenuation
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendSrc={THREE.SrcAlphaFactor}
        blendDst={THREE.OneFactor}
        blendSrcAlpha={THREE.ZeroFactor}
        blendDstAlpha={THREE.OneFactor}
      />
    </points>
  );
}

interface SceneProps {
  progress: RefObject<number>;
  intro: RefObject<{ v: number }>;
  labels: RefObject<(HTMLDivElement | null)[]>;
  light: boolean;
  still: boolean;
  onCompiled(): void;
}

function Scene({ progress, intro, labels, light, still, onCompiled }: SceneProps) {
  const watch = useWatch(DEFAULT_CONFIG, { detail: light ? 0.6 : 1, printSize: light ? 1024 : 2048 }, () => {
    useStore.getState().setStageReady();
    onCompiled();
  });
  const { camera, scene, gl, size } = useThree();
  const smoothed = useRef(progress.current ?? 0);
  const ptr = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const v = useMemo(() => new THREE.Vector3(), []);
  const poses = useMemo(() => keyPoses(size.width / size.height), [size.width, size.height]);

  useEffect(() => {
    if (still) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      ptr.current.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.current.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [still]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 6.5);
    smoothed.current += ((progress.current ?? 0) - smoothed.current) * (still ? 1 : k);
    const p = smoothed.current;
    const { H, X, F, vertical } = poses;

    // hero → the layers part as soon as the scroll starts → held → reassembled
    const wExp = easeIO(seg(p, 0.05, 0.36));
    const wEnd = easeIO(seg(p, 0.8, 0.95));
    const pose = mixPose(mixPose(H, X, wExp), F, wEnd);
    const e = easeIO(seg(p, 0.09, 0.38)) * (1 - easeIO(seg(p, 0.8, 0.92)));
    const strap = 1 - ease(seg(p, 0.06, 0.15)) * (1 - ease(seg(p, 0.87, 0.95)));

    // slow drift while the layers are apart
    const hold = (seg(p, 0.38, 0.8) - 0.5) * wExp * (1 - wEnd);
    if (vertical) pose.rx += hold * 0.14;
    else pose.ry -= hold * 0.2;

    // idle float + pointer parallax while the watch is whole
    const free = still ? 0 : 1 - wExp + wEnd + 0.2 * wExp * (1 - wEnd);
    ptr.current.x += (ptr.current.tx - ptr.current.x) * k * 0.6;
    ptr.current.y += (ptr.current.ty - ptr.current.y) * k * 0.6;
    pose.rx += (Math.sin(t * 0.62) * 0.035 + ptr.current.y * 0.09) * free;
    pose.ry += (Math.sin(t * 0.47) * 0.05 + ptr.current.x * 0.16) * free;
    pose.py += Math.sin(t * 0.55) * 0.05 * free;

    // entrance: turn in from the dark while the light sweeps across the case
    const i = still ? 1 : intro.current.v;
    pose.ry -= (1 - i) * 0.75;
    pose.cam += (1 - i) * 2.2;
    gl.toneMappingExposure = 1.04 * Math.pow(i, 1.6);
    // the studio turns with the scroll so reflections travel across the metal
    scene.environmentRotation.set(
      0,
      // 0.1 for the hero, 1.15 for the exploded view, with a slow drift while it is held
      0.1 +
        1.05 * ease(seg(p, 0.07, 0.36)) +
        0.22 * Math.sin(Math.PI * 2 * seg(p, 0.38, 0.8)) +
        (1 - i) * 2.6 +
        (still ? 0 : Math.sin(t * 0.13) * 0.08),
      0,
    );

    watch.group.position.set(pose.px, pose.py, 0);
    watch.group.rotation.set(pose.rx, pose.ry, pose.rz);
    watch.setExplode(e, 1);
    watch.setFade('strap', strap);
    watch.setTime(new Date());
    watch.tick(still ? 0 : t);

    camera.position.set(pose.tx, pose.ty, pose.cam);
    camera.lookAt(pose.tx, pose.ty, 0);
    camera.updateMatrixWorld();
    watch.group.updateMatrixWorld(true);

    // every part carries its own note: above / below the layer on wide screens,
    // in an evenly spaced column beside the stack on portrait screens
    const list = labels.current;
    if (list) {
      const show = ease(seg(e, 0.82, 1));
      const visW = 2 * TAN * X.cam * (size.width / size.height);
      const slotX = Math.min(size.width * 0.66, ((X.px + 2.25) / visW + 0.5) * size.width + 0.05 * size.width);
      for (let n = 0; n < PARTS.length; n++) {
        const el = list[n];
        if (!el) continue;
        if (show <= 0.001) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          continue;
        }
        const info = LAYER_INFO[PARTS[n].layer];
        if (vertical) v.set(info.r * 0.96, 0, info.z);
        else v.set(0, n % 2 === 0 ? info.r : -info.r, info.z);
        watch.layers[PARTS[n].layer].localToWorld(v);
        v.project(camera);
        const x = (v.x * 0.5 + 0.5) * size.width;
        const y = (-v.y * 0.5 + 0.5) * size.height;
        const dot = el.children[0] as HTMLElement;
        const line = el.children[1] as HTMLElement;
        const text = el.children[2] as HTMLElement;
        el.style.visibility = 'visible';
        el.style.opacity = String(show);
        if (vertical) {
          const sy = size.height * (0.135 + (n * 0.79) / (PARTS.length - 1));
          const dx = x - slotX;
          const dy = y - sy;
          el.style.transform = `translate3d(${slotX.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
          dot.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
          line.style.width = `${Math.hypot(dx, dy).toFixed(1)}px`;
          line.style.transform = `rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`;
          text.style.width = `${Math.max(96, size.width - slotX - 14).toFixed(0)}px`;
        } else {
          el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
          if (dot.style.transform) {
            dot.style.transform = '';
            line.style.width = '';
            line.style.transform = '';
            text.style.width = '';
          }
        }
      }
    }
  });

  return (
    <>
      <Studio />
      <primitive object={watch.group} />
      {!still && <Dust count={light ? 90 : 220} />}
    </>
  );
}

export default function Experience() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const intro = useRef({ v: 0 });
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const heroCopy = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const outro = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [dpr, setDpr] = useState(1);
  const ready = useStore((s) => s.ready);
  const [compiled, setCompiled] = useState(false);
  const light = useMemo(() => window.matchMedia('(max-width: 767px)').matches, []);
  const still = useMemo(() => reducedMotion(), []);

  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, light ? 1.5 : 2));
  }, [light]);

  // entrance once the preloader has opened and the scene has compiled
  useEffect(() => {
    if (!ready || !compiled) return;
    if (still) {
      intro.current.v = 1;
      return;
    }
    const tw = gsap.to(intro.current, { v: 1, duration: 3.2, ease: 'power3.out', delay: 0.15 });
    return () => {
      tw.kill();
    };
  }, [ready, compiled, still]);

  useEffect(() => {
    const el = section.current!;
    const apply = (p: number) => {
      progress.current = p;
      const set = (node: HTMLElement | null, o: number, y = 0) => {
        if (!node) return;
        node.style.opacity = o.toFixed(3);
        node.style.visibility = o < 0.01 ? 'hidden' : 'visible';
        if (y) node.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
        else node.style.transform = '';
      };
      const heroOut = seg(p, 0.015, 0.075);
      set(heroCopy.current, 1 - heroOut, -48 * heroOut);
      set(hint.current, 1 - seg(p, 0.005, 0.03));
      set(outro.current, ease(seg(p, 0.94, 0.975)));
    };
    apply(0);
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => apply(self.progress),
      onRefresh: (self) => apply(self.progress),
    });
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '200px 0px' });
    io.observe(el);
    return () => {
      st.kill();
      io.disconnect();
    };
  }, []);

  const discover = () => {
    const el = section.current!;
    const range = el.offsetHeight - window.innerHeight;
    scrollToTarget(el.offsetTop + range * 0.56);
  };

  return (
    <section className="xp" id="top" ref={section} aria-label="ساعة Alajaj Meridian">
      <div className={`xp__stage${ready ? ' is-ready' : ''}`}>
        <div className="xp__bg" aria-hidden="true">
          <Media name="hero-atmosphere.webp" alt="" tone="green" className="xp__bg-media" eager />
          <span className="xp__glow" />
        </div>

        <div className="xp__canvas" aria-hidden="true">
          <Canvas
            dpr={dpr}
            frameloop={inView ? 'always' : 'never'}
            camera={{ fov: FOV, near: 0.1, far: 120, position: [0, 0, 14] }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
              gl.toneMappingExposure = 0;
            }}
          >
            <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.5))} />
            <Scene progress={progress} intro={intro} labels={labels} light={light} still={still} onCompiled={() => setCompiled(true)} />
          </Canvas>
        </div>

        {/* hero */}
        <div className="xp__hero" ref={heroCopy}>
          <div className="wrap">
            <div className="xp__hero-copy">
              <h1 className="h-display xp__title">
                <span className="reveal-line">الوقتُ حِرفةٌ نُتقنها باليد</span>
              </h1>
              <p className="lead reveal-line">
                ساعات ميكانيكية تُصاغ في مشغل العجاج قطعةً قطعة: حركة أوتوماتيكية من 312 جزءًا، وميناء بتشطيب
                شمسي، واحتياطي طاقة يبلغ 72 ساعة.
              </p>
              <div className="xp__cta reveal-line">
                <Magnetic>
                  <button
  type="button"
  className="btn btn--gold"
  onClick={() => navigate('/shop')}
  style={{ borderRadius: '5px' }}
>
  <span>اكتشف المجموعة</span>
</button>
                </Magnetic>
                <button type="button" className="link" onClick={() => navigate('/boutique')}>
                  احجز موعدًا في البوتيك
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="xp__hint" ref={hint} aria-hidden="true">
          <span className="xp__hint-line" />
          <span>مرّر للأسفل</span>
        </div>

        {/* exploded view: one note per part (positions are projected from 3D, so physical coordinates are intended) */}
        <div className="xp__hots" aria-hidden="true">
          {PARTS.map((part, n) => (
            <div
              key={part.layer}
              className="hot"
              data-side={n % 2 === 0 ? 'top' : 'bottom'}
              ref={(el) => {
                labels.current[n] = el;
              }}
            >
              <span className="hot__dot" />
              <span className="hot__line" />
              <div className="hot__text">
                <p className="hot__title">
                  <b>{String(n + 1).padStart(2, '0')}</b>
                  {part.title}
                </p>
                <p className="hot__desc">{part.short}</p>
              </div>
            </div>
          ))}
        </div>

        {/* outro */}
        <div className="xp__outro" ref={outro}>
          <p className="xp__outro-title">ثمانية أجزاء، وساعةٌ واحدة</p>
          <p className="xp__outro-text">العقارب أمامك تشير إلى وقتك الآن.</p>
        </div>
      </div>

      {/* the same content for assistive technology and when 3D is unavailable */}
      <div className="sr-only">
        <h2>مكوّنات الساعة</h2>
        <ol>
          {PARTS.map((part) => (
            <li key={part.layer}>
              <strong>{part.title}:</strong> {part.text}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
