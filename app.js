import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const SIDE_AREA = 3.6;
const MIN = 0;
const MAX = 10000;
const MIN_WIDTH = 1.5;
const MAX_WIDTH = 7.2;
const SMOOTH = 0.14;
const COLOR_TAU = 0.24;
const COLORS = [0xe39b3c, 0x3ea394, 0xd45a52, 0x4a6ad6];
const FACE_PARTS = ["h", "e", "n", "m"];
const SLIDER_META = [
  {
    key: "I",
    name: "Intelligence",
    hint: "※ 지능 수치를 과도하게 높일 경우, 전두부가 과도하게 커져 거만해질 수 있습니다.",
    tone: "red",
  },
  {
    key: "H",
    name: "Honor",
    hint: "※ 명예 수치를 과도하게 높일 경우, 눈매가 매서워져 타인을 내려다보는 시선이 강해질 수 있습니다.",
    tone: "yellow",
  },
  {
    key: "W",
    name: "Wealth",
    hint: "※ 재력 수치를 너무 과하게 높일 경우, 타인의 감정을 이해하기 어려워질 수 있습니다.",
    tone: "black",
  },
  {
    key: "L",
    name: "Love Luck",
    hint: "※ 애정운 수치를 너무 과하게 높일 경우, 정이 지나쳐 자신과 타인의 경계를 잃을 수 있습니다.",
    tone: "white",
  },
];
const SET_COUNT = 11;
const VERTICAL_FACES = [4, 0, 5, 1];
const SKIN_IMAGE = "img/lite/skin.png";
const HEAD_IMAGE = "img/lite/head.png";
const GRADE_STOPS = ["#3A0610", "#8D5145", "#E8A78C"];

const CAMERA_POS = new THREE.Vector3(6.4, 3.2, 8.4);
let viewScale = 1;

const canvas = document.getElementById("view");
const sliders = document.getElementById("sliders");
const sliderDock = document.getElementById("slider-dock");
const saveThumb = document.getElementById("save-thumb");
const judgmentCodeEl = document.getElementById("judgment-code");
const downloadButton = document.getElementById("download");
const refreshButton = document.getElementById("refresh");
const archiveOpenButton = document.getElementById("archive-open");
const archiveView = document.getElementById("archive");
const archiveGrid = document.getElementById("archive-grid");
const archiveEmpty = document.getElementById("archive-empty");
const siteSubtitle = document.getElementById("site-subtitle");
const SUBTITLE_MAIN = "The Four Aspects";
const toast = document.getElementById("toast");
const mailPop = document.getElementById("mail-pop");
const mailInput = document.getElementById("mail-input");
const mailSend = document.getElementById("mail-send");
const loadingEl = document.getElementById("loading");
let mailRecord = null;
const ARCHIVE_KEY = "faceJudgmentArchive";
const ARCHIVE_GEN = "archive-v4";
if (localStorage.getItem("faceJudgmentArchiveGen") !== ARCHIVE_GEN) {
  localStorage.removeItem(ARCHIVE_KEY);
  localStorage.setItem("faceJudgmentArchiveGen", ARCHIVE_GEN);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.copy(CAMERA_POS);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setClearColor(0xffffff, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 22;
controls.target.set(0, 1.6, 0);

scene.add(new THREE.AmbientLight(0xffffff, 1.35));

const key = new THREE.DirectionalLight(0xffffff, 0.4);
key.position.set(4, 8, 5);
key.castShadow = true;
key.shadow.radius = 8;
scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 0.95);
fill.position.set(-5, 2, -3);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.35);
rim.position.set(0, 3, -6);
scene.add(rim);

const group = new THREE.Group();
scene.add(group);

const loader = new THREE.TextureLoader();
THREE.Cache.enabled = true;
const textureCache = new Map();
const clock = new THREE.Clock();

const gradeUniforms = {
  tint: { value: new THREE.Vector3(0.79, 0.57, 0.49) },
  amount: { value: 0 },
};

const grade = { current: 0 };

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
  const x = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, x));
}

function hexToOklch(hex) {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16) / 255);
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16) / 255);
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16) / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b2 = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(a, b2), H: Math.atan2(b2, a) };
}

function oklchToLinear(L, C, H) {
  const a = C * Math.cos(H);
  const b2 = C * Math.sin(H);
  const l = L + 0.3963377774 * a + 0.2158037573 * b2;
  const m = L - 0.1055613458 * a - 0.0638541728 * b2;
  const s = L - 0.0894841775 * a - 1.291485548 * b2;
  const l3 = l * l * l;
  const m3 = m * m * m;
  const s3 = s * s * s;
  return [
    Math.max(0, +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3),
    Math.max(0, -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3),
    Math.max(0, -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3),
  ];
}

function lerpHue(h1, h2, t) {
  let d = h2 - h1;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return h1 + d * t;
}

const OKLCH_STOPS = GRADE_STOPS.map(hexToOklch);

