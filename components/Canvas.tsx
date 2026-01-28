
import React, { useEffect, useRef, useState } from 'react';
import { CanvasItem } from '../types';
import {
  X,
  Code,
  Mail,
  Calendar,
  Image as ImageIcon,
  Cpu,
  PenTool,
  AlertTriangle,
  BarChart2,
  Globe,
  FileText,
  Minus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Briefcase,
  Target,
} from 'lucide-react';
import CanvasItemContent from './CanvasItemContent';

interface CanvasProps {
  items: CanvasItem[];
  onClose: (id: string) => void;
  onAction?: (action: string, data: any) => void;
}

const Canvas: React.FC<CanvasProps> = ({ items, onClose, onAction }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Automatically focus new items
  useEffect(() => {
    if (items.length > 0) {
      setActiveIndex(0);
      setIsMinimized(false);
    }
  }, [items.length]); // Triggers when a new item is added

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (items.length <= 1) return;
        if (isMinimized) return;
        
        if (e.key === 'ArrowLeft') {
            // Left arrow -> Older item (Previous in list, higher index)
            if (activeIndex < items.length - 1) setActiveIndex(prev => prev + 1);
        } else if (e.key === 'ArrowRight') {
             // Right arrow -> Newer item (Next in list, lower index)
            if (activeIndex > 0) setActiveIndex(prev => prev - 1);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, activeIndex, isMinimized]);

  if (items.length === 0) return null;

  // Safety check
  const safeIndex = Math.min(activeIndex, items.length - 1);
  const activeItem = items[safeIndex];

  const handleAction = (action: string, data: any) => {
      if (onAction) {
          onAction(action, data);
      }
  };

  const showOlder = () => { // "Left" visually, but higher index
    if (safeIndex < items.length - 1) setActiveIndex(safeIndex + 1);
  };

  const showNewer = () => { // "Right" visually, but lower index
    if (safeIndex > 0) setActiveIndex(safeIndex - 1);
  };

  // If minimized, show a pill at the bottom
  if (isMinimized) {
    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 animate-in slide-in-from-bottom-5 fade-in pointer-events-auto">
           <div 
             onClick={() => setIsMinimized(false)}
             className="flex items-center space-x-3 bg-gray-900/80 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full shadow-2xl cursor-pointer hover:bg-gray-800/90 transition-all hover:scale-105 active:scale-95"
           >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-sm font-medium text-white">{activeItem.title}</span>
              <span className="text-xs text-white/40 border-l border-white/10 pl-3 uppercase tracking-wider">{activeItem.type.replace('-', ' ')}</span>
              {items.length > 1 && (
                 <span className="bg-white/20 text-white text-[10px] px-1.5 rounded-full">{items.length}</span>
              )}
           </div>
        </div>
    );
  }

  return (
    <div className="absolute inset-x-4 top-24 bottom-32 z-20 pointer-events-none flex flex-col items-center justify-start">
      
      {/* Navigation Controls (Outside Card) */}
      {items.length > 1 && (
        <div className="pointer-events-auto absolute top-1/2 -translate-y-1/2 w-full max-w-2xl flex justify-between px-4 z-0">
            {/* Show Older Items Button (Left) */}
            <button 
                onClick={showOlder} 
                disabled={safeIndex === items.length - 1}
                className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 shadow-xl group ${safeIndex === items.length - 1 ? 'opacity-0 scale-90 cursor-default' : 'bg-black/40 border-white/10 text-white hover:bg-black/60 hover:scale-110 cursor-pointer'}`}
                title="Previous Item"
            >
                <ChevronLeft size={28} className="opacity-80 group-hover:opacity-100" />
            </button>
            
            {/* Show Newer Items Button (Right) */}
            <button 
                onClick={showNewer} 
                disabled={safeIndex === 0}
                className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 shadow-xl group ${safeIndex === 0 ? 'opacity-0 scale-90 cursor-default' : 'bg-black/40 border-white/10 text-white hover:bg-black/60 hover:scale-110 cursor-pointer'}`}
                title="Next Item"
            >
                <ChevronRight size={28} className="opacity-80 group-hover:opacity-100" />
            </button>
        </div>
      )}

      {/* Main Card Container */}
      <div className="relative w-full max-w-md flex flex-col items-center z-10 pointer-events-auto">
          
          {/* Pagination Indicators */}
          {items.length > 1 && (
             <div className="absolute -top-6 flex space-x-1.5 p-2 rounded-full bg-black/20 backdrop-blur-sm">
                 {items.slice(0, 5).map((_, idx) => {
                     // We only show up to 5 dots to keep it clean, mapping roughly to current window
                     const isCurrent = idx === safeIndex;
                     if (idx > items.length - 1) return null;
                     return (
                         <div 
                            key={idx} 
                            className={`transition-all duration-300 rounded-full ${isCurrent ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/20'}`} 
                         />
                     );
                 })}
                 {items.length > 5 && <div className="w-1 h-1 rounded-full bg-white/10 self-center ml-1"></div>}
             </div>
          )}

          <div 
            className="w-full bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-500 ease-out animate-in zoom-in-95 fade-in flex flex-col max-h-[60vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5 shrink-0 cursor-move">
              <div className="flex items-center space-x-2 text-white/80">
                {activeItem.type === 'email' && <Mail size={16} className="text-blue-400" />}
                {activeItem.type === 'email-draft' && <PenTool size={16} className="text-amber-400" />}
                {activeItem.type === 'calendar' && <Calendar size={16} className="text-red-400" />}
                {activeItem.type === 'code' && <Code size={16} className="text-green-400" />}
                {(activeItem.type === 'image' || activeItem.type === 'generated-image') && <ImageIcon size={16} className="text-purple-400" />}
                {activeItem.type === 'memory' && <Cpu size={16} className="text-pink-400" />}
                {activeItem.type === 'system-notification' && <AlertTriangle size={16} className="text-orange-400" />}
                {activeItem.type === 'chart' && <BarChart2 size={16} className="text-emerald-400" />}
                {activeItem.type === 'web-search' && <Globe size={16} className="text-sky-400" />}
                {activeItem.type === 'note' && <FileText size={16} className="text-yellow-400" />}
                {activeItem.type === 'note-search-results' && <FileText size={16} className="text-yellow-400" />}
                {activeItem.type === 'financial-ticker' && <TrendingUp size={16} className="text-green-400" />}
                {activeItem.type === 'dossier' && <Briefcase size={16} className="text-indigo-400" />}
                {activeItem.type === 'strategy-memo' && <Target size={16} className="text-rose-400" />}
                
                <span className="text-xs font-semibold uppercase tracking-wider text-white/60">{activeItem.type.replace('-', ' ')}</span>
                
                {items.length > 1 && (
                    <span className="ml-2 text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/40">
                        {items.length - safeIndex} of {items.length}
                    </span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <button onClick={() => setIsMinimized(true)} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Minimize">
                   <Minus size={18} />
                </button>
                <button onClick={() => onClose(activeItem.id)} className="p-2 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors" title="Close">
                   <X size={18} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div ref={scrollRef} className="p-6 overflow-y-auto no-scrollbar text-white flex-1">
              <CanvasItemContent item={activeItem} onAction={handleAction} />
            </div>
          </div>
      </div>
    </div>
  );
};

export default Canvas;
