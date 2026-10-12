import * as THREE from 'three';
import { CharacterId, WeaponType } from '../../types/game';
import { CHARACTERS } from '../constants';
import { WeaponModelFactory } from './WeaponModels';

export interface CharacterRigs {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  visor: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftLowerLeg: THREE.Group;
  rightLowerLeg: THREE.Group;
  weaponMount: THREE.Group;
  currentWeaponMesh: THREE.Group | null;
  muzzlePoint: THREE.Vector3;
  suitMat: THREE.MeshStandardMaterial;
  armorMat: THREE.MeshStandardMaterial;
  glowMat: THREE.MeshStandardMaterial;
}

export class CharacterModelFactory {
  public static createCharacter(characterId: CharacterId, isRemote: boolean = false, skinId?: string): {
    rig: CharacterRigs;
    model: THREE.Group;
  } {
    const charDef = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];
    const skin = charDef.skins?.find((s) => s.id === skinId) || charDef.skins?.[0];

    const root = new THREE.Group();
    root.name = `character_${characterId}`;

    const primaryColor = new THREE.Color(skin?.primaryColor || charDef.primaryColor);
    const secondaryColor = new THREE.Color(skin?.secondaryColor || charDef.secondaryColor);
    const glowColor = new THREE.Color(skin?.glowColor || charDef.glowColor);