function gradeLinear(normalized) {
  const t = Math.min(1, Math.max(0, normalized));
  const from = t < 0.5 ? OKLCH_STOPS[0] : OKLCH_STOPS[1];
  const to = t < 0.5 ? OKLCH_STOPS[1] : OKLCH_STOPS[2];
  const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const endBoost = t < 0.5 ? 1 - u : u;
  const chroma = (from.C + (to.C - from.C) * u) * (1 + 0.45 * endBoost);
  return oklchToLinear(
    from.L + (to.L - from.L) * u,
    chroma,
    lerpHue(from.H, to.H, u)
  );
}

function attachGrade(material) {
  material.color.set(0xffffff);
  material.emissive.set(0x000000);
  material.emissiveIntensity = 0;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGradeTint = gradeUniforms.tint;
    shader.uniforms.uGradeAmount = gradeUniforms.amount;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "uniform float opacity;",
        `uniform float opacity;
uniform vec3 uGradeTint;
uniform float uGradeAmount;`
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
#ifdef USE_MAP
{
  vec3 base = diffuseColor.rgb;
  float luma = dot(base, vec3(0.2126, 0.7152, 0.0722));
  vec3 tint = uGradeTint;
  float tintLuma = max(dot(tint, vec3(0.2126, 0.7152, 0.0722)), 1e-4);
  vec3 recolored = tint * (luma / tintLuma);
  float mixAmt = mix(0.1, 0.06, uGradeAmount);
  diffuseColor.rgb = mix(base, recolored, mixAmt);
  diffuseColor.rgb *= mix(1.08, 1.12, uGradeAmount);
  vec2 suv = vMapUv;
  float edge = max(max(1.0 - smoothstep(0.0, 0.008, suv.x), 1.0 - smoothstep(0.0, 0.008, suv.y)),
    max(1.0 - smoothstep(0.0, 0.008, 1.0 - suv.x), 1.0 - smoothstep(0.0, 0.008, 1.0 - suv.y)));
  diffuseColor.rgb *= 1.0 - edge * 0.04;
}
#endif`
      );
  };
  material.customProgramCacheKey = () => "avg-grade";
  material.needsUpdate = true;
}

function loadFaceMap(imagePath, priority = "low") {
  const cached = textureCache.get(imagePath);
  if (cached) return cached;
  const map = new THREE.Texture();
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 1;
  map.readyMaterials = [];
  textureCache.set(imagePath, map);
  beginImageLoad(imagePath, map, priority);
  return map;
}

const imageLoads = new Map();
let inflightLoads = 0;

function syncLoading() {
  if (!loadingEl) return;
  loadingEl.hidden = inflightLoads === 0;
}

function beginImageLoad(imagePath, map, priority) {
  if (map.image) return Promise.resolve();
  if (imageLoads.has(imagePath)) return imageLoads.get(imagePath);
  const job = new Promise((resolve) => {
    inflightLoads += 1;
    syncLoading();
    const img = new Image();
    img.fetchPriority = priority;
    img.decoding = "async";
    const finish = () => {
      inflightLoads = Math.max(0, inflightLoads - 1);
      imageLoads.delete(imagePath);
      syncLoading();
      resolve();
    };
    img.onload = () => {
      map.image = img;
      map.needsUpdate = true;
      (map.readyMaterials || []).forEach((material) => {
        material.map = map;
        material.needsUpdate = true;
      });
      finish();
    };
    img.onerror = finish;
    window.setTimeout(() => {
      img.src = imagePath;
    }, priority === "high" ? 0 : 1);
  });
  imageLoads.set(imagePath, job);
  return job;
}

function facePath(setNum, part) {
  return `img/lite/mk${setNum}-${part}.png`;
}

function preloadSet(setNum, priority = "low") {
  return Promise.all(
    FACE_PARTS.map((part) => {
      const path = facePath(setNum, part);
      const map = loadFaceMap(path, priority);
      return beginImageLoad(path, map, priority);
    })
  );
}

function isSetReady(setNum) {
  return FACE_PARTS.every((part) => {
    const map = textureCache.get(facePath(setNum, part));
    return map && map.image;
  });
}

function sameSet(a, b) {
  if (!a || !b) return false;
  const left = [...a].sort().join(",");
  const right = [...b].sort().join(",");
  return left === right;
}

