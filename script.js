/* ---------------------------------------------------------
   Mobile nav toggle
--------------------------------------------------------- */
(function () {
  const toggle = document.getElementById('navToggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
})();

/* ---------------------------------------------------------
   Reveal-on-scroll for sections / cards
--------------------------------------------------------- */
(function () {
  const targets = document.querySelectorAll(
    '.snap-card, .project-card, .expertise-card, .timeline li, .edu-block, .lang-block, .lehre-block'
  );
  targets.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity .6s ease, transform .6s ease';
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: '150px 0px 150px 0px' }
  );
  targets.forEach((el) => io.observe(el));
})();

/* ---------------------------------------------------------
   Procedurally generated artwork used as the distortion
   texture: a dark "signal / observation" graphic so the
   page needs no external image asset.
--------------------------------------------------------- */
function generateArtworkCanvas() {
  const w = 1000;
  const h = 1250;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  // background gradient
  const bg = ctx.createRadialGradient(w * 0.5, h * 0.38, 40, w * 0.5, h * 0.5, h * 0.8);
  bg.addColorStop(0, '#101b18');
  bg.addColorStop(0.55, '#0b1013');
  bg.addColorStop(1, '#05070a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // subtle scanlines
  ctx.strokeStyle = 'rgba(124,255,178,0.05)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // radar rings
  ctx.strokeStyle = 'rgba(124,255,178,0.18)';
  ctx.lineWidth = 1.5;
  const cx = w * 0.5;
  const cy = h * 0.42;
  for (let r = 60; r < 520; r += 90) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // constellation nodes + connecting lines
  const nodes = [];
  const seedRandom = (() => {
    let s = 42;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })();
  for (let i = 0; i < 42; i++) {
    const angle = seedRandom() * Math.PI * 2;
    const radius = 40 + seedRandom() * 480;
    nodes.push({
      x: cx + Math.cos(angle) * radius * (0.9 + seedRandom() * 0.4),
      y: cy + Math.sin(angle) * radius * (0.9 + seedRandom() * 0.6) * 0.85,
      r: 1.2 + seedRandom() * 2.6,
    });
  }
  ctx.lineWidth = 1;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 150) {
        ctx.strokeStyle = `rgba(124,255,178,${0.12 * (1 - d / 150)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }
  nodes.forEach((n) => {
    const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 6);
    glow.addColorStop(0, 'rgba(124,255,178,0.9)');
    glow.addColorStop(1, 'rgba(124,255,178,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eafff2';
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  });

  // large monogram watermark
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.font = '700 340px -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, h * 0.35, 0, h * 0.85);
  grad.addColorStop(0, 'rgba(124,255,178,0.16)');
  grad.addColorStop(1, 'rgba(99,179,255,0.05)');
  ctx.fillStyle = grad;
  ctx.fillText('MS', cx, h * 0.62);
  ctx.restore();

  // frame vignette
  const vignette = ctx.createRadialGradient(cx, h * 0.5, h * 0.2, cx, h * 0.5, h * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  return c;
}

/* ---------------------------------------------------------
   Grid Distortion hover effect.
   Ported from React Bits "Grid Distortion" (three.js /
   ogl-style displacement shader) to plain JS + three.js,
   so it runs from a single local HTML page without a
   React/Vite build step. Same shader + velocity-based
   displacement math as the original component.
--------------------------------------------------------- */
function initGridDistortion(canvas, sourceCanvas, opts) {
  if (!window.THREE) return;
  const { grid = 18, mouse = 0.28, strength = 0.11, relaxation = 0.92 } = opts || {};

  const container = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -1000, 1000);
  camera.position.z = 2;

  const uniforms = {
    resolution: { value: new THREE.Vector4() },
    uTexture: { value: null },
    uDataTexture: { value: null },
  };

  const texture = new THREE.CanvasTexture(sourceCanvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  uniforms.uTexture.value = texture;

  const size = grid;
  const data = new Float32Array(4 * size * size);
  const dataTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
  dataTexture.needsUpdate = true;
  uniforms.uDataTexture.value = dataTexture;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const fragmentShader = `
    uniform sampler2D uDataTexture;
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
      vec4 offset = texture2D(uDataTexture, vUv);
      vec2 uv = vUv - 0.025 * offset.rg;
      gl_FragColor = texture2D(uTexture, uv);
    }
  `;

  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
  });

  const geometry = new THREE.PlaneGeometry(1, 1, size - 1, size - 1);
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  function handleResize() {
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    renderer.setSize(width, height, false);
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const containerAspect = width / height;
    plane.scale.set(containerAspect, 1, 1);

    const frustumHeight = 1;
    const frustumWidth = frustumHeight * containerAspect;
    camera.left = -frustumWidth / 2;
    camera.right = frustumWidth / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
    camera.updateProjectionMatrix();

    uniforms.resolution.value.set(width, height, 1, 1);
  }

  const mouseState = { x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5, vX: 0, vY: 0 };

  function handleMouseMove(e) {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    mouseState.vX = x - mouseState.prevX;
    mouseState.vY = y - mouseState.prevY;
    mouseState.x = x;
    mouseState.y = y;
    mouseState.prevX = x;
    mouseState.prevY = y;
  }

  function handleMouseLeave() {
    mouseState.vX = 0;
    mouseState.vY = 0;
  }

  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('mouseleave', handleMouseLeave);

  if (window.ResizeObserver) {
    new ResizeObserver(handleResize).observe(container);
  } else {
    window.addEventListener('resize', handleResize);
  }
  handleResize();

  let raf;
  function animate() {
    raf = requestAnimationFrame(animate);

    const d = dataTexture.image.data;
    for (let i = 0; i < size * size; i++) {
      d[i * 4] *= relaxation;
      d[i * 4 + 1] *= relaxation;
    }

    const gridMouseX = size * mouseState.x;
    const gridMouseY = size * mouseState.y;
    const maxDist = size * mouse;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const distSq = (gridMouseX - i) ** 2 + (gridMouseY - j) ** 2;
        if (distSq < maxDist * maxDist) {
          const index = 4 * (i + size * j);
          const power = Math.min(maxDist / Math.sqrt(distSq), 10);
          d[index] += strength * 100 * mouseState.vX * power;
          d[index + 1] -= strength * 100 * mouseState.vY * power;
        }
      }
    }

    dataTexture.needsUpdate = true;
    renderer.render(scene, camera);
  }
  animate();

  return () => {
    cancelAnimationFrame(raf);
    container.removeEventListener('mousemove', handleMouseMove);
    container.removeEventListener('mouseleave', handleMouseLeave);
    renderer.dispose();
    geometry.dispose();
    material.dispose();
    dataTexture.dispose();
    texture.dispose();
  };
}

/* ---------------------------------------------------------
   Decrypted Text — ported from React Bits "Decrypted Text".
   Scrambles through random characters, then reveals the real
   text sequentially. Triggered once the element scrolls into
   view.
--------------------------------------------------------- */
function initDecryptedText(el) {
  const original = el.textContent;
  const chars = '!<>-_\\/[]{}—=+*^?#________';
  const len = original.length;
  let revealed = 0;
  let frame = 0;

  function randomChar() {
    return chars[Math.floor(Math.random() * chars.length)];
  }

  function render() {
    let out = '';
    for (let i = 0; i < len; i++) {
      if (i < revealed || original[i] === ' ') {
        out += original[i];
      } else {
        out += randomChar();
      }
    }
    el.textContent = out;
  }

  let raf;
  function tick() {
    frame++;
    if (frame % 2 === 0) revealed++;
    render();
    if (revealed <= len) {
      raf = requestAnimationFrame(tick);
    } else {
      el.textContent = original;
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          tick();
          io.unobserve(el);
        }
      });
    },
    { threshold: 0, rootMargin: '150px 0px 150px 0px' }
  );
  io.observe(el);
}

/* ---------------------------------------------------------
   Variable Proximity — ported from React Bits "Variable
   Proximity". Splits a heading into per-character spans and
   interpolates the Inter Variable "wght" axis based on
   distance from the cursor.
--------------------------------------------------------- */
function initVariableProximity(headings, opts) {
  const { radius = 120, minWeight = 420, maxWeight = 850 } = opts || {};
  const entries = [];

  headings.forEach((heading) => {
    const text = heading.textContent;
    heading.textContent = '';
    const spans = [];
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch;
      heading.appendChild(span);
      spans.push(span);
    }
    entries.push({ spans });
  });

  let mouseX = -9999;
  let mouseY = -9999;
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function update() {
    entries.forEach(({ spans }) => {
      spans.forEach((span) => {
        const rect = span.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(mouseX - cx, mouseY - cy);
        const t = Math.max(0, 1 - dist / radius);
        const weight = Math.round(minWeight + (maxWeight - minWeight) * t);
        span.style.fontVariationSettings = `"wght" ${weight}`;
      });
    });
    requestAnimationFrame(update);
  }
  update();
}

/* ---------------------------------------------------------
   Dot Grid — ported from React Bits "Dot Grid". A canvas of
   dots that light up near the cursor and scatter outward on
   click, springing back into place.
--------------------------------------------------------- */
function initDotGrid(canvas, opts) {
  const {
    gap = 34,
    dotSize = 2.4,
    proximity = 140,
    baseColor = 'rgba(255,255,255,0.14)',
    activeColor = 'rgba(124,255,178,0.9)',
    shockRadius = 200,
    shockStrength = 46,
  } = opts || {};

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  let dots = [];
  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function buildGrid() {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    dots = [];
    const cols = Math.ceil(width / gap) + 1;
    const rows = Math.ceil(height / gap) + 1;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        dots.push({
          x: i * gap,
          y: j * gap,
          ox: i * gap,
          oy: j * gap,
          vx: 0,
          vy: 0,
        });
      }
    }
  }

  let mouseX = -9999;
  let mouseY = -9999;

  function handleMouseMove(e) {
    const rect = container.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }
  function handleMouseLeave() {
    mouseX = -9999;
    mouseY = -9999;
  }
  function handleClick(e) {
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    dots.forEach((d) => {
      const dist = Math.hypot(d.ox - cx, d.oy - cy);
      if (dist < shockRadius) {
        const power = (1 - dist / shockRadius) * shockStrength;
        const angle = Math.atan2(d.oy - cy, d.ox - cx);
        d.vx += Math.cos(angle) * power;
        d.vy += Math.sin(angle) * power;
      }
    });
  }

  container.addEventListener('mousemove', handleMouseMove);
  container.addEventListener('mouseleave', handleMouseLeave);
  container.addEventListener('click', handleClick);
  if (window.ResizeObserver) {
    new ResizeObserver(buildGrid).observe(container);
  } else {
    window.addEventListener('resize', buildGrid);
  }
  buildGrid();

  function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, width, height);

    dots.forEach((d) => {
      // spring back to origin + inertia from shock
      d.vx += (d.ox - d.x) * 0.08;
      d.vy += (d.oy - d.y) * 0.08;
      d.vx *= 0.82;
      d.vy *= 0.82;
      d.x += d.vx;
      d.y += d.vy;

      const dist = Math.hypot(mouseX - d.x, mouseY - d.y);
      const t = Math.max(0, 1 - dist / proximity);

      ctx.beginPath();
      const r = dotSize + t * 1.6;
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fillStyle = t > 0.02 ? activeColor : baseColor;
      if (t > 0.02) {
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 8 * t;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    });
  }
  animate();
}

/* ---------------------------------------------------------
   Profile Card — ported from React Bits "Profile Card". A
   3D tilt on mouse move plus a cursor-tracked radial glow.
--------------------------------------------------------- */
function initProfileCard(card, opts) {
  const { maxTilt = 10 } = opts || {};
  const inner = card.querySelector('.profile-card-inner');
  if (!inner) return;

  function handleMouseMove(e) {
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * maxTilt * 2;
    const rotateX = (0.5 - py) * maxTilt * 2;
    inner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    card.style.setProperty('--glow-x', `${px * 100}%`);
    card.style.setProperty('--glow-y', `${py * 100}%`);
  }
  function handleMouseLeave() {
    inner.style.transform = 'rotateX(0deg) rotateY(0deg)';
  }

  card.addEventListener('mousemove', handleMouseMove);
  card.addEventListener('mouseleave', handleMouseLeave);
}

/* ---------------------------------------------------------
   Click Spark — ported from React Bits "Click Spark". Fires
   a burst of fading lines from the click point, drawn on a
   full-viewport overlay canvas.
--------------------------------------------------------- */
function initClickSpark(canvas, opts) {
  const {
    sparkColor = '#7CFFB2',
    sparkSize = 10,
    sparkRadius = 22,
    sparkCount = 8,
    duration = 450,
  } = opts || {};

  const ctx = canvas.getContext('2d');
  let sparks = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function spawn(x, y) {
    const now = performance.now();
    for (let i = 0; i < sparkCount; i++) {
      sparks.push({ x, y, angle: (Math.PI * 2 * i) / sparkCount, start: now });
    }
  }

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.btn');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    spawn(e.clientX ?? rect.left + rect.width / 2, e.clientY ?? rect.top + rect.height / 2);
  });

  function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = performance.now();

    sparks = sparks.filter((s) => now - s.start < duration);
    sparks.forEach((s) => {
      const t = (now - s.start) / duration;
      const eased = 1 - Math.pow(1 - t, 2);
      const dist = eased * sparkRadius;
      const length = sparkSize * (1 - eased);
      const x1 = s.x + Math.cos(s.angle) * dist;
      const y1 = s.y + Math.sin(s.angle) * dist;
      const x2 = s.x + Math.cos(s.angle) * (dist + length);
      const y2 = s.y + Math.sin(s.angle) * (dist + length);

      ctx.strokeStyle = sparkColor;
      ctx.globalAlpha = 1 - t;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  }
  animate();
}

/* ---------------------------------------------------------
   Magnet — ported from React Bits "Magnet". Pulls an element
   toward the cursor within a padding radius, spring-releases
   on mouse leave.
--------------------------------------------------------- */
function initMagnet(elements, opts) {
  const { padding = 60, strength = 4 } = opts || {};

  window.addEventListener('mousemove', (e) => {
    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const reach = Math.max(rect.width, rect.height) / 2 + padding;

      if (dist < reach) {
        el.style.transform = `translate(${dx / strength}px, ${dy / strength - 2}px)`;
      } else {
        el.style.transform = 'translate(0, 0)';
      }
    });
  });
}

/* ---------------------------------------------------------
   Counter — animated count-up, triggered on scroll into view.
--------------------------------------------------------- */
function initCounter(el) {
  const from = parseInt(el.dataset.from || '0', 10);
  const target = parseInt(el.dataset.target || '0', 10);
  const pad = parseInt(el.dataset.pad || '0', 10);
  const duration = 1200;

  function format(n) {
    return pad ? String(n).padStart(pad, '0') : String(n);
  }

  function run() {
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (target - from) * eased);
      el.textContent = format(value);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run();
          io.unobserve(el);
        }
      });
    },
    { threshold: 0, rootMargin: '200px 0px 200px 0px' }
  );
  io.observe(el);
}

/* ---------------------------------------------------------
   Portrait loader — tries the real photo first (assets/
   mohammad.jpg), falls back to the generated artwork so the
   page still works before the file is added.
--------------------------------------------------------- */
function loadPortraitSource() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(generateArtworkCanvas());
    img.src = 'assets/mohammad.jpg';
  });
}

function buildCroppedCanvas(source, destW, destH) {
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  const destAspect = destW / destH;
  const srcAspect = sw / sh;
  let cropW, cropH, cropX, cropY;
  if (srcAspect > destAspect) {
    cropH = sh;
    cropW = sh * destAspect;
    cropX = (sw - cropW) / 2;
    cropY = 0;
  } else {
    cropW = sw;
    cropH = sw / destAspect;
    cropX = 0;
    cropY = (sh - cropH) / 2;
  }
  const c = document.createElement('canvas');
  c.width = destW;
  c.height = destH;
  c.getContext('2d').drawImage(source, cropX, cropY, cropW, cropH, 0, 0, destW, destH);
  return c;
}

/* ---------------------------------------------------------
   Mosaic Assemble — large blurred, scattered image tiles
   converge into the full portrait as the section scrolls
   into view. Once assembled, hands off to the Grid
   Distortion hover effect on an identical, pixel-matched
   canvas so there's no visual jump between the two.
--------------------------------------------------------- */
function initMosaicAssemble(canvas, source, opts) {
  const { cols = 9, rows = 11, duration = 2200, onComplete } = opts || {};
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  let width, height, dpr, croppedCanvas, tiles;
  let done = false;
  let animating = false;

  function buildTiles() {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const baseW = Math.round(width * dpr);
    const baseH = Math.round(height * dpr);
    croppedCanvas = buildCroppedCanvas(source, baseW, baseH);

    const tileW = width / cols;
    const tileH = height / rows;
    const srcTileW = baseW / cols;
    const srcTileH = baseH / rows;

    tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        tiles.push({
          dx: c * tileW,
          dy: r * tileH,
          sx: c * srcTileW,
          sy: r * srcTileH,
          scatterX: (Math.random() - 0.5) * width * 0.9,
          scatterY: (Math.random() - 0.5) * height * 0.9,
          angle: (Math.random() - 0.5) * 1.1,
          delay: Math.random() * 0.55,
          tileW,
          tileH,
          srcTileW,
          srcTileH,
        });
      }
    }
  }

  function draw(p) {
    ctx.clearRect(0, 0, width, height);
    tiles.forEach((t) => {
      const localP = Math.min(1, Math.max(0, (p - t.delay) / (1 - t.delay)));
      const eased = 1 - Math.pow(1 - localP, 3);
      const x = t.dx + t.scatterX * (1 - eased);
      const y = t.dy + t.scatterY * (1 - eased);
      const blur = 16 * (1 - eased);
      const alpha = 0.25 + 0.75 * eased;
      const rot = t.angle * (1 - eased);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.filter = blur > 0.5 ? `blur(${blur}px)` : 'none';
      ctx.translate(x + t.tileW / 2, y + t.tileH / 2);
      ctx.rotate(rot);
      ctx.drawImage(
        croppedCanvas,
        t.sx, t.sy, t.srcTileW, t.srcTileH,
        -t.tileW / 2, -t.tileH / 2, t.tileW + 0.5, t.tileH + 0.5
      );
      ctx.restore();
    });
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
  }

  buildTiles();
  draw(0);

  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      buildTiles();
      draw(done ? 1 : 0);
    }).observe(container);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !animating && !done) {
          animating = true;
          const start = performance.now();
          function tick(now) {
            const p = Math.min(1, (now - start) / duration);
            draw(p);
            if (p < 1) {
              requestAnimationFrame(tick);
            } else {
              done = true;
              if (onComplete) onComplete(croppedCanvas);
            }
          }
          requestAnimationFrame(tick);
          io.unobserve(canvas);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px 100px 0px' }
  );
  io.observe(canvas);
}

/* boot */
window.addEventListener('DOMContentLoaded', () => {
  const assembleCanvas = document.getElementById('mosaic-assemble-canvas');
  const mosaicDistortionCanvas = document.getElementById('mosaic-distortion-canvas');
  if (assembleCanvas && mosaicDistortionCanvas) {
    loadPortraitSource().then((source) => {
      initMosaicAssemble(assembleCanvas, source, {
        cols: 9,
        rows: 11,
        duration: 2200,
        onComplete: (finalImage) => {
          initGridDistortion(mosaicDistortionCanvas, finalImage, {
            grid: 20, mouse: 0.28, strength: 0.11, relaxation: 0.9,
          });
          mosaicDistortionCanvas.classList.add('ready');
        },
      });
    });
  }

  document.querySelectorAll('[data-decrypt]').forEach(initDecryptedText);

  const proximityHeadings = document.querySelectorAll('[data-proximity]');
  if (proximityHeadings.length) initVariableProximity(proximityHeadings);

  const dotGrid = document.getElementById('dot-grid');
  if (dotGrid) initDotGrid(dotGrid);

  const profileCard = document.getElementById('profileCard');
  if (profileCard) initProfileCard(profileCard);

  const sparkCanvas = document.getElementById('click-spark-canvas');
  if (sparkCanvas) initClickSpark(sparkCanvas);

  const magnetEls = document.querySelectorAll('.magnet');
  if (magnetEls.length) initMagnet(magnetEls);

  document.querySelectorAll('.counter').forEach(initCounter);
});
