import * as THREE from 'three';
import { LootItem, SafeZoneState, WeaponType } from '../../types/game';
import { MAP_SIZE, WEAPONS } from '../constants';

export interface MapCollider {
  box: THREE.Box3;
  mesh?: THREE.Object3D;
  isObstacle: boolean;
}

export interface LandmarkPOI {
  name: string;
  position: { x: number; z: number };
  radius: number;
  type: string;
}

export class BattleRoyaleMap {
  public scene: THREE.Scene;
  public colliders: MapCollider[] = [];
  public lootSpawnPoints: { position: THREE.Vector3; type: WeaponType | 'medkit' | 'armor' }[] = [];
  public pois: LandmarkPOI[] = [];
  
  // Safe zone visual meshes
  public safeZoneMesh: THREE.Mesh | null = null;
  public safeZoneWarningRing: THREE.Mesh | null = null;
  public oceanMesh: THREE.Mesh | null = null;
  
  private safeZoneMaterial: THREE.MeshBasicMaterial | null = null;
  private animTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public generateMap(): { spawnPoints: THREE.Vector3[]; pois: LandmarkPOI[] } {
    // 1. Terrain Ground
    this.createTerrain();

    // 2. Ocean
    this.createOcean();

    // 3. Landmarks / POIs
    this.createCitadelPOI(new THREE.Vector3(0, 0, 0)); // Center (0,0)
    this.createShipyardPOI(new THREE.Vector3(-120, 0, -100)); // NW
    this.createRadarBunkerPOI(new THREE.Vector3(130, 0, -110)); // NE
    this.createStiltVillagePOI(new THREE.Vector3(-110, 0, 110)); // SW
    this.createObservatoryPOI(new THREE.Vector3(120, 0, 120)); // SE

    // 4. Foliage & Boulders & Roads
    this.createScatterEnvironment();

    // 5. Shrinking Safe Zone Cylinder
    this.createSafeZoneVisuals();

    // 6. Generate Candidate Player Spawn Points around the map
    const spawnPoints: THREE.Vector3[] = [
      new THREE.Vector3(-80, 2, -70),
      new THREE.Vector3(80, 2, -70),
      new THREE.Vector3(-70, 2, 80),
      new THREE.Vector3(70, 2, 80),
      new THREE.Vector3(0, 2, -140),
      new THREE.Vector3(0, 2, 140),
      new THREE.Vector3(-140, 2, 0),
      new THREE.Vector3(140, 2, 0),
      new THREE.Vector3(-40, 2, -40),
      new THREE.Vector3(40, 2, 40)
    ];

    return { spawnPoints, pois: this.pois };
  }

  private createTerrain() {
    const terrainGeo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, 64, 64);
    terrainGeo.rotateX(-Math.PI / 2);

    // Apply procedural island elevation: central plateau with beach falloff
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const distFromCenter = Math.sqrt(x * x + z * z);
      
      // Island mask: high in center, slopes down to ocean at edges
      const islandMask = Math.max(0, 1 - (distFromCenter / (MAP_SIZE * 0.46)));
      
      // Organic terrain hills with noise approximation
      const hill1 = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 3.5;
      const hill2 = Math.sin(x * 0.07 + 1.2) * Math.sin(z * 0.07 + 2.1) * 1.5;
      
      // Central mountain at SE (Observatory)
      const distSE = Math.hypot(x - 120, z - 120);
      const mountain = Math.max(0, (1 - distSE / 60)) * 12;