function shuffle(list) {
  const pool = list.slice();
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function pickUniqueSets(avoid) {
  const order = shuffle(Array.from({ length: SET_COUNT }, (_, i) => i + 1));
  const next = [];
  const used = new Set();
  order.forEach((n) => {
    if (next.length < 4 && !used.has(n)) {
      next.push(n);
      used.add(n);
    }
  });
  for (let i = 1; i <= SET_COUNT && next.length < 4; i += 1) {
    if (!used.has(i)) {
      next.push(i);
      used.add(i);
    }
  }
  if (avoid && sameSet(next, avoid)) {
    const spare = [];
    for (let i = 1; i <= SET_COUNT; i += 1) {
      if (!used.has(i)) spare.push(i);
    }
    if (spare.length) next[0] = spare[0];
  }
  return next;
}

let currentSets = [1, 2, 3, 4];

function applyFaceSets() {
  const unique = [...new Set(currentSets)];
  if (unique.length !== 4) {
    currentSets = pickUniqueSets(currentSets);
  }
  VERTICAL_FACES.forEach((faceIndex, side) => {
    const setNum = currentSets[side];
    state.forEach((box) => {
      const material = box.mesh.material[faceIndex];
      const map =
        textureCache.get(facePath(setNum, FACE_PARTS[box.index])) ||
        loadFaceMap(facePath(setNum, FACE_PARTS[box.index]), "high");
      if (map.image) {
        if (material.map !== map) {
          material.map = map;
          material.needsUpdate = true;
        }
      } else if (!map.readyMaterials.includes(material)) {
        map.readyMaterials.push(material);
      }
    });
  });
}

function sideMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.05,
  });
}

function mappedMaterial(imagePath, priority = "low") {
  const map = loadFaceMap(imagePath, priority);
  const material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    map: map.image ? map : null,
  });
  attachGrade(material);
  if (!map.image) map.readyMaterials.push(material);
  return material;
}

function skinFacesFor(index) {
  if (index === 0) return [3];
  if (index === 1 || index === 2 || index === 3) return [2, 3];
  return [];
}

const state = COLORS.map((color, index) => {
  const part = FACE_PARTS[index];
  const materials = [
    mappedMaterial(facePath(2, part), "low"),
    mappedMaterial(facePath(4, part), "low"),
    sideMaterial(color),
    sideMaterial(color),
    mappedMaterial(facePath(1, part), "high"),
    mappedMaterial(facePath(3, part), "low"),
  ];
  const skinFaces = skinFacesFor(index);
  skinFaces.forEach((faceIndex) => {
    materials[faceIndex] = mappedMaterial(SKIN_IMAGE, "high");
  });
  if (index === 0) {
    materials[2] = mappedMaterial(HEAD_IMAGE, "high");
  }
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), materials);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  group.add(mesh);

  const meta = SLIDER_META[index];
  const row = document.createElement("div");
  row.className = "knob-row";
  const label = document.createElement("label");
  label.textContent = meta.name;
  label.htmlFor = `slider-${meta.key}`;

  const input = document.createElement("input");
  input.className = "knob";
  input.id = `slider-${meta.key}`;
  input.type = "range";
  input.min = String(MIN);
  input.max = String(MAX);
  input.step = "1";
  input.value = "5000";
  const wrap = document.createElement("div");
  wrap.className = "knob-wrap";
  wrap.append(input);
  row.append(label, wrap);
  sliders.append(row);
  syncSliderFill(input);

  const start = sizeFromValue(5000);
  const box = {
    value: 5000,
    width: start.width,
    height: start.height,
    mesh,
    input,
    index,
    skinFaces,
  };
  let dragging = false;
  input.addEventListener("pointerdown", () => {
    dragging = false;
  });
  input.addEventListener("input", () => {
    box.value = Number(input.value);
    syncSliderFill(input);
    startCodeShuffle();
    updateUiLook();
  });
  input.addEventListener("pointerup", () => {
    dragging = false;
    stopCodeShuffle();
    updateUiLook();
  });
  input.addEventListener("blur", () => {
    dragging = false;
    stopCodeShuffle();
  });
  return box;
});

const SHUFFLE_GLYPHS = "IHWL0123456789";
let shuffleTimer = 0;

function scrambledCode(target) {
  return [...target]
    .map((ch) => (ch === "#" ? "#" : SHUFFLE_GLYPHS[Math.floor(Math.random() * SHUFFLE_GLYPHS.length)]))
    .join("");
}

function startCodeShuffle() {
  if (shuffleTimer) return;
  shuffleTimer = window.setInterval(() => {
    if (judgmentCodeEl) judgmentCodeEl.textContent = scrambledCode(liveJudgmentCode());
  }, 40);
}

function stopCodeShuffle() {
  window.clearInterval(shuffleTimer);
  shuffleTimer = 0;
  updateJudgmentCode();
}

function syncSliderFill(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const value = Number(input.value);
  const pct = ((value - min) / Math.max(max - min, 1)) * 100;
  input.parentElement.style.setProperty("--p", `${pct}%`);
}

function sizeFromValue(value) {
  const t = Math.min(1, Math.max(0, value / MAX));
  const width = MIN_WIDTH + t * (MAX_WIDTH - MIN_WIDTH);
  const height = SIDE_AREA / width;
  return { width, height, depth: width };
}

function averageScore() {
  return state.reduce((sum, box) => sum + box.value, 0) / state.length / MAX;
}

function applyGrade(dt) {
  const target = averageScore();
  const k = 1 - Math.exp(-dt / COLOR_TAU);
  grade.current += (target - grade.current) * k;
  const [r, g, b] = gradeLinear(grade.current);
  gradeUniforms.tint.value.set(r, g, b);
  gradeUniforms.amount.value = grade.current;
}

