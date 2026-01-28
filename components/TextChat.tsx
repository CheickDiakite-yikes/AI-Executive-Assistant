import React, { useEffect, useMemo, useRef } from 'react';
import { CanvasItem, ChatMessage } from '../types';
import CanvasItemCard from './CanvasItemCard';

interface TextChatProps {
  messages: ChatMessage[];
  items: CanvasItem[];
  assistantName: string;
  assistantColor: string;
  onAction?: (action: string, data: any) => void;
  onCloseItem?: (id: string) => void;
}

const TextChat: React.FC<TextChatProps> = ({ messages, items, assistantName, assistantColor, onAction, onCloseItem }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, items.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 flex items-center justify-center">
        <div className="text-center text-white/40">
          <div className="text-sm uppercase tracking-[0.3em]">Text Mode</div>
          <div className="mt-3 text-lg text-white/70">Type to continue the conversation.</div>
          <div className="mt-1 text-xs text-white/40">Voice replies will appear here as transcripts.</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 w-full max-w-4xl mx-auto px-6 pt-28 pb-32 overflow-y-auto no-scrollbar">
      <div className="space-y-6">
        {messages.map((msg, index) => {
          const prev = messages[index - 1];
          if (msg.type === 'canvas') {
            const item = itemsById.get(msg.itemId);
            if (!item) {
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="max-w-[80%] text-xs text-white/40 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                    This item was dismissed.
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-[92%]">
                  <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${assistantColor}`}>{assistantName.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{assistantName} • Canvas</div>
                    <CanvasItemCard item={item} onAction={onAction} onClose={onCloseItem} />
                  </div>
                </div>
              </div>
            );
          }

          const isUser = msg.role === 'user';
          const prevSameRole = prev && prev.role === msg.role && prev.type === 'text';
          const showAvatar = !prevSameRole;
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-end ${isUser ? 'space-x-reverse space-x-3' : 'space-x-3'}`}>
                {showAvatar && !isUser && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${assistantColor}`}>{assistantName.charAt(0)}</div>
                )}
                {showAvatar && isUser && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-white/10 border border-white/10">You</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${isUser ? 'bg-amber-500/10 border-amber-500/30 text-amber-50 rounded-br-sm' : 'bg-white/5 border-white/10 text-white/90 rounded-bl-sm'}`}>
                  <div>{msg.text}</div>
                  <div className={`mt-1 text-[10px] ${isUser ? 'text-amber-200/50 text-right' : 'text-white/30 text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TextChat;
