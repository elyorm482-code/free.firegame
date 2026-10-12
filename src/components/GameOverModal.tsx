import React from 'react';
import { Trophy, Skull, Crosshair, ShieldAlert, RotateCcw, Home, Award } from 'lucide-react';

interface GameOverModalProps {
  isVictory: boolean;
  winnerName: string;
  stats: {
    kills: number;
    damage: number;
    rank: number;
  };
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isVictory,
  winnerName,
  stats,
  onPlayAgain,
  onReturnToLobby
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-neutral-950 border-2 border-neutral-700 shadow-2xl p-6 sm:p-8 flex flex-col items-center text-center overflow-hidden">
        {/* Top Glow Banner Accent */}
        <div
          className={`absolute top-0 inset-x-0 h-1.5 ${
            isVictory ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300' : 'bg-red-600'
          }`}
        />

        {/* Big Icon */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
            isVictory
              ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
              : 'bg-red-950 border-2 border-red-500 text-red-500'
          }`}
        >
          {isVictory ? <Trophy className="w-10 h-10 animate-bounce" /> : <ShieldAlert className="w-10 h-10" />}
        </div>

        {/* Title */}
        <h1
          className={`font-teko text-5xl sm:text-6xl uppercase tracking-wider leading-none font-bold ${
            isVictory
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-200'
              : 'text-red-500'
          }`}
        >
          {isVictory ? 'VICTORY ROYALE!' : 'ELIMINATED'}
        </h1>

        <p className="text-sm font-mono text-neutral-400 mt-1 mb-6">
          {isVictory ? 'You emerged as the last surviving operator!' : `Last operator standing: ${winnerName}`}
        </p>

        {/* Rank Placement Pill */}
        <div className="bg-neutral-900 border border-neutral-800 px-6 py-2 mb-6 flex items-center gap-3">
          <Award className="w-5 h-5 text-orange-400" />
          <span className="font-mono text-xs text-neutral-400 uppercase">PLACEMENT:</span>
          <span className="font-chakra font-black text-xl text-white">
            #{stats.rank} <span className="text-xs text-neutral-500 font-normal">/ 10</span>
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8">
          <div className="bg-neutral-900/90 border border-neutral-800 p-3 flex flex-col items-center">
            <Skull className="w-4 h-4 text-orange-400 mb-1" />
            <span className="text-[10px] font-mono text-neutral-400 uppercase">ELIMINATIONS</span>
            <span className="font-teko text-3xl font-bold text-white">{stats.kills}</span>
          </div>

          <div className="bg-neutral-900/90 border border-neutral-800 p-3 flex flex-col items-center">
            <Crosshair className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="text-[10px] font-mono text-neutral-400 uppercase">DAMAGE DEALT</span>
            <span className="font-teko text-3xl font-bold text-cyan-300">{stats.damage}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-black font-chakra font-bold text-base tracking-wider uppercase transition shadow-xl active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN</span>
          </button>

          <button
            onClick={onReturnToLobby}
            className="w-full py-3.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-chakra font-bold text-base tracking-wider uppercase transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