function layout(dt) {
  let total = 0;
  state.forEach((box) => {
    const target = sizeFromValue(box.value);
    box.width += (target.width - box.width) * SMOOTH;
    box.height += (target.height - box.height) * SMOOTH;
    box.mesh.scale.set(box.width, box.height, box.width);
    total += box.height;
  });

  let y = total;
  state.forEach((box) => {
    y -= box.height;
    box.mesh.position.set(0, y + box.height / 2, 0);
  });

  controls.target.y += ((total * viewScale) / 2 - controls.target.y) * SMOOTH;
  applyGrade(dt);
  if (!shuffleTimer) updateJudgmentCode();
  updateUiLook();
}

function liveJudgmentCode() {
  return `#${SLIDER_META.map((meta, index) => `${meta.key}${scoreInt(state[index].value)}`).join("")}`;
}

function updateJudgmentCode() {
  if (judgmentCodeEl) judgmentCodeEl.textContent = liveJudgmentCode();
}

let facing = 0;

function resetCamera() {
  camera.position.copy(CAMERA_POS);
  controls.target.x = 0;
  controls.target.z = 0;
}

function showSide(index) {
  facing = ((index % 4) + 4) % 4;
  group.rotation.y = facing * (Math.PI / 2);
  resetCamera();
}

function hideSaveThumb() {
  if (!saveThumb) return;
  saveThumb.hidden = true;
  saveThumb.removeAttribute("src");
}

function refreshSide() {
  hideSaveThumb();
  currentSets = pickUniqueSets(currentSets);
  applyFaceSets();
  showSide(facing + 1 + Math.floor(Math.random() * 3));
  placeSliderDock(true);
}

refreshButton.addEventListener("click", () => {
  if (!archiveView.hidden) showBuilder();
  refreshSide();
});
downloadButton.addEventListener("click", downloadCurrent);
archiveOpenButton.addEventListener("click", () => {
  if (archiveView.hidden) showArchive();
  else showBuilder();
});
const siteTitle = document.getElementById("site-title");
const aboutPop = document.getElementById("about-pop");
const aboutCard = document.getElementById("about-card");

const aboutClose = document.getElementById("about-close");

function showAbout() {
  if (document.body.classList.contains("archive-open")) return;
  document.body.classList.add("about-open");
  if (aboutPop) aboutPop.hidden = false;
}

function hideAbout() {
  document.body.classList.remove("about-open");
  if (aboutPop) aboutPop.hidden = true;
}

if (siteTitle) {
  siteTitle.addEventListener("click", (event) => {
    if (document.body.classList.contains("archive-open")) {
      showBuilder();
      return;
    }
    event.preventDefault();
    if (document.body.classList.contains("about-open")) hideAbout();
    else showAbout();
  });
}
if (aboutClose) aboutClose.addEventListener("click", (event) => {
  event.stopPropagation();
  hideAbout();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideAbout();
});
if (archiveView) {
  archiveView.addEventListener("click", (event) => {
    if (event.target.closest(".archive-card")) return;
    if (mailPop && !mailPop.hidden) {
      hideMailPop();
      return;
    }
    showBuilder();
  });
}
window.addEventListener("pageshow", () => {
  showBuilder();
});
window.addEventListener("resize", resize);
resize();
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => alignTitleTops());
}
requestAnimationFrame(() => {
  updateViewScale();
  placeSliderDock(false);
});
tick();
try {
  applyFaceSets();
  showSide(Math.floor(Math.random() * 4));
  placeSliderDock(false);
  requestAnimationFrame(() => placeSliderDock(false));
} catch (error) {
  window.__bootError = String(error && error.stack ? error.stack : error);
}

function scoreInt(value) {
  return Math.round(Math.min(MAX, Math.max(MIN, value)));
}

function linearRgbToHex(vec) {
  const r = Math.round(linearToSrgb(vec.x) * 255);
  const g = Math.round(linearToSrgb(vec.y) * 255);
  const b = Math.round(linearToSrgb(vec.z) * 255);
  return `#${[r, g, b].map((c) => Math.min(255, Math.max(0, c)).toString(16).padStart(2, "0")).join("")}`;
}

function readArchive() {
  try {
    const parsed = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  } catch {
    return [];
  }
}

function writeArchive(list) {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list));
}

function formatStamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  let hour = date.getHours();
  const min = String(date.getMinutes()).padStart(2, "0");
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${y}/${m}/${d} ${String(hour).padStart(2, "0")}:${min}${ampm}`;
}

const faceNormals = [
  { index: 0, dir: new THREE.Vector3(1, 0, 0) },
  { index: 1, dir: new THREE.Vector3(-1, 0, 0) },
  { index: 4, dir: new THREE.Vector3(0, 0, 1) },
  { index: 5, dir: new THREE.Vector3(0, 0, -1) },
];
const worldNormal = new THREE.Vector3();
const toCamera = new THREE.Vector3();

function visibleFaceIndex() {
  group.updateWorldMatrix(true, false);
  toCamera.copy(camera.position).normalize();
  let best = 4;
  let bestDot = -Infinity;
  faceNormals.forEach((face) => {
    worldNormal.copy(face.dir).transformDirection(group.matrixWorld).normalize();
    const dot = worldNormal.dot(toCamera);
    if (dot > bestDot) {
      bestDot = dot;
      best = face.index;
    }
  });
  return best;
}

function pathForMap(map) {
  for (const [path, tex] of textureCache) {
    if (tex === map) return path;
  }
  return null;
}

function currentVisibleFaces() {
  const faceIndex = visibleFaceIndex();
  return state.map((box) => {
    const map = box.mesh.material[faceIndex] && box.mesh.material[faceIndex].map;
    return {
      path: pathForMap(map),
      image: map && map.image && map.image.width ? map.image : null,
    };
  });
}

function sourceImage(path) {
  const tex = textureCache.get(path);
  if (tex && tex.image && tex.image.width) return tex.image;
  return null;
}

function hexToRgb01(hex) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ];
}

function gradePixels(ctx, x, y, w, h, tintHex, mixAmt, brightness) {
  const rx = Math.max(0, Math.floor(x));
  const ry = Math.max(0, Math.floor(y));
  const rw = Math.max(1, Math.floor(w));
  const rh = Math.max(1, Math.floor(h));
  const [tr, tg, tb] = hexToRgb01(tintHex);
  const tintLuma = Math.max(0.2126 * tr + 0.7152 * tg + 0.0722 * tb, 1e-4);
  const imageData = ctx.getImageData(rx, ry, rw, rh);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue;
    const r = pixels[i] / 255;
    const g = pixels[i + 1] / 255;
    const b = pixels[i + 2] / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const scale = luma / tintLuma;
    pixels[i] = Math.round(Math.min(1, Math.max(0, (r * (1 - mixAmt) + tr * scale * mixAmt) * brightness)) * 255);
    pixels[i + 1] = Math.round(Math.min(1, Math.max(0, (g * (1 - mixAmt) + tg * scale * mixAmt) * brightness)) * 255);
    pixels[i + 2] = Math.round(Math.min(1, Math.max(0, (b * (1 - mixAmt) + tb * scale * mixAmt) * brightness)) * 255);
  }
  ctx.putImageData(imageData, rx, ry);
}

function planCanvas(record, liveImages = []) {
  const cubes = [
    record.cubeDimensions.cube1,
    record.cubeDimensions.cube2,
    record.cubeDimensions.cube3,
    record.cubeDimensions.cube4,
  ];
  const maxW = Math.max(...cubes.map((cube) => cube.width), 0.001);
  const totalH = cubes.reduce((sum, cube) => sum + cube.height, 0) || 1;
  const frameW = 640;
  const frameH = 640;
  const pad = 28;
  const scale = Math.min((frameW - pad * 2) / maxW, (frameH - pad * 2) / totalH);
  const stackW = maxW * scale;
  const stackH = totalH * scale;
  const canvas2d = document.createElement("canvas");
  canvas2d.width = frameW;
  canvas2d.height = frameH;
  const ctx = canvas2d.getContext("2d", { willReadFrequently: true });
  const originX = (frameW - stackW) / 2;
  const originY = (frameH - stackH) / 2;
  const paths = record.faceImages || [];
  const amount = record.gradeAmount ?? record.color?.gradeAmount ?? 0;
  const mixAmt = record.colorMix ?? record.color?.mixAmount ?? 0.1 + (0.06 - 0.1) * amount;
  const brightness = record.colorBrightness ?? record.color?.brightness ?? 1.08 + (1.12 - 1.08) * amount;
  const tint = record.tintColor || record.color?.tintColor || "#8D5145";

  let y = originY;
  cubes.forEach((cube, index) => {
    const w = cube.width * scale;
    const h = cube.height * scale;
    const x = originX + (stackW - w) / 2;
    const img = liveImages[index] || sourceImage(paths[index]);
    if (img) {
      ctx.drawImage(img, x, y, w, h);
      gradePixels(ctx, x, y, w, h, tint, mixAmt, brightness);
    } else {
      ctx.fillStyle = tint;
      ctx.fillRect(x, y, w, h);
    }
    y += h;
  });

  return canvas2d;
}

function drawPlan(record, liveImages = []) {
  return planCanvas(record, liveImages).toDataURL("image/png");
}

function snapshotRecord() {
  const values = {
    [SLIDER_META[0].key]: scoreInt(state[0].value),
    [SLIDER_META[1].key]: scoreInt(state[1].value),
    [SLIDER_META[2].key]: scoreInt(state[2].value),
    [SLIDER_META[3].key]: scoreInt(state[3].value),
  };
  const createdAt = new Date().toISOString();
  const visible = currentVisibleFaces();
  const tintColor = linearRgbToHex(gradeUniforms.tint.value);
  const gradeAmount = grade.current;
  const colorMix = 0.1 + (0.06 - 0.1) * gradeAmount;
  const colorBrightness = 1.08 + (1.12 - 1.08) * gradeAmount;
  const record = {
    id: crypto.randomUUID ? crypto.randomUUID() : `archive-${Date.now()}`,
    createdAt,
    cubeValues: values,
    averageScore: Object.values(values).reduce((sum, n) => sum + n, 0) / 4,
    judgmentCode: liveJudgmentCode(),
    cubeDimensions: {
      cube1: { width: state[0].width, height: state[0].height },
      cube2: { width: state[1].width, height: state[1].height },
      cube3: { width: state[2].width, height: state[2].height },
      cube4: { width: state[3].width, height: state[3].height },
    },
    tintColor,
    gradeAmount,
    colorMix,
    colorBrightness,
    color: {
      tintColor,
      gradeAmount,
      mixAmount: colorMix,
      brightness: colorBrightness,
      rgb: {
        r: gradeUniforms.tint.value.x,
        g: gradeUniforms.tint.value.y,
        b: gradeUniforms.tint.value.z,
      },
    },
    faceImages: visible.map((item) => item.path),
  };
  record.planImage = drawPlan(
    record,
    visible.map((item) => item.image)
  );
  return record;
}

const outlineCache = new Map();

function outlineFromPlan(src) {
  if (!src) return Promise.resolve("");
  if (outlineCache.has(src)) return Promise.resolve(outlineCache.get(src));
  const job = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const canvas2d = document.createElement("canvas");
      canvas2d.width = w;
      canvas2d.height = h;
      const ctx = canvas2d.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const srcData = ctx.getImageData(0, 0, w, h).data;
      const out = ctx.createImageData(w, h);
      const alpha = (x, y) => {
        if (x < 0 || y < 0 || x >= w || y >= h) return 0;
        return srcData[(y * w + x) * 4 + 3];
      };
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (alpha(x, y) < 40) continue;
          let edge = false;
          for (let dy = -1; dy <= 1 && !edge; dy += 1) {
            for (let dx = -1; dx <= 1 && !edge; dx += 1) {
              if (dx === 0 && dy === 0) continue;
              if (alpha(x + dx, y + dy) < 40) edge = true;
            }
          }
          if (!edge) continue;
          const i = (y * w + x) * 4;
          out.data[i] = 0;
          out.data[i + 1] = 0;
          out.data[i + 2] = 0;
          out.data[i + 3] = 255;
        }
      }
      ctx.clearRect(0, 0, w, h);
      ctx.putImageData(out, 0, 0);
      const url = canvas2d.toDataURL("image/png");
      outlineCache.set(src, url);
      resolve(url);
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
  outlineCache.set(src, job);
  return job;
}

function fitArchiveCaptions() {
  archiveGrid.querySelectorAll(".archive-card").forEach((card) => {
    const img = card.querySelector(".archive-shot img");
    const meta = card.querySelector(".archive-meta");
    const code = card.querySelector(".archive-code");
    if (!img || !meta || !code) return;
    const box = card.querySelector(".archive-shot");
    const nw = img.naturalWidth || 1;
    const nh = img.naturalHeight || 1;
    const bw = box.clientWidth || 1;
    const bh = box.clientHeight || 1;
    const width = Math.min(bw, Math.max(1, nw * Math.min(bw / nw, bh / nh)));
    meta.style.width = `${Math.round(width)}px`;
    const glyphs = Math.max(code.textContent.length, 16);
    code.style.fontSize = `${Math.max(8, width / (glyphs * 0.62))}px`;
    const time = card.querySelector("time");
    if (time) time.style.fontSize = code.style.fontSize;
  });
}

function renderArchive() {
  const list = readArchive();
  archiveGrid.replaceChildren();
  archiveEmpty.hidden = list.length > 0;
  list.forEach((record) => {
    const photo = record.planImage || "";
    const card = document.createElement("article");
    card.className = "archive-card";
    const shot = document.createElement("div");
    shot.className = "archive-shot";
    const img = document.createElement("img");
    img.alt = "";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.maxWidth = "100%";
    shot.append(img);
    const meta = document.createElement("div");
    meta.className = "archive-meta";
    const code = document.createElement("p");
    code.className = "archive-code";
    code.textContent = record.judgmentCode || "";
    const time = document.createElement("time");
    time.dateTime = record.createdAt;
    time.textContent = formatStamp(record.createdAt);
    meta.append(code, time);
    card.append(shot, meta);
    let outlineUrl = "";
    outlineFromPlan(photo).then((outline) => {
      outlineUrl = outline || photo;
      img.dataset.outline = outlineUrl;
      if (!card.classList.contains("is-hover") && !card.classList.contains("is-selected")) {
        img.src = outlineUrl;
      }
    });
    img.addEventListener("load", fitArchiveCaptions);
    card.addEventListener("pointerenter", () => {
      card.classList.add("is-hover");
      img.src = photo;
      requestAnimationFrame(fitArchiveCaptions);
    });
    card.addEventListener("pointerleave", () => {
      if (card.classList.contains("is-selected")) return;
      card.classList.remove("is-hover");
      img.src = outlineUrl || photo;
    });
    card.addEventListener("click", (event) => {
      event.stopPropagation();
      if (card.classList.contains("is-selected")) {
        hideMailPop();
        return;
      }
      showMailPop(record, card);
      card.classList.add("is-hover");
      img.src = photo;
    });
    archiveGrid.append(card);
  });
  requestAnimationFrame(fitArchiveCaptions);
  hideMailPop();
}

async function ensurePlanImages(record) {
  const paths = (record.faceImages || []).filter(Boolean);
  await Promise.all(
    paths.map((path) => beginImageLoad(path, loadFaceMap(path, "high"), "high"))
  );
}

function pngFileName(record) {
  const values = record.cubeValues || {};
  const fromValues = SLIDER_META.every((meta) => values[meta.key] != null)
    ? `#${SLIDER_META.map((meta) => `${meta.key}${values[meta.key]}`).join("")}`
    : values.W != null
      ? `#W${values.W}I${values.I}H${values.H}G${values.G}`
      : "";
  const code = record.judgmentCode || fromValues || "#archive";
  return `${code.replace(/[/\\?%*:|"<>]/g, "")}.png`;
}

