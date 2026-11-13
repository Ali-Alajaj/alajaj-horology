import * as THREE from 'three';

/**
 * Procedural product-studio environment (no remote HDRI): a dark room with
 * soft boxes, strip lights and a warm rim, baked to a PMREM cube map.
 */
export function createStudioEnv(renderer: THREE.WebGLRenderer): { texture: THREE.Texture; dispose(): void } {
  const scene = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];

  const room = new THREE.Mesh(
    new THREE.SphereGeometry(30, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {},
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vDir;
        void main(){
          float up = smoothstep(-0.6, 1.0, vDir.y);
          vec3 low = vec3(0.012, 0.022, 0.018);
          vec3 high = vec3(0.07, 0.085, 0.08);
          vec3 col = mix(low, high, up);
          // faint warm horizon band keeps polished metal from going dead black
          col += vec3(0.05, 0.04, 0.025) * exp(-pow(vDir.y * 4.0, 2.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  scene.add(room);
  disposables.push(room.geometry, room.material as THREE.Material);

  const panel = (
    w: number,
    h: number,
    color: number,
    intensity: number,
    pos: [number, number, number],
    target: [number, number, number] = [0, 0, 0],
  ) => {
    const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false });
    mat.color.multiplyScalar(intensity);
    const geo = new THREE.PlaneGeometry(w, h);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.lookAt(...target);
    scene.add(m);
    disposables.push(geo, mat);
  };

  // key soft box, upper front-left
  panel(12, 8, 0xfff4e2, 5, [-9, 11, 10]);
  // overhead fill
  panel(16, 10, 0xeaf0ff, 3.2, [2, 16, 0]);
  // long strip lights for crisp edge highlights
  panel(1.4, 20, 0xffffff, 16, [13, 3, 6]);
  panel(1.0, 18, 0xffffff, 12, [-14, 1, 3]);
  panel(18, 0.9, 0xffffff, 10, [0, 6, 14]);
  // warm rim from behind
  panel(10, 6, 0xffc988, 6, [8, 5, -13]);
  panel(6, 10, 0xc9a86a, 4, [-11, -3, -10]);
  // low bounce
  panel(20, 12, 0x77807c, 0.55, [0, -12, 4]);
  // small sparkle sources
  panel(1.2, 1.2, 0xffffff, 40, [5, 12, 9]);
  panel(0.9, 0.9, 0xfff0d0, 36, [-4, 5, 15]);
  panel(0.8, 0.8, 0xffffff, 30, [10, -2, 11]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return { texture: rt.texture, dispose: () => rt.dispose() };
}
