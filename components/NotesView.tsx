
import React, { useState } from 'react';
import { X, Search, Image as ImageIcon, Calendar, Clock, Tag, ArrowRight } from 'lucide-react';
import { Note } from '../types';

interface NotesViewProps {
  notes: Note[];
  onClose: () => void;
}

const NotesView: React.FC<NotesViewProps> = ({ notes, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="absolute inset-0 z-40 bg-gray-900/95 backdrop-blur-xl animate-in fade-in duration-300 flex flex-col text-white">
       {/* Header */}
       <div className="px-6 py-6 flex items-center justify-between border-b border-white/5 bg-black/20">
          <div className="flex items-center space-x-4">
              <h2 className="text-xl font-light tracking-wide text-white/90">Executive Notes</h2>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs text-white/50 border border-white/5">{notes.length}</span>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
             <X size={20} />
          </button>
       </div>

       {/* Search Bar */}
       <div className="px-6 py-4">
          <div className="relative max-w-xl mx-auto">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
             <input 
                type="text" 
                placeholder="Search your mind..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all"
             />
          </div>
       </div>

       {/* Grid */}
       <div className="flex-1 overflow-y-auto px-6 pb-20 no-scrollbar">
          {notes.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 text-white/30">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Tag size={24} />
                </div>
                <p>No notes yet.</p>
                <p className="text-xs mt-2">Say "Create a note" to get started.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
               {filteredNotes.map((note) => (
                  <div key={note.id} className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-2xl p-5 transition-all duration-300 flex flex-col">
                     <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 text-xs text-white/40">
                           <Clock size={12} />
                           <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                        </div>
                        {note.attachmentUrl && (
                           <div className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded flex items-center space-x-1">
                               <ImageIcon size={10} /> <span>Visual</span>
                           </div>
                        )}
                     </div>
                     
                     <h3 className="font-medium text-lg text-white/90 mb-2 leading-tight">{note.title}</h3>
                     
                     <div className="flex-1 relative">
                        {note.attachmentUrl && (
                            <div className="mb-4 rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/50">
                                <img src={note.attachmentUrl} alt="Visual Attachment" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                        <p className="text-sm text-white/60 leading-relaxed line-clamp-4 font-light whitespace-pre-wrap">
                            {note.content}
                        </p>
                     </div>

                     <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-xs text-amber-500 font-medium cursor-pointer hover:underline">View details</span>
                         <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                            <ArrowRight size={12} />
                         </div>
                     </div>
                  </div>
               ))}
            </div>
          )}
       </div>
    </div>
  );
};

export default NotesView;