async function downloadArchivePng(record) {
  await ensurePlanImages(record);
  await new Promise((resolve) => {
    planCanvas(record).toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pngFileName(record);
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });
}

function planBlob(record) {
  return new Promise((resolve) => {
    planCanvas(record).toBlob((blob) => resolve(blob), "image/png");
  });
}

async function recordPngFile(record) {
  if (record.planImage && record.planImage.startsWith("data:")) {
    const blob = await (await fetch(record.planImage)).blob();
    return new File([blob], pngFileName(record), { type: "image/png" });
  }
  const blob = (await planBlob(record)) || new Blob([], { type: "image/png" });
  return new File([blob], pngFileName(record), { type: "image/png" });
}

function mailFieldMap(record) {
  const code = record.judgmentCode || "";
  return {
    _subject: `Your new friend ${code}`,
    _template: "box",
    name: "四面觀相體",
    judgmentCode: code,
    message: `Here is your new friend.\n${code}`,
  };
}

async function sendRecordToEmail(email, record) {
  if (!record) throw new Error("no save");
  const body = new FormData();
  Object.entries(mailFieldMap(record)).forEach(([name, value]) => body.append(name, value));
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body,
  });
  if (!response.ok) throw new Error("network");
  const result = await response.json();
  if (result.success === false || result.success === "false") {
    throw new Error(result.message || "fail");
  }
}

