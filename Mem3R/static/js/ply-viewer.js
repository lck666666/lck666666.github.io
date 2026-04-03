import * as THREE from 'three';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Shared camera & controls state ──────────────────────────────────────────
const sharedCamera = new THREE.PerspectiveCamera(60, 1, 0.01, 2000);
sharedCamera.position.set(0, 0, 3);

// ── Per-side setup ───────────────────────────────────────────────────────────
function makeViewer(canvasId, loadingId) {
  const canvas  = document.getElementById(canvasId);
  const loading = document.getElementById(loadingId);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xffffff);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.add(new THREE.AmbientLight(0xffffff, 2));

  return { canvas, loading, renderer, scene };
}

const left  = makeViewer('canvas-left',  'loading-left');
const right = makeViewer('canvas-right', 'loading-right');

// ── Shared OrbitControls (drives the shared camera) ─────────────────────────
// Attach controls to the LEFT canvas; mirror to right via sync
const controls = new OrbitControls(sharedCamera, left.canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.rotateSpeed   = 1.0;
controls.panSpeed      = 1.0;
controls.zoomSpeed     = 1.5;
controls.screenSpacePanning = true;

// Mirror orbit events from RIGHT canvas to shared controls
(function mirrorRightToControls() {
  const rc = right.canvas;
  let dragging = false;
  let lastX = 0, lastY = 0;
  let isRight = false;

  rc.addEventListener('mousedown', e => {
    dragging  = true;
    isRight   = (e.button === 2);
    lastX     = e.clientX;
    lastY     = e.clientY;
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;

    if (isRight) {
      // Pan: move target
      const panVec = new THREE.Vector3();
      const right3 = new THREE.Vector3();
      const up3    = new THREE.Vector3();
      right3.crossVectors(sharedCamera.getWorldDirection(panVec), sharedCamera.up).normalize();
      up3.copy(sharedCamera.up).normalize();
      const dist = sharedCamera.position.distanceTo(controls.target);
      const scale = dist * Math.tan(sharedCamera.fov * 0.5 * Math.PI / 180) * 2 / rc.clientHeight;
      controls.target.addScaledVector(right3, -dx * scale);
      controls.target.addScaledVector(up3, dy * scale);
    } else {
      // Orbit: rotate spherical
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(sharedCamera.position.clone().sub(controls.target));
      spherical.theta -= dx * 0.005;
      spherical.phi   -= dy * 0.005;
      spherical.phi    = Math.max(0.05, Math.min(Math.PI - 0.05, spherical.phi));
      const newPos = new THREE.Vector3().setFromSpherical(spherical).add(controls.target);
      sharedCamera.position.copy(newPos);
    }
    controls.update();
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  rc.addEventListener('wheel', e => {
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const dir = sharedCamera.position.clone().sub(controls.target);
    dir.multiplyScalar(factor);
    sharedCamera.position.copy(controls.target.clone().add(dir));
    controls.update();
    e.preventDefault();
  }, { passive: false });
  rc.addEventListener('contextmenu', e => e.preventDefault());
})();

// ── Resize both canvases ─────────────────────────────────────────────────────
function resizeBoth() {
  for (const v of [left, right]) {
    const w = v.canvas.parentElement.clientWidth;
    const h = v.canvas.parentElement.clientHeight;
    if (w === 0 || h === 0) continue;
    v.renderer.setSize(w, h, false);
  }
  const w = left.canvas.parentElement.clientWidth;
  const h = left.canvas.parentElement.clientHeight;
  if (w && h) {
    sharedCamera.aspect = w / h;
    sharedCamera.updateProjectionMatrix();
  }
}
window.addEventListener('resize', resizeBoth);

// ── PLY load helper ──────────────────────────────────────────────────────────
const loader = new PLYLoader();
let currentPoints = { left: null, right: null };

function loadPLY(url, viewer, side) {
  viewer.loading.style.display = 'flex';

  loader.load(url,
    (geo) => {
      geo.computeBoundingBox();
      const box    = geo.boundingBox;
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size   = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      geo.translate(-center.x, -center.y, -center.z);

      // Flip upright: PLY Y-axis is often inverted relative to Three.js
      geo.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI));

      const hasColor = geo.hasAttribute('color');
      const ptSize   = Math.max(maxDim * 0.003, 0.006);
      const mat = new THREE.PointsMaterial({
        size: ptSize, sizeAttenuation: true,
        vertexColors: hasColor,
        color: hasColor ? 0xffffff : 0x4488ff,
      });
      const pts = new THREE.Points(geo, mat);

      // Remove old
      if (currentPoints[side]) viewer.scene.remove(currentPoints[side]);
      currentPoints[side] = pts;
      viewer.scene.add(pts);

      // Fit camera only on first full load (left side drives fit)
      if (side === 'left') {
        // Slightly elevated angle for a natural top-down-ish view
        sharedCamera.position.set(0, maxDim * 0.6, maxDim * 2.0);
        controls.target.set(0, 0, 0);
        controls.maxDistance = maxDim * 15;
        controls.minDistance = maxDim * 0.03;
        controls.update();
      }
      viewer.loading.style.display = 'none';
    },
    (xhr) => {
      const pct = xhr.total ? Math.round(xhr.loaded / xhr.total * 100) : '…';
      viewer.loading.querySelector('span').textContent = `Loading… ${pct}%`;
    },
    (err) => {
      console.error(err);
      viewer.loading.querySelector('span').textContent = 'Failed to load.';
    }
  );
}

// ── Scene switcher ───────────────────────────────────────────────────────────
const thumbs = document.querySelectorAll('.scene-thumb');
const compImg = document.getElementById('comparison-image');

function loadScene(thumb) {
  thumbs.forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
  loadPLY(thumb.dataset.left,  left,  'left');
  loadPLY(thumb.dataset.right, right, 'right');
  if (compImg && thumb.dataset.image) compImg.src = thumb.dataset.image;
}

thumbs.forEach(t => t.addEventListener('click', () => loadScene(t)));

// Load initial scene
const firstThumb = document.querySelector('.scene-thumb');
if (firstThumb) loadScene(firstThumb);

// ── Render loop ──────────────────────────────────────────────────────────────
resizeBoth();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  left.renderer.render(left.scene, sharedCamera);
  right.renderer.render(right.scene, sharedCamera);
}
animate();
