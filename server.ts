import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import {
  ClientPacket,
  ServerPacket,
  PlayerState,
  RoomInfo,
  SafeZoneState,
  LootItem,
  WeaponType,
  CharacterId
} from './src/types/game';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  roomCode: string | null;
  lastPing: number;
}

interface ServerRoom {
  code: string;
  name: string;
  hostId: string;
  status: 'lobby' | 'starting' | 'in_game' | 'ended';
  maxPlayers: number;
  players: Map<string, PlayerState>;
  clients: Map<string, WebSocket>;
  safeZone: SafeZoneState;
  loot: LootItem[];
  countdown: number;
  tickInterval: NodeJS.Timeout | null;
  winnerId: string | null;
}

const rooms = new Map<string, ServerRoom>();
const clientMap = new Map<WebSocket, ConnectedClient>();

// Helper to generate unique room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Initial Safe Zone setup
function createInitialSafeZone(): SafeZoneState {
  return {
    currentCenter: { x: 0, z: 0 },
    targetCenter: { x: 0, z: 0 },
    currentRadius: 220,
    targetRadius: 150,
    isShrinking: false,
    shrinkSpeed: 2.8,
    shrinkTimer: 35, // 35 seconds before first shrink
    damagePerSec: 4,
    phase: 1,
    maxPhases: 4
  };
}

// Generate starting loot spawns across map landmarks
function generateServerLoot(): LootItem[] {
  const lootList: LootItem[] = [];
  const poiPoints = [
    // Citadel
    { x: 0, y: 0.5, z: 6, type: 'weapon', weaponType: 'rifle' as WeaponType, rarity: 'epic' },
    { x: 6, y: 0.5, z: 0, type: 'weapon', weaponType: 'sniper' as WeaponType, rarity: 'legendary' },
    { x: -6, y: 0.5, z: 0, type: 'armor', rarity: 'rare' },
    { x: 0, y: 0.5, z: -6, type: 'medkit', rarity: 'common' },
    { x: -22, y: 0.5, z: 0, type: 'weapon', weaponType: 'smg' as WeaponType, rarity: 'rare' },
    { x: 22, y: 0.5, z: 0, type: 'weapon', weaponType: 'rifle' as WeaponType, rarity: 'rare' },
    // Shipyard
    { x: -135, y: 0.5, z: -100, type: 'weapon', weaponType: 'smg' as WeaponType, rarity: 'rare' },
    { x: -135, y: 0.5, z: -92, type: 'weapon', weaponType: 'rifle' as WeaponType, rarity: 'epic' },
    { x: -100, y: 0.5, z: -110, type: 'armor', rarity: 'legendary' },
    { x: -120, y: 0.5, z: -82, type: 'medkit', rarity: 'common' },
    // Radar Outpost
    { x: 130, y: 0.5, z: -110, type: 'weapon', weaponType: 'sniper' as WeaponType, rarity: 'legendary' },
    { x: 134, y: 0.5, z: -106, type: 'weapon', weaponType: 'rifle' as WeaponType, rarity: 'epic' },
    { x: 110, y: 6.5, z: -130, type: 'weapon', weaponType: 'sniper' as WeaponType, rarity: 'epic' },
    { x: 150, y: 6.5, z: -90, type: 'armor', rarity: 'rare' },
    // Stilt Village
    { x: -110, y: 0.5, z: 110, type: 'weapon', weaponType: 'smg' as WeaponType, rarity: 'rare' },
    { x: -95, y: 2.5, z: 125, type: 'weapon', weaponType: 'rifle' as WeaponType, rarity: 'rare' },
    { x: -125, y: 0.5, z: 110, type: 'medkit', rarity: 'common' },
    // Mountain Observatory
    { x: 120, y: 8.5, z: 125, type: 'weapon', weaponType: 'sniper' as WeaponType, rarity: 'legendary' },
    { x: 125, y: 8.5, z: 120, type: 'weapon', weaponType: 'rifle' as WeaponType, rarity: 'epic' },
    { x: 115, y: 8.5, z: 120, type: 'armor', rarity: 'legendary' }
  ];

  poiPoints.forEach((p, idx) => {
    lootList.push({
      id: `loot_${idx}_${Date.now()}`,
      type: p.type as 'weapon' | 'medkit' | 'armor',
      weaponType: p.weaponType,
      name: p.weaponType ? p.weaponType.toUpperCase() : p.type.toUpperCase(),
      position: { x: p.x, y: p.y, z: p.z },
      rarity: p.rarity as 'common' | 'rare' | 'epic' | 'legendary'
    });
  });

  return lootList;
}