if (mailPop) {
  mailPop.addEventListener("click", (event) => event.stopPropagation());
  mailPop.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const email = (mailInput && mailInput.value.trim()) || "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      flashSaved("ENTER A VALID E-MAIL");
      return;
    }
    if (mailSend) mailSend.disabled = true;
    try {
      await sendRecordToEmail(email, mailRecord || readArchive()[0]);
      flashSaved("SENT TO YOUR E-MAIL");
      mailInput.value = "";
    } catch (error) {
      flashSaved("CHECK INBOX TO CONFIRM, OR TRY AGAIN");
    } finally {
      if (mailSend) mailSend.disabled = false;
    }
  });
}

function clearArchiveSelection() {
  if (!archiveGrid) return;
  archiveGrid.querySelectorAll(".archive-card.is-selected").forEach((card) => {
    card.classList.remove("is-selected");
    if (!card.matches(":hover")) {
      card.classList.remove("is-hover");
      const img = card.querySelector("img");
      if (img && img.dataset.outline) img.src = img.dataset.outline;
    }
  });
}

function showMailPop(record, card) {
  mailRecord = record || null;
  if (!mailPop || !mailRecord) return;
  clearArchiveSelection();
  if (card) card.classList.add("is-selected");
  mailPop.hidden = false;
}

function hideMailPop() {
  mailRecord = null;
  clearArchiveSelection();
  if (mailPop) mailPop.hidden = true;
}

function showArchive() {
  hideAbout();
  renderArchive();
  archiveView.hidden = false;
  document.body.classList.add("archive-open");
  if (siteSubtitle) siteSubtitle.textContent = "Archive";
}

function showBuilder() {
  archiveView.hidden = true;
  document.body.classList.remove("archive-open");
  if (siteSubtitle) siteSubtitle.textContent = SUBTITLE_MAIN;
  hideMailPop();
}

function flashSaved(message = "SAVED TO ARCHIVE") {
  if (!toast) return;
  toast.hidden = false;
  toast.textContent = message;
  window.clearTimeout(flashSaved.timer);
  flashSaved.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 1800);
}

function saveToArchive() {
  const record = snapshotRecord();
  const list = readArchive();
  list.unshift(record);
  writeArchive(list);
  return record;
}

