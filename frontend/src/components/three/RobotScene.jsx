import * as THREE from "three";
import { useEffect, useRef } from "react";

function RobotScene({ mode }) {
  const mountRef = useRef(null);
  const sceneRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0 });
  const frameRef = useRef();

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth,
      H = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 1.5, 6);

    /* Lighting */
    const ambient = new THREE.AmbientLight(0x0a0a2e, 0.8);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0x00d4ff, 2.5);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x7b2fff, 3, 20);
    fillLight.position.set(-4, 2, 3);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0x00ffcc, 2, 15);
    rimLight.position.set(0, 5, -3);
    scene.add(rimLight);
    const groundLight = new THREE.PointLight(0x00d4ff, 1.5, 10);
    groundLight.position.set(0, -2, 2);
    scene.add(groundLight);

    /* Materials */
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x0d1b3e,
      metalness: 0.9,
      roughness: 0.15,
      envMapIntensity: 1.5,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      metalness: 0.8,
      roughness: 0.1,
      emissive: 0x00d4ff,
      emissiveIntensity: 0.4,
    });
    const purpleMat = new THREE.MeshStandardMaterial({
      color: 0x7b2fff,
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0x7b2fff,
      emissiveIntensity: 0.3,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 1.2,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.25,
      metalness: 0.1,
      roughness: 0.0,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x050d1a,
      metalness: 0.95,
      roughness: 0.05,
    });

    const robot = new THREE.Group();

    /* Torso */
    const torsoGeo = new THREE.BoxGeometry(1.6, 1.8, 0.9, 1, 1, 1);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.castShadow = true;
    robot.add(torso);

    /* Chest plate details */
    const chestPlateGeo = new THREE.BoxGeometry(1.0, 0.9, 0.05);
    const chestPlate = new THREE.Mesh(chestPlateGeo, darkMat);
    chestPlate.position.set(0, 0.1, 0.48);
    robot.add(chestPlate);

    /* Chest glow line */
    for (let i = 0; i < 3; i++) {
      const lineGeo = new THREE.BoxGeometry(0.7, 0.03, 0.06);
      const line = new THREE.Mesh(lineGeo, accentMat);
      line.position.set(0, 0.25 - i * 0.18, 0.52);
      robot.add(line);
    }

    /* Core orb */
    const coreGeo = new THREE.SphereGeometry(0.18, 32, 32);
    const core = new THREE.Mesh(coreGeo, eyeMat);
    core.position.set(0, -0.1, 0.5);
    robot.add(core);
    const coreGlowGeo = new THREE.SphereGeometry(0.28, 32, 32);
    const coreGlow = new THREE.Mesh(coreGlowGeo, glassMat);
    coreGlow.position.set(0, -0.1, 0.5);
    robot.add(coreGlow);

    /* Shoulders */
    [-1, 1].forEach((side) => {
      const shGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const sh = new THREE.Mesh(shGeo, purpleMat);
      sh.position.set(side * 1.05, 0.75, 0);
      robot.add(sh);
      const shRingGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 24);
      const shRing = new THREE.Mesh(shRingGeo, accentMat);
      shRing.position.set(side * 1.05, 0.75, 0);
      shRing.rotation.y = Math.PI / 2;
      robot.add(shRing);
    });

    /* Arms */
    [-1, 1].forEach((side) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 1.05, 0.75, 0);

      const upperArmGeo = new THREE.CylinderGeometry(0.16, 0.14, 0.8, 12);
      const upperArm = new THREE.Mesh(upperArmGeo, bodyMat);
      upperArm.position.set(side * 0.2, -0.5, 0);
      upperArm.rotation.z = side * 0.15;
      armGroup.add(upperArm);

      const elbowGeo = new THREE.SphereGeometry(0.16, 12, 12);
      const elbow = new THREE.Mesh(elbowGeo, darkMat);
      elbow.position.set(side * 0.35, -0.95, 0);
      armGroup.add(elbow);

      const lowerArmGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.75, 12);
      const lowerArm = new THREE.Mesh(lowerArmGeo, bodyMat);
      lowerArm.position.set(side * 0.48, -1.4, 0);
      lowerArm.rotation.z = side * 0.25;
      armGroup.add(lowerArm);

      const handGeo = new THREE.BoxGeometry(0.22, 0.22, 0.18);
      const hand = new THREE.Mesh(handGeo, darkMat);
      hand.position.set(side * 0.58, -1.82, 0);
      armGroup.add(hand);

      const accentRingGeo = new THREE.TorusGeometry(0.14, 0.03, 6, 20);
      const accentRing = new THREE.Mesh(accentRingGeo, accentMat);
      accentRing.position.set(side * 0.35, -0.7, 0);
      accentRing.rotation.x = Math.PI / 2;
      armGroup.add(accentRing);

      robot.add(armGroup);
    });

    /* Waist */
    const waistGeo = new THREE.CylinderGeometry(0.55, 0.65, 0.25, 16);
    const waist = new THREE.Mesh(waistGeo, darkMat);
    waist.position.set(0, -0.95, 0);
    robot.add(waist);

    /* Hips */
    const hipGeo = new THREE.BoxGeometry(1.3, 0.35, 0.75);
    const hip = new THREE.Mesh(hipGeo, bodyMat);
    hip.position.set(0, -1.2, 0);
    robot.add(hip);

    /* Legs */
    [-1, 1].forEach((side) => {
      const legGeo = new THREE.CylinderGeometry(0.22, 0.18, 1.2, 12);
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(side * 0.42, -1.95, 0);
      robot.add(leg);

      const kneeGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const knee = new THREE.Mesh(kneeGeo, darkMat);
      knee.position.set(side * 0.42, -2.6, 0);
      robot.add(knee);

      const lowerLegGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.9, 12);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, bodyMat);
      lowerLeg.position.set(side * 0.42, -3.15, 0);
      robot.add(lowerLeg);

      const footGeo = new THREE.BoxGeometry(0.4, 0.2, 0.7);
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.position.set(side * 0.42, -3.65, 0.1);
      robot.add(foot);

      const kneeLightGeo = new THREE.BoxGeometry(0.25, 0.04, 0.04);
      const kneeLight = new THREE.Mesh(kneeLightGeo, accentMat);
      kneeLight.position.set(side * 0.42, -2.55, 0.22);
      robot.add(kneeLight);
    });

    /* Neck */
    const neckGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.35, 12);
    const neck = new THREE.Mesh(neckGeo, darkMat);
    neck.position.set(0, 1.0, 0);
    robot.add(neck);
    const neckRingGeo = new THREE.TorusGeometry(0.24, 0.04, 8, 20);
    const neckRing = new THREE.Mesh(neckRingGeo, accentMat);
    neckRing.position.set(0, 1.05, 0);
    neckRing.rotation.x = Math.PI / 2;
    robot.add(neckRing);

    /* Head */
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.7, 0);

    const headGeo = new THREE.BoxGeometry(1.1, 1.0, 0.95);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.castShadow = true;
    headGroup.add(head);

    /* Visor */
    const visorGeo = new THREE.BoxGeometry(0.9, 0.3, 0.05);
    const visor = new THREE.Mesh(visorGeo, glassMat);
    visor.position.set(0, 0.1, 0.5);
    headGroup.add(visor);

    /* Eyes */
    [-0.22, 0.22].forEach((x) => {
      const eyeGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, 0.1, 0.5);
      headGroup.add(eye);
      const pupilGeo = new THREE.SphereGeometry(0.05, 12, 12);
      const pupilMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 2,
      });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(x, 0.1, 0.58);
      headGroup.add(pupil);
    });

    /* Mouth / Speaker */
    for (let i = -2; i <= 2; i++) {
      const slotGeo = new THREE.BoxGeometry(0.06, 0.06, 0.04);
      const slot = new THREE.Mesh(slotGeo, accentMat);
      slot.position.set(i * 0.1, -0.2, 0.49);
      headGroup.add(slot);
    }

    /* Ear antennae */
    [-1, 1].forEach((side) => {
      const earGeo = new THREE.BoxGeometry(0.12, 0.4, 0.15);
      const ear = new THREE.Mesh(earGeo, darkMat);
      ear.position.set(side * 0.62, 0.1, 0);
      headGroup.add(ear);
      const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8);
      const antenna = new THREE.Mesh(antennaGeo, accentMat);
      antenna.position.set(side * 0.62, 0.72, 0);
      headGroup.add(antenna);
      const tipGeo = new THREE.SphereGeometry(0.07, 12, 12);
      const tipMat = new THREE.MeshStandardMaterial({
        color: 0xff00aa,
        emissive: 0xff00aa,
        emissiveIntensity: 1.5,
      });
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.set(side * 0.62, 1.02, 0);
      headGroup.add(tip);
    });

    /* Crown panel */
    const crownGeo = new THREE.BoxGeometry(0.7, 0.06, 0.5);
    const crown = new THREE.Mesh(crownGeo, accentMat);
    crown.position.set(0, 0.55, 0);
    headGroup.add(crown);

    robot.add(headGroup);

    /* Floating energy rings */
    const rings = [];
    [0.7, 1.1, 1.5].forEach((r, i) => {
      const ringGeo = new THREE.TorusGeometry(r, 0.02, 8, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0x00d4ff : 0x7b2fff,
        emissive: i % 2 === 0 ? 0x00d4ff : 0x7b2fff,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.5,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, -0.5, 0);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
      rings.push(ring);
    });

    /* Floating particles */
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    particleGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    const particleMat = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.04,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    /* Ground shadow plane */
    const planeGeo = new THREE.PlaneGeometry(8, 8);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x000510,
      transparent: true,
      opacity: 0.4,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -3.8;
    plane.receiveShadow = true;
    scene.add(plane);

    robot.position.set(0, 0.2, 0);
    robot.castShadow = true;
    scene.add(robot);

    sceneRef.current = {
      renderer,
      scene,
      camera,
      robot,
      headGroup,
      rings,
      particles,
      core,
      coreGlow,
      fillLight,
    };

    /* Mouse move */
    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    el.addEventListener("mousemove", onMouseMove);

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.012;

      /* Smooth head tracking */
      const tx = mouseRef.current.x * 0.35;
      const ty = mouseRef.current.y * 0.25;
      headGroup.rotation.y += (tx - headGroup.rotation.y) * 0.06;
      headGroup.rotation.x += (ty - headGroup.rotation.x) * 0.06;

      /* Body subtle sway */
      robot.rotation.y += (mouseRef.current.x * 0.1 - robot.rotation.y) * 0.03;
      robot.position.y = 0.2 + Math.sin(t * 0.8) * 0.08;

      /* Rings spin */
      rings.forEach((r, i) => {
        r.rotation.z = t * (0.3 + i * 0.15);
        r.rotation.x = Math.PI / 2 + Math.sin(t * 0.5 + i) * 0.2;
        r.position.y = -0.5 + Math.sin(t * 0.6 + i * 1.2) * 0.1;
      });

      /* Core pulse */
      const pulse = 0.18 + Math.sin(t * 2) * 0.04;
      core.scale.setScalar(pulse / 0.18);
      coreGlow.scale.setScalar((pulse / 0.18) * 1.1 + 0.1);

      /* Particle drift */
      particles.rotation.y = t * 0.04;

      /* Light pulse */
      fillLight.intensity = 2.5 + Math.sin(t * 1.5) * 0.8;

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nW = el.clientWidth,
        nH = el.clientHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  /* Mode color shift */
  useEffect(() => {
    const { fillLight } = sceneRef.current;
    if (!fillLight) return;
    if (mode === "register") {
      fillLight.color.set(0x9b59b6);
    } else if (mode === "forgot") {
      fillLight.color.set(0xff6b35);
    } else {
      fillLight.color.set(0x7b2fff);
    }
  }, [mode]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ cursor: "crosshair" }}
    />
  );
}

export default RobotScene;
