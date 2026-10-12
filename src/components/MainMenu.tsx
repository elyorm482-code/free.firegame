import React, { useState, useEffect } from 'react';
import { CharacterId, Friend, InventoryItem, RoomInfo, SkinId, WeaponType } from '../types/game';
import { CHARACTERS, INITIAL_FRIENDS, INITIAL_INVENTORY, WEAPONS } from '../game/constants';
import { sound } from '../game/audio/SoundSystem';
import { HeroPreview3D } from './HeroPreview3D';
import {
  Play,
  Users,
  UserPlus,
  Shield,
  Zap,
  Settings,
  Volume2,
  Sliders,
  Crosshair,
  Copy,
  Check,
  RotateCw,
  Flame,
  Award,
  ChevronRight,
  Package,
  UserCheck,
  Sparkles,
  ExternalLink,
  Plus,
  Search
} from 'lucide-react';

interface MainMenuProps {
  onStartGame: (mode: 'solo' | 'room', roomCode?: string, createRoom?: boolean) => void;
  selectedCharacter: CharacterId;
  onSelectCharacter: (id: CharacterId) => void;
  selectedSkin?: SkinId;
  onSelectSkin?: (id: SkinId) => void;
  playerName: string;
  onUpdatePlayerName: (name: string) => void;
  roomInfo: RoomInfo | null;
  onStartRoomMatch: () => void;
  onToggleReady: (ready: boolean) => void;
  isHost: boolean;
  graphicsQuality: 'low' | 'balanced' | 'high' | 'ultra';
  onChangeGraphics: (quality: 'low' | 'balanced' | 'high' | 'ultra') => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  selectedCharacter,
  onSelectCharacter,
  selectedSkin = 'default',
  onSelectSkin,
  playerName,
  onUpdatePlayerName,
  roomInfo,
  onStartRoomMatch,
  isHost,
  graphicsQuality,
  onChangeGraphics
}) => {
  // Navigation tabs: Lobby, Operators, Inventory, Friends, Settings, Rooms
  const [activeTab, setActiveTab] = useState<'lobby' | 'operators' | 'inventory' | 'friends' | 'rooms' | 'settings'>('lobby');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeRooms, setActiveRooms] = useState<{ code: string; name: string; playerCount: number; maxPlayers: number }[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Customization & Friends state
  const [activeSkin, setActiveSkin] = useState<SkinId>(selectedSkin);
  const [previewWeapon, setPreviewWeapon] = useState<WeaponType>('rifle');
  const [friendsList, setFriendsList] = useState<Friend[]>(INITIAL_FRIENDS);
  const [newFriendInput, setNewFriendInput] = useState('');
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [invFilter, setInvFilter] = useState<'all' | 'character' | 'weapon'>('all');

  // Audio sliders
  const [masterVol, setMasterVol] = useState(0.8);
  const [sfxVol, setSfxVol] = useState(0.9);
  const [musicVol, setMusicVol] = useState(0.45);

  const curChar = CHARACTERS.find((c) => c.id === selectedCharacter) || CHARACTERS[0];

  useEffect(() => {
    sound.startMusic('lobby');
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (data.rooms) {
        setActiveRooms(data.rooms);
      }
    } catch {
      // offline
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleAddFriend = () => {
    if (!newFriendInput.trim()) return;
    const newFr: Friend = {
      id: `fr_${Date.now()}`,
      name: newFriendInput.trim(),
      status: 'online',
      characterId: 'viper',
      level: 1
    };
    setFriendsList((prev) => [newFr, ...prev]);
    setNewFriendInput('');
  };

  const handleVolumeChange = (m: number, s: number, mu: number) => {
    setMasterVol(m);
    setSfxVol(s);
    setMusicVol(mu);
    sound.setVolumes(m, s, mu);
  };

  return (
    <div className="relative w-full h-full bg-[#05080e] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Background Cyber Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,#1e293b55_0%,#05080e_80%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf806_1px,transparent_1px),linear-gradient(to_bottom,#38bdf806_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* 1. TOP HEADER NAVIGATION */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3.5 border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.6)]">
            <Flame className="w-6 h-6 text-black fill-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-teko text-3xl font-bold tracking-wider leading-none text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200">
              IGNITE MAX
            </span>
            <span className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase -mt-1">
              BATTLE ROYALE · 3D ONLINE
            </span>
          </div>
        </div>

        {/* Center Primary Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-900/90 p-1 border border-neutral-800 shadow-inner">
          {[
            { id: 'lobby', label: 'LOBBY' },
            { id: 'operators', label: 'OPERATORS' },
            { id: 'inventory', label: 'INVENTORY' },
            { id: 'friends', label: 'FRIENDS' },
            { id: 'rooms', label: 'CUSTOM ROOMS' },
            { id: 'settings', label: 'SETTINGS' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                sound.init();
                if (tab.id === 'rooms') fetchRooms();
              }}
              className={`px-4 py-1.5 text-xs font-chakra font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-black shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Player Identity */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono text-neutral-400 uppercase">CALLSIGN</span>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onUpdatePlayerName(e.target.value.slice(0, 14))}
              placeholder="Operator"
              className="bg-neutral-900 border border-neutral-700 px-2 py-0.5 text-xs font-mono font-bold text-orange-400 focus:outline-none focus:border-orange-500 text-right w-28 sm:w-36"
            />
          </div>
          <div className="w-9 h-9 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center font-chakra font-bold text-orange-400 shadow">
            {playerName.charAt(0).toUpperCase() || 'O'}
          </div>
        </div>
      </header>

      {/* 2. BODY CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row items-stretch justify-between p-4 sm:p-8 overflow-y-auto">
        {/* LEFT / CENTER INTERFACE PANEL */}
        <div className="flex-1 flex flex-col justify-center max-w-xl z-20">
          {/* TAB: LOBBY */}
          {activeTab === 'lobby' && (
            <>
              {roomInfo ? (
                // Inside custom room lobby
                <div className="bg-neutral-950/90 border-2 border-neutral-800 p-6 backdrop-blur-md shadow-2xl">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                    <div>
                      <span className="text-xs font-mono text-orange-400 uppercase font-bold tracking-wider">
                        MULTIPLAYER ROOM
                      </span>
                      <h2 className="font-chakra font-bold text-2xl text-white">{roomInfo.name}</h2>
                    </div>

                    {/* Room Code */}
                    <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-3 py-1.5">
                      <span className="text-xs font-mono text-neutral-400">CODE:</span>
                      <span className="font-mono font-black text-xl text-orange-400 tracking-widest">
                        {roomInfo.code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(roomInfo.code)}
                        className="ml-2 text-neutral-400 hover:text-white cursor-pointer"
                        title="Copy Code"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Players in Room */}
                  <div className="mb-6">
                    <span className="text-xs font-mono text-neutral-400 uppercase mb-2 block">
                      PARTY ROSTER ({roomInfo.players.length} / {roomInfo.maxPlayers})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {roomInfo.players.map((p) => (
                        <div
                          key={p.id}
                          className="bg-neutral-900/90 border border-neutral-800 p-2.5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded flex items-center justify-center font-chakra font-bold text-xs"
                              style={{ backgroundColor: `${p.color}33`, borderColor: p.color, borderWidth: 1 }}
                            >
                              {p.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-chakra font-bold text-xs text-white">{p.name}</span>
                              <span className="text-[9px] font-mono text-neutral-400 uppercase">
                                {p.characterId} {p.isHost ? '· HOST' : ''}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">READY</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                    <span className="text-xs font-mono text-neutral-400">
                      Share code with friends to join!
                    </span>

                    {isHost ? (
                      <button
                        onClick={onStartRoomMatch}
                        className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-black font-chakra font-black text-base tracking-wider uppercase transition shadow-xl active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <Play className="w-4 h-4 fill-black" />
                        <span>START MATCH</span>
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-amber-400 font-bold animate-pulse">
                        WAITING FOR HOST TO START...
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                // Standard main lobby actions
                <div className="flex flex-col gap-5">
                  <div>
                    <span className="px-2.5 py-1 text-[11px] font-mono font-bold bg-orange-500/20 text-orange-400 border border-orange-500/40 uppercase inline-block mb-3">
                      ORIGINAL 3D CYBER ROYALE
                    </span>
                    <h1 className="font-teko text-6xl sm:text-7xl font-bold uppercase tracking-tight leading-none text-white">
                      DROP. LOOT. SURVIVE.
                    </h1>
                    <p className="text-sm font-rajdhani text-neutral-300 max-w-md mt-2">
                      Drop into the Neo Caldera island. Scavenge high-tier tactical armaments, navigate landmarks, and outlast rival operators inside the shrinking plasma storm.
                    </p>
                  </div>

                  {/* Play Action Buttons */}
                  <div className="flex flex-col gap-2.5 w-full">
                    <button
                      onClick={() => {
                        sound.init();
                        onStartGame('solo');
                      }}
                      className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 hover:from-orange-500 hover:to-amber-400 text-black font-chakra font-black text-xl tracking-wider uppercase transition shadow-[0_0_35px_rgba(249,115,22,0.6)] active:scale-95 flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <Play className="w-6 h-6 fill-black" />
                        <span>SOLO SURVIVAL / PRACTICE</span>
                      </div>
                      <ChevronRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                    </button>

                    <button
                      onClick={() => {
                        sound.init();
                        onStartGame('room', undefined, true);
                      }}
                      className="w-full py-3.5 px-6 bg-neutral-900/90 hover:bg-neutral-800 border-2 border-cyan-500 text-white font-chakra font-bold text-base tracking-wider uppercase transition shadow-lg active:scale-95 flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-cyan-400" />
                        <span>CREATE MULTIPLAYER ROOM</span>
                      </div>
                      <span className="text-xs font-mono text-cyan-400">HOST & INVITE</span>
                    </button>

                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="w-full py-3.5 px-6 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-chakra font-bold text-base tracking-wider uppercase transition shadow active:scale-95 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <UserPlus className="w-5 h-5 text-orange-400" />
                        <span>JOIN WITH ROOM CODE</span>
                      </div>
                      <span className="text-xs font-mono text-neutral-400">ENTER CODE</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB: OPERATORS */}
          {activeTab === 'operators' && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-mono text-orange-400 uppercase font-bold tracking-wider">
                  OPERATORS & OUTFITS
                </span>
                <h2 className="font-chakra font-bold text-3xl text-white">CHOOSE OPERATOR</h2>
              </div>

              {/* Character selection tiles */}
              <div className="grid grid-cols-2 gap-2.5">
                {CHARACTERS.map((char) => {
                  const isSelected = selectedCharacter === char.id;
                  return (
                    <div
                      key={char.id}
                      onClick={() => {
                        onSelectCharacter(char.id);
                        setActiveSkin('default');
                        onSelectSkin?.('default');
                        sound.playReload();
                      }}
                      className={`p-3 bg-neutral-950/90 border-2 cursor-pointer transition active:scale-95 flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                          : 'border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-chakra font-bold text-base text-white">{char.name}</span>
                        <span className="text-[10px] font-mono text-orange-400">{Math.round(char.speed * 100)}% SPD</span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400 block mb-2">{char.role}</span>
                      <div className="text-[10px] font-mono bg-neutral-900 p-1.5 border border-neutral-800 text-neutral-300">
                        {char.specialAbility}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Skins / Outfits for selected operator */}
              <div className="mt-2 bg-neutral-950/80 border border-neutral-800 p-3">
                <span className="text-xs font-mono text-neutral-300 uppercase font-bold block mb-2">
                  CUSTOMIZE OUTFIT / SKIN
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {curChar.skins.map((skin) => {
                    const isSkinActive = activeSkin === skin.id;
                    return (
                      <button
                        key={skin.id}
                        onClick={() => {
                          setActiveSkin(skin.id);
                          onSelectSkin?.(skin.id);
                          sound.playReload();
                        }}
                        className={`p-2 text-left border cursor-pointer transition ${
                          isSkinActive
                            ? 'border-orange-500 bg-orange-500/10'
                            : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                        }`}
                      >
                        <div className="w-full h-2 rounded mb-1" style={{ backgroundColor: skin.primaryColor }} />
                        <span className="text-xs font-chakra font-bold block text-white truncate">{skin.name}</span>
                        <span className="text-[9px] font-mono text-neutral-400 uppercase">{skin.rarity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-mono text-orange-400 uppercase font-bold tracking-wider">
                  ARMORY & COSMETICS
                </span>
                <h2 className="font-chakra font-bold text-3xl text-white">OPERATOR INVENTORY</h2>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-2 bg-neutral-900/80 p-1 border border-neutral-800">
                {(['all', 'character', 'weapon'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInvFilter(cat)}
                    className={`px-3 py-1 text-xs font-chakra font-bold uppercase transition cursor-pointer ${
                      invFilter === cat ? 'bg-orange-500 text-black' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {inventory
                  .filter((item) => invFilter === 'all' || item.category === invFilter)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="bg-neutral-950 border border-neutral-800 p-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-chakra font-bold text-sm text-white">{item.name}</span>
                          <span className="text-[9px] font-mono text-orange-400 uppercase">
                            {item.rarity}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-neutral-400 mb-2">{item.description}</p>
                      </div>

                      <button
                        onClick={() => {
                          setInventory((prev) =>
                            prev.map((i) => (i.id === item.id ? { ...i, equipped: !i.equipped } : i))
                          );
                          sound.playReload();
                        }}
                        className={`w-full py-1.5 text-xs font-chakra font-bold uppercase transition cursor-pointer ${
                          item.equipped
                            ? 'bg-neutral-800 text-orange-400 border border-orange-500/50'
                            : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        {item.equipped ? 'EQUIPPED' : 'EQUIP'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB: FRIENDS */}
          {activeTab === 'friends' && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-mono text-orange-400 uppercase font-bold tracking-wider">
                  COMMUNICATIONS
                </span>
                <h2 className="font-chakra font-bold text-3xl text-white">FRIENDS & SQUAD</h2>
              </div>

              {/* Add friend input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFriendInput}
                  onChange={(e) => setNewFriendInput(e.target.value)}
                  placeholder="Enter friend callsign..."
                  className="flex-1 bg-neutral-900 border border-neutral-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
                />
                <button
                  onClick={handleAddFriend}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-black text-xs font-chakra font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD</span>
                </button>
              </div>

              {/* Friends List */}
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                {friendsList.map((fr) => (
                  <div
                    key={fr.id}
                    className="bg-neutral-950 border border-neutral-800 p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center font-chakra font-bold text-xs text-orange-400">
                        {fr.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-chakra font-bold text-sm text-white">{fr.name}</span>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                          <span
                            className={
                              fr.status === 'online'
                                ? 'text-emerald-400'
                                : fr.status === 'in_game'
                                ? 'text-amber-400'
                                : fr.status === 'in_lobby'
                                ? 'text-cyan-400'
                                : 'text-neutral-500'
                            }
                          >
                            ● {fr.status.toUpperCase()}
                          </span>
                          <span className="text-neutral-500">· LVL {fr.level}</span>
                        </div>
                      </div>
                    </div>

                    {fr.currentRoomCode ? (
                      <button
                        onClick={() => onStartGame('room', fr.currentRoomCode)}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-chakra font-bold text-xs uppercase cursor-pointer"
                      >
                        JOIN PARTY
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.href);
                          alert(`Invite link copied! Share with ${fr.name}`);
                        }}
                        className="px-3 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-chakra font-bold text-xs uppercase cursor-pointer"
                      >
                        INVITE
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ROOMS BROWSER */}
          {activeTab === 'rooms' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-orange-400 uppercase font-bold tracking-wider">
                    MULTIPLAYER LOBBIES
                  </span>
                  <h2 className="font-chakra font-bold text-3xl text-white">ACTIVE ROOMS</h2>
                </div>
                <button
                  onClick={fetchRooms}
                  className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                  <span>REFRESH</span>
                </button>
              </div>

              {activeRooms.length === 0 ? (
                <div className="bg-neutral-950/80 border border-neutral-800 p-8 text-center flex flex-col items-center">
                  <Users className="w-10 h-10 text-neutral-600 mb-2" />
                  <span className="font-chakra font-bold text-lg text-white">No active custom rooms yet</span>
                  <p className="text-xs font-mono text-neutral-400 mt-1 mb-4">
                    Create a custom room to invite friends using a room code!
                  </p>
                  <button
                    onClick={() => onStartGame('room', undefined, true)}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-chakra font-bold text-sm uppercase cursor-pointer"
                  >
                    CREATE NEW ROOM
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {activeRooms.map((r) => (
                    <div
                      key={r.code}
                      className="bg-neutral-950 border border-neutral-800 p-3.5 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-chakra font-bold text-base text-white">{r.name}</span>
                        <span className="text-xs font-mono text-orange-400 ml-3">CODE: {r.code}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-neutral-400">
                          {r.playerCount} / {r.maxPlayers} PLAYERS
                        </span>
                        <button
                          onClick={() => onStartGame('room', r.code)}
                          className="px-4 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-chakra font-bold text-xs uppercase cursor-pointer"
                        >
                          JOIN
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-mono text-orange-400 uppercase font-bold tracking-wider">
                  CONFIGURATION
                </span>
                <h2 className="font-chakra font-bold text-3xl text-white">GAME SETTINGS</h2>
              </div>

              {/* Graphics preset */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono text-neutral-300 uppercase font-bold">GRAPHICS QUALITY</span>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'balanced', 'high', 'ultra'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => onChangeGraphics(q)}
                      className={`py-2 text-xs font-chakra font-bold uppercase transition cursor-pointer ${
                        graphicsQuality === q
                          ? 'bg-orange-500 text-black shadow-md'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume sliders */}
              <div className="flex flex-col gap-2.5 bg-neutral-950 border border-neutral-800 p-3">
                <span className="text-xs font-mono text-neutral-300 uppercase font-bold flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-orange-400" />
                  <span>AUDIO VOLUMES</span>
                </span>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span>MASTER VOLUME</span>
                    <span>{Math.round(masterVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={masterVol}
                    onChange={(e) => handleVolumeChange(Number(e.target.value), sfxVol, musicVol)}
                    className="accent-orange-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span>SFX & COMBAT AUDIO</span>
                    <span>{Math.round(sfxVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sfxVol}
                    onChange={(e) => handleVolumeChange(masterVol, Number(e.target.value), musicVol)}
                    className="accent-orange-500"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono text-neutral-400">
                    <span>DYNAMIC BATTLE SOUNDTRACK</span>
                    <span>{Math.round(musicVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={musicVol}
                    onChange={(e) => handleVolumeChange(masterVol, sfxVol, Number(e.target.value))}
                    className="accent-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: 3D CHARACTER PEDESTAL SHOWCASE */}
        <div className="flex-1 min-h-[360px] md:min-h-0 flex flex-col items-center justify-center relative">
          <div className="w-full h-full max-w-md max-h-[520px] relative">
            <HeroPreview3D
              characterId={selectedCharacter}
              skinId={activeSkin}
              weaponType={previewWeapon}
            />

            {/* Pedestal Footnote */}
            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center pointer-events-none">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-neutral-950/80 px-3 py-1 border border-neutral-800">
                DRAG TO ROTATE OPERATOR 360°
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 3. JOIN ROOM MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-neutral-950 border-2 border-neutral-700 p-6 flex flex-col gap-4 shadow-2xl">
            <h3 className="font-chakra font-bold text-2xl text-white">ENTER ROOM CODE</h3>
            <p className="text-xs font-mono text-neutral-400">
              Enter the 5-character code from your host friend to join their battle royale match.
            </p>

            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. 7XQ9A"
              className="bg-neutral-900 border-2 border-orange-500 px-4 py-3 font-mono font-bold text-2xl text-center text-orange-400 tracking-widest uppercase focus:outline-none"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowJoinModal(false)}
                className="w-1/2 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-chakra font-bold uppercase cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (joinCodeInput.trim()) {
                    setShowJoinModal(false);
                    onStartGame('room', joinCodeInput.trim());
                  }
                }}
                className="w-1/2 py-2.5 bg-orange-500 hover:bg-orange-400 text-black text-xs font-chakra font-bold uppercase cursor-pointer"
              >
                JOIN PARTY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. FOOTER STATUS BAR */}
      <footer className="relative z-20 px-6 py-2.5 border-t border-neutral-800/80 bg-neutral-950/70 flex items-center justify-between text-[11px] font-mono text-neutral-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-neutral-400">SERVERS ONLINE · 20 HZ SYNC</span>
          </div>
          <span className="hidden sm:inline text-neutral-600">|</span>
          <span className="hidden sm:inline text-neutral-400">MAP: NEO CALDERA (500M)</span>
        </div>
        <span>IGNITE MAX © 2026 · ORIGINAL 3D CYBER ROYALE</span>
      </footer>
    </div>
  );
};
