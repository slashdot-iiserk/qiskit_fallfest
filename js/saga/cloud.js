/**
 * One particle system for the whole saga.
 *
 * Every point knows four places it can be — a point on the line drawing, a
 * point on the machine's surface, a point on the qubit's sphere, and a point in
 * the register button — and three uniforms slide between them in order. That is
 * why the drawing can disintegrate into the machine and the machine into a
 * qubit without anything ever cross-fading: it is the same fourteen thousand
 * points the entire way down the page.
 *
 * The drawing and the button face the camera, so their positions live in world
 * space. The machine and the sphere turn with the model, so theirs live in the
 * pivot's space and are transformed in the shader by `uPivot`.
 */

import { SPHERE_R, SPHERE_X, SPHERE_Y } from './timeline.js';

const VERTEX = `
  attribute vec3 aDraw;
  attribute vec3 aModel;
  attribute vec3 aSphere;
  attribute vec3 aButton;
  attribute float aSeed;

  uniform mat4 uPivot;
  uniform vec3 uSphereCentre;
  uniform float uDraw;    // drawing -> machine
  uniform float uSphere;  // machine -> qubit
  uniform float uButton;  // qubit  -> button
  uniform float uSize;
  uniform float uProj;
  uniform float uTime;
  uniform vec2 uFog;          // near, far

  varying float vPhase;
  varying float vFog;
  varying float vSeed;

  // Each point sets off at its own moment, so a change sweeps through the
  // cloud instead of every particle moving at once.
  float staggered(float t, float seed, float spread) {
    float delay = seed * spread;
    float k = clamp((t - delay) / max(0.0001, 1.0 - delay), 0.0, 1.0);
    return k * k * (3.0 - 2.0 * k);
  }

  void main() {
    vec3 model  = (uPivot * vec4(aModel, 1.0)).xyz;
    vec3 sphere = (uPivot * vec4(aSphere + uSphereCentre, 1.0)).xyz;

    float t1 = staggered(uDraw, aSeed, 0.55);
    // Bow the path outward so the drawing bursts rather than sliding, and add
    // a little curl per point so the burst is a scatter, not a fan.
    vec3 lift = normalize(vec3(aDraw.x, aDraw.y, 1.0)) * 0.5 * sin(t1 * 3.14159);
    float swirl = sin(t1 * 3.14159);
    vec3 curl = vec3(
      sin(aSeed * 61.0 + uTime * 0.6),
      cos(aSeed * 43.0 + uTime * 0.5),
      sin(aSeed * 29.0)
    ) * 0.13 * swirl;   // enough to scatter, little enough to stay legible
    vec3 p = mix(aDraw, model, t1) + (lift + curl) * (1.0 - abs(t1 * 2.0 - 1.0));

    float t2 = staggered(uSphere, aSeed, 0.45);
    p = mix(p, sphere, t2);

    float t3 = staggered(uButton, aSeed, 0.35);
    p = mix(p, aButton, t3);

    // A slow shimmer while the cloud is holding a shape, so a settled sphere
    // still breathes instead of freezing into a texture.
    float held = min(t2, 1.0 - t3);
    float idle = 0.0035 + held * 0.006;
    p += vec3(
      sin(uTime * 0.7 + aSeed * 40.0),
      cos(uTime * 0.6 + aSeed * 31.0),
      sin(uTime * 0.5 + aSeed * 53.0)
    ) * idle;

    vPhase = max(t2, t3);
    vSeed = aSeed;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = -mv.z;

    // Depth carries the volume: nearer points are bigger and brighter, so a
    // shell of particles reads as a sphere rather than a flat disc of dots.
    vFog = 1.0 - clamp((depth - uFog.x) / max(0.001, uFog.y - uFog.x), 0.0, 1.0);

    // A little spread in size, or every point looks stamped from the same die.
    float scale = 0.65 + aSeed * 0.8;
    gl_PointSize = clamp(uSize * scale * uProj / max(0.15, depth), 1.0, 7.0);
    gl_Position = projectionMatrix * mv;
  }`;

const FRAGMENT = `
  uniform vec3 uColor;
  uniform vec3 uTip;
  uniform float uOpacity;
  varying float vPhase;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if (r > 0.25) discard;
    float edge = smoothstep(0.25, 0.02, r);
    gl_FragColor = vec4(mix(uColor, uTip, vPhase * 0.22), edge * uOpacity);
  }`;

/**
 * @param {object} THREE
 * @param {object} wrap    the group holding the normalised model
 * @param {object} outline {points: Float32Array(count*2), aspect} from js/assets.js
 */
