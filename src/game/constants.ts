import { CharacterDef, Friend, InventoryItem, WeaponDef, WeaponType } from '../types/game';

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'viper',
    name: 'VIPER',
    role: 'Speed Infiltrator',
    title: 'The Cyber Specter',
    speed: 1.15,
    health: 100,
    armor: 80,
    primaryColor: '#ff6200',
    secondaryColor: '#1a1f26',
    glowColor: '#ff8400',
    description: 'High agility scout with rapid repositioning speed and enhanced sprint recovery.',
    specialAbility: 'Overdrive Dash (+20% Sprint Burst)',
    skins: [
      { id: 'default', name: 'Original Cyber', primaryColor: '#ff6200', secondaryColor: '#1a1f26', glowColor: '#ff8400', rarity: 'common' },
      { id: 'cyber_neon', name: 'Electric Blaze', primaryColor: '#f43f5e', secondaryColor: '#18181b', glowColor: '#fb7185', rarity: 'rare' },
      { id: 'stealth_shadow', name: 'Ghost Operative', primaryColor: '#64748b', secondaryColor: '#090d16', glowColor: '#94a3b8', rarity: 'epic' },
      { id: 'apex_gold', name: 'Golden Apex VIP', primaryColor: '#f59e0b', secondaryColor: '#291e08', glowColor: '#fcd34d', rarity: 'legendary' }
    ]
  },
  {
    id: 'titan',
    name: 'TITAN',
    role: 'Frontline Juggernaut',
    title: 'Iron Bulwark',
    speed: 0.95,
    health: 120,
    armor: 120,
    primaryColor: '#00d2ff',
    secondaryColor: '#182433',
    glowColor: '#00f2ff',
    description: 'Heavy armored assault unit capable of soaking immense punishment and holding chokepoints.',
    specialAbility: 'Reinforced Plating (+25% Blast Resistance)',
    skins: [
      { id: 'default', name: 'Titanium Blue', primaryColor: '#00d2ff', secondaryColor: '#182433', glowColor: '#00f2ff', rarity: 'common' },
      { id: 'cyber_neon', name: 'Toxic Core', primaryColor: '#10b981', secondaryColor: '#0f291e', glowColor: '#34d399', rarity: 'rare' },
      { id: 'stealth_shadow', name: 'Obsidian Dread', primaryColor: '#475569', secondaryColor: '#0a0f18', glowColor: '#38bdf8', rarity: 'epic' },
      { id: 'apex_gold', name: 'Apex Warforged', primaryColor: '#eab308', secondaryColor: '#2b2106', glowColor: '#fde047', rarity: 'legendary' }
    ]
  },
  {
    id: 'mirage',
    name: 'MIRAGE',
    role: 'Precision Sharpshooter',
    title: 'Desert Mirage',
    speed: 1.05,
    health: 100,
    armor: 90,
    primaryColor: '#f59e0b',
    secondaryColor: '#2b2318',
    glowColor: '#fbbf24',
    description: 'Master of ranged engagements with pinpoint sniper steady aim and reduced recoil.',
    specialAbility: 'Dead-Eye Precision (1.3x Headshot Damage Bonus)',
    skins: [
      { id: 'default', name: 'Desert Dune', primaryColor: '#f59e0b', secondaryColor: '#2b2318', glowColor: '#fbbf24', rarity: 'common' },
      { id: 'arctic_frost', name: 'Arctic Camo', primaryColor: '#38bdf8', secondaryColor: '#172554', glowColor: '#7dd3fc', rarity: 'rare' },
      { id: 'stealth_shadow', name: 'Night Ops', primaryColor: '#71717a', secondaryColor: '#09090b', glowColor: '#a1a1aa', rarity: 'epic' },
      { id: 'apex_gold', name: 'Sultan Gilded', primaryColor: '#eab308', secondaryColor: '#241a05', glowColor: '#fef08a', rarity: 'legendary' }
    ]
  },
  {
    id: 'nyx',
    name: 'NYX',
    role: 'Phantom Striker',
    title: 'Shadow Valkyrie',
    speed: 1.1,
    health: 105,
    armor: 95,
    primaryColor: '#a855f7',
    secondaryColor: '#1e102a',
    glowColor: '#c084fc',
    description: 'Futuristic urban operative with silent movement mechanics and rapid weapon switching.',
    specialAbility: 'Ghost Step (Reduced Footstep Audio & Quick ADS)',
    skins: [
      { id: 'default', name: 'Violet Spectre', primaryColor: '#a855f7', secondaryColor: '#1e102a', glowColor: '#c084fc', rarity: 'common' },
      { id: 'cyber_neon', name: 'Cyberpunk Magenta', primaryColor: '#ec4899', secondaryColor: '#240b17', glowColor: '#f472b6', rarity: 'rare' },
      { id: 'arctic_frost', name: 'Neon Glitch', primaryColor: '#06b6d4', secondaryColor: '#082f49', glowColor: '#67e8f9', rarity: 'epic' },
      { id: 'apex_gold', name: 'Imperial Valkyrie', primaryColor: '#f59e0b', secondaryColor: '#332007', glowColor: '#fde047', rarity: 'legendary' }
    ]
  }
];

