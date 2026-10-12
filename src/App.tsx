import React, { useState, useEffect, useRef } from 'react';
import { CharacterId, SkinId, LootItem, SafeZoneState, WeaponType, RoomInfo } from './types/game';
import { GameEngine } from './game/engine/GameEngine';
import { sound } from './game/audio/SoundSystem';
import { MainMenu } from './components/MainMenu';
import { HUD } from './components/HUD';
import { MobileControls } from './components/MobileControls';
import { GameOverModal } from './components/GameOverModal';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'in_game' | 'game_over'>('menu');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('viper');
  const [selectedSkin, setSelectedSkin] = useState<SkinId>('default');
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('ignite_player_name') || `Operator-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isHost, setIsHost] = useState(true);
  const [graphicsQuality, setGraphicsQuality] = useState<'low' | 'balanced' | 'high' | 'ultra'>('high');
  const [isMobile, setIsMobile] = useState(false);

  // HUD Realtime State
  const [hudData, setHudData] = useState({
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    currentWeapon: 'rifle' as WeaponType,
    ammoInMag: 30,
    ammoReserve: 120,
    isReloading: false,
    isAiming: false,
    aliveCount: 10,
    kills: 0,
    damageDealt: 0,
    safeZone: {
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
    } as SafeZoneState,
    nearbyLoot: null as LootItem | null,
    compassHeading: 0,
    ping: 25,
    isInStorm: false
  });

  const [hitMarker, setHitMarker] = useState<{ active: boolean; isHeadshot: boolean; damage: number } | null>(null);
  const [killFeed, setKillFeed] = useState<{ id: string; killer: string; victim: string; weapon: string; headshot: boolean }[]>([]);
  const [gameOverData, setGameOverData] = useState<{
    isVictory: boolean;
    winnerName: string;
    stats: { kills: number; damage: number; rank: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouch || isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleUpdatePlayerName = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('ignite_player_name', name);
  };

  // Launch Game
  const handleStartGame = (mode: 'solo' | 'room', roomCode?: string, createRoom?: boolean) => {
    sound.init();
    setGameState('in_game');
    sound.startMusic('battle');

    // Give react time to mount container
    setTimeout(() => {
      if (!containerRef.current) return;

      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }

      const engine = new GameEngine(
        containerRef.current,
        {
          onHUDUpdate: (data) => {
            setHudData(data);
          },
          onHitMarker: (isHeadshot, damage) => {
            setHitMarker({ active: true, isHeadshot, damage });
            setTimeout(() => setHitMarker(null), 300);
          },
          onDamageTaken: () => {
            // Screen red flinch handled by damage state
          },
          onKillFeed: (entry) => {
            setKillFeed((prev) => [...prev.slice(-4), { id: Math.random().toString(), ...entry }]);
          },
          onGameOver: (winnerName, isVictory, stats) => {
            setGameOverData({
              isVictory,
              winnerName,
              stats
            });
            setGameState('game_over');
          }
        },
        selectedCharacter,
        playerName,
        selectedSkin
      );

      engine.setGraphicsQuality(graphicsQuality);
      engineRef.current = engine;

      if (mode === 'solo') {
        engine.initSoloBots();
      } else {
        engine.connect(roomCode, createRoom);
      }
    }, 50);
  };

  const handleReturnToLobby = () => {
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setGameState('menu');
    setRoomInfo(null);
    setGameOverData(null);
    sound.startMusic('lobby');
  };

  const handlePlayAgain = () => {
    handleReturnToLobby();
    setTimeout(() => {
      handleStartGame('solo');
    }, 100);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className={`absolute inset-0 w-full h-full ${gameState === 'menu' ? 'hidden' : 'block'}`}
      />

      {/* MAIN MENU */}
      {gameState === 'menu' && (
        <MainMenu
          onStartGame={handleStartGame}
          selectedCharacter={selectedCharacter}
          onSelectCharacter={setSelectedCharacter}
          selectedSkin={selectedSkin}
          onSelectSkin={setSelectedSkin}
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          roomInfo={roomInfo}
          onStartRoomMatch={() => handleStartGame('room', roomInfo?.code)}
          onToggleReady={() => {}}
          isHost={isHost}
          graphicsQuality={graphicsQuality}
          onChangeGraphics={(q) => {
            setGraphicsQuality(q);
            if (engineRef.current) engineRef.current.setGraphicsQuality(q);
          }}
        />
      )}

      {/* IN-GAME HEADS-UP DISPLAY (HUD) */}
      {gameState === 'in_game' && (
        <>
          <HUD
            health={hudData.health}
            maxHealth={hudData.maxHealth}
            armor={hudData.armor}
            maxArmor={hudData.maxArmor}
            currentWeapon={hudData.currentWeapon}
            ammoInMag={hudData.ammoInMag}
            ammoReserve={hudData.ammoReserve}
            isReloading={hudData.isReloading}
            isAiming={hudData.isAiming}
            aliveCount={hudData.aliveCount}
            kills={hudData.kills}
            damageDealt={hudData.damageDealt}
            safeZone={hudData.safeZone}
            nearbyLoot={hudData.nearbyLoot}
            compassHeading={hudData.compassHeading}
            ping={hudData.ping}
            isInStorm={hudData.isInStorm}
            hitMarker={hitMarker}
            killFeed={killFeed}
            onPickupLoot={() => engineRef.current?.pickupNearestLoot()}
            onUseItem={(type) => engineRef.current?.useConsumable(type)}
            onSwitchWeapon={(w) => engineRef.current?.switchWeapon(w)}
            onReload={() => engineRef.current?.reloadWeapon()}
            isMobile={isMobile}
          />

          {/* MOBILE ON-SCREEN CONTROLS */}
          {isMobile && (
            <MobileControls
              onMove={(dx, dy) => engineRef.current?.handleMobileMove(dx, dy)}
              onLook={(dx, dy) => engineRef.current?.handleMobileLook(dx, dy)}
              onJump={() => engineRef.current?.handleMobileJump()}
              onCrouch={() => engineRef.current?.handleMobileCrouch()}
              onAimToggle={() => engineRef.current?.handleMobileAimToggle()}
              onShoot={() => engineRef.current?.handleMobileShoot()}
              onReload={() => engineRef.current?.reloadWeapon()}
              onSwitchWeapon={(w) => engineRef.current?.switchWeapon(w)}
              currentWeapon={hudData.currentWeapon}
              isAiming={hudData.isAiming}
            />
          )}

          {/* Quick Exit / Menu Button */}
          <button
            onClick={handleReturnToLobby}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 hover:bg-black/90 border border-neutral-700 text-[11px] font-mono text-neutral-400 hover:text-white uppercase tracking-wider backdrop-blur transition z-30 cursor-pointer pointer-events-auto"
          >
            ESC / LEAVE MATCH
          </button>
        </>
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'game_over' && gameOverData && (
        <GameOverModal
          isVictory={gameOverData.isVictory}
          winnerName={gameOverData.winnerName}
          stats={gameOverData.stats}
          onPlayAgain={handlePlayAgain}
          onReturnToLobby={handleReturnToLobby}
        />
      )}
    </div>
  );
}
