import React, { useEffect, useState } from 'react';
import { X, Mail, Calendar, ChevronRight, Shield, Bell, Zap, Cloud, Smartphone } from 'lucide-react';
import { api } from '../services/api';

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const [integrationStatus, setIntegrationStatus] = useState({
     provider: 'mock',
     mode: 'mock',
     googleConfigured: false,
     gmailConnected: false,
     calendarConnected: false,
     connectedAt: null as number | null,
     tokenExpiresAt: null as number | null,
     metadata: {} as Record<string, unknown>,
  });
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [integrationHealth, setIntegrationHealth] = useState<null | {
     provider: string;
     mode: string;
     googleConfigured: boolean;
     healthy: boolean;
     email: { ok?: boolean; status?: string; address?: string | null; error?: string | null };
     calendar: { ok?: boolean; status?: string; error?: string | null };
  }>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState(true);

  const refreshIntegrations = async () => {
     setLoadingIntegrations(true);
     try {
        const status = await api.integrations.status();
        setIntegrationStatus(status);
        setIntegrationError(null);
     } catch (err) {
        setIntegrationError('Unable to reach integrations service.');
     } finally {
        setLoadingIntegrations(false);
     }
  };

  useEffect(() => {
     refreshIntegrations();
     const onFocus = () => refreshIntegrations();
     window.addEventListener('focus', onFocus);
     return () => window.removeEventListener('focus', onFocus);
  }, []);

  const runHealthCheck = async () => {
     setHealthLoading(true);
     setHealthError(null);
     try {
        const result = await api.integrations.health();
        setIntegrationHealth(result);
     } catch (err) {
        setHealthError('Health check failed. Please try again.');
     } finally {
        setHealthLoading(false);
     }
  };

  const handleConnect = async () => {
     setLoadingIntegrations(true);
     setIntegrationError(null);
     try {
        const { authUrl } = await api.integrations.connectGoogle();
        window.open(authUrl, '_blank', 'noopener,noreferrer');
     } catch (err) {
        setIntegrationError('Google OAuth is not configured yet.');
     } finally {
        setLoadingIntegrations(false);
     }
  };

  const handleDisconnect = async () => {
     setLoadingIntegrations(true);
     setIntegrationError(null);
     try {
        await api.integrations.disconnectGoogle();
        await refreshIntegrations();
     } catch (err) {
        setIntegrationError('Failed to disconnect. Try again.');
     } finally {
        setLoadingIntegrations(false);
     }
  };

  const isGoogleMode = integrationStatus.provider === 'google';
  const gmailConnected = integrationStatus.gmailConnected;
  const gcalConnected = integrationStatus.calendarConnected;
  const metadata = integrationStatus.metadata as Record<string, any>;
  const lastEmailSyncAt = metadata?.lastEmailSyncAt as string | undefined;
  const lastCalendarSyncAt = metadata?.lastCalendarSyncAt as string | undefined;
  const lastHealthCheckAt = metadata?.lastHealthCheckAt as string | undefined;

  useEffect(() => {
     if (isGoogleMode && (gmailConnected || gcalConnected)) {
        runHealthCheck();
     } else {
        setIntegrationHealth(null);
     }
  }, [isGoogleMode, gmailConnected, gcalConnected]);

  const formatTimestamp = (value?: string | number | null) => {
     if (!value) return '—';
     const date = typeof value === 'string' ? new Date(value) : new Date(value);
     if (Number.isNaN(date.getTime())) return '—';
     return date.toLocaleString();
  };

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
                    {/* Gmail */}
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                       <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                             <Mail size={20} />
                          </div>
                          <div>
                              <div className="text-sm font-medium">Gmail</div>
                              <div className="text-xs text-white/40">
                                 {isGoogleMode
                                    ? (gmailConnected ? 'Connected' : 'Connect your Gmail inbox')
                                    : 'Demo mode (mock data)'}
                              </div>
                          </div>
                       </div>
                       {isGoogleMode ? (
                          <button
                             onClick={gmailConnected ? handleDisconnect : handleConnect}
                             disabled={loadingIntegrations}
                             className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors ${gmailConnected ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'} ${loadingIntegrations ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                             {gmailConnected ? 'Disconnect' : 'Connect'}
                          </button>
                       ) : (
                          <div className="text-[10px] uppercase tracking-wider text-white/40 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                             Demo
                          </div>
                       )}
                    </div>

                    {/* Google Calendar */}
                    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                       <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                             <Calendar size={20} />
                          </div>
                          <div>
                              <div className="text-sm font-medium">Google Calendar</div>
                              <div className="text-xs text-white/40">
                                 {isGoogleMode
                                    ? (gcalConnected ? 'Connected' : 'Sync events & meetings')
                                    : 'Demo mode (mock data)'}
                              </div>
                          </div>
                       </div>
                       {isGoogleMode ? (
                          <div className={`text-xs font-medium px-3 py-1 rounded-full ${gcalConnected ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white/60'}`}>
                             {gcalConnected ? 'Synced' : 'Not Connected'}
                          </div>
                       ) : (
                          <div className="text-[10px] uppercase tracking-wider text-white/40 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                             Demo
                          </div>
                       )}
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
                 {integrationError && (
                    <div className="mt-3 px-4 py-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl">
                       {integrationError}
                    </div>
                 )}
                 {isGoogleMode && !integrationStatus.googleConfigured && (
                    <div className="mt-3 px-4 py-2 text-xs text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                       Google OAuth is not configured. Add server env vars to enable live integrations.
                    </div>
                 )}

                 <div className="mt-4 p-4 rounded-2xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between">
                       <div>
                          <div className="text-xs font-semibold uppercase tracking-widest text-white/40">Connection Health</div>
                          <div className="text-sm text-white/80 mt-1">Provider: {integrationStatus.provider}</div>
                       </div>
                       <button
                          onClick={runHealthCheck}
                          disabled={healthLoading || !isGoogleMode}
                          className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full border ${healthLoading ? 'border-white/10 text-white/40' : 'border-white/20 text-white/70 hover:text-white'} ${!isGoogleMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}`}
                       >
                          {healthLoading ? 'Checking' : 'Run Check'}
                       </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-white/60">
                       <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <div className="uppercase tracking-wider text-[10px] text-white/40 mb-1">Gmail</div>
                          <div className="font-semibold text-white/80">
                             {isGoogleMode ? (gmailConnected ? 'Connected' : 'Not Connected') : 'Demo'}
                          </div>
                          <div className="text-[11px] text-white/40 mt-1">
                             Last sync: {formatTimestamp(lastEmailSyncAt)}
                          </div>
                       </div>
                       <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                          <div className="uppercase tracking-wider text-[10px] text-white/40 mb-1">Calendar</div>
                          <div className="font-semibold text-white/80">
                             {isGoogleMode ? (gcalConnected ? 'Connected' : 'Not Connected') : 'Demo'}
                          </div>
                          <div className="text-[11px] text-white/40 mt-1">
                             Last sync: {formatTimestamp(lastCalendarSyncAt)}
                          </div>
                       </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
                       <span>Last health check: {formatTimestamp(lastHealthCheckAt)}</span>
                       <span>
                          {integrationHealth
                             ? (integrationHealth.healthy ? 'Healthy' : 'Issues detected')
                             : 'Not checked'}
                       </span>
                    </div>

                    {integrationHealth?.email?.address && (
                       <div className="mt-2 text-[11px] text-white/50">
                          Gmail account: {integrationHealth.email.address}
                       </div>
                    )}

                    {healthError && (
                       <div className="mt-3 px-3 py-2 text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl">
                          {healthError}
                       </div>
                    )}

                    {integrationHealth && !integrationHealth.healthy && (
                       <div className="mt-3 px-3 py-2 text-[11px] text-amber-200/80 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                          {integrationHealth.email.error || integrationHealth.calendar.error || 'Integration checks failed.'}
                       </div>
                    )}
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
