import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CharacterId, SkinId, WeaponType } from '../types/game';
import { CHARACTERS } from '../game/constants';
import { CharacterModelFactory, CharacterRigs } from '../game/engine/CharacterModels';

interface HeroPreview3DProps {
  characterId: CharacterId;
  skinId?: SkinId;
  weaponType?: WeaponType;
}

export const HeroPreview3D: React.FC<HeroPreview3DProps> = ({
  characterId,
  skinId = 'default',
  weaponType = 'rifle'
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const lastMouseXRef = useRef(0);
  const rotationYRef = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.4, 4.4);
    camera.lookAt(0, 1.1, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Lighting (Dramatic Showcase Lights)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.4);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 3.2);
    rimLight.position.set(-3, 3, -3);
    scene.add(rimLight);

    // 4. Holographic Pedestal / Stage
    const pedestalGroup = new THREE.Group();
    scene.add(pedestalGroup);

    // Base cylinder
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.2, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.1;
    baseMesh.receiveShadow = true;
    pedestalGroup.add(baseMesh);

    // Glowing Neon Ring
    const charDef = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];
    const ringGeo = new THREE.TorusGeometry(1.25, 0.04, 16, 64);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(charDef.glowColor),
      transparent: true,
      opacity: 0.9
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.01;
    pedestalGroup.add(ringMesh);

    // 5. Spawn 3D Character Model
    const { rig, model } = CharacterModelFactory.createCharacter(characterId, false, skinId);
    model.position.set(0, 0, 0);
    scene.add(model);

    if (weaponType) {
      CharacterModelFactory.switchWeapon(rig, weaponType);
    }

    // 6. Interactive Drag-to-Rotate handlers
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseXRef.current = e.clientX;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.clientX;
      rotationYRef.current += dx * 0.012;
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    // Touch handlers for mobile
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        lastMouseXRef.current = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastMouseXRef.current;
      lastMouseXRef.current = e.touches[0].clientX;
      rotationYRef.current += dx * 0.012;
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Slow gentle auto-rotation when not dragging
      if (!isDraggingRef.current) {
        rotationYRef.current += 0.005;
      }

      model.rotation.y = rotationYRef.current;
      pedestalGroup.rotation.y = rotationYRef.current * 0.5;

      // Animate Character Rig
      CharacterModelFactory.animateCharacter(rig, dt, {
        isMoving: false,
        isSprinting: false,
        isJumping: false,
        isCrouching: false,
        isAiming: false,
        isAlive: true,
        animTime: elapsed,
        recoilIntensity: 0
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);

      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [characterId, skinId, weaponType]);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
      title="Click and drag to rotate operator"
    />
  );
};