// Broadcast packet to all clients in a room
function broadcastToRoom(room: ServerRoom, packet: ServerPacket, excludePlayerId?: string) {
  const json = JSON.stringify(packet);
  room.clients.forEach((ws, pId) => {
    if (pId !== excludePlayerId && ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  });
}

function sendToPlayer(ws: WebSocket, packet: ServerPacket) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(packet));
  }
}

function getRoomInfo(room: ServerRoom): RoomInfo {
  return {
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    status: room.status,
    maxPlayers: room.maxPlayers,
    playerCount: room.players.size,
    players: Array.from(room.players.values()),
    countdown: room.countdown
  };
}

// Start Game Loop for a Room
function startGameLoop(room: ServerRoom) {
  room.status = 'in_game';
  room.loot = generateServerLoot();
  room.safeZone = createInitialSafeZone();

  // Position spawns around the map perimeter
  const playerArr = Array.from(room.players.values());
  const spawnRadius = 140;
  playerArr.forEach((player, idx) => {
    const angle = (idx / playerArr.length) * Math.PI * 2;
    player.position = {
      x: Math.cos(angle) * spawnRadius,
      y: 2,
      z: Math.sin(angle) * spawnRadius
    };
    player.health = 100;
    player.armor = 100;
    player.isAlive = true;
    player.kills = 0;
    player.damageDealt = 0;
  });

  broadcastToRoom(room, {
    type: 'game_started',
    players: playerArr,
    loot: room.loot,
    safeZone: room.safeZone
  });

  const TICK_INTERVAL = 1000 / 20; // 20 Hz
  const dt = 1 / 20;

  room.tickInterval = setInterval(() => {
    if (room.status !== 'in_game') {
      if (room.tickInterval) clearInterval(room.tickInterval);
      return;
    }

    // 1. Safe Zone Shrink Logic
    const zone = room.safeZone;
    if (zone.isShrinking) {
      zone.currentRadius = Math.max(zone.targetRadius, zone.currentRadius - zone.shrinkSpeed * dt);
      // Lerp center toward target center
      zone.currentCenter.x += (zone.targetCenter.x - zone.currentCenter.x) * (dt * 0.1);
      zone.currentCenter.z += (zone.targetCenter.z - zone.currentCenter.z) * (dt * 0.1);

      if (zone.currentRadius <= zone.targetRadius + 0.1) {
        zone.isShrinking = false;
        zone.phase++;
        if (zone.phase <= zone.maxPhases) {
          zone.shrinkTimer = 25; // 25s grace period before next shrink
          zone.damagePerSec += 4;
          // Pick new random target center inside current radius
          const angle = Math.random() * Math.PI * 2;
          const maxOffset = zone.currentRadius * 0.4;
          zone.targetCenter = {
            x: zone.currentCenter.x + Math.cos(angle) * maxOffset,
            z: zone.currentCenter.z + Math.sin(angle) * maxOffset
          };
          zone.targetRadius = Math.max(15, zone.currentRadius * 0.55);
        }
      }
    } else {
      zone.shrinkTimer = Math.max(0, zone.shrinkTimer - dt);
      if (zone.shrinkTimer <= 0 && zone.phase <= zone.maxPhases) {
        zone.isShrinking = true;
      }
    }

    // 2. Safe Zone Damage Check for players outside safe radius
    let aliveCount = 0;
    room.players.forEach((player) => {
      if (!player.isAlive) return;
      aliveCount++;

      const dist = Math.hypot(
        player.position.x - zone.currentCenter.x,
        player.position.z - zone.currentCenter.z
      );

      if (dist > zone.currentRadius) {
        const damage = zone.damagePerSec * dt;
        player.health = Math.max(0, player.health - damage);
        if (player.health <= 0) {
          player.isAlive = false;
          broadcastToRoom(room, {
            type: 'player_eliminated',
            victimId: player.id,
            killerId: 'zone',
            killerName: 'THE STORM',
            victimName: player.name,
            weaponName: 'Plasma Radiation',
            isHeadshot: false,
            aliveCount: aliveCount - 1
          });
        }
      }
    });

    // 3. Victory check: if only 1 player alive (or 0)
    const alivePlayers = Array.from(room.players.values()).filter((p) => p.isAlive);
    if (alivePlayers.length <= 1 && room.players.size > 1 && room.status === 'in_game') {
      const winner = alivePlayers[0] || Array.from(room.players.values())[0];
      room.status = 'ended';
      room.winnerId = winner ? winner.id : null;

      broadcastToRoom(room, {
        type: 'game_over',
        winnerId: winner ? winner.id : '',
        winnerName: winner ? winner.name : 'NO SURVIVORS',
        matchStats: {
          kills: winner ? winner.kills : 0,
          damage: winner ? winner.damageDealt : 0,
          rank: 1
        }
      });
      if (room.tickInterval) clearInterval(room.tickInterval);
      return;
    }

    // 4. Broadcast world tick state
    broadcastToRoom(room, {
      type: 'world_tick',
      players: Array.from(room.players.values()),
      safeZone: room.safeZone,
      aliveCount: alivePlayers.length
    });
  }, TICK_INTERVAL);
}

