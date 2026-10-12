import * as THREE from 'three';
import {
  CharacterId,
  ClientPacket,
  LootItem,
  PlayerState,
  RoomInfo,
  SafeZoneState,
  ServerPacket,
  WeaponType
} from '../../types/game';
import { CHARACTERS, MAP_SIZE, WEAPONS } from '../constants';
import { sound } from '../audio/SoundSystem';
import { CharacterModelFactory, CharacterRigs } from './CharacterModels';
import { BattleRoyaleMap, MapCollider } from './MapGenerator';
import { WeaponModelFactory } from './WeaponModels';

export interface FloatingDamageNumber {
  id: string;
  amount: number;
  isHeadshot: boolean;
  screenX: number;
  screenY: number;
  life: number;
}

export interface EngineCallbacks {
  onHUDUpdate: (data: {
    health: number;
    maxHealth: number;
    armor: number;
    maxArmor: number;
    currentWeapon: WeaponType;
    ammoInMag: number;
    ammoReserve: number;
    isReloading: boolean;
    isAiming: boolean;
    aliveCount: number;
    kills: number;
    damageDealt: number;
    safeZone: SafeZoneState;
    nearbyLoot: LootItem | null;
    compassHeading: number;
    ping: number;
    isInStorm: boolean;
  }) => void;
  onHitMarker: (isHeadshot: boolean, damage: number) => void;
  onDamageTaken: (sourceAngle: number) => void;
  onKillFeed: (entry: { killer: string; victim: string; weapon: string; headshot: boolean }) => void;
  onGameOver: (winnerName: string, isVictory: boolean, stats: { kills: number; damage: number; rank: number }) => void;
}

interface RemotePlayerEntity {
  state: PlayerState;
  rig: CharacterRigs;
  model: THREE.Group;
  targetPos: THREE.Vector3;
  targetRotY: number;
  animTime: number;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  
  // Three.js Core
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  // Map & Systems
  public map: BattleRoyaleMap;
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private isDestroyed: boolean = false;

  // Local Player
  public localPlayerId: string = 'local';
  public localPlayerState: PlayerState;
  private localRig: CharacterRigs | null = null;
  private localModel: THREE.Group | null = null;

  // Camera Control
  private cameraYaw: number = 0;
  private cameraPitch: number = 0;
  private cameraDistance: number = 3.6;
  private targetCameraDistance: number = 3.6;
  private cameraOffset: THREE.Vector3 = new THREE.Vector3(0.7, 1.7, 0); // Over the shoulder

  // Player Physics & Movement
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private isGrounded: boolean = true;
  private moveForward: number = 0;
  private moveRight: number = 0;
  private isSprinting: boolean = false;
  private isCrouching: boolean = false;
  private isAiming: boolean = false;
  private isReloading: boolean = false;
  private reloadTimer: number = 0;
  private recoilPitch: number = 0;
  private animTime: number = 0;
  private footstepTimer: number = 0;
  private lastShootTime: number = 0;

  // Remote Players & Bots
  private remotePlayers: Map<string, RemotePlayerEntity> = new Map();
  private bots: { id: string; state: PlayerState; rig: CharacterRigs; model: THREE.Group; aiTimer: number; targetX: number; targetZ: number }[] = [];
  public isSoloBotMode: boolean = false;

  // Loot & Safe Zone
  private groundLootMeshes: Map<string, { mesh: THREE.Group; item: LootItem }> = new Map();
  private safeZone: SafeZoneState;
  private nearbyLoot: LootItem | null = null;
  private stormWarningTimer: number = 0;

  // Networking
  private ws: WebSocket | null = null;
  private ping: number = 24;
  private lastPingSent: number = 0;
  private networkTickTimer: number = 0;

  // Tracers & FX
  private bulletTracers: { mesh: THREE.Line; velocity: THREE.Vector3; life: number }[] = [];

  // Key state
  private keys: Record<string, boolean> = {};

  // Settings
  public mouseSensitivity: number = 0.0022;
  public adsSensitivityMult: number = 0.6;
  public graphicsQuality: 'low' | 'balanced' | 'high' | 'ultra' = 'high';

