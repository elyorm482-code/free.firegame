import * as THREE from 'three';
import { WeaponType } from '../../types/game';
import { WEAPONS } from '../constants';

export class WeaponModelFactory {
  // Cache materials
  private static gunMetalMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f242d,
    roughness: 0.35,
    metalness: 0.85
  });

  private static darkTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.6,
    metalness: 0.4
  });

  private static goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.95
  });

  private static orangeNeonMaterial = new THREE.MeshStandardMaterial({
    color: 0xff6b00,
    emissive: 0xff4500,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });

  private static cyanNeonMaterial = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });

  private static purpleNeonMaterial = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0x9333ea,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });

  private static lensMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x00e5ff,
    transmission: 0.8,
    opacity: 1,
    transparent: true,
    roughness: 0.1,
    ior: 1.5
  });

  public static createWeaponMesh(type: WeaponType): THREE.Group {
    const group = new THREE.Group();
    group.name = `weapon_${type}`;

    switch (type) {
      case 'rifle':
        this.buildRifle(group);
        break;
      case 'smg':
        this.buildSMG(group);
        break;
      case 'sniper':
        this.buildSniper(group);
        break;
      case 'pistol':
        this.buildPistol(group);
        break;
    }

    // Enable shadows
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return group;
  }

  private static buildRifle(group: THREE.Group) {
    // Body / Receiver
    const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, 0.55);
    const body = new THREE.Mesh(bodyGeo, this.gunMetalMaterial);
    body.position.set(0, 0, 0);
    group.add(body);

    // Orange accent rail
    const railGeo = new THREE.BoxGeometry(0.084, 0.02, 0.4);
    const rail = new THREE.Mesh(railGeo, this.orangeNeonMaterial);
    rail.position.set(0, 0.065, 0.05);
    group.add(rail);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, this.darkTrimMaterial);
    barrel.position.set(0, 0.02, 0.42);
    group.add(barrel);

    // Muzzle Brake
    const muzzleGeo = new THREE.CylinderGeometry(0.026, 0.024, 0.08, 12);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, this.gunMetalMaterial);
    muzzle.position.set(0, 0.02, 0.6);
    group.add(muzzle);

    // Magazine (curved curved box)
    const magGeo = new THREE.BoxGeometry(0.06, 0.22, 0.09);
    const mag = new THREE.Mesh(magGeo, this.darkTrimMaterial);
    mag.position.set(0, -0.14, 0.12);
    mag.rotation.x = 0.2;
    group.add(mag);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.06, 0.16, 0.07);
    const grip = new THREE.Mesh(gripGeo, this.darkTrimMaterial);
    grip.position.set(0, -0.12, -0.12);
    grip.rotation.x = -0.3;
    group.add(grip);

    // Tactical Stock
    const stockGeo = new THREE.BoxGeometry(0.06, 0.12, 0.25);
    const stock = new THREE.Mesh(stockGeo, this.darkTrimMaterial);
    stock.position.set(0, -0.01, -0.36);
    group.add(stock);

    // Holo Sight
    const holoGeo = new THREE.BoxGeometry(0.06, 0.07, 0.12);
    const holo = new THREE.Mesh(holoGeo, this.gunMetalMaterial);
    holo.position.set(0, 0.1, 0.04);
    group.add(holo);

    const reticleGeo = new THREE.PlaneGeometry(0.04, 0.04);
    const reticleMat = new THREE.MeshBasicMaterial({ color: 0xff3b00, side: THREE.DoubleSide });
    const reticle = new THREE.Mesh(reticleGeo, reticleMat);
    reticle.position.set(0, 0.1, 0.09);
    group.add(reticle);
  }

  private static buildSMG(group: THREE.Group) {
    // Compact frame
    const bodyGeo = new THREE.BoxGeometry(0.07, 0.1, 0.38);
    const body = new THREE.Mesh(bodyGeo, this.gunMetalMaterial);
    group.add(body);

    // Cyan energy stripes
    const stripeGeo = new THREE.BoxGeometry(0.076, 0.02, 0.3);
    const stripe = new THREE.Mesh(stripeGeo, this.cyanNeonMaterial);
    stripe.position.set(0, 0.045, 0.02);
    group.add(stripe);

    // Short barrel with shroud
    const barrelGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.18, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, this.darkTrimMaterial);
    barrel.position.set(0, 0.01, 0.26);
    group.add(barrel);

    // Extended drum/stick magazine
    const magGeo = new THREE.BoxGeometry(0.055, 0.24, 0.08);
    const mag = new THREE.Mesh(magGeo, this.cyanNeonMaterial);
    mag.position.set(0, -0.15, 0.08);
    group.add(mag);

    // Foregrip
    const foregripGeo = new THREE.BoxGeometry(0.05, 0.1, 0.05);
    const foregrip = new THREE.Mesh(foregripGeo, this.darkTrimMaterial);
    foregrip.position.set(0, -0.09, 0.18);
    group.add(foregrip);

    // Handle grip
    const gripGeo = new THREE.BoxGeometry(0.055, 0.14, 0.06);
    const grip = new THREE.Mesh(gripGeo, this.darkTrimMaterial);
    grip.position.set(0, -0.1, -0.08);
    grip.rotation.x = -0.25;
    group.add(grip);
  }

  private static buildSniper(group: THREE.Group) {
    // Sleek long frame
    const bodyGeo = new THREE.BoxGeometry(0.09, 0.13, 0.65);
    const body = new THREE.Mesh(bodyGeo, this.gunMetalMaterial);
    group.add(body);

    // Gold trim
    const goldGeo = new THREE.BoxGeometry(0.094, 0.025, 0.5);
    const gold = new THREE.Mesh(goldGeo, this.goldMaterial);
    gold.position.set(0, 0.06, 0.02);
    group.add(gold);

    // Extra Long Heavy Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.68, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, this.darkTrimMaterial);
    barrel.position.set(0, 0.03, 0.62);
    group.add(barrel);

    // Large Muzzle Suppressor
    const muzzleGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.16, 12);
    muzzleGeo.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeo, this.gunMetalMaterial);
    muzzle.position.set(0, 0.03, 0.98);
    group.add(muzzle);

    // Elevated Scope Mount
    const mountGeo = new THREE.BoxGeometry(0.05, 0.05, 0.15);
    const mount = new THREE.Mesh(mountGeo, this.darkTrimMaterial);
    mount.position.set(0, 0.09, 0.05);
    group.add(mount);

    // High Power Scope Tube
    const scopeGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.36, 16);
    scopeGeo.rotateX(Math.PI / 2);
    const scope = new THREE.Mesh(scopeGeo, this.gunMetalMaterial);
    scope.position.set(0, 0.14, 0.05);
    group.add(scope);

    // Scope Lens
    const lensGeo = new THREE.CircleGeometry(0.038, 16);
    const lens = new THREE.Mesh(lensGeo, this.lensMaterial);
    lens.position.set(0, 0.14, 0.231);
    group.add(lens);

    // Bipod legs
    const bipodGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6);
    const bipodL = new THREE.Mesh(bipodGeo, this.darkTrimMaterial);
    bipodL.position.set(-0.06, -0.06, 0.45);
    bipodL.rotation.z = 0.35;
    group.add(bipodL);

    const bipodR = new THREE.Mesh(bipodGeo, this.darkTrimMaterial);
    bipodR.position.set(0.06, -0.06, 0.45);
    bipodR.rotation.z = -0.35;
    group.add(bipodR);

    // Ergonomic Stock
    const stockGeo = new THREE.BoxGeometry(0.07, 0.15, 0.32);
    const stock = new THREE.Mesh(stockGeo, this.darkTrimMaterial);
    stock.position.set(0, -0.02, -0.45);
    group.add(stock);
  }

  private static buildPistol(group: THREE.Group) {
    // Slide
    const slideGeo = new THREE.BoxGeometry(0.06, 0.07, 0.28);
    const slide = new THREE.Mesh(slideGeo, this.purpleNeonMaterial);
    slide.position.set(0, 0.04, 0.02);
    group.add(slide);

    // Lower Frame
    const frameGeo = new THREE.BoxGeometry(0.055, 0.06, 0.26);
    const frame = new THREE.Mesh(frameGeo, this.gunMetalMaterial);
    frame.position.set(0, -0.01, 0.01);
    group.add(frame);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.05, 0.14, 0.07);
    const grip = new THREE.Mesh(gripGeo, this.darkTrimMaterial);
    grip.position.set(0, -0.09, -0.07);
    grip.rotation.x = -0.3;
    group.add(grip);
  }

  // Create floating 3D loot beacon for ground pickups
  public static createLootDropMesh(weaponType: WeaponType | 'medkit' | 'armor'): THREE.Group {
    const root = new THREE.Group();

    if (weaponType === 'medkit') {
      const boxGeo = new THREE.BoxGeometry(0.45, 0.3, 0.3);
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      root.add(box);

      // Red cross
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.31), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.31), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      root.add(crossH);
      root.add(crossV);
    } else if (weaponType === 'armor') {
      const vestGeo = new THREE.CylinderGeometry(0.25, 0.22, 0.35, 8);
      const vestMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.6, roughness: 0.2 });
      const vest = new THREE.Mesh(vestGeo, vestMat);
      root.add(vest);
    } else {
      const weaponMesh = this.createWeaponMesh(weaponType);
      weaponMesh.scale.set(1.5, 1.5, 1.5);
      root.add(weaponMesh);
    }

    // Vertical holographic beacon beam
    const beamGeo = new THREE.CylinderGeometry(0.03, 0.2, 2.5, 16);
    const color = weaponType in WEAPONS ? WEAPONS[weaponType as WeaponType].color : (weaponType === 'medkit' ? '#10b981' : '#3b82f6');
    const beamMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.25;
    root.add(beam);

    // Glowing base pedestal ring
    const ringGeo = new THREE.RingGeometry(0.3, 0.45, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, beamMat);
    ring.position.y = 0.02;
    root.add(ring);

    return root;
  }
}
