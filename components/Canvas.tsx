
import React, { useEffect, useRef, useState } from 'react';
import { CanvasItem, Note, FinancialData, DossierContent, StrategyMemoContent } from '../types';
import { 
  X, Code, Mail, Calendar, Image as ImageIcon, Cpu, 
  PenTool, Send, Palette, Archive, Reply, AlertTriangle, 
  BarChart2, Globe, FileText, Minus, ChevronLeft, ChevronRight, ExternalLink,
  TrendingUp, TrendingDown, Briefcase, Target, AlertOctagon, CheckSquare, Building, Edit2, Circle
} from 'lucide-react';

interface CanvasProps {
  items: CanvasItem[];
  onClose: (id: string) => void;
  onAction?: (action: string, data: any) => void;
}

// Simple Typing Effect Component
const TypingText: React.FC<{ text: string; speed?: number; onComplete?: () => void }> = ({ text, speed = 10, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i > text.length) {
         clearInterval(interval);
         if (onComplete) onComplete();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return <span>{displayedText}<span className="animate-pulse">|</span></span>;
};

// Dedicated Draft Item Component to handle editing state
const EmailDraftItem: React.FC<{ content: any; onAction: (action: string, data: any) => void }> = ({ content, onAction }) => {
  const [body, setBody] = useState(content.body);
  const [isEditing, setIsEditing] = useState(false);
  const [typingDone, setTypingDone] = useState(false);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
       <div className="flex flex-col space-y-3 pb-4 border-b border-white/10">
          <div className="flex justify-between text-sm items-center">
            <span className="text-white/40 w-16">To</span>
            <span className="text-white/90 font-medium flex-1 text-right bg-white/5 px-3 py-1 rounded-lg">{content.recipient}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-white/40 w-16">Subject</span>
            <span className="text-white/90 font-medium flex-1 text-right">{content.subject}</span>
          </div>
       </div>

       <div className="relative group">
           {!isEditing ? (
               <div 
                 onClick={() => { setIsEditing(true); setTypingDone(true); }}
                 className="bg-white/5 p-4 rounded-xl text-white/90 text-sm whitespace-pre-wrap min-h-[150px] font-light border border-white/5 cursor-text hover:border-white/20 transition-colors relative"
               >
                  {typingDone ? body : <TypingText text={content.body} speed={15} onComplete={() => setTypingDone(true)} />}
                  
                  {typingDone && (
                    <div className="absolute bottom-3 right-3 text-[10px] text-white/30 italic flex items-center bg-black/40 px-2 py-1 rounded-md backdrop-blur-sm">
                        <Edit2 size={10} className="mr-1.5"/> Click to edit
                    </div>
                  )}
               </div>
           ) : (
               <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onBlur={() => setIsEditing(false)}
                  className="w-full h-[150px] bg-white/5 p-4 rounded-xl text-white/90 text-sm font-light border border-white/20 focus:outline-none focus:border-amber-500/50 resize-none placeholder-white/20"
                  autoFocus
                  placeholder="Type your email content..."
               />
           )}
       </div>

       <div className="flex items-center justify-between pt-2">
          <button 
             onClick={() => onAction('discard_draft', content)}
             className="px-4 py-2 rounded-xl text-xs font-medium text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
          >
             Discard
          </button>
          <button 
            onClick={() => onAction('send_draft', { ...content, body })}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-900/20"
          >
             <Send size={14} />
             <span>{isEditing ? 'Confirm & Send' : 'Send Email'}</span>
          </button>
       </div>
    </div>
  );
};

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
              <h2 className="text-2xl font-light mb-6 leading-tight">{activeItem.title}</h2>
              
              {/* Content Renderers */}
              {activeItem.type === 'email' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center space-x-3">
                    <img src={activeItem.content.avatar} alt="Sender" className="w-10 h-10 rounded-full border border-white/10" />
                    <div>
                      <div className="font-medium text-white">{activeItem.content.from}</div>
                      <div className="text-xs text-white/50">Today, 10:42 AM</div>
                    </div>
                  </div>
                  <div className="text-white/80 leading-relaxed text-sm bg-white/5 p-5 rounded-2xl border border-white/5">
                    {activeItem.content.body}
                  </div>
                  <div className="flex space-x-3 mt-4 pt-2">
                    <button 
                        onClick={() => handleAction('reply', activeItem.content)}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm transition flex items-center justify-center space-x-2"
                    >
                        <Reply size={14} /> <span>Reply</span>
                    </button>
                    <button 
                        onClick={() => handleAction('archive', activeItem.content)}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-sm transition flex items-center justify-center space-x-2"
                    >
                        <Archive size={14} /> <span>Archive</span>
                    </button>
                  </div>
                </div>
              )}

              {activeItem.type === 'email-draft' && (
                 <EmailDraftItem content={activeItem.content} onAction={handleAction} />
              )}

              {activeItem.type === 'calendar' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                  {activeItem.content.map((evt: any, idx: number) => (
                    <div key={idx} className="flex flex-col p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border-l-4 border-amber-500">
                      <div className="text-xs text-amber-500 font-bold mb-1 uppercase tracking-wide">{evt.time}</div>
                      <div className="font-medium text-lg">{evt.title}</div>
                      <div className="text-xs text-white/50 mt-1 flex items-center">
                         <span className="mr-2">{evt.location}</span>
                         <span className="w-1 h-1 rounded-full bg-white/30 mx-1"></span>
                         <span>{evt.participants.join(", ")}</span>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-3 mt-2 text-xs text-white/40 hover:text-white border border-dashed border-white/10 rounded-xl hover:bg-white/5 transition-colors">
                     + Schedule New Event
                  </button>
                </div>
              )}

              {activeItem.type === 'chart' && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="h-48 flex items-end justify-between space-x-2 px-2">
                       {activeItem.content.values.map((val: number, idx: number) => {
                           const max = Math.max(...activeItem.content.values);
                           const height = (val / max) * 100;
                           return (
                               <div key={idx} className="flex-1 flex flex-col items-center group">
                                   <div className="text-[10px] text-white/0 group-hover:text-white/80 mb-1 transition-colors">${val}</div>
                                   <div 
                                     className="w-full bg-emerald-500/80 rounded-t-sm hover:bg-emerald-400 transition-all relative overflow-hidden" 
                                     style={{ height: `${height}%` }}
                                   >
                                       <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                   </div>
                                   <div className="text-[10px] text-white/40 mt-2 truncate w-full text-center">{activeItem.content.labels[idx]}</div>
                               </div>
                           )
                       })}
                    </div>
                    <div className="p-4 bg-emerald-900/20 border border-emerald-500/20 rounded-xl">
                       <h4 className="text-xs text-emerald-400 font-bold uppercase mb-1 flex items-center"><BarChart2 size={12} className="mr-1"/> Insight</h4>
                       <p className="text-sm text-emerald-100/80 leading-relaxed">{activeItem.content.summary}</p>
                    </div>
                 </div>
              )}

               {activeItem.type === 'financial-ticker' && (
                 <div className="animate-in fade-in slide-in-from-bottom-2">
                   {(() => {
                     const data = activeItem.content as FinancialData;
                     const isPositive = data.changePercent >= 0;
                     return (
                       <div className={`p-6 rounded-3xl border ${isPositive ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_40px_-10px_rgba(34,197,94,0.15)]' : 'border-red-500/30 bg-red-500/5 shadow-[0_0_40px_-10px_rgba(239,68,68,0.15)]'}`}>
                         <div className="flex justify-between items-start mb-4">
                           <div>
                             <div className="text-xs font-bold text-white/40 tracking-widest uppercase mb-1">{data.companyName}</div>
                             <div className="text-5xl font-light tracking-tighter text-white">${data.price.toFixed(2)}</div>
                           </div>
                           <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                              {isPositive ? '+' : ''}{data.changePercent}%
                           </div>
                         </div>
                         
                         <div className="h-16 flex items-end space-x-1 mb-4 opacity-80">
                           {data.history.map((h, i) => {
                             const min = Math.min(...data.history);
                             const max = Math.max(...data.history);
                             const height = ((h - min) / (max - min)) * 100;
                             return (
                                <div key={i} className={`flex-1 rounded-sm transition-all duration-300 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} style={{ height: `${Math.max(10, height)}%`, opacity: (i + 5) / 25 }}></div>
                             )
                           })}
                         </div>

                         <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="text-white/40 mb-1">Vol</div>
                              <div className="text-white/90">{data.volume}</div>
                            </div>
                            <div className="bg-white/5 rounded-lg p-2">
                              <div className="text-white/40 mb-1">P/E</div>
                              <div className="text-white/90">{data.peRatio}</div>
                            </div>
                             <div className="bg-white/5 rounded-lg p-2">
                              <div className="text-white/40 mb-1">Mkt Cap</div>
                              <div className="text-white/90">{data.marketCap}</div>
                            </div>
                         </div>
                       </div>
                     );
                   })()}
                 </div>
               )}

               {activeItem.type === 'dossier' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                     {(() => {
                       const data = activeItem.content as DossierContent;
                       return (
                         <>
                            <div className="flex items-start space-x-4 p-5 bg-white/5 rounded-2xl border border-white/10">
                               <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                  {data.name.charAt(0)}
                               </div>
                               <div>
                                  <h3 className="text-xl font-medium text-white">{data.name}</h3>
                                  <div className="text-indigo-400 text-sm font-medium mb-1">{data.role}</div>
                                  <div className="flex items-center text-xs text-white/40">
                                     <Building size={12} className="mr-1" /> {data.company}
                                  </div>
                               </div>
                            </div>

                            <div className="p-1">
                               <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 flex items-center"><Globe size={12} className="mr-2" /> Recent Intelligence</h4>
                               <div className="space-y-2">
                                 {data.recentNews.map((news, i) => (
                                    <div key={i} className="group p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                                       <div className="flex justify-between items-start">
                                          <div className="text-sm text-white/90 font-light leading-snug mb-1 group-hover:text-indigo-300 transition-colors">{news.title}</div>
                                          <ExternalLink size={12} className="text-white/20 shrink-0 ml-2" />
                                       </div>
                                       <div className="flex justify-between items-center mt-2 text-[10px] text-white/40">
                                          <span>{news.source}</span>
                                          <span>{news.date}</span>
                                       </div>
                                    </div>
                                 ))}
                               </div>
                            </div>

                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                               <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center"><Briefcase size={12} className="mr-2" /> Context</h4>
                               <p className="text-sm text-indigo-100/80 leading-relaxed">{data.lastInteraction}</p>
                            </div>
                         </>
                       )
                     })()}
                  </div>
               )}

               {activeItem.type === 'strategy-memo' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                     {(() => {
                       const data = activeItem.content as StrategyMemoContent;
                       return (
                         <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                               <div>
                                  <div className="text-xs text-rose-500 font-bold uppercase tracking-widest mb-1">Strategy Memo</div>
                                  <div className="text-lg font-medium text-white">{data.title}</div>
                               </div>
                               <div className="text-xs text-white/40 font-mono">{data.date}</div>
                            </div>

                            <div>
                               <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center"><AlertOctagon size={14} className="mr-2 text-rose-500" /> Key Risks</h4>
                               <ul className="space-y-2">
                                  {data.risks.map((risk, i) => (
                                     <li key={i} className="text-sm text-rose-100/70 bg-rose-500/5 px-3 py-2 rounded-lg border border-rose-500/10 flex items-start">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 mr-2 shrink-0"></span>
                                        {risk}
                                     </li>
                                  ))}
                               </ul>
                            </div>

                            <div>
                               <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center"><CheckSquare size={14} className="mr-2 text-emerald-500" /> Decisions Made</h4>
                                <ul className="space-y-2">
                                  {data.decisions.map((dec, i) => (
                                     <li key={i} className="text-sm text-emerald-100/70 bg-emerald-500/5 px-3 py-2 rounded-lg border border-emerald-500/10 flex items-start">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 mr-2 shrink-0"></span>
                                        {dec}
                                     </li>
                                  ))}
                               </ul>
                            </div>

                            <div>
                               <h4 className="text-sm font-medium text-white/80 mb-3 flex items-center"><Target size={14} className="mr-2 text-amber-500" /> Action Items</h4>
                               <div className="space-y-3">
                                  {data.actionItems.map((item, i) => (
                                     <div key={i} className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col space-y-2">
                                        <div className="flex justify-between items-start">
                                           <span className="text-sm text-white/90">{item.task}</span>
                                           <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50">{item.dueDate}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                                           <div className="flex items-center text-xs text-white/40">
                                              <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 mr-1.5 text-[8px] font-bold">{item.assignee.charAt(0)}</div>
                                              {item.assignee}
                                           </div>
                                           <button className="text-xs text-amber-500 hover:text-amber-400 font-medium">Draft Email &rarr;</button>
                                        </div>
                                     </div>
                                  ))}
                               </div>
                            </div>

                         </div>
                       )
                     })()}
                  </div>
               )}

              {activeItem.type === 'web-search' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                     {activeItem.content.results.map((res: any, idx: number) => (
                        <div key={idx} className="group p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all cursor-pointer">
                            <div className="flex items-start justify-between">
                               <div>
                                  <div className="text-xs text-sky-400 mb-1 flex items-center space-x-1">
                                     <Globe size={10} /> <span>{new URL(res.url).hostname}</span>
                                  </div>
                                  <h3 className="font-medium text-white group-hover:text-sky-300 transition-colors">{res.title}</h3>
                               </div>
                               <ExternalLink size={14} className="text-white/20 group-hover:text-white transition-colors" />
                            </div>
                            <p className="text-xs text-white/50 mt-2 leading-relaxed line-clamp-2">
                               {res.snippet}
                            </p>
                        </div>
                     ))}
                  </div>
              )}

              {activeItem.type === 'note' && (
                 <div className="relative bg-yellow-100/10 border border-yellow-500/20 p-6 rounded-xl animate-in fade-in slide-in-from-bottom-2 min-h-[200px] flex flex-col">
                    <div className="absolute top-0 right-0 p-2">
                       <div className="w-16 h-16 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-3xl"></div>
                    </div>
                    <div className="flex-1 font-mono text-sm text-yellow-50 leading-relaxed whitespace-pre-wrap">
                       {activeItem.content.content}
                    </div>
                    {activeItem.content.tags && (
                       <div className="flex gap-2 mt-4 flex-wrap">
                          {activeItem.content.tags.map((tag: string) => (
                              <span key={tag} className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">#{tag}</span>
                          ))}
                       </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-yellow-500/50">
                        <span>Synced to Notes</span>
                        <span>{new Date(activeItem.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                 </div>
              )}

              {activeItem.type === 'note-search-results' && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="text-sm text-white/60 pb-2">Found {activeItem.content.notes.length} notes tagged <span className="text-yellow-400 font-medium">#{activeItem.content.tag}</span></div>
                    {activeItem.content.notes.length === 0 ? (
                        <div className="text-white/40 text-center py-8 bg-white/5 rounded-2xl">No notes found.</div>
                    ) : (
                        activeItem.content.notes.map((note: Note) => (
                            <div key={note.id} className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl hover:bg-yellow-500/20 transition-colors cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-medium text-yellow-100 group-hover:text-white transition-colors">{note.title}</h3>
                                    <span className="text-[10px] text-yellow-500/50 whitespace-nowrap ml-2">{new Date(note.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-yellow-50/70 line-clamp-2 leading-relaxed">{note.content}</p>
                            </div>
                        ))
                    )}
                 </div>
              )}

              {activeItem.type === 'code' && (
                <div className="bg-[#1e1e1e] p-4 rounded-xl font-mono text-xs text-gray-300 overflow-x-auto border border-white/10 shadow-inner">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/5">
                     <span className="text-white/40">{activeItem.content.language}</span>
                     <button className="text-[10px] bg-white/10 px-2 py-1 rounded hover:bg-white/20 transition">Copy</button>
                  </div>
                  <pre>{activeItem.content.code}</pre>
                </div>
              )}

              {(activeItem.type === 'image' || activeItem.type === 'generated-image') && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black group">
                      <img src={activeItem.content.url} alt="Visual" className="w-full h-auto object-cover" />
                      {activeItem.type === 'generated-image' && (
                          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] uppercase tracking-wider text-white/80 border border-white/10 flex items-center">
                            <Palette size={10} className="mr-1" /> AI Generated
                          </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                         <p className="text-sm text-white font-medium">{activeItem.content.prompt || activeItem.content.caption}</p>
                      </div>
                    </div>
                    {(activeItem.content.prompt || activeItem.content.caption) && (
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                           <p className="text-xs text-white/60 italic leading-relaxed">"{activeItem.content.prompt || activeItem.content.caption}"</p>
                        </div>
                    )}
                 </div>
              )}

               {activeItem.type === 'system-notification' && (
                <div className={`p-4 rounded-xl border animate-in bounce-in ${activeItem.content.level === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'}`}>
                   <div className="flex items-start space-x-3">
                     <div className={`mt-1 ${activeItem.content.level === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                        <AlertTriangle size={18} />
                     </div>
                     <div>
                        <h3 className={`text-sm font-semibold mb-1 ${activeItem.content.level === 'error' ? 'text-red-300' : 'text-blue-300'}`}>
                            {activeItem.content.message}
                        </h3>
                        <p className="text-xs text-white/60 leading-relaxed font-mono">
                            {activeItem.content.details}
                        </p>
                     </div>
                   </div>
                </div>
              )}

               {activeItem.type === 'memory' && (
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl animate-in fade-in">
                   <p className="text-indigo-200 text-sm italic">"{activeItem.content.text}"</p>
                   <div className="mt-2 text-xs text-indigo-400 flex items-center">
                     <Cpu size={10} className="mr-1"/> Context retrieved
                   </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default Canvas;