      let y = (hill1 + hill2 + mountain) * islandMask;
      if (distFromCenter > MAP_SIZE * 0.44) {
        y = -2; // Submerge into ocean
      }
      pos.setY(i, y);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x223624, // Tactical dark grass
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);
  }

  private createOcean() {
    const oceanGeo = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x064e6b,
      transparent: true,
      opacity: 0.85,
      roughness: 0.2,
      metalness: 0.5
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.y = -0.5;
    this.scene.add(this.oceanMesh);
  }

  // --- POI 1: Central Cyber Citadel ---
  private createCitadelPOI(center: THREE.Vector3) {
    this.pois.push({ name: 'CYBER CITADEL', position: { x: center.x, z: center.z }, radius: 45, type: 'citadel' });

    // Main multi-story command tower
    this.createBuilding(center.x, 0, center.z, 24, 16, 24, 0x1e2430);
    // Upper tier
    this.createBuilding(center.x, 16, center.z, 14, 12, 14, 0x0f172a);

    // Glowing antennas
    const antGeo = new THREE.CylinderGeometry(0.3, 0.3, 10, 8);
    const antMat = new THREE.MeshBasicMaterial({ color: 0xff6b00 });
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.set(center.x, 33, center.z);
    this.scene.add(ant);

    // Flanking pavilions
    this.createBuilding(center.x - 22, 0, center.z, 12, 8, 12, 0x242d3d);
    this.createBuilding(center.x + 22, 0, center.z, 12, 8, 12, 0x242d3d);
    this.createBuilding(center.x, 0, center.z - 22, 12, 8, 12, 0x242d3d);
    this.createBuilding(center.x, 0, center.z + 22, 12, 8, 12, 0x242d3d);

    // High Tier Loot inside Citadel
    this.lootSpawnPoints.push(
      { position: new THREE.Vector3(center.x, 0.5, center.z + 6), type: 'rifle' },
      { position: new THREE.Vector3(center.x + 6, 0.5, center.z), type: 'sniper' },
      { position: new THREE.Vector3(center.x - 6, 0.5, center.z), type: 'armor' },
      { position: new THREE.Vector3(center.x, 0.5, center.z - 6), type: 'medkit' },
      { position: new THREE.Vector3(center.x - 22, 0.5, center.z), type: 'smg' },
      { position: new THREE.Vector3(center.x + 22, 0.5, center.z), type: 'rifle' }
    );
  }

  // --- POI 2: Shipping Harbor & Docks ---
  private createShipyardPOI(center: THREE.Vector3) {
    this.pois.push({ name: 'CARGO SHIPYARD', position: { x: center.x, z: center.z }, radius: 40, type: 'industrial' });

    // Warehouses
    this.createBuilding(center.x - 15, 0, center.z, 18, 9, 32, 0x334155);
    this.createBuilding(center.x + 20, 0, center.z - 10, 16, 8, 24, 0x1e293b);

    // Colorful Shipping Containers (cover and loot)
    const colors = [0xdc2626, 0x2563eb, 0xca8a04, 0x16a34a, 0x9333ea];
    for (let i = 0; i < 14; i++) {
      const offsetX = (i % 4) * 8 - 12;
      const offsetZ = Math.floor(i / 4) * 12 + 10;
      const cColor = colors[i % colors.length];
      const isStacked = i % 3 === 0;

      this.createContainer(center.x + offsetX, 0, center.z + offsetZ, cColor);
      if (isStacked) {
        this.createContainer(center.x + offsetX, 3.2, center.z + offsetZ, colors[(i + 1) % colors.length]);
      }
    }

    // Shipyard Loot
    this.lootSpawnPoints.push(
      { position: new THREE.Vector3(center.x - 15, 0.5, center.z), type: 'smg' },
      { position: new THREE.Vector3(center.x - 15, 0.5, center.z + 8), type: 'rifle' },
      { position: new THREE.Vector3(center.x + 20, 0.5, center.z - 10), type: 'armor' },
      { position: new THREE.Vector3(center.x, 0.5, center.z + 18), type: 'medkit' }
    );
  }

  // --- POI 3: Military Radar Bunker ---
  private createRadarBunkerPOI(center: THREE.Vector3) {
    this.pois.push({ name: 'RADAR ALPHA', position: { x: center.x, z: center.z }, radius: 35, type: 'military' });

    // Concrete heavy bunker
    this.createBuilding(center.x, 0, center.z, 22, 6, 22, 0x475569);

    // Giant Radar Dish
    const dishPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2, 5, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
    );
    dishPedestal.position.set(center.x, 8.5, center.z);
    this.scene.add(dishPedestal);

    const dishGeo = new THREE.CylinderGeometry(8, 0.5, 2, 16, 1, true);
    dishGeo.rotateX(0.5);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, metalness: 0.9, roughness: 0.2 });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(center.x, 12, center.z);
    this.scene.add(dish);

    // Perimeter watchtowers
    this.createWatchtower(center.x - 20, 0, center.z - 20);
    this.createWatchtower(center.x + 20, 0, center.z + 20);

    // Bunker loot
    this.lootSpawnPoints.push(
      { position: new THREE.Vector3(center.x, 0.5, center.z), type: 'sniper' },
      { position: new THREE.Vector3(center.x + 4, 0.5, center.z + 4), type: 'rifle' },
      { position: new THREE.Vector3(center.x - 20, 6.5, center.z - 20), type: 'sniper' },
      { position: new THREE.Vector3(center.x + 20, 6.5, center.z + 20), type: 'armor' }
    );
  }

  // --- POI 4: Stilt Village ---
  private createStiltVillagePOI(center: THREE.Vector3) {
    this.pois.push({ name: 'STILT BAY', position: { x: center.x, z: center.z }, radius: 35, type: 'village' });

    // Rustic beach huts on stilts
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const x = center.x + Math.cos(angle) * 22;
      const z = center.z + Math.sin(angle) * 22;
      this.createStiltHut(x, 0, z);

      this.lootSpawnPoints.push({
        position: new THREE.Vector3(x, 2.5, z),
        type: i % 2 === 0 ? 'smg' : 'rifle'
      });
    }

    this.lootSpawnPoints.push(
      { position: new THREE.Vector3(center.x, 0.5, center.z), type: 'medkit' },
      { position: new THREE.Vector3(center.x + 5, 0.5, center.z), type: 'armor' }
    );
  }

  // --- POI 5: Mountain Peak Observatory ---
  private createObservatoryPOI(center: THREE.Vector3) {
    this.pois.push({ name: 'APEX OBSERVATORY', position: { x: center.x, z: center.z }, radius: 40, type: 'mountain' });

    // Observatory base
    this.createBuilding(center.x, 8, center.z, 20, 8, 20, 0x1e293b);

    // Observatory Dome
    const domeGeo = new THREE.SphereGeometry(7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.3 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(center.x, 16, center.z);
    this.scene.add(dome);

    // Sniper Vantage Point Loot
    this.lootSpawnPoints.push(
      { position: new THREE.Vector3(center.x, 8.5, center.z + 5), type: 'sniper' },
      { position: new THREE.Vector3(center.x + 5, 8.5, center.z), type: 'rifle' },
      { position: new THREE.Vector3(center.x - 5, 8.5, center.z), type: 'armor' }
    );
  }

  // --- Props & Cover Helpers ---
  private createBuilding(x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Add physical collider
    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push({ box, mesh, isObstacle: true });

    // Accent line
    const trimGeo = new THREE.BoxGeometry(w + 0.2, 0.4, d + 0.2);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0x00d2ff });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(x, y + h - 0.2, z);
    this.scene.add(trim);
  }

  private createContainer(x: number, y: number, z: number, color: number) {
    const geo = new THREE.BoxGeometry(3.2, 3.0, 7.0);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + 1.5, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    this.colliders.push({ box, mesh, isObstacle: true });
  }

  private createWatchtower(x: number, y: number, z: number) {
    // 4 legs
    const legGeo = new THREE.CylinderGeometry(0.2, 0.2, 6, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const offsets = [
      [-2, -2],
      [-2, 2],
      [2, -2],
      [2, 2]
    ];
    offsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x + ox, y + 3, z + oz);
      this.scene.add(leg);
    });

    // Platform
    const platGeo = new THREE.BoxGeometry(5.5, 0.4, 5.5);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.set(x, y + 6, z);
    this.scene.add(plat);

    const box = new THREE.Box3().setFromObject(plat);
    this.colliders.push({ box, mesh: plat, isObstacle: true });
  }

  private createStiltHut(x: number, y: number, z: number) {
    // Platform
    const platGeo = new THREE.BoxGeometry(6, 0.5, 6);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.set(x, y + 2, z);
    this.scene.add(plat);

    // Walls
    const wallGeo = new THREE.BoxGeometry(5.4, 3, 5.4);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(x, y + 3.75, z);
    this.scene.add(wall);

    const box = new THREE.Box3().setFromObject(wall);
    this.colliders.push({ box, mesh: wall, isObstacle: true });
  }

  private createScatterEnvironment() {
    // Palm Trees & Rocks across the island
    const rockGeo = new THREE.DodecahedronGeometry(1.8, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });

    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const leavesGeo = new THREE.ConeGeometry(3.5, 3.0, 6);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, flatShading: true });

    // Seed rocks & trees
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * (MAP_SIZE * 0.35);
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;

      if (i % 2 === 0) {
        // Boulder cover
        const rock = new THREE.Mesh(rockGeo, rockMat);
        rock.position.set(rx, 1.2, rz);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.castShadow = true;
        rock.receiveShadow = true;
        this.scene.add(rock);

        const box = new THREE.Box3().setFromObject(rock);
        this.colliders.push({ box, mesh: rock, isObstacle: true });
      } else {
        // Palm Tree
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(rx, 3, rz);
        trunk.rotation.z = (Math.random() - 0.5) * 0.15;
        trunk.castShadow = true;
        this.scene.add(trunk);

        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.set(rx, 6.2, rz);
        leaves.castShadow = true;
        this.scene.add(leaves);

        const box = new THREE.Box3().setFromObject(trunk);
        this.colliders.push({ box, mesh: trunk, isObstacle: true });
      }
    }
  }

  // Safe Zone Visual Cylinder (Blue Plasma Energy Barrier)
  private createSafeZoneVisuals() {
    const radius = 240;
    const height = 120;
    const cylinderGeo = new THREE.CylinderGeometry(radius, radius, height, 48, 1, true);

    this.safeZoneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      wireframe: false
    });

    this.safeZoneMesh = new THREE.Mesh(cylinderGeo, this.safeZoneMaterial);
    this.safeZoneMesh.position.set(0, height / 2, 0);
    this.scene.add(this.safeZoneMesh);

    // Target Next Zone Warning Ring on ground
    const ringGeo = new THREE.RingGeometry(radius * 0.6, radius * 0.6 + 1.2, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    this.safeZoneWarningRing = new THREE.Mesh(ringGeo, ringMat);
    this.safeZoneWarningRing.position.set(0, 0.4, 0);
    this.scene.add(this.safeZoneWarningRing);
  }

  public updateSafeZone(zone: SafeZoneState, dt: number) {
    this.animTimer += dt;
    if (this.safeZoneMesh && this.safeZoneMaterial) {
      // Scale cylinder to current safe zone radius
      const scale = zone.currentRadius / 240;
      this.safeZoneMesh.scale.set(scale, 1, scale);
      this.safeZoneMesh.position.x = zone.currentCenter.x;
      this.safeZoneMesh.position.z = zone.currentCenter.z;

      // Pulse opacity when shrinking
      const pulse = zone.isShrinking ? 0.35 + Math.sin(this.animTimer * 6) * 0.12 : 0.25;
      this.safeZoneMaterial.opacity = pulse;
    }

    if (this.safeZoneWarningRing) {
      const targetScale = zone.targetRadius / (240 * 0.6);
      this.safeZoneWarningRing.scale.set(targetScale, targetScale, targetScale);
      this.safeZoneWarningRing.position.x = zone.targetCenter.x;
      this.safeZoneWarningRing.position.z = zone.targetCenter.z;
    }
  }

  // Fast Bounding Box Collision Check for player movement
  public checkCollision(pos: THREE.Vector3, playerRadius: number = 0.5): boolean {
    const playerMin = new THREE.Vector3(pos.x - playerRadius, pos.y, pos.z - playerRadius);
    const playerMax = new THREE.Vector3(pos.x + playerRadius, pos.y + 1.8, pos.z + playerRadius);
    const playerBox = new THREE.Box3(playerMin, playerMax);

    for (const collider of this.colliders) {
      if (collider.box.intersectsBox(playerBox)) {
        return true;
      }
    }
    return false;
  }
}
