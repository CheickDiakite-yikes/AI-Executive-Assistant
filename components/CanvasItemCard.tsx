import React from 'react';
import { CanvasItem } from '../types';
import CanvasItemContent from './CanvasItemContent';
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
  TrendingUp,
  Briefcase,
  Target,
} from 'lucide-react';

interface CanvasItemCardProps {
  item: CanvasItem;
  onAction?: (action: string, data: any) => void;
  onClose?: (id: string) => void;
}

const CanvasItemCard: React.FC<CanvasItemCardProps> = ({ item, onAction, onClose }) => {
  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center space-x-2 text-white/80">
          {item.type === 'email' && <Mail size={14} className="text-blue-400" />}
          {item.type === 'email-draft' && <PenTool size={14} className="text-amber-400" />}
          {item.type === 'calendar' && <Calendar size={14} className="text-red-400" />}
          {item.type === 'code' && <Code size={14} className="text-green-400" />}
          {(item.type === 'image' || item.type === 'generated-image') && <ImageIcon size={14} className="text-purple-400" />}
          {item.type === 'memory' && <Cpu size={14} className="text-pink-400" />}
          {item.type === 'system-notification' && <AlertTriangle size={14} className="text-orange-400" />}
          {item.type === 'chart' && <BarChart2 size={14} className="text-emerald-400" />}
          {item.type === 'web-search' && <Globe size={14} className="text-sky-400" />}
          {item.type === 'note' && <FileText size={14} className="text-yellow-400" />}
          {item.type === 'note-search-results' && <FileText size={14} className="text-yellow-400" />}
          {item.type === 'financial-ticker' && <TrendingUp size={14} className="text-green-400" />}
          {item.type === 'dossier' && <Briefcase size={14} className="text-indigo-400" />}
          {item.type === 'strategy-memo' && <Target size={14} className="text-rose-400" />}
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">{item.type.replace('-', ' ')}</span>
        </div>
        {onClose && (
          <button
            onClick={() => onClose(item.id)}
            className="p-1 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <div className="p-4">
        <CanvasItemContent item={item} onAction={onAction} variant="chat" />
      </div>
    </div>
  );
};

export default CanvasItemCard;