  constructor(container: HTMLElement, callbacks: EngineCallbacks, characterId: CharacterId, playerName: string, skinId: string = 'default') {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c131d);
    this.scene.fog = new THREE.FogExp2(0x0e1726, 0.0025);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 10);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.ambientLight = new THREE.AmbientLight(0xd1e0ff, 0.7);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff3db, 1.8);
    this.dirLight.position.set(100, 150, 80);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 400;
    const d = 160;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);

    // 5. Initial Player State
    const charDef = CHARACTERS.find((c) => c.id === characterId) || CHARACTERS[0];
    this.localPlayerState = {
      id: this.localPlayerId,
      name: playerName || 'Operator',
      characterId,
      color: charDef.primaryColor,
      isHost: true,
      isReady: true,
      isAlive: true,
      health: charDef.health,
      maxHealth: charDef.health,
      armor: charDef.armor,
      maxArmor: 100,
      kills: 0,
      damageDealt: 0,
      position: { x: 0, y: 3, z: 0 },
      rotation: { yaw: 0, pitch: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      isMoving: false,
      isSprinting: false,
      isJumping: false,
      isCrouching: false,
      isAiming: false,
      isReloading: false,
      currentWeapon: 'rifle',
      ammo: {
        rifle: { inMag: 30, reserve: 120 },
        smg: { inMag: 36, reserve: 144 },
        sniper: { inMag: 5, reserve: 25 },
        pistol: { inMag: 8, reserve: 40 }
      }
    };

    // Safe Zone
    this.safeZone = {
      currentCenter: { x: 0, z: 0 },
      targetCenter: { x: 0, z: 0 },
      currentRadius: 220,
      targetRadius: 150,
      isShrinking: false,
      shrinkSpeed: 2.8,
      shrinkTimer: 35,
      damagePerSec: 4,
      phase: 1,
      maxPhases: 4
    };

    // 6. Map Generation
    this.map = new BattleRoyaleMap(this.scene);
    const { spawnPoints } = this.map.generateMap();

    // Pick random spawn
    const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    this.localPlayerState.position = { x: spawn.x, y: spawn.y, z: spawn.z };

    // 7. Spawn Local Character Rig
    const { rig, model } = CharacterModelFactory.createCharacter(characterId, false, skinId);
    this.localRig = rig;
    this.localModel = model;
    this.localModel.position.set(spawn.x, spawn.y, spawn.z);
    this.scene.add(this.localModel);

    // 8. Setup Controls
    this.setupEventListeners();

    // 9. Start Render Loop
    this.lastTime = performance.now();
    this.animate();
  }

  // --- CONNECT TO WEBSOCKET MULTIPLAYER ---
  public connect(roomCode?: string, createNew?: boolean) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.sendPacket({
          type: 'join_room',
          code: roomCode,
          playerName: this.localPlayerState.name,
          characterId: this.localPlayerState.characterId,
          createNew: createNew ?? false
        });
        this.lastPingSent = performance.now();
        this.sendPacket({ type: 'ping', timestamp: this.lastPingSent });
      };

      this.ws.onmessage = (event) => {
        try {
          const packet: ServerPacket = JSON.parse(event.data);
          this.handleServerPacket(packet);
        } catch {
          // invalid payload
        }
      };

      this.ws.onerror = () => {
        // Fallback to offline mode with smart AI bots if network fails
        if (this.remotePlayers.size === 0) {
          this.initSoloBots();
        }
      };

      this.ws.onclose = () => {
        if (!this.isDestroyed && this.remotePlayers.size === 0) {
          this.initSoloBots();
        }
      };
    } catch {
      this.initSoloBots();
    }
  }

  // Start Offline / Training Mode with 9 Battle Royale AI Bots
  public initSoloBots() {
    this.isSoloBotMode = true;
    this.bots = [];

    // Spawn 8 bot opponents
    const botNames = ['ShadowStrike', 'Ghost_Rider', 'Valkyrie99', 'BlazeFury', 'CyberPunkX', 'ReaperX', 'NightHawk', 'ZeroCool'];
    const botChars: CharacterId[] = ['viper', 'titan', 'mirage', 'nyx'];

    for (let i = 0; i < botNames.length; i++) {
      const charId = botChars[i % botChars.length];
      const botId = `bot_${i}`;
      const angle = (i / botNames.length) * Math.PI * 2 + 0.3;
      const dist = 70 + (i % 3) * 35;
      const bx = Math.cos(angle) * dist;
      const bz = Math.sin(angle) * dist;

      const { rig, model } = CharacterModelFactory.createCharacter(charId, true);
      model.position.set(bx, 2, bz);
      this.scene.add(model);

      const botState: PlayerState = {
        id: botId,
        name: botNames[i],
        characterId: charId,
        color: '#f59e0b',
        isHost: false,
        isReady: true,
        isAlive: true,
        health: 100,
        maxHealth: 100,
        armor: 80,
        maxArmor: 100,
        kills: 0,
        damageDealt: 0,
        position: { x: bx, y: 2, z: bz },
        rotation: { yaw: Math.random() * Math.PI * 2, pitch: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        isMoving: false,
        isSprinting: false,
        isJumping: false,
        isCrouching: false,
        isAiming: false,
        isReloading: false,
        currentWeapon: (i % 2 === 0 ? 'rifle' : 'smg') as WeaponType,
        ammo: {
          rifle: { inMag: 30, reserve: 90 },
          smg: { inMag: 36, reserve: 100 }
        }
      };

      this.bots.push({
        id: botId,
        state: botState,
        rig,
        model,
        aiTimer: Math.random() * 2,
        targetX: bx + (Math.random() - 0.5) * 30,
        targetZ: bz + (Math.random() - 0.5) * 30
      });
    }

    // Spawn offline ground loot
    this.spawnGroundLoot(this.map.lootSpawnPoints.map((p, idx) => ({
      id: `loot_${idx}`,
      type: p.type === 'medkit' ? 'medkit' : p.type === 'armor' ? 'armor' : 'weapon',
      weaponType: (p.type !== 'medkit' && p.type !== 'armor') ? p.type as WeaponType : undefined,
      name: p.type.toUpperCase(),
      position: { x: p.position.x, y: p.position.y, z: p.position.z },
      rarity: 'rare'
    })));
  }

  private handleServerPacket(packet: ServerPacket) {
    switch (packet.type) {
      case 'room_joined':
        this.localPlayerId = packet.selfId;
        this.localPlayerState.id = packet.selfId;
        break;

      case 'game_started':
        this.safeZone = packet.safeZone;
        this.spawnGroundLoot(packet.loot);
        break;

      case 'world_tick':
        this.safeZone = packet.safeZone;
        this.syncRemotePlayers(packet.players);
        break;

      case 'player_fired':
        this.handleRemoteFired(packet.playerId, packet.weaponType, packet.origin, packet.direction);
        break;

      case 'player_damaged':
        if (packet.victimId === this.localPlayerId) {
          this.localPlayerState.health = packet.currentHealth;
          this.localPlayerState.armor = packet.currentArmor;
          sound.playDamageTaken();
          this.callbacks.onDamageTaken(0); // Red flinch indicator
        }
        break;

      case 'player_eliminated':
        this.callbacks.onKillFeed({
          killer: packet.killerName,
          victim: packet.victimName,
          weapon: packet.weaponName,
          headshot: packet.isHeadshot
        });
        if (packet.victimId === this.localPlayerId) {
          this.localPlayerState.isAlive = false;
          sound.playDamageTaken();
          this.callbacks.onGameOver(packet.killerName, false, {
            kills: this.localPlayerState.kills,
            damage: this.localPlayerState.damageDealt,
            rank: packet.aliveCount + 1
          });
        }
        break;

      case 'loot_picked_up':
        this.removeLootMesh(packet.lootId);
        break;

      case 'game_over':
        const isVictory = packet.winnerId === this.localPlayerId;
        if (isVictory) sound.playVictory();
        this.callbacks.onGameOver(packet.winnerName, isVictory, {
          kills: this.localPlayerState.kills,
          damage: this.localPlayerState.damageDealt,
          rank: isVictory ? 1 : 2
        });
        break;

      case 'pong':
        this.ping = Math.round(performance.now() - packet.timestamp);
        break;
    }
  }

  private syncRemotePlayers(players: Partial<PlayerState>[]) {
    players.forEach((p) => {
      if (!p.id || p.id === this.localPlayerId) return;

      let remote = this.remotePlayers.get(p.id);
      if (!remote) {
        // Spawn remote player model
        const { rig, model } = CharacterModelFactory.createCharacter(p.characterId || 'viper', true);
        this.scene.add(model);
        remote = {
          state: p as PlayerState,
          rig,
          model,
          targetPos: new THREE.Vector3(p.position?.x || 0, p.position?.y || 0, p.position?.z || 0),
          targetRotY: p.rotation?.yaw || 0,
          animTime: 0
        };
        this.remotePlayers.set(p.id, remote);
      }

      // Update state
      if (p.position) {
        remote.targetPos.set(p.position.x, p.position.y, p.position.z);
      }
      if (p.rotation) {
        remote.targetRotY = p.rotation.yaw;
      }
      if (p.health !== undefined) remote.state.health = p.health;
      if (p.armor !== undefined) remote.state.armor = p.armor;
      if (p.isAlive !== undefined) remote.state.isAlive = p.isAlive;
      if (p.isMoving !== undefined) remote.state.isMoving = p.isMoving;
      if (p.isSprinting !== undefined) remote.state.isSprinting = p.isSprinting;
      if (p.isJumping !== undefined) remote.state.isJumping = p.isJumping;
      if (p.isCrouching !== undefined) remote.state.isCrouching = p.isCrouching;
      if (p.isAiming !== undefined) remote.state.isAiming = p.isAiming;
      if (p.currentWeapon && p.currentWeapon !== remote.state.currentWeapon) {
        remote.state.currentWeapon = p.currentWeapon;
        CharacterModelFactory.switchWeapon(remote.rig, p.currentWeapon);
      }
    });
  }

  private handleRemoteFired(playerId: string, weaponType: WeaponType, origin: { x: number; y: number; z: number }, direction: { x: number; y: number; z: number }) {
    // Play 3D gunshot sound
    sound.playShoot(weaponType);

    // Spawn tracer from remote gun
    const start = new THREE.Vector3(origin.x, origin.y, origin.z);
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    this.spawnTracer(start, dir, weaponType);
  }

  // --- LOOT MESH MANAGEMENT ---
  private spawnGroundLoot(items: LootItem[]) {
    items.forEach((item) => {
      if (this.groundLootMeshes.has(item.id)) return;
      const typeKey = item.weaponType || (item.type as 'medkit' | 'armor');
      const mesh = WeaponModelFactory.createLootDropMesh(typeKey);
      mesh.position.set(item.position.x, item.position.y, item.position.z);
      this.scene.add(mesh);
      this.groundLootMeshes.set(item.id, { mesh, item });
    });
  }

  private removeLootMesh(lootId: string) {
    const entry = this.groundLootMeshes.get(lootId);
    if (entry) {
      this.scene.remove(entry.mesh);
      this.groundLootMeshes.delete(lootId);
    }
  }

  // Pickup loot action
  public pickupNearestLoot() {
    if (!this.nearbyLoot) return;
    const item = this.nearbyLoot;
    sound.playLootPickup();

    if (item.type === 'weapon' && item.weaponType) {
      this.switchWeapon(item.weaponType);
    } else if (item.type === 'medkit') {
      this.localPlayerState.health = Math.min(this.localPlayerState.maxHealth, this.localPlayerState.health + 50);
    } else if (item.type === 'armor') {
      this.localPlayerState.armor = Math.min(this.localPlayerState.maxArmor, this.localPlayerState.armor + 50);
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendPacket({ type: 'pickup_loot', lootId: item.id });
    }
    this.removeLootMesh(item.id);
    this.nearbyLoot = null;
  }

  public useConsumable(type: 'medkit' | 'armor') {
    if (type === 'medkit' && this.localPlayerState.health < this.localPlayerState.maxHealth) {
      this.localPlayerState.health = Math.min(this.localPlayerState.maxHealth, this.localPlayerState.health + 50);
      sound.playLootPickup();
    } else if (type === 'armor' && this.localPlayerState.armor < this.localPlayerState.maxArmor) {
      this.localPlayerState.armor = Math.min(this.localPlayerState.maxArmor, this.localPlayerState.armor + 50);
      sound.playLootPickup();
    }
  }

  public switchWeapon(type: WeaponType) {
    if (this.localPlayerState.currentWeapon === type) return;
    this.localPlayerState.currentWeapon = type;
    if (this.localRig) {
      CharacterModelFactory.switchWeapon(this.localRig, type);
    }
    sound.playReload();
  }

  // --- CONTROLS & INPUT ---
  private setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyR') this.reloadWeapon();
      if (e.code === 'KeyE') this.pickupNearestLoot();
      if (e.code === 'Digit1') this.switchWeapon('rifle');
      if (e.code === 'Digit2') this.switchWeapon('smg');
      if (e.code === 'Digit3') this.switchWeapon('sniper');
      if (e.code === 'Digit4') this.switchWeapon('pistol');
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse Pointer Lock
    this.container.addEventListener('click', () => {
      if (document.pointerLockElement !== this.container) {
        this.container.requestPointerLock?.();
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.container) {
        const mult = this.isAiming ? this.mouseSensitivity * this.adsSensitivityMult : this.mouseSensitivity;
        this.cameraYaw -= e.movementX * mult;
        this.cameraPitch -= e.movementY * mult;
        // Clamp pitch (-80 to +65 degrees)
        this.cameraPitch = Math.max(-1.2, Math.min(0.9, this.cameraPitch));
      }
    });

    // Mouse clicks (Left = Shoot, Right = ADS)
    this.container.addEventListener('mousedown', (e) => {
      sound.init();
      if (e.button === 0) {
        this.shoot();
      } else if (e.button === 2) {
        e.preventDefault();
        this.isAiming = !this.isAiming;
      }
    });

    this.container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Window Resize
    window.addEventListener('resize', () => {
      if (!this.container) return;
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  // Mobile virtual joystick & buttons API
  public handleMobileMove(dirX: number, dirY: number) {
    this.moveRight = dirX;
    this.moveForward = -dirY;
  }

  public handleMobileLook(deltaX: number, deltaY: number) {
    const mult = this.isAiming ? this.mouseSensitivity * 1.5 * this.adsSensitivityMult : this.mouseSensitivity * 1.5;
    this.cameraYaw -= deltaX * mult;
    this.cameraPitch -= deltaY * mult;
    this.cameraPitch = Math.max(-1.2, Math.min(0.9, this.cameraPitch));
  }

  public handleMobileJump() {
    if (this.isGrounded) {
      this.velocity.y = 8.5;
      this.isGrounded = false;
      sound.playJump();
    }
  }

  public handleMobileCrouch() {
    this.isCrouching = !this.isCrouching;
  }

  public handleMobileAimToggle() {
    this.isAiming = !this.isAiming;
  }

  public handleMobileShoot() {
    sound.init();
    this.shoot();
  }

  // --- SHOOTING & BALLISTICS ---
  public shoot() {
    if (!this.localPlayerState.isAlive || this.isReloading) return;

    const weapon = WEAPONS[this.localPlayerState.currentWeapon];
    const ammoData = this.localPlayerState.ammo[weapon.type];
    if (!ammoData || ammoData.inMag <= 0) {
      this.reloadWeapon();
      return;
    }

    const now = performance.now();
    const minInterval = (1 / weapon.fireRate) * 1000;
    if (now - this.lastShootTime < minInterval) return;
    this.lastShootTime = now;

    // Deduct ammo
    ammoData.inMag -= 1;

    // Play weapon sound
    sound.playShoot(weapon.type);

    // Apply procedural recoil to pitch and rig
    this.recoilPitch = Math.min(0.12, this.recoilPitch + 0.04);

    // Bullet Raycast Calculation
    // Origin is player eye level
    const origin = new THREE.Vector3(
      this.localPlayerState.position.x,
      this.localPlayerState.position.y + 1.5,
      this.localPlayerState.position.z
    );

    // Direction forward with weapon spread (reduced when aiming)
    const spreadMult = this.isAiming ? 0.35 : 1.0;
    const spreadX = (Math.random() - 0.5) * weapon.spread * spreadMult;
    const spreadY = (Math.random() - 0.5) * weapon.spread * spreadMult;

    // Direction from camera crosshair
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ'));
    forward.x += spreadX;
    forward.y += spreadY;
    forward.normalize();

    // Spawn tracer visual
    this.spawnTracer(origin, forward, weapon.type);

    // Check hit against remote players or bots
    this.raycastEnemies(origin, forward, weapon);

    // Network packet
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendPacket({
        type: 'player_shoot',
        weaponType: weapon.type,
        origin: { x: origin.x, y: origin.y, z: origin.z },
        direction: { x: forward.x, y: forward.y, z: forward.z },
        clientTimestamp: Date.now()
      });
    }
  }

  private raycastEnemies(origin: THREE.Vector3, dir: THREE.Vector3, weapon: typeof WEAPONS[WeaponType]) {
    const ray = new THREE.Ray(origin, dir);
    let closestDist = weapon.range;
    let hitTarget: { id: string; name: string; isHeadshot: boolean; targetPos: THREE.Vector3; isBot: boolean } | null = null;

    // 1. Check Remote Players
    for (const [id, rp] of this.remotePlayers.entries()) {
      if (!rp.state.isAlive) continue;
      const headPos = new THREE.Vector3(rp.model.position.x, rp.model.position.y + 1.5, rp.model.position.z);
      const bodyPos = new THREE.Vector3(rp.model.position.x, rp.model.position.y + 0.8, rp.model.position.z);

      const headDist = ray.distanceToPoint(headPos);
      if (headDist < 0.35) {
        const d = origin.distanceTo(headPos);
        if (d < closestDist) {
          closestDist = d;
          hitTarget = { id, name: rp.state.name, isHeadshot: true, targetPos: headPos, isBot: false };
        }
      } else {
        const bodyDist = ray.distanceToPoint(bodyPos);
        if (bodyDist < 0.65) {
          const d = origin.distanceTo(bodyPos);
          if (d < closestDist) {
            closestDist = d;
            hitTarget = { id, name: rp.state.name, isHeadshot: false, targetPos: bodyPos, isBot: false };
          }
        }
      }
    }

    // 2. Check Bots in Solo Mode
    if (this.isSoloBotMode) {
      for (const bot of this.bots) {
        if (!bot.state.isAlive) continue;
        const headPos = new THREE.Vector3(bot.model.position.x, bot.model.position.y + 1.5, bot.model.position.z);
        const bodyPos = new THREE.Vector3(bot.model.position.x, bot.model.position.y + 0.8, bot.model.position.z);

        const headDist = ray.distanceToPoint(headPos);
        if (headDist < 0.35) {
          const d = origin.distanceTo(headPos);
          if (d < closestDist) {
            closestDist = d;
            hitTarget = { id: bot.id, name: bot.state.name, isHeadshot: true, targetPos: headPos, isBot: true };
          }
        } else {
          const bodyDist = ray.distanceToPoint(bodyPos);
          if (bodyDist < 0.65) {
            const d = origin.distanceTo(bodyPos);
            if (d < closestDist) {
              closestDist = d;
              hitTarget = { id: bot.id, name: bot.state.name, isHeadshot: false, targetPos: bodyPos, isBot: true };
            }
          }
        }
      }
    }

    if (hitTarget) {
      const target = hitTarget;
      const dmg = target.isHeadshot ? Math.round(weapon.damage * weapon.headshotMultiplier) : weapon.damage;
      sound.playHitMarker(target.isHeadshot);
      this.callbacks.onHitMarker(target.isHeadshot, dmg);
      this.localPlayerState.damageDealt += dmg;

      if (target.isBot) {
        // Apply bot damage directly
        const b = this.bots.find((x) => x.id === target.id);
        if (b) {
          b.state.health -= dmg;
          if (b.state.health <= 0) {
            b.state.isAlive = false;
            this.localPlayerState.kills += 1;
            const aliveBots = this.bots.filter((x) => x.state.isAlive).length;
            this.callbacks.onKillFeed({
              killer: this.localPlayerState.name,
              victim: b.state.name,
              weapon: weapon.name,
              headshot: target.isHeadshot
            });

            if (aliveBots === 0) {
              sound.playVictory();
              this.callbacks.onGameOver(this.localPlayerState.name, true, {
                kills: this.localPlayerState.kills,
                damage: this.localPlayerState.damageDealt,
                rank: 1
              });
            }
          }
        }
      } else if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send hit verification to server
        this.sendPacket({
          type: 'player_hit',
          targetId: target.id,
          damage: weapon.damage,
          isHeadshot: target.isHeadshot,
          weaponType: weapon.type
        });
      }
    }
  }

  private spawnTracer(start: THREE.Vector3, dir: THREE.Vector3, weaponType: WeaponType) {
    const end = start.clone().add(dir.clone().multiplyScalar(120));
    const points = [start, end];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const color = weaponType === 'sniper' ? 0xfff04b : weaponType === 'rifle' ? 0xff7b00 : 0x00f2ff;
    const mat = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.bulletTracers.push({
      mesh: line,
      velocity: dir.clone().multiplyScalar(320),
      life: 0.18
    });
  }

  public reloadWeapon() {
    if (this.isReloading) return;
    const weapon = WEAPONS[this.localPlayerState.currentWeapon];
    const ammo = this.localPlayerState.ammo[weapon.type];
    if (!ammo || ammo.inMag >= weapon.magazineSize || ammo.reserve <= 0) return;

    this.isReloading = true;
    this.reloadTimer = weapon.reloadTime;
    sound.playReload();
  }

  // --- MAIN ANIMATION & UPDATE LOOP ---
  private animate = () => {
    if (this.isDestroyed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.animTime += dt;

    this.updatePlayerMovement(dt);
    this.updateCamera(dt);
    this.updateSafeZone(dt);
    this.updateTracers(dt);
    this.updateBots(dt);
    this.updateLootProximity();
    this.updateNetworkTick(dt);
    this.updateHUD();

    // Map Safe Zone shader animations
    this.map.updateSafeZone(this.safeZone, dt);

    this.renderer.render(this.scene, this.camera);
  };

  private updatePlayerMovement(dt: number) {
    if (!this.localPlayerState.isAlive) {
      if (this.localRig) {
        CharacterModelFactory.animateCharacter(this.localRig, dt, {
          isMoving: false,
          isSprinting: false,
          isJumping: false,
          isCrouching: false,
          isAiming: false,
          isAlive: false,
          animTime: this.animTime,
          recoilIntensity: 0
        });
      }
      return;
    }

    // Keyboard inputs
    let fwd = this.moveForward;
    let right = this.moveRight;

    if (this.keys['KeyW']) fwd += 1;
    if (this.keys['KeyS']) fwd -= 1;
    if (this.keys['KeyA']) right -= 1;
    if (this.keys['KeyD']) right += 1;
    if (this.keys['Space'] && this.isGrounded) {
      this.velocity.y = 8.5;
      this.isGrounded = false;
      sound.playJump();
    }
    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) && fwd > 0;
    this.isCrouching = !!this.keys['KeyC'];

    // Reload timer
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const weapon = WEAPONS[this.localPlayerState.currentWeapon];
        const ammo = this.localPlayerState.ammo[weapon.type];
        if (ammo) {
          const needed = weapon.magazineSize - ammo.inMag;
          const transfer = Math.min(needed, ammo.reserve);
          ammo.inMag += transfer;
          ammo.reserve -= transfer;
        }
      }
    }

    // Move direction relative to camera yaw
    const charDef = CHARACTERS.find((c) => c.id === this.localPlayerState.characterId) || CHARACTERS[0];
    const baseSpeed = 7.5 * charDef.speed;
    const currentSpeed = this.isCrouching ? baseSpeed * 0.45 : this.isSprinting ? baseSpeed * 1.5 : this.isAiming ? baseSpeed * 0.7 : baseSpeed;

    const moveVector = new THREE.Vector3(right, 0, -fwd);
    const isMoving = moveVector.lengthSq() > 0.01;

    if (isMoving) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
      this.velocity.x = moveVector.x * currentSpeed;
      this.velocity.z = moveVector.z * currentSpeed;

      // Footstep sound
      this.footstepTimer += dt;
      const stepInterval = this.isSprinting ? 0.3 : 0.45;
      if (this.footstepTimer >= stepInterval) {
        this.footstepTimer = 0;
        sound.playFootstep(this.isSprinting);
      }
    } else {
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, dt * 12);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, dt * 12);
      this.footstepTimer = 0;
    }

    // Gravity
    this.velocity.y -= 22 * dt;

    // Apply movement with simple terrain / obstacle collision check
    const nextPos = new THREE.Vector3(
      this.localPlayerState.position.x + this.velocity.x * dt,
      this.localPlayerState.position.y + this.velocity.y * dt,
      this.localPlayerState.position.z + this.velocity.z * dt
    );

    // Collision check against buildings & cover
    const collidesX = this.map.checkCollision(new THREE.Vector3(nextPos.x, this.localPlayerState.position.y, this.localPlayerState.position.z));
    if (!collidesX) {
      this.localPlayerState.position.x = nextPos.x;
    }

    const collidesZ = this.map.checkCollision(new THREE.Vector3(this.localPlayerState.position.x, this.localPlayerState.position.y, nextPos.z));
    if (!collidesZ) {
      this.localPlayerState.position.z = nextPos.z;
    }

    // Ground floor snap
    if (nextPos.y <= 1.0) {
      this.localPlayerState.position.y = 1.0;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.localPlayerState.position.y = nextPos.y;
    }

    // Update Model Position & Rotation
    if (this.localModel && this.localRig) {
      this.localModel.position.set(
        this.localPlayerState.position.x,
        this.localPlayerState.position.y,
        this.localPlayerState.position.z
      );
      this.localModel.rotation.y = this.cameraYaw;

      // Animate Rig
      CharacterModelFactory.animateCharacter(this.localRig, dt, {
        isMoving,
        isSprinting: this.isSprinting,
        isJumping: !this.isGrounded,
        isCrouching: this.isCrouching,
        isAiming: this.isAiming,
        isAlive: this.localPlayerState.isAlive,
        animTime: this.animTime,
        recoilIntensity: this.recoilPitch
      });
    }

    // Recoil recovery
    this.recoilPitch = Math.max(0, this.recoilPitch - dt * 0.8);
  }

  private updateCamera(dt: number) {
    // Aim Down Sights (ADS) camera zoom
    const targetDist = this.isAiming ? 1.6 : 3.6;
    this.cameraDistance = THREE.MathUtils.lerp(this.cameraDistance, targetDist, dt * 14);

    // Camera target focus is player head/chest
    const focusTarget = new THREE.Vector3(
      this.localPlayerState.position.x,
      this.localPlayerState.position.y + 1.45,
      this.localPlayerState.position.z
    );

    // Calculate third-person shoulder offset
    const offset = new THREE.Vector3(
      this.isAiming ? 0.45 : 0.65,
      0.35,
      this.cameraDistance
    );
    offset.applyEuler(new THREE.Euler(this.cameraPitch + this.recoilPitch, this.cameraYaw, 0, 'YXZ'));

    const idealCameraPos = focusTarget.clone().add(offset);

    // Smooth lerp camera
    this.camera.position.lerp(idealCameraPos, 0.45);
    this.camera.lookAt(focusTarget.clone().add(new THREE.Vector3(0, 0.2, 0)));

    // Directional shadow follower
    this.dirLight.position.set(
      this.localPlayerState.position.x + 80,
      120,
      this.localPlayerState.position.z + 60
    );
    this.dirLight.target.position.set(
      this.localPlayerState.position.x,
      0,
      this.localPlayerState.position.z
    );
    this.dirLight.target.updateMatrixWorld();
  }

  private updateSafeZone(dt: number) {
    // If playing solo bot mode, simulate shrinking
    if (this.isSoloBotMode) {
      if (this.safeZone.isShrinking) {
        this.safeZone.currentRadius = Math.max(this.safeZone.targetRadius, this.safeZone.currentRadius - this.safeZone.shrinkSpeed * dt);
        if (this.safeZone.currentRadius <= this.safeZone.targetRadius + 0.1) {
          this.safeZone.isShrinking = false;
          this.safeZone.phase++;
          if (this.safeZone.phase <= this.safeZone.maxPhases) {
            this.safeZone.shrinkTimer = 25;
            this.safeZone.damagePerSec += 4;
            this.safeZone.targetRadius = Math.max(15, this.safeZone.currentRadius * 0.55);
          }
        }
      } else {
        this.safeZone.shrinkTimer = Math.max(0, this.safeZone.shrinkTimer - dt);
        if (this.safeZone.shrinkTimer <= 0 && this.safeZone.phase <= this.safeZone.maxPhases) {
          this.safeZone.isShrinking = true;
          sound.playZoneWarning();
        }
      }
    }

    // Check if player is outside safe zone
    const distToCenter = Math.hypot(
      this.localPlayerState.position.x - this.safeZone.currentCenter.x,
      this.localPlayerState.position.z - this.safeZone.currentCenter.z
    );

    const isInStorm = distToCenter > this.safeZone.currentRadius;
    if (isInStorm && this.localPlayerState.isAlive) {
      this.stormWarningTimer += dt;
      if (this.stormWarningTimer >= 1.0) {
        this.stormWarningTimer = 0;
        this.localPlayerState.health = Math.max(0, this.localPlayerState.health - this.safeZone.damagePerSec);
        sound.playDamageTaken();
        if (this.localPlayerState.health <= 0) {
          this.localPlayerState.isAlive = false;
          this.callbacks.onGameOver('THE STORM', false, {
            kills: this.localPlayerState.kills,
            damage: this.localPlayerState.damageDealt,
            rank: 2
          });
        }
      }
    }
  }

  private updateTracers(dt: number) {
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const tracer = this.bulletTracers[i];
      tracer.life -= dt;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.mesh);
        this.bulletTracers.splice(i, 1);
      }
    }
  }

  // AI Bots in Solo Mode
  private updateBots(dt: number) {
    if (!this.isSoloBotMode) return;

    this.bots.forEach((bot) => {
      if (!bot.state.isAlive) {
        CharacterModelFactory.animateCharacter(bot.rig, dt, {
          isMoving: false,
          isSprinting: false,
          isJumping: false,
          isCrouching: false,
          isAiming: false,
          isAlive: false,
          animTime: 0,
          recoilIntensity: 0
        });
        return;
      }

      bot.aiTimer -= dt;
      if (bot.aiTimer <= 0) {
        bot.aiTimer = 2 + Math.random() * 3;
        // Head toward safe zone center or patrol
        const angle = Math.random() * Math.PI * 2;
        bot.targetX = this.safeZone.currentCenter.x + Math.cos(angle) * (this.safeZone.currentRadius * 0.4);
        bot.targetZ = this.safeZone.currentCenter.z + Math.sin(angle) * (this.safeZone.currentRadius * 0.4);
      }

      // Move toward target
      const dx = bot.targetX - bot.model.position.x;
      const dz = bot.targetZ - bot.model.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 2) {
        const speed = 4.5;
        bot.model.position.x += (dx / dist) * speed * dt;
        bot.model.position.z += (dz / dist) * speed * dt;
        bot.model.rotation.y = Math.atan2(dx, dz);
        bot.state.isMoving = true;
      } else {
        bot.state.isMoving = false;
      }

      // Check distance to player: shoot if close
      const distToPlayer = Math.hypot(
        this.localPlayerState.position.x - bot.model.position.x,
        this.localPlayerState.position.z - bot.model.position.z
      );

      if (distToPlayer < 40 && this.localPlayerState.isAlive && Math.random() < 0.015) {
        // Bot shoots at player
        const bOrigin = new THREE.Vector3(bot.model.position.x, 1.5, bot.model.position.z);
        const bDir = new THREE.Vector3(
          this.localPlayerState.position.x - bot.model.position.x,
          this.localPlayerState.position.y - bot.model.position.y,
          this.localPlayerState.position.z - bot.model.position.z
        ).normalize();
        this.spawnTracer(bOrigin, bDir, 'rifle');
        sound.playShoot('rifle');

        // Bot accuracy
        if (Math.random() < 0.35) {
          const dmg = 18;
          if (this.localPlayerState.armor > 0) {
            this.localPlayerState.armor = Math.max(0, this.localPlayerState.armor - dmg * 0.6);
            this.localPlayerState.health = Math.max(0, this.localPlayerState.health - dmg * 0.4);
          } else {
            this.localPlayerState.health = Math.max(0, this.localPlayerState.health - dmg);
          }
          sound.playDamageTaken();
          this.callbacks.onDamageTaken(0);
          if (this.localPlayerState.health <= 0) {
            this.localPlayerState.isAlive = false;
            this.callbacks.onGameOver(bot.state.name, false, {
              kills: this.localPlayerState.kills,
              damage: this.localPlayerState.damageDealt,
              rank: this.bots.filter((x) => x.state.isAlive).length + 1
            });
          }
        }
      }

      CharacterModelFactory.animateCharacter(bot.rig, dt, {
        isMoving: bot.state.isMoving,
        isSprinting: false,
        isJumping: false,
        isCrouching: false,
        isAiming: distToPlayer < 40,
        isAlive: true,
        animTime: this.animTime + Number(bot.id.slice(-1)),
        recoilIntensity: 0
      });
    });
  }

  // Check proximity to ground loot drops
  private updateLootProximity() {
    let closestItem: LootItem | null = null;
    let closestDist = 2.5; // 2.5m pickup radius

    this.groundLootMeshes.forEach(({ mesh, item }) => {
      // Rotate floating loot
      mesh.rotation.y += 0.02;

      const d = Math.hypot(
        this.localPlayerState.position.x - item.position.x,
        this.localPlayerState.position.z - item.position.z
      );

      if (d < closestDist) {
        closestDist = d;
        closestItem = item;
      }
    });

    this.nearbyLoot = closestItem;
  }

  private updateNetworkTick(dt: number) {
    this.networkTickTimer += dt;
    if (this.networkTickTimer >= 0.05) { // 20 Hz
      this.networkTickTimer = 0;

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendPacket({
          type: 'player_move',
          position: this.localPlayerState.position,
          rotation: { yaw: this.cameraYaw, pitch: this.cameraPitch },
          velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
          isMoving: this.moveForward !== 0 || this.moveRight !== 0,
          isSprinting: this.isSprinting,
          isJumping: !this.isGrounded,
          isCrouching: this.isCrouching,
          isAiming: this.isAiming
        });
      }
    }
  }

  private updateHUD() {
    const curWep = WEAPONS[this.localPlayerState.currentWeapon];
    const ammoData = this.localPlayerState.ammo[curWep.type] || { inMag: 0, reserve: 0 };

    // Compass degree (0-360)
    let heading = THREE.MathUtils.radToDeg(-this.cameraYaw) % 360;
    if (heading < 0) heading += 360;

    const aliveCount = this.isSoloBotMode
      ? this.bots.filter((b) => b.state.isAlive).length + (this.localPlayerState.isAlive ? 1 : 0)
      : Array.from(this.remotePlayers.values()).filter((p) => p.state.isAlive).length + (this.localPlayerState.isAlive ? 1 : 0);

    const distToCenter = Math.hypot(
      this.localPlayerState.position.x - this.safeZone.currentCenter.x,
      this.localPlayerState.position.z - this.safeZone.currentCenter.z
    );

    this.callbacks.onHUDUpdate({
      health: Math.round(this.localPlayerState.health),
      maxHealth: this.localPlayerState.maxHealth,
      armor: Math.round(this.localPlayerState.armor),
      maxArmor: this.localPlayerState.maxArmor,
      currentWeapon: this.localPlayerState.currentWeapon,
      ammoInMag: ammoData.inMag,
      ammoReserve: ammoData.reserve,
      isReloading: this.isReloading,
      isAiming: this.isAiming,
      aliveCount,
      kills: this.localPlayerState.kills,
      damageDealt: this.localPlayerState.damageDealt,
      safeZone: this.safeZone,
      nearbyLoot: this.nearbyLoot,
      compassHeading: Math.round(heading),
      ping: this.ping,
      isInStorm: distToCenter > this.safeZone.currentRadius
    });
  }

  private sendPacket(packet: ClientPacket) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    }
  }

  public setGraphicsQuality(preset: 'low' | 'balanced' | 'high' | 'ultra') {
    this.graphicsQuality = preset;
    if (preset === 'low') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
    } else if (preset === 'balanced') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = true;
    } else if (preset === 'high') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.shadowMap.enabled = true;
    }
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.ws) {
      this.ws.close();
    }
    sound.stopMusic();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