function cropPlanPreview(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const pixels = ctx.getImageData(0, 0, w, h).data;
      let minX = w;
      let minY = h;
      let maxX = 0;
      let maxY = 0;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (pixels[(y * w + x) * 4 + 3] < 16) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX < minX) {
        resolve(src);
        return;
      }
      const pad = 10;
      const sx = Math.max(0, minX - pad);
      const sy = Math.max(0, minY - pad);
      const sw = Math.min(w, maxX + pad + 1) - sx;
      const sh = Math.min(h, maxY + pad + 1) - sy;
      const out = document.createElement("canvas");
      out.width = sw;
      out.height = sh;
      out.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(out.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

async function downloadCurrent() {
  const record = saveToArchive();
  if (saveThumb && record.planImage) {
    saveThumb.src = await cropPlanPreview(record.planImage);
    saveThumb.hidden = false;
    saveThumb.onload = () => placeSliderDock(false);
  }
  flashSaved();
}

function updateUiLook() {
  const hot = state.filter((box) => box.value / MAX >= 0.7).length >= 2;
  document.body.classList.toggle("hot", hot);
  const bg = hot ? 0xff0000 : 0xffffff;
  scene.background.setHex(bg);
  renderer.setClearColor(bg, 1);
}

function randRange(min, max) {
  return min + Math.random() * Math.max(0, max - min);
}

function placeSliderDock(move) {
  if (!sliderDock) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(sliderDock.offsetWidth, 340);
  const h = Math.max(sliderDock.offsetHeight, 160);
  const titleBox = document.getElementById("site-title");
  const actions = document.getElementById("circle-actions");
  const codeBox = judgmentCodeEl ? judgmentCodeEl.getBoundingClientRect() : null;
  const titleBottom = titleBox ? titleBox.getBoundingClientRect().bottom : 0;
  const pad = 30;
  const topMin = Math.max(pad, titleBottom + 12);
  const bottomReserve = codeBox ? vh - codeBox.top + 8 : pad + 80;
  const topMax = Math.max(topMin, vh - h - bottomReserve);
  const leftMin = pad;
  const leftMax = Math.max(leftMin, vw - w - pad);
  const clamp = (left, top) => ({
    left: Math.min(leftMax, Math.max(leftMin, left)),
    top: Math.min(topMax, Math.max(topMin, top)),
  });
  if (!move && sliderDock.dataset.placed) {
    const pos = clamp(
      parseFloat(sliderDock.style.left) || leftMax,
      parseFloat(sliderDock.style.top) || topMax
    );
    sliderDock.style.left = `${Math.round(pos.left)}px`;
    sliderDock.style.top = `${Math.round(pos.top)}px`;
    return;
  }
  const hitsButtons = (left, top) => {
    if (!actions) return false;
    const r = actions.getBoundingClientRect();
    return !(left + w < r.left - 12 || left > r.right + 12 || top + h < r.top - 12 || top > r.bottom + 12);
  };
  let pos = clamp(randRange(leftMin, leftMax), randRange(topMin, topMax));
  for (let i = 0; i < 14 && hitsButtons(pos.left, pos.top); i += 1) {
    pos = clamp(randRange(leftMin, leftMax), randRange(topMin, topMax));
  }
  sliderDock.dataset.placed = "1";
  sliderDock.style.left = `${Math.round(pos.left)}px`;
  sliderDock.style.top = `${Math.round(pos.top)}px`;
  sliderDock.style.right = "auto";
  sliderDock.style.bottom = "auto";
}

function updateViewScale() {
  const look = controls.target;
  const dist = Math.max(camera.position.distanceTo(look), 1);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const visibleH = 2 * Math.tan(vFov / 2) * dist;
  const visibleW = visibleH * Math.max(camera.aspect, 0.25);
  const defaultW = MIN_WIDTH + 0.5 * (MAX_WIDTH - MIN_WIDTH);
  const slim = THREE.MathUtils.clamp((camera.aspect - 0.5) / 1.2, 0, 1);
  const widthFrac = THREE.MathUtils.lerp(0.741, 0.363, slim);
  const widthScale = (visibleW * widthFrac) / defaultW;
  viewScale = THREE.MathUtils.clamp(widthScale, 0.25, 4.2);
  group.scale.setScalar(viewScale);
  controls.minDistance = 4.2 * viewScale;
  controls.maxDistance = 24 * Math.max(1, viewScale);
}

function alignTitleTops() {
  const hanzi = document.querySelector("#site-title h1 span");
  const sub = siteSubtitle;
  if (!hanzi || !sub) return;
  sub.style.transform = "none";
  const topOf = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()];
    if (range.detach) range.detach();
    if (!rects.length) return el.getBoundingClientRect().top;
    return Math.min(...rects.map((rect) => rect.top));
  };
  const dy = topOf(hanzi) - topOf(sub);
  if (Math.abs(dy) < 0.5) return;
  sub.style.transform = `translateY(${Math.round(dy)}px)`;
}

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  updateViewScale();
  placeSliderDock(false);
  alignTitleTops();
  if (archiveView && !archiveView.hidden) fitArchiveCaptions();
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  layout(dt);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
