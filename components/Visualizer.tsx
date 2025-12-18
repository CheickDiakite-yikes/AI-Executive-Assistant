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
  
  // Color mapping based on persona
  const getGlowColor = () => {
    switch (persona.id) {
      case 'atlas': return 'rgba(59, 130, 246, 0.6)';
      case 'nova': return 'rgba(244, 63, 94, 0.6)';
      case 'zorra': return 'rgba(147, 51, 234, 0.6)'; // Purple/Violet
      case 'maya': 
      default: return 'rgba(217, 119, 6, 0.6)';
    }
  };

  const glowColor = getGlowColor();

  return (
    <div className="relative flex items-center justify-center w-64 h-64 pointer-events-none">
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 rounded-full opacity-30 blur-3xl transition-colors duration-1000"
        style={{ background: glowColor, transform: `scale(${1 + volume * 0.5})` }}
      />
      
      {/* Main Orb */}
      <div 
        className={`relative w-24 h-24 rounded-full glass transition-all duration-100 ease-out flex items-center justify-center border-2 border-white/20`}
        style={{ 
          transform: `scale(${state === AgentState.SPEAKING ? scale : 1})`,
          boxShadow: `0 0 ${20 + volume * 50}px ${glowColor}`
        }}
      >
        {/* Core */}
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-transparent ${state === AgentState.THINKING ? 'animate-spin' : ''}`} />
      </div>

      {/* State Text */}
      <div className="absolute -bottom-12 text-white/60 text-sm font-medium tracking-widest uppercase fade-in">
        {state === AgentState.LISTENING ? "Listening..." : 
         state === AgentState.THINKING ? "Thinking..." : 
         state === AgentState.SPEAKING ? "Speaking" : ""}
      </div>
    </div>
  );
};

export default Visualizer;