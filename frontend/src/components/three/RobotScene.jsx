import * as THREE from "three";
import { useRef, useEffect } from "react";

export default function ChibiRobotScene({ mode }) {
  const mountRef = useRef(null);
  const sceneRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef();

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth, H = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0.35, 6.4);

    /* Lighting */
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const key = new THREE.DirectionalLight(0xd4b8ff, 3.5); key.position.set(4, 7, 5); key.castShadow = true; scene.add(key);
    const fill = new THREE.PointLight(0x3dbccc, 3.5, 18); fill.position.set(-4, 2, 3); scene.add(fill);
    const rim = new THREE.PointLight(0xb96ef7, 2.5, 14); rim.position.set(3, -1, -3); scene.add(rim);
    const top = new THREE.PointLight(0x6c63ff, 2.5, 12); top.position.set(0, 6, 2); scene.add(top);

    /* Materials */
    const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.3, ...opts });
    const body = M(0xffffff, { roughness: 0.2 });
    const softLav = M(0xe8e4ff, { roughness: 0.28 });
    const teal = M(0x3dbccc, { emissive: 0x3dbccc, emissiveIntensity: 0.3, roughness: 0.15 });
    const violet = M(0x6c63ff, { emissive: 0x6c63ff, emissiveIntensity: 0.35, roughness: 0.15 });
    const lilac = M(0xb96ef7, { emissive: 0xb96ef7, emissiveIntensity: 0.4, roughness: 0.15 });
    const pink = M(0xff85a1, { emissive: 0xff85a1, emissiveIntensity: 0.6, roughness: 0.2 });
    const eyeW = M(0xffffff, { roughness: 0.05 });
    const eyeP = M(0x2d2b55, { emissive: 0x3a3880, emissiveIntensity: 0.4 });
    const eyeG = M(0x6c63ff, { emissive: 0x6c63ff, emissiveIntensity: 1.8 });
    const shine = M(0xffffff, { emissive: 0xffffff, emissiveIntensity: 3 });
    const cheek = M(0xffb3c6, { transparent: true, opacity: 0.65, roughness: 0.5 });
    const glass = M(0xaae4f0, { transparent: true, opacity: 0.28, roughness: 0.0 });
    const yellow = M(0xffd166, { emissive: 0xffd166, emissiveIntensity: 0.5 });

    const bot = new THREE.Group();

    /* ──── BIG ROUND HEAD ──── */
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.15, 0);

    // Head sphere
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.92, 40, 40), body);
    head.castShadow = true; headGroup.add(head);

    // Pastel cap on top
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.94, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.4),
      new THREE.MeshStandardMaterial({ color: 0xede9ff, transparent: true, opacity: 0.4, side: THREE.BackSide }));
    headGroup.add(cap);

    // ── Big oval eyes ──
    [-0.31, 0.31].forEach((x) => {
      // Outer white
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 24), eyeW);
      ew.scale.set(1, 1.18, 0.55); ew.position.set(x, 0.1, 0.78); headGroup.add(ew);
      // Pupil
      const ep = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), eyeP);
      ep.position.set(x, 0.1, 0.9); headGroup.add(ep);
      // Glow iris
      const eg = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), eyeG);
      eg.position.set(x, 0.12, 0.96); headGroup.add(eg);
      // Sparkle
      const es = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), shine);
      es.position.set(x + 0.08, 0.21, 0.98); headGroup.add(es);
      // Tiny extra sparkle
      const es2 = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), shine);
      es2.position.set(x - 0.06, 0.04, 0.98); headGroup.add(es2);
    });

    // ── Smile (torus arc) ──
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.034, 8, 22, Math.PI), teal);
    smile.position.set(0, -0.22, 0.85); smile.rotation.z = Math.PI; headGroup.add(smile);

    // ── Rosy cheeks ──
    [-0.55, 0.55].forEach((x) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 12), cheek);
      c.scale.set(1, 0.5, 0.28); c.position.set(x, -0.14, 0.8); headGroup.add(c);
    });

    // ── Round ears ──
    [-1, 1].forEach((s) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), softLav);
      ear.position.set(s * 0.94, 0.22, 0); headGroup.add(ear);
      const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), lilac);
      innerEar.position.set(s * 1.06, 0.22, 0.06); headGroup.add(innerEar);
    });

    // ── Antenna ──
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.55, 10), softLav);
    stem.position.set(0, 1.02, 0); headGroup.add(stem);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), pink);
    ball.position.set(0, 1.34, 0); headGroup.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.027, 8, 24), pink);
    ring.position.set(0, 1.34, 0); ring.rotation.x = Math.PI / 2; headGroup.add(ring);

    bot.add(headGroup);

    /* ──── CHUBBY BODY ──── */
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.52, 0.9, 22), softLav);
    torso.position.set(0, 0.04, 0); torso.castShadow = true; bot.add(torso);

    // Tummy screen glass
    const tummy = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.08), glass);
    tummy.position.set(0, 0.08, 0.55); bot.add(tummy);

    // Screen glow dots — cute face
    [[0, 0.12, 0xff85a1], [-0.13, -0.06, 0x6c63ff], [0.13, -0.06, 0x6c63ff]].forEach(([x, y, col]) => {
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.3 }));
      d.position.set(x, 0.08 + y, 0.61); bot.add(d);
    });

    // Chest stripe
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.075, 0.07), teal);
    stripe.position.set(0, 0.44, 0.48); bot.add(stripe);

    /* ──── ARMS ──── */
    [-1, 1].forEach((s) => {
      const ag = new THREE.Group();
      // Upper arm moved closer to torso (torso radius is ~0.58)
      const ua = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.52, 12), softLav);
      ua.rotation.z = s * 0.55;
      ua.position.set(s * 0.1, -0.22, 0);
      ag.add(ua);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), body);
      hand.position.set(s * 0.32, -0.52, 0.05);
      ag.add(hand);

      const band = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 8, 20), teal);
      band.position.set(s * 0.26, -0.38, 0.02);
      band.rotation.z = Math.PI / 2;
      ag.add(band);

      ag.position.set(s * 0.52, 0.24, 0); // Attached to body radius
      bot.add(ag);
    });

    /* ──── LEGS ──── */
    [-1, 1].forEach((s) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.52, 12), softLav);
      leg.position.set(s * 0.26, -0.68, 0); bot.add(leg);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), body);
      foot.scale.set(1.1, 0.62, 1.35); foot.position.set(s * 0.26, -1.0, 0.07); bot.add(foot);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.055), violet);
      shoe.position.set(s * 0.26, -0.92, 0.23); bot.add(shoe);
    });

    bot.position.set(0, -0.15, 0);
    scene.add(bot);

    /* ──── FLOATING SPARKLES ──── */
    const sparkles = [];
    const sColors = [0x6c63ff, 0x3dbccc, 0xb96ef7, 0xff85a1, 0xffd166, 0x22e5c0];
    for (let i = 0; i < 20; i++) {
      const sg = new THREE.OctahedronGeometry(0.042 + Math.random() * 0.055);
      const sm = new THREE.MeshStandardMaterial({ color: sColors[i % sColors.length], emissive: sColors[i % sColors.length], emissiveIntensity: 0.95, transparent: true, opacity: 0.82 });
      const sp = new THREE.Mesh(sg, sm);
      const angle = (i / 20) * Math.PI * 2;
      const r = 1.15 + Math.random() * 0.95;
      sp.position.set(Math.cos(angle) * r, -0.2 + Math.random() * 2.6, Math.sin(angle) * r * 0.5);
      sp.userData = { angle, r, baseY: sp.position.y, speed: 0.35 + Math.random() * 0.65 };
      scene.add(sp); sparkles.push(sp);
    }

    /* ──── FLOATING HEARTS ──── */
    const hearts = [];
    [[0xff85a1, -1.5, 0.6, 0.28], [0xb96ef7, 1.5, 0.7, 0.24]].forEach(([col, hx, hy, scale], ci) => {
      const hg = new THREE.Group();
      const hm = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.7, transparent: true, opacity: 0.85 });
      [-0.1, 0.1].forEach(ox => { const h = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), hm); h.position.set(ox, 0.06, 0); hg.add(h); });
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 3), hm);
      tip.rotation.z = Math.PI; tip.position.set(0, -0.11, 0); hg.add(tip);
      hg.scale.setScalar(scale); hg.position.set(hx, hy, 0.3);
      hg.userData = { baseY: hy, ci };
      scene.add(hg); hearts.push(hg);
    });

    /* ──── GROUND ──── */
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshStandardMaterial({ color: 0xe8e4ff, transparent: true, opacity: 0.3 }));
    gnd.rotation.x = -Math.PI / 2; gnd.position.y = -1.15; gnd.receiveShadow = true; scene.add(gnd);
    const gndR = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.032, 8, 64), new THREE.MeshStandardMaterial({ color: 0x6c63ff, emissive: 0x6c63ff, emissiveIntensity: 0.55, transparent: true, opacity: 0.5 }));
    gndR.rotation.x = -Math.PI / 2; gndR.position.y = -1.13; scene.add(gndR);

    sceneRef.current = { renderer, scene, camera, bot, headGroup, sparkles, hearts, fill, ball, ring };

    /* Mouse tracking */
    const onMM = (e) => {
      const r = el.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouseRef.current.y = -((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    el.addEventListener("mousemove", onMM);

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.016;

      // Sweet head-follow
      headGroup.rotation.y += (mouseRef.current.x * 0.38 - headGroup.rotation.y) * 0.07;
      headGroup.rotation.x += (mouseRef.current.y * 0.22 - headGroup.rotation.x) * 0.07;

      // Cute bob
      bot.position.y = -0.15 + Math.sin(t * 1.15) * 0.075;
      bot.rotation.y = Math.sin(t * 0.5) * 0.055;

      // Antenna pulse
      const ap = 1 + Math.sin(t * 3.2) * 0.22;
      ball.scale.setScalar(ap); ring.scale.setScalar(ap * 1.12);

      // Sparkles orbit
      sparkles.forEach((s, i) => {
        const { angle, r, baseY, speed } = s.userData;
        const a = angle + t * speed * 0.28;
        s.position.x = Math.cos(a) * r;
        s.position.z = Math.sin(a) * r * 0.5;
        s.position.y = baseY + Math.sin(t * speed + i) * 0.22;
        s.rotation.y = t * speed; s.rotation.x = t * speed * 0.7;
      });

      // Hearts float
      hearts.forEach((h, i) => {
        h.position.y = h.userData.baseY + Math.sin(t * 0.9 + i * Math.PI) * 0.2;
        h.rotation.z = Math.sin(t * 0.5 + i) * 0.12;
        h.scale.setScalar(h.userData.ci === 0 ? 0.28 : 0.24 + (Math.sin(t * 1.5 + i) * 0.03));
      });

      fill.intensity = 2.8 + Math.sin(t * 1.8) * 0.6;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight;
      camera.aspect = nW / nH; camera.updateProjectionMatrix(); renderer.setSize(nW, nH);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener("mousemove", onMM);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const { fill } = sceneRef.current;
    if (!fill) return;
    if (mode === "register") fill.color.set(0xb96ef7);
    else if (mode === "forgot") fill.color.set(0xff85a1);
    else fill.color.set(0x3dbccc);
  }, [mode]);

  return <div ref={mountRef} className="w-full h-full" style={{ cursor: "crosshair" }} />;
}