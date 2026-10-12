export type CharacterId = 'viper' | 'titan' | 'mirage' | 'nyx';

export type SkinId = 'default' | 'cyber_neon' | 'stealth_shadow' | 'apex_gold' | 'arctic_frost';

export interface SkinDef {
  id: SkinId;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  role: string;
  title: string;
  speed: number;
  health: number;
  armor: number;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  description: string;
  specialAbility: string;
  skins: SkinDef[];
}

export interface Friend {
  id: string;
  name: string;
  status: 'online' | 'in_lobby' | 'in_game' | 'offline';
  characterId: CharacterId;
  level: number;
  currentRoomCode?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'skin' | 'weapon_wrap' | 'badge' | 'emote';
  category: 'character' | 'weapon' | 'vanity';
  targetId: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  equipped: boolean;
}

export type WeaponType = 'rifle' | 'smg' | 'sniper' | 'pistol';

export interface WeaponDef {
  id: string;
  type: WeaponType;
  name: string;
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // shots per second
  magazineSize: number;
  reloadTime: number; // seconds
  range: number;
  spread: number;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface PlayerState {
  id: string;
  name: string;
  characterId: CharacterId;
  color: string;
  isHost: boolean;
  isReady: boolean;
  isAlive: boolean;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  kills: number;
  damageDealt: number;
  // Spatial
  position: { x: number; y: number; z: number };
  rotation: { yaw: number; pitch: number };
  velocity: { x: number; y: number; z: number };
  // Animation state
  isMoving: boolean;
  isSprinting: boolean;
  isJumping: boolean;
  isCrouching: boolean;
  isAiming: boolean;
  isReloading: boolean;
  currentWeapon: WeaponType;
  ammo: { [key in WeaponType]?: { inMag: number; reserve: number } };
  ping?: number;
}

export interface LootItem {
  id: string;
  type: 'weapon' | 'medkit' | 'armor' | 'ammo';
  weaponType?: WeaponType;
  name: string;
  amount?: number;
  position: { x: number; y: number; z: number };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface SafeZoneState {
  currentCenter: { x: number; z: number };
  targetCenter: { x: number; z: number };
  currentRadius: number;
  targetRadius: number;
  isShrinking: boolean;
  shrinkSpeed: number; // units/sec
  shrinkTimer: number; // seconds until next shrink
  damagePerSec: number;
  phase: number;
  maxPhases: number;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  victimName: string;
  weaponName: string;
  isHeadshot: boolean;
  timestamp: number;
}

export interface RoomInfo {
  code: string;
  name: string;
  hostId: string;
  status: 'lobby' | 'starting' | 'in_game' | 'ended';
  maxPlayers: number;
  playerCount: number;
  players: PlayerState[];
  countdown?: number;
}

// Network Packets
export type ClientPacket =
  | { type: 'join_room'; code?: string; playerName: string; characterId: CharacterId; createNew?: boolean }
  | { type: 'ready_toggle'; isReady: boolean }
  | { type: 'start_game' }
  | { type: 'player_move'; position: { x: number; y: number; z: number }; rotation: { yaw: number; pitch: number }; velocity: { x: number; y: number; z: number }; isMoving: boolean; isSprinting: boolean; isJumping: boolean; isCrouching: boolean; isAiming: boolean }
  | { type: 'player_shoot'; weaponType: WeaponType; origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number }; clientTimestamp: number }
  | { type: 'player_hit'; targetId: string; damage: number; isHeadshot: boolean; weaponType: WeaponType }
  | { type: 'player_reload'; weaponType: WeaponType }
  | { type: 'pickup_loot'; lootId: string }
  | { type: 'use_item'; itemType: 'medkit' | 'armor' }
  | { type: 'ping'; timestamp: number };

export type ServerPacket =
  | { type: 'room_joined'; room: RoomInfo; selfId: string }
  | { type: 'room_update'; room: RoomInfo }
  | { type: 'game_starting'; countdown: number }
  | { type: 'game_started'; players: PlayerState[]; loot: LootItem[]; safeZone: SafeZoneState }
  | { type: 'world_tick'; players: Partial<PlayerState>[]; safeZone: SafeZoneState; aliveCount: number }
  | { type: 'player_fired'; playerId: string; weaponType: WeaponType; origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } }
  | { type: 'player_damaged'; victimId: string; attackerId: string; currentHealth: number; currentArmor: number; damage: number; isHeadshot: boolean }
  | { type: 'player_eliminated'; victimId: string; killerId: string; killerName: string; victimName: string; weaponName: string; isHeadshot: boolean; aliveCount: number }
  | { type: 'loot_spawned'; loot: LootItem[] }
  | { type: 'loot_picked_up'; lootId: string; playerId: string }
  | { type: 'game_over'; winnerId: string; winnerName: string; matchStats: { kills: number; damage: number; rank: number } }
  | { type: 'pong'; timestamp: number; serverTime: number }
  | { type: 'error'; message: string };