    // Standard materials
    const suitMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: 0.6,
      metalness: 0.3
    });

    const armorMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: 0.35,
      metalness: 0.7
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x11161d,
      roughness: 0.5,
      metalness: 0.8
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: glowColor,
      emissive: glowColor,
      emissiveIntensity: 1.2,
      roughness: 0.2
    });

    // 1. Pelvis / Hips
    const pelvis = new THREE.Group();
    pelvis.position.y = 1.0;
    root.add(pelvis);

    const hipsGeo = new THREE.BoxGeometry(0.36, 0.22, 0.26);
    const hipsMesh = new THREE.Mesh(hipsGeo, suitMat);
    pelvis.add(hipsMesh);

    // Belt / Utility
    const beltGeo = new THREE.BoxGeometry(0.38, 0.08, 0.28);
    const beltMesh = new THREE.Mesh(beltGeo, darkMetalMat);
    pelvis.add(beltMesh);

    // 2. Torso & Chest
    const torso = new THREE.Group();
    torso.position.y = 0.16;
    pelvis.add(torso);

    const chestGeo = new THREE.BoxGeometry(0.44, 0.48, 0.3);
    const chestMesh = new THREE.Mesh(chestGeo, suitMat);
    chestMesh.position.y = 0.24;
    torso.add(chestMesh);

    // Armor Chestplate
    const plateGeo = new THREE.BoxGeometry(0.4, 0.36, 0.12);
    const plateMesh = new THREE.Mesh(plateGeo, armorMat);
    plateMesh.position.set(0, 0.26, 0.13);
    torso.add(plateMesh);

    // Glowing Core Reactor / Insignia on chest
    const reactorGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    reactorGeo.rotateX(Math.PI / 2);
    const reactorMesh = new THREE.Mesh(reactorGeo, glowMat);
    reactorMesh.position.set(0, 0.28, 0.19);
    torso.add(reactorMesh);

    // Tactical Backpack / Thruster
    const packGeo = new THREE.BoxGeometry(0.34, 0.42, 0.18);
    const packMesh = new THREE.Mesh(packGeo, darkMetalMat);
    packMesh.position.set(0, 0.24, -0.2);
    torso.add(packMesh);

    // Pack glow vents
    const ventGeo = new THREE.BoxGeometry(0.24, 0.06, 0.04);
    const ventMesh = new THREE.Mesh(ventGeo, glowMat);
    ventMesh.position.set(0, 0.32, -0.29);
    torso.add(ventMesh);

    // 3. Head & Helmet
    const head = new THREE.Group();
    head.position.y = 0.52;
    torso.add(head);

    const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.1, 12);
    const neckMesh = new THREE.Mesh(neckGeo, darkMetalMat);
    neckMesh.position.y = 0.05;
    head.add(neckMesh);

    const helmetGeo = new THREE.BoxGeometry(0.28, 0.3, 0.3);
    const helmetMesh = new THREE.Mesh(helmetGeo, suitMat);
    helmetMesh.position.y = 0.2;
    head.add(helmetMesh);

    // Sleek Visor
    const visorGeo = new THREE.BoxGeometry(0.26, 0.1, 0.1);
    const visorMesh = new THREE.Mesh(visorGeo, glowMat);
    visorMesh.position.set(0, 0.21, 0.12);
    head.add(visorMesh);

    // Head antenna / sensor
    const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.18, 6);
    const antMesh = new THREE.Mesh(antGeo, darkMetalMat);
    antMesh.position.set(0.14, 0.34, -0.06);
    antMesh.rotation.z = -0.15;
    head.add(antMesh);

    // 4. Arms
    // Left Arm Pivot
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.28, 0.42, 0);
    torso.add(leftArm);

    const shoulderGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const shoulderL = new THREE.Mesh(shoulderGeo, armorMat);
    leftArm.add(shoulderL);

    const bicepGeo = new THREE.BoxGeometry(0.14, 0.28, 0.14);
    const bicepL = new THREE.Mesh(bicepGeo, suitMat);
    bicepL.position.y = -0.16;
    leftArm.add(bicepL);

    const forearmL = new THREE.Mesh(bicepGeo, darkMetalMat);
    forearmL.position.y = -0.38;
    leftArm.add(forearmL);

    // Right Arm Pivot (Holds Weapon)
    const rightArm = new THREE.Group();
    rightArm.position.set(0.28, 0.42, 0);
    torso.add(rightArm);

    const shoulderR = new THREE.Mesh(shoulderGeo, armorMat);
    rightArm.add(shoulderR);

    const bicepR = new THREE.Mesh(bicepGeo, suitMat);
    bicepR.position.y = -0.16;
    rightArm.add(bicepR);

    const forearmR = new THREE.Mesh(bicepGeo, darkMetalMat);
    forearmR.position.y = -0.38;
    rightArm.add(forearmR);

    // Weapon Mount Point in Right Hand
    const weaponMount = new THREE.Group();
    weaponMount.position.set(0, -0.48, 0.18);
    rightArm.add(weaponMount);

    // 5. Legs
    // Left Leg
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.13, -0.05, 0);
    pelvis.add(leftLeg);

    const thighGeo = new THREE.BoxGeometry(0.16, 0.42, 0.18);
    const thighL = new THREE.Mesh(thighGeo, suitMat);
    thighL.position.y = -0.22;
    leftLeg.add(thighL);

    const leftLowerLeg = new THREE.Group();
    leftLowerLeg.position.y = -0.44;
    leftLeg.add(leftLowerLeg);

    const shinGeo = new THREE.BoxGeometry(0.15, 0.44, 0.16);
    const shinL = new THREE.Mesh(shinGeo, darkMetalMat);
    shinL.position.y = -0.22;
    leftLowerLeg.add(shinL);

    const bootGeo = new THREE.BoxGeometry(0.16, 0.14, 0.26);
    const bootL = new THREE.Mesh(bootGeo, armorMat);
    bootL.position.set(0, -0.42, 0.04);
    leftLowerLeg.add(bootL);

    // Right Leg
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.13, -0.05, 0);
    pelvis.add(rightLeg);

    const thighR = new THREE.Mesh(thighGeo, suitMat);
    thighR.position.y = -0.22;
    rightLeg.add(thighR);

    const rightLowerLeg = new THREE.Group();
    rightLowerLeg.position.y = -0.44;
    rightLeg.add(rightLowerLeg);

    const shinR = new THREE.Mesh(shinGeo, darkMetalMat);
    shinR.position.y = -0.22;
    rightLowerLeg.add(shinR);

    const bootR = new THREE.Mesh(bootGeo, armorMat);
    bootR.position.set(0, -0.42, 0.04);
    rightLowerLeg.add(bootR);

    // Attach Default Weapon
    const initialWeapon = WeaponModelFactory.createWeaponMesh('rifle');
    weaponMount.add(initialWeapon);

    // Shadow configuration
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const rigs: CharacterRigs = {
      root,
      pelvis,
      torso,
      head,
      visor: visorMesh,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      leftLowerLeg,
      rightLowerLeg,
      weaponMount,
      currentWeaponMesh: initialWeapon,
      muzzlePoint: new THREE.Vector3(0, 0, 0.6),
      suitMat,
      armorMat,
      glowMat
    };

    return { rig: rigs, model: root };
  }

  public static applySkin(rig: CharacterRigs, skin: { primaryColor: string; secondaryColor: string; glowColor: string }) {
    rig.armorMat.color.set(skin.primaryColor);
    rig.suitMat.color.set(skin.secondaryColor);
    rig.glowMat.color.set(skin.glowColor);
    rig.glowMat.emissive.set(skin.glowColor);
  }

  // Switch character's displayed 3D weapon
  public static switchWeapon(rig: CharacterRigs, weaponType: WeaponType) {
    if (rig.currentWeaponMesh) {
      rig.weaponMount.remove(rig.currentWeaponMesh);
    }
    const newWeapon = WeaponModelFactory.createWeaponMesh(weaponType);
    rig.weaponMount.add(newWeapon);
    rig.currentWeaponMesh = newWeapon;
  }

  // Procedural Animation Update
  public static animateCharacter(
    rig: CharacterRigs,
    dt: number,
    state: {
      isMoving: boolean;
      isSprinting: boolean;
      isJumping: boolean;
      isCrouching: boolean;
      isAiming: boolean;
      isAlive: boolean;
      animTime: number;
      recoilIntensity: number;
    }
  ) {
    if (!state.isAlive) {
      // Ragdoll collapse
      rig.root.rotation.x = THREE.MathUtils.lerp(rig.root.rotation.x, -Math.PI / 2, dt * 8);
      rig.root.position.y = THREE.MathUtils.lerp(rig.root.position.y, 0.2, dt * 8);
      return;
    }

    const t = state.animTime;
    const speedMult = state.isSprinting ? 12 : state.isMoving ? 7 : 2;

    // 1. Idle breathing
    const breath = Math.sin(t * 2) * 0.02;
    rig.torso.position.y = 0.16 + breath;
    rig.head.rotation.x = Math.sin(t * 1.5) * 0.03;

    // 2. Crouch Stance
    const targetPelvisY = state.isCrouching ? 0.65 : 1.0;
    rig.pelvis.position.y = THREE.MathUtils.lerp(rig.pelvis.position.y, targetPelvisY, dt * 10);

    // 3. Movement Running Cycle
    if (state.isMoving && !state.isJumping) {
      const cycle = Math.sin(t * speedMult);
      const sprintFactor = state.isSprinting ? 1.4 : 1.0;

      // Leg swings
      rig.leftLeg.rotation.x = cycle * 0.75 * sprintFactor;
      rig.rightLeg.rotation.x = -cycle * 0.75 * sprintFactor;

      rig.leftLowerLeg.rotation.x = Math.max(0, -cycle * 0.6 * sprintFactor);
      rig.rightLowerLeg.rotation.x = Math.max(0, cycle * 0.6 * sprintFactor);

      // Torso bob & forward lean
      rig.torso.rotation.x = state.isSprinting ? 0.25 : 0.1;
      rig.torso.rotation.y = cycle * 0.08;

      // Off-hand swing
      if (!state.isAiming) {
        rig.leftArm.rotation.x = -cycle * 0.6 * sprintFactor;
        rig.rightArm.rotation.x = cycle * 0.3 * sprintFactor;
      }
    } else {
      // Return legs to neutral
      rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0, dt * 10);
      rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, 0, dt * 10);
      rig.leftLowerLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLowerLeg.rotation.x, 0, dt * 10);
      rig.rightLowerLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLowerLeg.rotation.x, 0, dt * 10);
      rig.torso.rotation.x = THREE.MathUtils.lerp(rig.torso.rotation.x, 0, dt * 10);
      rig.torso.rotation.y = THREE.MathUtils.lerp(rig.torso.rotation.y, 0, dt * 10);
    }

    // 4. In Air / Jump
    if (state.isJumping) {
      rig.leftLeg.rotation.x = -0.4;
      rig.rightLeg.rotation.x = 0.2;
      rig.leftLowerLeg.rotation.x = 0.6;
      rig.rightLowerLeg.rotation.x = 0.8;
      rig.torso.rotation.x = -0.1;
    }

    // 5. Aim Down Sights (ADS) & Weapon Positioning
    if (state.isAiming) {
      // Right arm aimed forward
      rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -Math.PI / 2 + 0.1, dt * 14);
      rig.rightArm.rotation.y = THREE.MathUtils.lerp(rig.rightArm.rotation.y, -0.2, dt * 14);
      rig.rightArm.rotation.z = THREE.MathUtils.lerp(rig.rightArm.rotation.z, 0, dt * 14);

      // Left arm supports gun barrel
      rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, -Math.PI / 2.2, dt * 14);
      rig.leftArm.rotation.y = THREE.MathUtils.lerp(rig.leftArm.rotation.y, 0.45, dt * 14);
      rig.leftArm.rotation.z = THREE.MathUtils.lerp(rig.leftArm.rotation.z, -0.15, dt * 14);

      rig.weaponMount.position.set(-0.1, -0.32, 0.38);
    } else {
      // Hip fire / relaxed ready carry
      rig.rightArm.rotation.x = THREE.MathUtils.lerp(rig.rightArm.rotation.x, -Math.PI / 3, dt * 10);
      rig.rightArm.rotation.y = THREE.MathUtils.lerp(rig.rightArm.rotation.y, -0.15, dt * 10);

      rig.leftArm.rotation.x = THREE.MathUtils.lerp(rig.leftArm.rotation.x, -Math.PI / 3.6, dt * 10);
      rig.leftArm.rotation.y = THREE.MathUtils.lerp(rig.leftArm.rotation.y, 0.3, dt * 10);

      rig.weaponMount.position.set(0, -0.44, 0.2);
    }

    // 6. Recoil kick
    if (state.recoilIntensity > 0) {
      rig.rightArm.rotation.x += state.recoilIntensity * 0.15;
      rig.torso.rotation.x -= state.recoilIntensity * 0.05;
      rig.weaponMount.position.z -= state.recoilIntensity * 0.08;
    }
  }
}
