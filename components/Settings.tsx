import React, { useState } from 'react';
import { X, Mail, Calendar, ChevronRight, Shield, Bell, Zap, Cloud, Smartphone } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [gmailConnected, setGmailConnected] = useState(true);
  const [gcalConnected, setGcalConnected] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl animate-in slide-in-from-right duration-300 flex flex-col text-white">
       {/* Header */}
       <div className="px-6 py-6 flex items-center justify-between">
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
             <X size={20} />
          </button>
          <h2 className="text-lg font-medium tracking-wide">Account</h2>
          <div className="w-10" /> {/* Spacer for balance */}
       </div>

       <div className="flex-1 overflow-y-auto px-6 pb-10 no-scrollbar">
          
          {/* Hero Profile Section */}
          <div className="mb-10 mt-4 text-center">
             <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-rose-600 p-[2px] mb-4">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    <span className="text-4xl font-light text-white/90">M</span>
                </div>
             </div>
             <h3 className="text-2xl font-light text-white mb-1">Maya User</h3>
             <p className="text-white/40 font-mono text-sm">executive@company.com</p>
          </div>

          <div className="space-y-8 max-w-md mx-auto">
              {/* Promo Text */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 text-center relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
                     <Zap size={48} />
                 </div>
                 <h4 className="text-lg font-medium text-white mb-2">Bringing the computer to life.</h4>
                 <p className="text-sm text-white/60">Unlock advanced reasoning and memory capabilities.</p>
              </div>

              {/* Connections Section */}
              <section>
                 <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 pl-2">Integrations</h4>
                 <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                    {/* Gmail Toggle */}
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                       <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                             <Mail size={20} />
                          </div>
                          <div>
                              <div className="text-sm font-medium">Gmail</div>
                              <div className="text-xs text-white/40">{gmailConnected ? 'Connected' : 'Sync your emails'}</div>
                          </div>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={gmailConnected} onChange={() => setGmailConnected(!gmailConnected)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                       </label>
                    </div>

                    {/* Google Calendar Toggle */}
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                       <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                             <Calendar size={20} />
                          </div>
                          <div>
                              <div className="text-sm font-medium">Google Calendar</div>
                              <div className="text-xs text-white/40">Sync events & meetings</div>
                          </div>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={gcalConnected} onChange={() => setGcalConnected(!gcalConnected)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                       </label>
                    </div>

                    {/* Cloud/Files */}
                     <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                       <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                             <Cloud size={20} />
                          </div>
                          <div>
                              <div className="text-sm font-medium">Drive & Files</div>
                              <div className="text-xs text-white/40">Context retrieval</div>
                          </div>
                       </div>
                        <div className="text-xs text-white/30 font-medium px-3 py-1 bg-white/5 rounded-full">Coming Soon</div>
                    </div>
                 </div>
              </section>

              {/* General Settings */}
              <section>
                 <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 pl-2">Preferences</h4>
                 <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                    
                    <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left group">
                       <div className="flex items-center space-x-4">
                          <div className="text-white/60 group-hover:text-white transition-colors"><Shield size={20}/></div>
                          <span className="text-sm font-medium">Privacy & Data</span>
                       </div>
                       <ChevronRight size={16} className="text-white/30" />
                    </button>

                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                       <div className="flex items-center space-x-4">
                          <div className="text-white/60"><Bell size={20}/></div>
                          <span className="text-sm font-medium">Notifications</span>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={notifications} onChange={() => setNotifications(!notifications)} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white/40"></div>
                       </label>
                    </div>

                    <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left group">
                       <div className="flex items-center space-x-4">
                          <div className="text-white/60 group-hover:text-white transition-colors"><Smartphone size={20}/></div>
                          <span className="text-sm font-medium">Device Permissions</span>
                       </div>
                       <ChevronRight size={16} className="text-white/30" />
                    </button>
                 </div>
              </section>

              <button className="w-full py-4 rounded-xl text-center text-red-400/80 text-sm hover:text-red-400 hover:bg-white/5 transition-colors">
                 Log Out
              </button>
          </div>
       </div>
    </div>
  )
}