// WebSocket Connection Handler
wss.on('connection', (ws) => {
  const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
  const client: ConnectedClient = {
    ws,
    playerId,
    roomCode: null,
    lastPing: Date.now()
  };
  clientMap.set(ws, client);

  ws.on('message', (data) => {
    try {
      const packet: ClientPacket = JSON.parse(data.toString());

      switch (packet.type) {
        case 'join_room': {
          let targetRoom: ServerRoom | undefined;

          if (packet.createNew) {
            // Create a brand new room
            const code = generateRoomCode();
            targetRoom = {
              code,
              name: `${packet.playerName}'s Match`,
              hostId: playerId,
              status: 'lobby',
              maxPlayers: 10,
              players: new Map(),
              clients: new Map(),
              safeZone: createInitialSafeZone(),
              loot: [],
              countdown: 0,
              tickInterval: null,
              winnerId: null
            };
            rooms.set(code, targetRoom);
          } else if (packet.code) {
            // Join specific room by code
            const searchCode = packet.code.toUpperCase().trim();
            targetRoom = rooms.get(searchCode);
            if (!targetRoom) {
              sendToPlayer(ws, { type: 'error', message: `Room "${searchCode}" not found.` });
              return;
            }
          } else {
            // Quick match: find any available lobby with space, or create one
            for (const [, r] of rooms) {
              if (r.status === 'lobby' && r.players.size < r.maxPlayers) {
                targetRoom = r;
                break;
              }
            }
            if (!targetRoom) {
              const code = generateRoomCode();
              targetRoom = {
                code,
                name: `Battle Room ${code}`,
                hostId: playerId,
                status: 'lobby',
                maxPlayers: 10,
                players: new Map(),
                clients: new Map(),
                safeZone: createInitialSafeZone(),
                loot: [],
                countdown: 0,
                tickInterval: null,
                winnerId: null
              };
              rooms.set(code, targetRoom);
            }
          }

          if (targetRoom.players.size >= targetRoom.maxPlayers && !targetRoom.players.has(playerId)) {
            sendToPlayer(ws, { type: 'error', message: 'Room is already full.' });
            return;
          }

          client.roomCode = targetRoom.code;

          const newPlayer: PlayerState = {
            id: playerId,
            name: packet.playerName || `Operator-${playerId.slice(-4)}`,
            characterId: packet.characterId || 'viper',
            color: '#ff6200',
            isHost: targetRoom.hostId === playerId,
            isReady: false,
            isAlive: true,
            health: 100,
            maxHealth: 100,
            armor: 100,
            maxArmor: 100,
            kills: 0,
            damageDealt: 0,
            position: { x: 0, y: 1, z: 0 },
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

          targetRoom.players.set(playerId, newPlayer);
          targetRoom.clients.set(playerId, ws);

          // Reply with room info
          sendToPlayer(ws, {
            type: 'room_joined',
            room: getRoomInfo(targetRoom),
            selfId: playerId
          });

          // Notify others in room
          broadcastToRoom(targetRoom, {
            type: 'room_update',
            room: getRoomInfo(targetRoom)
          });
          break;
        }

        case 'ready_toggle': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room) return;
          const p = room.players.get(playerId);
          if (p) {
            p.isReady = packet.isReady;
            broadcastToRoom(room, { type: 'room_update', room: getRoomInfo(room) });
          }
          break;
        }

        case 'start_game': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room) return;
          if (room.hostId === playerId || room.players.size >= 1) {
            startGameLoop(room);
          }
          break;
        }

        case 'player_move': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'in_game') return;
          const p = room.players.get(playerId);
          if (p && p.isAlive) {
            p.position = packet.position;
            p.rotation = packet.rotation;
            p.velocity = packet.velocity;
            p.isMoving = packet.isMoving;
            p.isSprinting = packet.isSprinting;
            p.isJumping = packet.isJumping;
            p.isCrouching = packet.isCrouching;
            p.isAiming = packet.isAiming;
          }
          break;
        }

        case 'player_shoot': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'in_game') return;
          // Replicate shot event to all other players in room
          broadcastToRoom(
            room,
            {
              type: 'player_fired',
              playerId,
              weaponType: packet.weaponType,
              origin: packet.origin,
              direction: packet.direction
            },
            playerId
          );
          break;
        }

        case 'player_hit': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'in_game') return;
          const victim = room.players.get(packet.targetId);
          const attacker = room.players.get(playerId);
          if (victim && victim.isAlive) {
            let dmg = packet.damage;
            if (packet.isHeadshot) dmg *= 1.8;

            // Armor absorbs 60% of damage
            if (victim.armor > 0) {
              const armorAbsorb = Math.min(victim.armor, dmg * 0.6);
              victim.armor = Math.max(0, victim.armor - armorAbsorb);
              victim.health = Math.max(0, victim.health - (dmg - armorAbsorb));
            } else {
              victim.health = Math.max(0, victim.health - dmg);
            }

            if (attacker) {
              attacker.damageDealt += Math.round(dmg);
            }

            broadcastToRoom(room, {
              type: 'player_damaged',
              victimId: victim.id,
              attackerId: playerId,
              currentHealth: victim.health,
              currentArmor: victim.armor,
              damage: Math.round(dmg),
              isHeadshot: packet.isHeadshot
            });

            if (victim.health <= 0) {
              victim.isAlive = false;
              if (attacker) attacker.kills += 1;
              const aliveCount = Array.from(room.players.values()).filter((p) => p.isAlive).length;

              broadcastToRoom(room, {
                type: 'player_eliminated',
                victimId: victim.id,
                killerId: playerId,
                killerName: attacker ? attacker.name : 'Unknown',
                victimName: victim.name,
                weaponName: packet.weaponType.toUpperCase(),
                isHeadshot: packet.isHeadshot,
                aliveCount
              });
            }
          }
          break;
        }

        case 'pickup_loot': {
          if (!client.roomCode) return;
          const room = rooms.get(client.roomCode);
          if (!room || room.status !== 'in_game') return;
          const lootIdx = room.loot.findIndex((l) => l.id === packet.lootId);
          if (lootIdx !== -1) {
            const lootItem = room.loot[lootIdx];
            room.loot.splice(lootIdx, 1);
            const p = room.players.get(playerId);
            if (p) {
              if (lootItem.type === 'weapon' && lootItem.weaponType) {
                p.currentWeapon = lootItem.weaponType;
              } else if (lootItem.type === 'medkit') {
                p.health = Math.min(p.maxHealth, p.health + 50);
              } else if (lootItem.type === 'armor') {
                p.armor = Math.min(p.maxArmor, p.armor + 50);
              }
            }
            broadcastToRoom(room, {
              type: 'loot_picked_up',
              lootId: packet.lootId,
              playerId
            });
          }
          break;
        }

        case 'ping': {
          sendToPlayer(ws, {
            type: 'pong',
            timestamp: packet.timestamp,
            serverTime: Date.now()
          });
          break;
        }
      }
    } catch {
      // Malformed packet ignored
    }
  });

  ws.on('close', () => {
    if (client.roomCode) {
      const room = rooms.get(client.roomCode);
      if (room) {
        room.players.delete(playerId);
        room.clients.delete(playerId);

        if (room.players.size === 0) {
          if (room.tickInterval) clearInterval(room.tickInterval);
          rooms.delete(client.roomCode);
        } else {
          // If host left, elect new host
          if (room.hostId === playerId) {
            const nextHost = Array.from(room.players.values())[0];
            if (nextHost) {
              room.hostId = nextHost.id;
              nextHost.isHost = true;
            }
          }
          broadcastToRoom(room, {
            type: 'room_update',
            room: getRoomInfo(room)
          });
        }
      }
    }
    clientMap.delete(ws);
  });
});

// REST API for checking active battle rooms and game status
app.get('/api/rooms', (_req, res) => {
  const activeRooms = Array.from(rooms.values()).map((r) => ({
    code: r.code,
    name: r.name,
    status: r.status,
    playerCount: r.players.size,
    maxPlayers: r.maxPlayers
  }));
  res.json({ success: true, rooms: activeRooms });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', playersOnline: clientMap.size, roomsActive: rooms.size });
});

// Vite middleware or production static serving
const isProd = process.env.NODE_ENV === 'production';
async function setupServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`IGNITE MAX Battle Royale Game Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