export const INITIAL_FRIENDS: Friend[] = [
  { id: 'fr_1', name: 'GhostSniper', status: 'online', characterId: 'mirage', level: 42, currentRoomCode: 'MAX77' },
  { id: 'fr_2', name: 'CyberReaper', status: 'in_lobby', characterId: 'viper', level: 38, currentRoomCode: 'IGN82' },
  { id: 'fr_3', name: 'Valkyrie99', status: 'in_game', characterId: 'nyx', level: 55 },
  { id: 'fr_4', name: 'IronClad_Tank', status: 'online', characterId: 'titan', level: 29 },
  { id: 'fr_5', name: 'ApexPhantom', status: 'offline', characterId: 'viper', level: 19 }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'inv_1', name: 'Original Cyber Suit', type: 'skin', category: 'character', targetId: 'viper', rarity: 'common', description: 'Standard tactical carbon fiber outfit.', equipped: true },
  { id: 'inv_2', name: 'Electric Blaze Suit', type: 'skin', category: 'character', targetId: 'viper', rarity: 'rare', description: 'Charged with thermal ignition conduits.', equipped: false },
  { id: 'inv_3', name: 'Titanium Blue Plating', type: 'skin', category: 'character', targetId: 'titan', rarity: 'common', description: 'Reinforced exoskeleton alloy.', equipped: true },
  { id: 'inv_4', name: 'Toxic Core Exosuit', type: 'skin', category: 'character', targetId: 'titan', rarity: 'rare', description: 'Radioactive bio-hazard plating.', equipped: false },
  { id: 'inv_5', name: 'Desert Dune Ghillie', type: 'skin', category: 'character', targetId: 'mirage', rarity: 'common', description: 'High-altitude desert dust pattern.', equipped: true },
  { id: 'inv_6', name: 'Violet Spectre Attire', type: 'skin', category: 'character', targetId: 'nyx', rarity: 'common', description: 'Electromagnetic stealth weave.', equipped: true },
  { id: 'inv_7', name: 'Magma Flow Weapon Wrap', type: 'weapon_wrap', category: 'weapon', targetId: 'rifle', rarity: 'epic', description: 'Animated volcanic skin for AR-47 Igniter.', equipped: true },
  { id: 'inv_8', name: 'Cryo Freeze Weapon Wrap', type: 'weapon_wrap', category: 'weapon', targetId: 'smg', rarity: 'rare', description: 'Sub-zero frost coating for Havoc SMG.', equipped: true },
  { id: 'inv_9', name: 'Gold Apex Champion Wrap', type: 'weapon_wrap', category: 'weapon', targetId: 'sniper', rarity: 'legendary', description: '24K gold plated chassis for Vanguard Sniper.', equipped: true }
];

export const WEAPONS: Record<WeaponType, WeaponDef> = {
  rifle: {
    id: 'ar-igniter',
    type: 'rifle',
    name: 'AR-47 IGNITER',
    damage: 32,
    headshotMultiplier: 1.85,
    fireRate: 8.5, // rounds/sec
    magazineSize: 30,
    reloadTime: 2.1,
    range: 180,
    spread: 0.025,
    color: '#ff6b00',
    rarity: 'epic'
  },
  smg: {
    id: 'havoc-smg',
    type: 'smg',
    name: 'HAVOC SMG',
    damage: 22,
    headshotMultiplier: 1.6,
    fireRate: 13.0,
    magazineSize: 36,
    reloadTime: 1.6,
    range: 90,
    spread: 0.045,
    color: '#06b6d4',
    rarity: 'rare'
  },
  sniper: {
    id: 'vanguard-sniper',
    type: 'sniper',
    name: 'VANGUARD SNIPER',
    damage: 110,
    headshotMultiplier: 2.2,
    fireRate: 1.1,
    magazineSize: 5,
    reloadTime: 2.8,
    range: 350,
    spread: 0.005,
    color: '#eab308',
    rarity: 'legendary'
  },
  pistol: {
    id: 'apex-magnum',
    type: 'pistol',
    name: 'APEX MAGNUM',
    damage: 45,
    headshotMultiplier: 1.9,
    fireRate: 3.8,
    magazineSize: 8,
    reloadTime: 1.4,
    range: 110,
    spread: 0.02,
    color: '#a855f7',
    rarity: 'common'
  }
};

export const MAP_SIZE = 500; // 500m x 500m combat zone
export const SAFE_ZONE_INITIAL_RADIUS = 220;
export const TICK_RATE = 25; // 25 Hz networking update tick
