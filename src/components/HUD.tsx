import React, { useEffect, useRef } from 'react';
import { LootItem, SafeZoneState, WeaponType } from '../types/game';
import { WEAPONS } from '../game/constants';
import {
  Shield,
  Heart,
  Crosshair,
  Skull,
  Radio,
  Zap,
  RotateCw,
  Plus,
  Box,
  Eye
} from 'lucide-react';

interface HUDProps {
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
  hitMarker: { active: boolean; isHeadshot: boolean; damage: number } | null;
  killFeed: { id: string; killer: string; victim: string; weapon: string; headshot: boolean }[];
  onPickupLoot: () => void;
  onUseItem: (type: 'medkit' | 'armor') => void;
  onSwitchWeapon: (type: WeaponType) => void;
  onReload: () => void;
  isMobile: boolean;
}

export const HUD: React.FC<HUDProps> = ({
  health,
  maxHealth,
  armor,
  maxArmor,
  currentWeapon,
  ammoInMag,
  ammoReserve,
  isReloading,
  isAiming,
  aliveCount,
  kills,
  damageDealt,
  safeZone,
  nearbyLoot,
  compassHeading,
  ping,
  isInStorm,
  hitMarker,
  killFeed,
  onPickupLoot,
  onUseItem,
  onSwitchWeapon,
  onReload,
  isMobile
}) => {
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const curWepDef = WEAPONS[currentWeapon];

  // Draw Minimap Canvas
  useEffect(() => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const mapScale = (w * 0.45) / 250; // map size is 500 (-250 to +250)

    ctx.clearRect(0, 0, w, h);

    // Island circular background
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.46, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Ocean grid lines
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 10; x < w; x += 25) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 10; y < h; y += 25) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Major POI blips
    const pois = [
      { name: 'CITADEL', x: 0, z: 0, color: '#ff6200' },
      { name: 'SHIPYARD', x: -120, z: -100, color: '#38bdf8' },
      { name: 'RADAR', x: 130, z: -110, color: '#eab308' },
      { name: 'STILT BAY', x: -110, z: 110, color: '#10b981' },
      { name: 'APEX PEAK', x: 120, z: 120, color: '#a855f7' }
    ];

    pois.forEach((poi) => {
      const px = cx + poi.x * mapScale;
      const py = cy + poi.z * mapScale;
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = poi.color;
      ctx.fill();

      ctx.font = '8px Rajdhani';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(poi.name, px - 12, py - 6);
    });

    // Current Safe Zone Circle (Cyan)
    const szRadius = safeZone.currentRadius * mapScale;
    const szX = cx + safeZone.currentCenter.x * mapScale;
    const szY = cy + safeZone.currentCenter.z * mapScale;
    ctx.beginPath();
    ctx.arc(szX, szY, Math.max(2, szRadius), 0, Math.PI * 2);
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 242, 255, 0.08)';
    ctx.fill();

    // Next Target Safe Zone (White Dashed)
    const targetRadius = safeZone.targetRadius * mapScale;
    const tgtX = cx + safeZone.targetCenter.x * mapScale;
    const tgtY = cy + safeZone.targetCenter.z * mapScale;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.arc(tgtX, tgtY, Math.max(2, targetRadius), 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Player position marker (Orange Arrow in center)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((compassHeading * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fillStyle = '#ff6b00';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }, [safeZone, compassHeading]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
      {/* 1. STORM WARNING PERIPHERAL GLOW */}
      {isInStorm && (
        <div className="absolute inset-0 border-8 border-red-500/70 animate-pulse bg-red-950/20 pointer-events-none flex items-center justify-center">
          <div className="bg-red-950/90 border border-red-500 px-6 py-2 text-red-100 font-teko text-2xl tracking-widest uppercase shadow-2xl flex items-center gap-3">
            <Radio className="w-6 h-6 text-red-400 animate-spin" />
            <span>OUTSIDE SAFE ZONE · TAKING RADIATION DAMAGE</span>
          </div>
        </div>
      )}

      {/* 2. TOP COMPASS BAR */}
      <div className="absolute top-2 inset-x-0 flex flex-col items-center">
        <div className="relative w-72 sm:w-96 h-8 bg-neutral-950/70 border border-neutral-700/60 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-lg">
          {/* Degree Center Marker */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10" />
          <div className="absolute -top-1 w-2 h-2 bg-orange-500 rotate-45 z-10" />

          {/* Scrolling Ticks */}
          <div
            className="flex items-center gap-8 text-xs font-mono font-bold text-neutral-400 transition-transform duration-75"
            style={{ transform: `translateX(${-((compassHeading % 360) - 180) * 1.5}px)` }}
          >
            {Array.from({ length: 24 }).map((_, i) => {
              const deg = (i * 15) % 360;
              let label = `${deg}`;
              if (deg === 0) label = 'N';
              else if (deg === 45) label = 'NE';
              else if (deg === 90) label = 'E';
              else if (deg === 135) label = 'SE';
              else if (deg === 180) label = 'S';
              else if (deg === 225) label = 'SW';
              else if (deg === 270) label = 'W';
              else if (deg === 315) label = 'NW';

              const isCardinal = ['N', 'E', 'S', 'W'].includes(label);
              return (
                <div key={i} className="flex flex-col items-center">
                  <span className={`text-[10px] ${isCardinal ? 'text-orange-400 font-black text-xs' : ''}`}>
                    {label}
                  </span>
                  <div className={`w-0.5 ${isCardinal ? 'h-3 bg-orange-400' : 'h-1.5 bg-neutral-600'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Heading Digital Badge */}
        <div className="bg-neutral-900/90 border border-neutral-700 px-2 py-0.5 text-[11px] font-mono font-bold text-orange-400 shadow">
          {compassHeading}°
        </div>
      </div>

      {/* 3. TOP MATCH STATS HEADER */}
      <div className="absolute top-4 left-4 flex items-center gap-3">
        {/* Alive Counter */}
        <div className="flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 px-3 py-1.5 backdrop-blur shadow-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">ALIVE</span>
            <span className="font-teko text-2xl leading-none font-bold text-white tracking-wider">{aliveCount}</span>
          </div>
        </div>

        {/* Kills Counter */}
        <div className="flex items-center gap-2 bg-neutral-950/80 border border-neutral-800 px-3 py-1.5 backdrop-blur shadow-md">
          <Skull className="w-4 h-4 text-orange-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">ELIMINATIONS</span>
            <span className="font-teko text-2xl leading-none font-bold text-orange-400 tracking-wider">{kills}</span>
          </div>
        </div>

        {/* Ping */}
        <div className="hidden sm:flex items-center gap-1.5 bg-neutral-950/80 border border-neutral-800 px-2.5 py-1 text-xs font-mono font-bold text-emerald-400">
          <Zap className="w-3.5 h-3.5" />
          <span>{ping}ms</span>
        </div>
      </div>

      {/* 4. SAFE ZONE TIMER (Top Center Below Compass) */}
      <div className="absolute top-16 inset-x-0 flex justify-center">
        <div className={`px-4 py-1 text-xs font-rajdhani font-bold flex items-center gap-2 backdrop-blur border shadow-md ${
          safeZone.isShrinking
            ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse'
            : 'bg-neutral-950/80 border-cyan-500/50 text-cyan-300'
        }`}>
          <div className={`w-2 h-2 rounded-full ${safeZone.isShrinking ? 'bg-amber-400' : 'bg-cyan-400'}`} />
          <span>
            {safeZone.isShrinking
              ? `ZONE RESTRICTING · PHASE ${safeZone.phase}`
              : `SAFE ZONE SHRINK IN ${formatTime(safeZone.shrinkTimer)}`}
          </span>
        </div>
      </div>

      {/* 5. TOP RIGHT MINIMAP & KILL FEED */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-3">
        {/* Minimap Box */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 bg-neutral-950/90 border-2 border-neutral-700/80 shadow-2xl p-1 backdrop-blur-md">
          <canvas ref={minimapCanvasRef} width={176} height={176} className="w-full h-full" />
          <div className="absolute top-1.5 left-2 text-[9px] font-mono font-bold text-neutral-400 tracking-wider">
            RADAR · 500M
          </div>
        </div>

        {/* Kill Feed */}
        <div className="w-64 max-h-32 flex flex-col gap-1 overflow-hidden pointer-events-none">
          {killFeed.slice(-3).map((kf) => (
            <div
              key={kf.id}
              className="bg-neutral-950/80 border-l-2 border-orange-500 px-2 py-1 text-[11px] font-mono text-neutral-200 flex items-center justify-between shadow"
            >
              <span className="font-bold text-white truncate max-w-[80px]">{kf.killer}</span>
              <span className="text-[10px] text-orange-400 uppercase px-1">[{kf.weapon}]</span>
              <span className="text-neutral-400 truncate max-w-[80px]">{kf.victim}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6. CENTER CROSSHAIR & HIT MARKER */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {isAiming && currentWeapon === 'sniper' ? (
          // Tactical Sniper Scope Reticle Overlay
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40">
            {/* Outer Scope Circle */}
            <div className="relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] rounded-full border-2 border-cyan-400/80 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex items-center justify-center overflow-hidden">
              {/* Crosshairs */}
              <div className="absolute w-full h-[1px] bg-cyan-400/90" />
              <div className="absolute h-full w-[1px] bg-cyan-400/90" />
              {/* Center Mil-dot */}
              <div className="w-2.5 h-2.5 rounded-full border border-red-500 bg-red-500/40" />
              {/* Mil markings */}
              <div className="absolute top-1/4 w-4 h-[1px] bg-cyan-300" />
              <div className="absolute bottom-1/4 w-4 h-[1px] bg-cyan-300" />
              <div className="absolute left-1/4 h-4 w-[1px] bg-cyan-300" />
              <div className="absolute right-1/4 h-4 w-[1px] bg-cyan-300" />
              <div className="absolute bottom-6 font-mono text-[10px] text-cyan-300 tracking-wider">
                RANGE 350M · VANGUARD 8X
              </div>
            </div>
          </div>
        ) : (
          // Standard Dynamic Reticle
          <div className="relative w-8 h-8 flex items-center justify-center">
            {/* Center dot */}
            <div className="w-1.5 h-1.5 bg-white/90 rounded-full shadow" />
            {/* 4 tick lines */}
            <div className={`absolute -top-3 w-0.5 h-2 bg-white/80 transition-all ${isAiming ? 'top-[-6px]' : ''}`} />
            <div className={`absolute -bottom-3 w-0.5 h-2 bg-white/80 transition-all ${isAiming ? 'bottom-[-6px]' : ''}`} />
            <div className={`absolute -left-3 w-2 h-0.5 bg-white/80 transition-all ${isAiming ? 'left-[-6px]' : ''}`} />
            <div className={`absolute -right-3 w-2 h-0.5 bg-white/80 transition-all ${isAiming ? 'right-[-6px]' : ''}`} />

            {/* Hit Marker Chime */}
            {hitMarker?.active && (
              <div className="absolute inset-0 flex items-center justify-center animate-ping">
                <div className={`w-7 h-7 border-2 rotate-45 ${hitMarker.isHeadshot ? 'border-red-500' : 'border-amber-400'}`} />
                <span className={`absolute -top-7 font-chakra font-black text-sm ${hitMarker.isHeadshot ? 'text-red-400' : 'text-amber-300'}`}>
                  {hitMarker.isHeadshot ? `HEADSHOT! ${hitMarker.damage}` : hitMarker.damage}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. NEARBY GROUND LOOT PICKUP PROMPT */}
      {nearbyLoot && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center pointer-events-auto">
          <button
            onClick={onPickupLoot}
            className="flex items-center gap-3 bg-neutral-900/95 border-2 border-orange-500 px-5 py-2.5 backdrop-blur-md shadow-2xl hover:bg-neutral-800 transition active:scale-95 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded bg-orange-500/20 border border-orange-500 flex items-center justify-center text-orange-400 font-mono font-black text-sm">
              E
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-orange-400 uppercase tracking-widest font-bold">
                PICK UP {nearbyLoot.rarity.toUpperCase()}
              </span>
              <span className="font-chakra font-bold text-white text-base leading-tight">
                {nearbyLoot.name}
              </span>
            </div>
            <Box className="w-5 h-5 text-orange-400 ml-2 group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      )}

      {/* 8. BOTTOM LEFT HEALTH & ARMOR BARS */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 w-56 sm:w-72 pointer-events-auto">
        {/* Armor Shield Bar */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>ARMOR</span>
            </span>
            <span>{armor} / {maxArmor}</span>
          </div>
          <div className="w-full h-2.5 bg-neutral-900 border border-neutral-700 overflow-hidden shadow-inner">
            <div
              className="h-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (armor / maxArmor) * 100))}%` }}
            />
          </div>
        </div>

        {/* Health Bar */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-emerald-400" />
              <span>HEALTH</span>
            </span>
            <span>{health} / {maxHealth}</span>
          </div>
          <div className="w-full h-3.5 bg-neutral-900 border border-neutral-700 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-150 ${
                health < 30 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'
              } shadow-[0_0_8px_rgba(16,185,129,0.8)]`}
              style={{ width: `${Math.max(0, Math.min(100, (health / maxHealth) * 100))}%` }}
            />
          </div>
        </div>

        {/* Consumables quick actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onUseItem('medkit')}
            className="flex-1 bg-neutral-900/80 border border-neutral-700 hover:border-emerald-500 px-2 py-1 text-xs font-mono flex items-center justify-center gap-1.5 text-neutral-300 hover:text-emerald-400 transition cursor-pointer"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>MEDKIT [4]</span>
          </button>
          <button
            onClick={() => onUseItem('armor')}
            className="flex-1 bg-neutral-900/80 border border-neutral-700 hover:border-cyan-500 px-2 py-1 text-xs font-mono flex items-center justify-center gap-1.5 text-neutral-300 hover:text-cyan-400 transition cursor-pointer"
          >
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>PLATE [5]</span>
          </button>
        </div>
      </div>

      {/* 9. BOTTOM RIGHT WEAPON & AMMO DISPLAY */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Weapon Selection Bar */}
        <div className="flex items-center gap-1.5 bg-neutral-950/80 border border-neutral-800 p-1 backdrop-blur shadow-md">
          {(['rifle', 'smg', 'sniper', 'pistol'] as WeaponType[]).map((wKey, idx) => {
            const isEquipped = currentWeapon === wKey;
            const wep = WEAPONS[wKey];
            return (
              <button
                key={wKey}
                onClick={() => onSwitchWeapon(wKey)}
                className={`px-2.5 py-1 text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                  isEquipped
                    ? 'bg-orange-500 text-black shadow-md'
                    : 'text-neutral-400 hover:text-white bg-neutral-900/60'
                }`}
              >
                <span>{idx + 1}:</span>
                <span className="uppercase">{wKey}</span>
              </button>
            );
          })}
        </div>

        {/* Current Equipped Weapon Card */}
        <div className="relative bg-neutral-950/90 border-2 border-neutral-700/80 p-3 w-52 sm:w-64 backdrop-blur shadow-2xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-orange-400">
              {curWepDef.rarity.toUpperCase()} · {curWepDef.type.toUpperCase()}
            </span>
            <span className="font-chakra font-bold text-white text-lg tracking-wide leading-tight">
              {curWepDef.name}
            </span>
            {isReloading && (
              <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1 mt-1 animate-pulse">
                <RotateCw className="w-3 h-3 animate-spin" />
                <span>RELOADING...</span>
              </span>
            )}
          </div>

          {/* Ammo Digital Counter */}
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-1 font-teko leading-none">
              <span className={`text-4xl font-bold ${ammoInMag <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {ammoInMag}
              </span>
              <span className="text-xl font-bold text-neutral-500">/ {ammoReserve}</span>
            </div>
            <button
              onClick={onReload}
              className="text-[10px] font-mono text-neutral-400 hover:text-white uppercase flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-2.5 h-2.5" />
              <span>[R] RELOAD</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
