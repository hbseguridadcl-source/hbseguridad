import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const GOLD     = 0xd8cc1a;
const GOLD_DIM = 0xb0a614;

// ─── Renderer ────────────────────────────────────────────────────
const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ─── Scene / Camera ──────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 6;

// ─── Pivot (mouse parallax) ───────────────────────────────────────
const pivot = new THREE.Group();
scene.add(pivot);

// ─── Particles ───────────────────────────────────────────────────
const PARTICLE_COUNT = 1800;
const pPositions = new Float32Array(PARTICLE_COUNT * 3);
for (let i = 0; i < PARTICLE_COUNT; i++) {
  pPositions[i * 3]     = (Math.random() - 0.5) * 28;
  pPositions[i * 3 + 1] = (Math.random() - 0.5) * 28;
  pPositions[i * 3 + 2] = (Math.random() - 0.5) * 28;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
const pMat = new THREE.PointsMaterial({
  size: 0.026,
  color: GOLD,
  transparent: true,
  opacity: 0.35,
  sizeAttenuation: true,
});
const particles = new THREE.Points(pGeo, pMat);
pivot.add(particles);

// ─── Central globe (geodesic wireframe — surveillance sphere) ─────
const globeGeo = new THREE.IcosahedronGeometry(1.1, 3);
const globeMat = new THREE.MeshBasicMaterial({
  color: GOLD,
  wireframe: true,
  transparent: true,
  opacity: 0.22,
});
const globe = new THREE.Mesh(globeGeo, globeMat);
pivot.add(globe);

// Faint solid core
const coreMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1.06, 32, 32),
  new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.03 })
);
pivot.add(coreMesh);

// ─── Orbital rings (satellite / surveillance orbits) ──────────────
function makeRing(radius, tube, color, opacity) {
  const geo = new THREE.TorusGeometry(radius, tube, 8, 220);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  return new THREE.Mesh(geo, mat);
}

const ringEq     = makeRing(1.62, 0.007, GOLD,     0.75); // equatorial
const ringP1     = makeRing(1.62, 0.004, GOLD,     0.45); // polar 1
const ringP2     = makeRing(1.62, 0.004, GOLD_DIM, 0.30); // polar 2
const ringOrbit  = makeRing(2.55, 0.006, GOLD,     0.40); // outer orbit

ringP1.rotation.x = Math.PI / 2;
ringP2.rotation.x = Math.PI / 3;
ringP2.rotation.z = Math.PI / 6;
pivot.add(ringEq, ringP1, ringP2, ringOrbit);

// ─── Orbit dots on outer ring ─────────────────────────────────────
const dotGeo = new THREE.SphereGeometry(0.022, 8, 8);
const dotMat = new THREE.MeshBasicMaterial({ color: GOLD });
const orbitGroup = new THREE.Group();
for (let i = 0; i < 6; i++) {
  const dot = new THREE.Mesh(dotGeo, dotMat);
  const angle = (i / 6) * Math.PI * 2;
  dot.position.set(Math.cos(angle) * 2.55, Math.sin(angle) * 2.55, 0);
  orbitGroup.add(dot);
}
pivot.add(orbitGroup);

// ─── Network nodes (surveillance nodes) ──────────────────────────
const nodePositions = [
  [ 2.1,  1.4,  0.5], [-1.9,  1.1,  0.9],
  [ 2.0, -1.1, -0.6], [-1.6, -1.7,  0.7],
  [ 0.4,  2.1, -1.4], [-0.7, -1.4,  2.0],
];
const nGeo = new THREE.SphereGeometry(0.038, 8, 8);
const nMat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.9 });
const nodeGroup = new THREE.Group();
nodePositions.forEach(pos => {
  const n = new THREE.Mesh(nGeo, nMat);
  n.position.set(...pos);
  nodeGroup.add(n);
});
pivot.add(nodeGroup);

// Connecting lines between nodes
const lineMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.12 });
[[0,1],[1,4],[2,3],[3,5],[0,2],[4,5]].forEach(([a, b]) => {
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...nodePositions[a]),
    new THREE.Vector3(...nodePositions[b]),
  ]);
  pivot.add(new THREE.Line(geo, lineMat));
});

// ─── Scan pulse (radar ping) ──────────────────────────────────────
function spawnPulse() {
  const geo = new THREE.TorusGeometry(1.1, 0.007, 8, 120);
  const mat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55 });
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.random() * Math.PI;
  ring.rotation.y = Math.random() * Math.PI;
  pivot.add(ring);
  gsap.to(ring.scale, { x: 3.8, y: 3.8, z: 3.8, duration: 2.8, ease: 'power2.out' });
  gsap.to(mat, {
    opacity: 0,
    duration: 2.8,
    ease: 'power2.out',
    onComplete() {
      pivot.remove(ring);
      geo.dispose();
      mat.dispose();
    },
  });
}

function schedulePulse() {
  spawnPulse();
  gsap.delayedCall(3.5, schedulePulse);
}
gsap.delayedCall(0.8, schedulePulse);

// ─── Animation loop ───────────────────────────────────────────────
let t = 0;

