import * as THREE from 'three';
import { circleHole, extrude, gearShape, polarDisc, revolve, sectorPath } from './geo';
import { genevaTextures, perlageTexture, streakTexture } from './textures';

export interface Movement {
  bridges: THREE.Group;
  gears: THREE.Group;
  plate: THREE.Group;
  rotor: THREE.Group;
  /** advance the mechanism; `t` in seconds */
  update(t: number): void;
  dispose(): void;
}

const deg = (d: number) => (d * Math.PI) / 180;

/**
 * Stylised automatic movement: perlage main plate, brass gear train with a
 * beating balance, striped bridges with jewels and blued screws, gold rotor.
 * Everything is built around the Z axis, decorated faces towards +Z.
 */
export function buildMovement(detail: number): Movement {
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];
  const G = <T extends THREE.BufferGeometry>(g: T) => (geos.push(g), g);
  const M = <T extends THREE.Material>(m: T) => (mats.push(m), m);
  const T = <X extends THREE.Texture>(t: X) => (texs.push(t), t);
  const seg = Math.round(96 * detail);

  // ---------- materials ----------
  const circular = T(streakTexture('u', 31, 120, 255, 256));
  const geneva = genevaTextures();
  T(geneva.map);
  T(geneva.bump);
  const perlage = T(perlageTexture());
  perlage.repeat.set(4.2, 4.2);

  const rhodiumStriped = M(
    new THREE.MeshPhysicalMaterial({
      color: 0xd4d7da,
      metalness: 1,
      roughness: 0.34,
      map: geneva.map,
      bumpMap: geneva.bump,
      bumpScale: 2.2,
      envMapIntensity: 1.0,
    }),
  );
  const anglage = M(
    new THREE.MeshPhysicalMaterial({ color: 0xf1f2f3, metalness: 1, roughness: 0.05, envMapIntensity: 1.5 }),
  );
  const plateMat = M(
    new THREE.MeshPhysicalMaterial({
      color: 0xb4b7ba,
      metalness: 1,
      roughness: 0.36,
      map: perlage,
      envMapIntensity: 1.1,
    }),
  );
  const steel = M(
    new THREE.MeshPhysicalMaterial({ color: 0xd9dbde, metalness: 1, roughness: 0.14, envMapIntensity: 1.3 }),
  );
  const brass = M(
    new THREE.MeshPhysicalMaterial({
      color: 0xd9b45e,
      metalness: 1,
      roughness: 0.26,
      envMapIntensity: 1.25,
    }),
  );
  const brassBrushed = M(
    new THREE.MeshPhysicalMaterial({
      color: 0xd2ac58,
      metalness: 1,
      roughness: 0.45,
      roughnessMap: circular,
      anisotropy: 0.6,
      anisotropyRotation: Math.PI / 2,
      envMapIntensity: 1.2,
    }),
  );
  const gold = M(
    new THREE.MeshPhysicalMaterial({ color: 0xe0b96c, metalness: 1, roughness: 0.16, envMapIntensity: 1.4 }),
  );
  const goldBrushed = M(
    new THREE.MeshPhysicalMaterial({
      color: 0xd6ad62,
      metalness: 1,
      roughness: 0.42,
      roughnessMap: circular,
      envMapIntensity: 1.25,
    }),
  );
  const blued = M(
    new THREE.MeshPhysicalMaterial({ color: 0x2445a8, metalness: 1, roughness: 0.2, envMapIntensity: 1.5 }),
  );
  const ruby = M(
    new THREE.MeshPhysicalMaterial({
      color: 0xb3123a,
      metalness: 0,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: 0x4a0414,
      emissiveIntensity: 0.55,
      envMapIntensity: 1.4,
    }),
  );
  const slot = M(new THREE.MeshBasicMaterial({ color: 0x05070a }));
  const springMat = M(new THREE.LineBasicMaterial({ color: 0x6f8fd8, transparent: true, opacity: 0.9 }));

  // ---------- shared small parts ----------
  const screwHead = G(new THREE.CylinderGeometry(0.055, 0.06, 0.03, 20).rotateX(Math.PI / 2));
  const screwSlot = G(new THREE.BoxGeometry(0.1, 0.014, 0.012));
  const chaton = G(new THREE.CylinderGeometry(0.075, 0.08, 0.02, 24).rotateX(Math.PI / 2));
  const stone = G(new THREE.SphereGeometry(0.048, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.55));
  const arbor = G(new THREE.CylinderGeometry(0.03, 0.03, 0.24, 12).rotateX(Math.PI / 2));

  const addScrew = (parent: THREE.Object3D, x: number, y: number, z: number, scale = 1) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    g.rotation.z = (x * 7.3 + y * 3.1) % Math.PI;
    const head = new THREE.Mesh(screwHead, blued);
    head.position.z = 0.015;
    const s = new THREE.Mesh(screwSlot, slot);
    s.position.z = 0.031;
    g.add(head, s);
    parent.add(g);
  };
  const addJewel = (parent: THREE.Object3D, x: number, y: number, z: number, scale = 1) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    const c = new THREE.Mesh(chaton, gold);
    c.position.z = 0.01;
    const s = new THREE.Mesh(stone, ruby);
    s.position.z = 0.016;
    g.add(c, s);
    parent.add(g);
  };

  // ---------- main plate ----------
  const plate = new THREE.Group();
  {
    const top = new THREE.Mesh(G(new THREE.CircleGeometry(1.66, seg)), plateMat);
    top.position.z = -0.04;
    const wall = new THREE.Mesh(
      G(
        revolve(
          [
            [
              [1.66, -0.12],
              [1.66, -0.04],
            ],
          ],
          seg,
        ),
      ),
      steel,
    );
    const under = new THREE.Mesh(G(new THREE.CircleGeometry(1.66, seg).rotateX(Math.PI)), steel);
    under.position.z = -0.12;
    plate.add(top, wall, under);
    const jewelSpots: [number, number][] = [
      [0.66, 0.5],
      [0.86, -0.22],
      [0.52, -0.72],
      [-0.62, -0.7],
      [-0.5, 0.55],
      [0, 0],
    ];
    for (const [x, y] of jewelSpots) addJewel(plate, x, y, -0.04, 0.8);
    for (const a of [20, 110, 200, 290]) addScrew(plate, Math.cos(deg(a)) * 1.5, Math.sin(deg(a)) * 1.5, -0.04, 0.9);
  }

  // ---------- gear train ----------
  const gears = new THREE.Group();
  const spinners: { obj: THREE.Object3D; speed: number }[] = [];
  const addGear = (
    x: number,
    y: number,
    z: number,
    teeth: number,
    rTip: number,
    depth: number,
    spokes: number,
    mat: THREE.Material,
    speed: number,
    pointed = false,
  ) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    const wheel = new THREE.Mesh(
      G(extrude(gearShape(teeth, rTip, depth, spokes, Math.max(0.06, rTip * 0.2), rTip * 0.1, pointed), 0.028, 0.004, 10)),
      mat,
    );
    wheel.position.z = z;
    const hub = new THREE.Mesh(G(new THREE.CylinderGeometry(rTip * 0.16, rTip * 0.16, 0.05, 20).rotateX(Math.PI / 2)), steel);
    hub.position.z = z + 0.03;
    const ax = new THREE.Mesh(arbor, steel);
    ax.position.z = 0.07;
    g.add(wheel, hub, ax);
    gears.add(g);
    spinners.push({ obj: g, speed });
    return g;
  };
  addGear(0, 0, 0.05, 60, 0.52, 0.035, 4, brass, 0.05);
  addGear(0.66, 0.5, 0.015, 54, 0.42, 0.032, 5, brass, -0.16);
  addGear(0.86, -0.22, 0.05, 48, 0.36, 0.03, 4, brass, 0.5);
  const escape = addGear(0.52, -0.72, 0.015, 15, 0.21, 0.06, 4, steel, 0);
  // barrel: toothed ring + drum
  {
    const g = new THREE.Group();
    g.position.set(-0.5, 0.55, 0);
    const ring = new THREE.Mesh(G(extrude(gearShape(72, 0.66, 0.035, 0, 0, 0), 0.03, 0.004, 10)), brass);
    ring.position.z = -0.03;
    const drumWall = new THREE.Mesh(
      G(
        revolve(
          [
            [
              [0.58, 0.0],
              [0.58, 0.09],
            ],
            [
              [0.58, 0.09],
              [0.55, 0.105],
            ],
          ],
          Math.round(seg * 0.6),
        ),
      ),
      brass,
    );
    const lid = new THREE.Mesh(G(polarDisc(0, 0.55, Math.round(seg * 0.6), 2)), brassBrushed);
    lid.position.z = 0.105;
    g.add(ring, drumWall, lid);
    gears.add(g);
    spinners.push({ obj: g, speed: -0.02 });
  }
  // pallet fork
  {
    const fork = new THREE.Mesh(G(new THREE.BoxGeometry(0.62, 0.045, 0.02)), steel);
    fork.position.set(-0.02, -0.72, 0.05);
    const pivot = new THREE.Mesh(G(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16).rotateX(Math.PI / 2)), steel);
    pivot.position.set(0.08, -0.72, 0.06);
    gears.add(fork, pivot);
    addJewel(gears, 0.08, -0.72, 0.07, 0.6);
  }
  // balance wheel + hairspring
  const balance = new THREE.Group();
  balance.position.set(-0.62, -0.7, 0.07);
  {
    const rimShape = new THREE.Shape();
    rimShape.absarc(0, 0, 0.44, 0, Math.PI * 2, false);
    rimShape.holes.push(circleHole(0, 0, 0.375));
    const rim = new THREE.Mesh(G(extrude(rimShape, 0.045, 0.008, 40)), gold);
    balance.add(rim);
    const armGeo = G(new THREE.BoxGeometry(0.78, 0.05, 0.022));
    for (const a of [0, Math.PI / 2]) {
      const arm = new THREE.Mesh(armGeo, gold);
      arm.rotation.z = a;
      arm.position.z = 0.02;
      balance.add(arm);
    }
    // timing weights on the rim
    const w = G(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12).rotateX(Math.PI / 2));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const m = new THREE.Mesh(w, steel);
      m.position.set(Math.cos(a) * 0.405, Math.sin(a) * 0.405, 0.055);
      balance.add(m);
    }
    const hubB = new THREE.Mesh(G(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16).rotateX(Math.PI / 2)), steel);
    hubB.position.z = 0.03;
    balance.add(hubB);
    gears.add(balance);
  }
  const spring = (() => {
    const pts: THREE.Vector3[] = [];
    const turns = 9;
    const n = 360;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const a = t * turns * Math.PI * 2;
      const r = 0.05 + t * 0.24;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    const line = new THREE.Line(G(new THREE.BufferGeometry().setFromPoints(pts)), springMat);
    line.position.set(-0.62, -0.7, 0.135);
    gears.add(line);
    return line;
  })();

  // ---------- bridges ----------
  const bridges = new THREE.Group();
  const Z_BR = 0.145;
  const bridgeMats = [rhodiumStriped, anglage];
  const addBridge = (shape: THREE.Shape) => {
    const m = new THREE.Mesh(G(extrude(shape, 0.045, 0.014, Math.round(40 * detail) + 8)), bridgeMats);
    m.position.z = Z_BR;
    bridges.add(m);
    return m;
  };
  const TOP = Z_BR + 0.045 + 0.014;
  {
    // barrel bridge
    const a = sectorPath(new THREE.Shape(), 0.47, 1.6, deg(101), deg(189));
    a.holes.push(circleHole(-1.02, 0.12, 0.13));
    addBridge(a);
    // balance cock
    const capsule = (ax: number, ay: number, bx: number, by: number, wa: number, wb: number) => {
      const s = new THREE.Shape();
      const phi = Math.atan2(by - ay, bx - ax);
      s.absarc(bx, by, wb / 2, phi - Math.PI / 2, phi + Math.PI / 2, false);
      s.absarc(ax, ay, wa / 2, phi + Math.PI / 2, phi + Math.PI * 1.5, false);
      s.closePath();
      return s;
    };
    addBridge(capsule(-1.3, -0.62, -0.62, -0.7, 0.42, 0.28));
    addBridge(capsule(1.0, -1.04, 0.52, -0.72, 0.3, 0.2));
    // finger bridges for the centre, third and fourth wheels
    addBridge(capsule(0.55, 1.33, 0, 0, 0.46, 0.3));
    addBridge(capsule(1.25, 0.72, 0.66, 0.5, 0.4, 0.26));
    addBridge(capsule(1.36, -0.45, 0.86, -0.22, 0.4, 0.26));

    // jewels
    addJewel(bridges, 0.66, 0.5, TOP);
    addJewel(bridges, 0.86, -0.22, TOP);
    addJewel(bridges, 0, 0, TOP, 1.2);
    addJewel(bridges, -0.62, -0.7, TOP, 1.15);
    addJewel(bridges, 0.52, -0.72, TOP, 0.8);
    addJewel(bridges, -0.2, 0.92, TOP, 0.85);
    // screws
    const screws: [number, number][] = [
      [Math.cos(deg(98)) * 1.42, Math.sin(deg(98)) * 1.42],
      [Math.cos(deg(180)) * 1.42, Math.sin(deg(180)) * 1.42],
      [Math.cos(deg(150)) * 0.66, Math.sin(deg(150)) * 0.66],
      [0.55, 1.33],
      [1.25, 0.72],
      [1.36, -0.45],
      [-1.32, -0.62],
      [1.02, -1.05],
    ];
    for (const [x, y] of screws) addScrew(bridges, x, y, TOP);

    // regulator on the balance cock
    const reg = new THREE.Mesh(G(new THREE.BoxGeometry(0.34, 0.03, 0.012)), steel);
    reg.position.set(-0.78, -0.69, TOP + 0.008);
    reg.rotation.z = 0.35;
    bridges.add(reg);

    // ratchet wheel + crown wheel on the barrel bridge
    const ratchet = new THREE.Group();
    ratchet.position.set(-0.5, 0.55, TOP);
    const rw = new THREE.Mesh(G(extrude(gearShape(44, 0.43, 0.035, 0, 0, 0), 0.02, 0.004, 10)), steel);
    const rc = new THREE.Mesh(G(polarDisc(0.09, 0.37, Math.round(seg * 0.5), 2)), goldBrushed);
    rc.position.z = 0.0285;
    ratchet.add(rw, rc);
    addScrew(ratchet, 0, 0, 0.024, 1.5);
    bridges.add(ratchet);
    spinners.push({ obj: ratchet, speed: -0.02 });
    const crownW = new THREE.Group();
    crownW.position.set(-1.045, 0.865, TOP);
    crownW.add(new THREE.Mesh(G(extrude(gearShape(22, 0.21, 0.035, 0, 0, 0), 0.02, 0.004, 8)), steel));
    addScrew(crownW, 0, 0, 0.024, 1.1);
    bridges.add(crownW);
    spinners.push({ obj: crownW, speed: 0.041 });
  }

  // ---------- rotor ----------
  const rotor = new THREE.Group();
  const rotorSpin = new THREE.Group();
  rotor.add(rotorSpin);
  {
    const weight = new THREE.Mesh(
      G(extrude(sectorPath(new THREE.Shape(), 1.13, 1.62, deg(4), deg(176)), 0.075, 0.018, Math.round(60 * detail) + 8)),
      [goldBrushed, gold],
    );
    weight.position.z = -0.33;
    const plateShape = sectorPath(new THREE.Shape(), 0.2, 1.15, deg(6), deg(174));
    plateShape.holes.push(sectorPath(new THREE.Path(), 0.42, 0.95, deg(18), deg(62)));
    plateShape.holes.push(sectorPath(new THREE.Path(), 0.42, 0.95, deg(72), deg(108)));
    plateShape.holes.push(sectorPath(new THREE.Path(), 0.42, 0.95, deg(118), deg(162)));
    const web = new THREE.Mesh(G(extrude(plateShape, 0.026, 0.008, Math.round(48 * detail) + 8)), [rhodiumStriped, anglage]);
    web.position.z = -0.275;
    const hub = new THREE.Mesh(G(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 40).rotateX(Math.PI / 2)), steel);
    hub.position.z = -0.25;
    rotorSpin.add(weight, web, hub);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      addScrew(rotorSpin, Math.cos(a) * 0.15, Math.sin(a) * 0.15, -0.225, 0.7);
    }
    addJewel(rotorSpin, 0, 0, -0.225, 0.7);
  }

  let escStep = 0;
  return {
    bridges,
    gears,
    plate,
    rotor,
    update(t: number) {
      for (const s of spinners) s.obj.rotation.z = t * s.speed * Math.PI * 2;
      // balance: 3 Hz, wide amplitude; escape wheel advances one tooth per beat
      const beat = Math.sin(t * Math.PI * 2 * 3);
      balance.rotation.z = beat * 2.2;
      const sc = 1 + beat * 0.07;
      spring.scale.set(sc, sc, 1);
      spring.rotation.z = beat * 0.9;
      escStep = Math.floor(t * 6);
      escape.rotation.z = -(escStep / 15) * Math.PI * 2;
      rotorSpin.rotation.z = Math.sin(t * 0.45) * 1.1 + t * 0.12;
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      texs.forEach((x) => x.dispose());
    },
  };
}
