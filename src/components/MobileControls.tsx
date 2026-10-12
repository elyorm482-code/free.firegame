import React, { useRef, useState, useEffect } from 'react';
import { WeaponType } from '../types/game';
import { Crosshair, RotateCw, ArrowUp, ChevronDown, Flame, Eye } from 'lucide-react';

interface MobileControlsProps {
  onMove: (dirX: number, dirY: number) => void;
  onLook: (deltaX: number, deltaY: number) => void;
  onJump: () => void;
  onCrouch: () => void;
  onAimToggle: () => void;
  onShoot: () => void;
  onReload: () => void;
  onSwitchWeapon: (type: WeaponType) => void;
  currentWeapon: WeaponType;
  isAiming: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onLook,
  onJump,
  onCrouch,
  onAimToggle,
  onShoot,
  onReload,
  onSwitchWeapon,
  currentWeapon,
  isAiming
}) => {
  // Virtual Joystick State
  const joystickAreaRef = useRef<HTMLDivElement>(null);
  const lookAreaRef = useRef<HTMLDivElement>(null);

  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number } | null>(null);
  const [stickOffset, setStickOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Joystick Touch Handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;

    const rect = joystickAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const startX = touch.clientX - rect.left;
    const startY = touch.clientY - rect.top;
    setJoystickPos({ x: startX, y: startY });
    setStickOffset({ x: 0, y: 0 });
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null || !joystickPos) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        const rect = joystickAreaRef.current?.getBoundingClientRect();
        if (!rect) return;

        const curX = touch.clientX - rect.left;
        const curY = touch.clientY - rect.top;

        const dx = curX - joystickPos.x;
        const dy = curY - joystickPos.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 48;

        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        const offsetX = Math.cos(angle) * clampedDist;
        const offsetY = Math.sin(angle) * clampedDist;

        setStickOffset({ x: offsetX, y: offsetY });

        // Normalize -1 to 1
        const normX = offsetX / maxDist;
        const normY = offsetY / maxDist;
        onMove(normX, normY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickPos(null);
        setStickOffset({ x: 0, y: 0 });
        onMove(0, 0);
        break;
      }
    }
  };

  // Look Area Swipe Handlers
  const handleLookTouchStart = (e: React.TouchEvent) => {
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    if (lookTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
        onLook(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* LEFT HALF: VIRTUAL JOYSTICK AREA */}
      <div
        ref={joystickAreaRef}
        onTouchStart={handleJoystickTouchStart}
        onTouchMove={handleJoystickTouchMove}
        onTouchEnd={handleJoystickTouchEnd}
        onTouchCancel={handleJoystickTouchEnd}
        className="absolute bottom-0 left-0 w-1/2 h-2/3 pointer-events-auto touch-none"
      >
        {/* Render Joystick Base and Stick */}
        {joystickPos ? (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white/30 bg-black/40 backdrop-blur-sm pointer-events-none flex items-center justify-center"
            style={{ left: joystickPos.x, top: joystickPos.y }}
          >
            <div
              className="w-12 h-12 rounded-full bg-orange-500 shadow-lg border-2 border-white pointer-events-none"
              style={{ transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)` }}
            />
          </div>
        ) : (
          <div className="absolute bottom-16 left-12 w-24 h-24 rounded-full border border-dashed border-white/20 bg-black/20 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] font-mono text-white/40 uppercase">MOVE</span>
          </div>
        )}
      </div>

      {/* RIGHT HALF: LOOK SWIPE AREA */}
      <div
        ref={lookAreaRef}
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
        className="absolute bottom-0 right-0 w-1/2 h-2/3 pointer-events-auto touch-none"
      />

      {/* RIGHT SIDE ACTION BUTTONS */}
      <div className="absolute bottom-20 right-6 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Aim ADS Toggle */}
        <button
          onClick={onAimToggle}
          className={`w-14 h-14 rounded-full border-2 flex items-center justify-center backdrop-blur shadow-2xl transition active:scale-90 ${
            isAiming
              ? 'bg-orange-500 border-white text-black'
              : 'bg-black/60 border-neutral-500 text-white'
          }`}
        >
          <Eye className="w-6 h-6" />
        </button>

        {/* Reload Button */}
        <button
          onClick={onReload}
          className="w-12 h-12 rounded-full bg-black/60 border border-neutral-600 text-white flex items-center justify-center active:scale-90 shadow-lg"
        >
          <RotateCw className="w-5 h-5" />
        </button>

        {/* Large Primary Fire Button */}
        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            onShoot();
          }}
          onClick={onShoot}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 border-4 border-white/80 shadow-[0_0_20px_rgba(249,115,22,0.8)] flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <Flame className="w-9 h-9 fill-white" />
        </button>
      </div>

      {/* JUMP & CROUCH BUTTONS (Bottom Center Right) */}
      <div className="absolute bottom-8 right-32 flex items-center gap-3 pointer-events-auto">
        {/* Crouch */}
        <button
          onClick={onCrouch}
          className="w-12 h-12 rounded-full bg-black/60 border border-neutral-600 text-white flex items-center justify-center active:scale-90 shadow-lg"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Jump */}
        <button
          onClick={onJump}
          className="w-14 h-14 rounded-full bg-neutral-900/80 border-2 border-white/80 text-white flex items-center justify-center active:scale-90 shadow-xl"
        >
          <ArrowUp className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