export function buildCloud(THREE, wrap, outline) {
  const COUNT = outline ? outline.count : 12000;

  const aDraw = new Float32Array(COUNT * 3);
  const aModel = new Float32Array(COUNT * 3);
  const aSphere = new Float32Array(COUNT * 3);
  const aButton = new Float32Array(COUNT * 3);
  const aSeed = new Float32Array(COUNT);

  /* --- Where the machine is ------------------------------------------- */
  const tris = collectTriangles(THREE, wrap);
  const totalArea = tris.reduce((a, t) => a + t[3], 0) || 1;

  for (let i = 0; i < COUNT; i += 1) {
    // Area-weighted pick, then a uniform point inside that triangle.
    let target = Math.random() * totalArea;
    let t = tris[0];
    for (const tri of tris) { target -= tri[3]; if (target <= 0) { t = tri; break; } }
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    aModel[i * 3] = t[0].x + u * (t[1].x - t[0].x) + v * (t[2].x - t[0].x);
    aModel[i * 3 + 1] = t[0].y + u * (t[1].y - t[0].y) + v * (t[2].y - t[0].y);
    aModel[i * 3 + 2] = t[0].z + u * (t[1].z - t[0].z) + v * (t[2].z - t[0].z);

    // Fibonacci sphere about the origin; where it actually sits is a uniform,
    // so the particles and the qubit's rings can never drift apart.
    const k = i + 0.5;
    const phi = Math.acos(1 - (2 * k) / COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * k;
    aSphere[i * 3] = SPHERE_R * Math.cos(theta) * Math.sin(phi);
    aSphere[i * 3 + 1] = SPHERE_R * Math.cos(phi);
    aSphere[i * 3 + 2] = SPHERE_R * Math.sin(theta) * Math.sin(phi);

    aSeed[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(aModel.slice(), 3));
  geometry.setAttribute('aDraw', new THREE.BufferAttribute(aDraw, 3));
  geometry.setAttribute('aModel', new THREE.BufferAttribute(aModel, 3));
  geometry.setAttribute('aSphere', new THREE.BufferAttribute(aSphere, 3));
  geometry.setAttribute('aButton', new THREE.BufferAttribute(aButton, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Normal blending: fourteen thousand points converging on one small sphere
    // will always overdraw, and additive turns that into a white disc.
    blending: THREE.NormalBlending,
    uniforms: {
      uPivot: { value: new THREE.Matrix4() },
      uSphereCentre: { value: new THREE.Vector3(SPHERE_X, SPHERE_Y, 0) },
      uDraw: { value: 0 },
      uSphere: { value: 0 },
      uButton: { value: 0 },
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      // A world radius, not a pixel count: uProj converts it to pixels per unit
      // of depth so the points keep a constant real size.
      // Slightly larger on a phone: the same world radius covers far fewer
      // pixels there, and the shatter was reading as dust rather than a drawing.
      uSize: { value: window.matchMedia('(pointer: coarse)').matches ? 0.0055 : 0.0042 },
      uProj: { value: 700 },
      uFog: { value: new THREE.Vector2(2, 8) },
      uColor: { value: new THREE.Color(0xe8c87a) },
      uTip: { value: new THREE.Color(0xff7eb6) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;

  /**
   * Lay the drawing out on a plane facing the camera, exactly two world units
   * tall — the machine's own height — so the outline sits over the machine it
   * was traced from and the particles never have to travel far sideways.
   */
  function layoutDrawing(planeZ) {
    if (!outline) {
      aDraw.set(aModel);
    } else {
      const { points: pts } = outline;
      for (let i = 0; i < COUNT; i += 1) {
        aDraw[i * 3] = pts[i * 2] * 2;
        aDraw[i * 3 + 1] = pts[i * 2 + 1] * 2;
        aDraw[i * 3 + 2] = planeZ;
      }
    }
    geometry.getAttribute('aDraw').needsUpdate = true;
  }

  /** The button is a filled rounded rectangle facing the camera. */
  function layoutButton(width, height, centre) {
    const radius = Math.min(width, height) * 0.5;
    for (let i = 0; i < COUNT; i += 1) {
      let x = 0;
      let y = 0;
      // Rejection-sample a rounded rect; it converges in one or two tries.
      for (let attempt = 0; attempt < 6; attempt += 1) {
        x = (Math.random() - 0.5) * width;
        y = (Math.random() - 0.5) * height;
        const dx = Math.max(0, Math.abs(x) - (width / 2 - radius));
        const dy = Math.max(0, Math.abs(y) - (height / 2 - radius));
        if (dx * dx + dy * dy <= radius * radius) break;
      }
      aButton[i * 3] = centre.x + x;
      aButton[i * 3 + 1] = centre.y + y;
      aButton[i * 3 + 2] = centre.z;
    }
    geometry.getAttribute('aButton').needsUpdate = true;
  }

  return {
    points,
    material,
    layoutDrawing,
    layoutButton,
    setProjection(pixelsPerUnit) { material.uniforms.uProj.value = pixelsPerUnit; },
    update({ pivotMatrix, sphereCentre, draw, sphere, button, opacity, time, fog }) {
      if (fog) material.uniforms.uFog.value.set(fog.near, fog.far);
      material.uniforms.uPivot.value.copy(pivotMatrix);
      if (sphereCentre) material.uniforms.uSphereCentre.value.copy(sphereCentre);
      material.uniforms.uDraw.value = draw;
      material.uniforms.uSphere.value = sphere;
      material.uniforms.uButton.value = button;
      material.uniforms.uOpacity.value = opacity;
      material.uniforms.uTime.value = time;
      points.visible = opacity > 0.004;
    },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

/** Every triangle of the model, in the normalised space the camera works in. */
function collectTriangles(THREE, wrap) {
  wrap.updateMatrixWorld(true);
  const tris = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  wrap.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes.position) return;
    const geo = o.geometry;
    const pos = geo.attributes.position;
    const index = geo.getIndex();
    const count = index ? index.count : pos.count;
    // Cap the work: a few thousand triangles is plenty to sample a surface.
    const step = Math.max(3, Math.floor(count / 3 / 4000) * 3);
    for (let i = 0; i + 2 < count; i += step) {
      const i0 = index ? index.getX(i) : i;
      const i1 = index ? index.getX(i + 1) : i + 1;
      const i2 = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).length() * 0.5;
      if (area > 0) tris.push([a.clone(), b.clone(), c.clone(), area]);
    }
  });
  return tris.length ? tris : [[
    new THREE.Vector3(-1, -1, 0), new THREE.Vector3(1, -1, 0), new THREE.Vector3(0, 1, 0), 1,
  ]];
}
