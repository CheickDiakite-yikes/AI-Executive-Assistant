import React from 'react';
import { AgentState, AgentPersona } from '../types';

interface VisualizerProps {
  state: AgentState;
  volume: number; // 0 to 1
  persona: AgentPersona;
}

const Visualizer: React.FC<VisualizerProps> = ({ state, volume, persona }) => {
  // Map volume to scale
  const scale = 1 + Math.max(0, volume) * 1.5;
  
  // Color mapping based on persona - Gold/Amber dominant
  const getGlowColor = () => {
    switch (persona.id) {
      case 'atlas': return 'rgba(59, 130, 246, 0.6)'; // Keep Blue for Atlas
      case 'nova': return 'rgba(244, 63, 94, 0.6)'; // Keep Rose for Nova
      case 'zorra': return 'rgba(147, 51, 234, 0.6)'; // Keep Purple for Zorra
      case 'maya': 
      default: return 'rgba(245, 158, 11, 0.6)'; // Amber/Gold for Maya
    }
  };

  const glowColor = getGlowColor();

  return (
    <div className="relative flex items-center justify-center w-80 h-80 pointer-events-none">
      {/* Background ambient glow - Sun God Ra Style */}
      <div 
        className="absolute inset-0 rounded-full opacity-20 blur-[60px] transition-colors duration-1000"
        style={{ background: glowColor, transform: `scale(${1 + volume * 0.8})` }}
      />
      
      {/* Outer Ring - Ancient Glyph Style */}
      <div 
         className="absolute inset-0 rounded-full border border-amber-500/10 opacity-40 animate-[spin_10s_linear_infinite]"
         style={{ transform: `scale(${1.2 + volume * 0.1})` }}
      ></div>
      <div 
         className="absolute inset-0 rounded-full border border-amber-500/5 opacity-30 animate-[spin_15s_linear_infinite_reverse]"
         style={{ transform: `scale(${1.4 + volume * 0.1})` }}
      ></div>

      {/* Main Orb */}
      <div 
        className={`relative w-32 h-32 rounded-full transition-all duration-100 ease-out flex items-center justify-center border border-amber-100/20 shadow-[inset_0_0_20px_rgba(251,191,36,0.2)]`}
        style={{ 
          transform: `scale(${state === AgentState.SPEAKING ? scale : 1})`,
          boxShadow: `0 0 ${30 + volume * 60}px ${glowColor}, inset 0 0 20px ${glowColor}`
        }}
      >
        {/* Core - The Eye */}
        <div className={`w-28 h-28 rounded-full bg-gradient-to-br from-amber-100/30 to-transparent backdrop-blur-sm ${state === AgentState.THINKING ? 'animate-pulse' : ''}`}>
           <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent rounded-full"></div>
        </div>
      </div>

      {/* State Text */}
      <div className="absolute -bottom-16 text-amber-100/40 text-xs font-serif tracking-[0.3em] uppercase fade-in">
        {state === AgentState.LISTENING ? "Listening..." : 
         state === AgentState.THINKING ? "Divining..." : 
         state === AgentState.SPEAKING ? "Speaking" : ""}
      </div>
    </div>
  );
};

export default Visualizer;