function tick() {
  requestAnimationFrame(tick);
  t += 0.008;

  globe.rotation.y     =  t * 0.09;
  globe.rotation.x     =  Math.sin(t * 0.13) * 0.04;

  ringEq.rotation.z    =  t * 0.10;
  ringP1.rotation.z    = -t * 0.15;
  ringP2.rotation.z    =  t * 0.09;
  ringP2.rotation.y    = -t * 0.05;
  ringOrbit.rotation.z =  t * 0.07;
  ringOrbit.rotation.x =  Math.sin(t * 0.14) * 0.05;

  orbitGroup.rotation.z = t * 0.07;
  nodeGroup.rotation.y  = t * 0.04;

  // Particle drift (slow downfall)
  const pos = pGeo.attributes.position;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    pos.array[i * 3 + 1] -= 0.003;
    if (pos.array[i * 3 + 1] < -14) pos.array[i * 3 + 1] = 14;
  }
  pos.needsUpdate = true;

  renderer.render(scene, camera);
}

tick();

// ─── Scroll: rings expand & fade ─────────────────────────────────
const scrollTL = gsap.timeline({
  scrollTrigger: {
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 1.8,
  },
});

scrollTL
  .to(ringEq.scale,       { x: 3.5, y: 3.5, z: 3.5 }, 0)
  .to(ringEq.material,    { opacity: 0 }, 0)
  .to(ringP1.scale,       { x: 3.0, y: 3.0, z: 3.0 }, 0)
  .to(ringP1.material,    { opacity: 0 }, 0)
  .to(ringP2.scale,       { x: 2.8, y: 2.8, z: 2.8 }, 0)
  .to(ringP2.material,    { opacity: 0 }, 0)
  .to(ringOrbit.scale,    { x: 4.2, y: 4.2, z: 4.2 }, 0)
  .to(ringOrbit.material, { opacity: 0 }, 0)
  .to(globeMat,           { opacity: 0.07 }, 0)
  .to(pMat,               { opacity: 0.07 }, 0)
  .to(camera.position,    { z: 3.5 }, 0);

// ─── Scroll: hero content drifts up ──────────────────────────────
gsap.to('.hero-content', {
  scrollTrigger: { trigger: '#hero', start: 'top top', end: '55% top', scrub: 1.2 },
  y: -70,
  opacity: 0,
});

gsap.to('.scroll-cue', {
  scrollTrigger: { trigger: '#hero', start: 'top top', end: '25% top', scrub: 1 },
  opacity: 0,
  y: 18,
});

// ─── Stats: count up ─────────────────────────────────────────────
document.querySelectorAll('.stat-number').forEach(el => {
  const target = parseInt(el.dataset.target, 10);
  gsap.to(el, {
    scrollTrigger: { trigger: el.closest('.stat-item'), start: 'top 82%', once: true },
    innerHTML: target,
    duration: 2,
    ease: 'power2.out',
    snap: { innerHTML: 1 },
    onUpdate() { el.innerHTML = Math.round(parseFloat(el.innerHTML)); },
  });
});

gsap.to('.stat-item', {
  scrollTrigger: { trigger: '.stats-section', start: 'top 80%', once: true },
  opacity: 1,
  y: 0,
  duration: 0.85,
  stagger: 0.14,
  ease: 'power3.out',
});

// ─── Service cards ────────────────────────────────────────────────
gsap.to('.service-card', {
  scrollTrigger: { trigger: '.services-grid', start: 'top 75%', once: true },
  opacity: 1,
  y: 0,
  duration: 0.9,
  stagger: 0.2,
  ease: 'power3.out',
});

// ─── Team cards ───────────────────────────────────────────────────
gsap.to('.team-card', {
  scrollTrigger: { trigger: '.team-grid', start: 'top 75%', once: true },
  opacity: 1,
  y: 0,
  duration: 0.9,
  stagger: 0.2,
  ease: 'power3.out',
});

// ─── CTA section ─────────────────────────────────────────────────
gsap.from('.cta-inner', {
  scrollTrigger: { trigger: '.cta-section', start: 'top 75%', once: true },
  y: 50,
  opacity: 0,
  duration: 1.1,
  ease: 'power3.out',
});

// ─── Entrance sequence ───────────────────────────────────────────
const enter = gsap.timeline({ delay: 0.3 });
enter
  .to('.overline',         { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
  .to('.hero-title .line', { opacity: 1, y: 0, duration: 0.9, stagger: 0.18, ease: 'power3.out' }, '-=0.45')
  .to('.hero-desc',        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.45')
  .to('.cta-group',        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.4')
  .to('.scroll-cue',       { opacity: 1, duration: 1,   ease: 'power3.out' }, '-=0.2');

// ─── Mouse parallax ───────────────────────────────────────────────
window.addEventListener('mousemove', e => {
  const mx = (e.clientX / window.innerWidth  - 0.5) * 0.4;
  const my = (e.clientY / window.innerHeight - 0.5) * 0.4;
  gsap.to(pivot.rotation, { x: my * 0.35, y: mx * 0.35, duration: 2.5, ease: 'power2.out' });
});

// ─── Resize ───────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
