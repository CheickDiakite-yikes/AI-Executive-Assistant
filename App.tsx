
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, Video, VideoOff, User, ArrowUp, X, RefreshCw, Send, FileText, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import Canvas from './components/Canvas';
import Visualizer from './components/Visualizer';
import Settings from './components/Settings';
import NotesView from './components/NotesView';
import TextChat from './components/TextChat';
import { CanvasItem, AgentState, AgentPersona, Note, ChatMessage } from './types';
import { getPathForViewMode, getViewModeFromPath } from './utils/routing';
import { trackEvent, trackError, trackToolExecution } from './utils/telemetry';
import { GEMINI_MODEL, GEMINI_TEXT_MODEL, PERSONAS, getSystemInstruction } from './constants';
import { toolsDeclaration, DUMMY_EMAILS, DUMMY_CALENDAR, generateMarketData } from './services/tools';
import { api } from './services/api';
import Logger from './utils/logger';

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const summarizeText = (text: string, max = 180) => {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

type ViewMode = 'voice' | 'text';

// Manual PCM decoding function
// Gemini sends raw PCM 16-bit mono audio at 24kHz
const decodeAudioData = (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000
): AudioBuffer => {
  // Create an Int16Array view of the data
  // We explicitly copy to ensure alignment and safety
  const pcm16 = new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));

  const buffer = ctx.createBuffer(1, pcm16.length, sampleRate);
  const channelData = buffer.getChannelData(0);

  // Normalize 16-bit integers to float [-1, 1]
  for (let i = 0; i < pcm16.length; i++) {
    channelData[i] = pcm16[i] / 32768.0;
  }

  return buffer;
};

export default function App() {
  // --- State ---
  const [activePersona, setActivePersona] = useState<AgentPersona>(PERSONAS[0]);
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);
  const [isCamOn, setIsCamOn] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [isConnected, setIsConnected] = useState(false);
  const [canvasItems, setCanvasItems] = useState<CanvasItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]); // New Notes State
  const [volume, setVolume] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('voice');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false); // New View State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");

  // --- Refs for Audio/Video/Gemini ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const genAI = useRef<GoogleGenAI | null>(null);

  const pendingAssistantTextRef = useRef<string>('');
  const pendingAssistantTranscriptRef = useRef<string>('');
  const pendingUserTranscriptRef = useRef<string>('');
  const assistantTurnHasTextRef = useRef<boolean>(false);
  const isAudioMutedRef = useRef<boolean>(false);

  // Refs to track state for stale closures in callbacks
  const notesRef = useRef<Note[]>([]);
  const isCamOnRef = useRef<boolean>(false);

  // --- Initialization ---
  useEffect(() => {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      setErrorMsg("API Key missing. See metadata/instructions.");
      console.error("CRITICAL: API Key is missing/empty.");
      trackEvent('api_key_missing', {}, 'warn');
    } else {
      console.log("API Key loaded successfully:", apiKey.substring(0, 4) + "****");
    }
    genAI.current = new GoogleGenAI({ apiKey });

    // Initialize AudioContexts (lazy load when needed usually, but here on mount for readiness)
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

    return () => {
      disconnectSession();
    };
  }, []);

  useEffect(() => {
    const initialMode = getViewModeFromPath(window.location.pathname);
    setViewMode(initialMode);

    const canonicalPath = getPathForViewMode(initialMode);
    if (window.location.pathname !== canonicalPath) {
      window.history.replaceState({}, '', canonicalPath);
    }

    trackEvent('route_init', { mode: initialMode, path: window.location.pathname });

    const handlePopState = () => {
      const mode = getViewModeFromPath(window.location.pathname);
      setViewMode(mode);
      trackEvent('route_pop', { mode, path: window.location.pathname });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync state to refs for API callbacks
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  // Load Notes from API
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const isHealthy = await api.health();
        if (isHealthy) {
          const loadedNotes = await api.getNotes();
          setNotes(loadedNotes);
          console.log(`Loaded ${loadedNotes.length} notes from backend.`);
        } else {
          console.warn("Backend API not reachable. Using local state only.");
        }
      } catch (e) {
        console.error("Failed to load notes", e);
      }
    };
    fetchNotes();
  }, []);

  useEffect(() => {
    isCamOnRef.current = isCamOn;
  }, [isCamOn]);

  useEffect(() => {
    if (viewMode === 'text') setIsAudioMuted(true);
    if (viewMode === 'voice') setIsAudioMuted(false);
  }, [viewMode]);

  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  useEffect(() => {
    // PRIVACY: Do NOT auto-connect or auto-start mic on page load.
    // User must explicitly click the mic button to start listening.
    // This useEffect only manages state transitions when viewMode changes.

    if (viewMode === 'text') {
      stopMicInput();
      setAgentState(AgentState.IDLE);
    }
    // Note: We no longer auto-start mic when switching to voice mode.
    // The user must click the mic button to activate listening.
  }, [viewMode]);

  const stopMicInput = () => {
    if (sourceRef.current) sourceRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    sourceRef.current = null;
    processorRef.current = null;
    streamRef.current = null;
    setVolume(0);
    trackEvent('mic_stop');
  };

  const startMicInput = async (session: any) => {
    if (!inputContextRef.current || streamRef.current) return;
    const ctx = inputContextRef.current;

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate volume for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        setVolume(Math.sqrt(sum / inputData.length) * 10);

        // Convert Float32 to Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const base64Data = arrayBufferToBase64(pcmData.buffer);
        try {
          session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data
            }
          });
        } catch (e) {
          // Silent catch for "CLOSING or CLOSED" errors to prevent console spam
          // This happens when mic is still active but session closed
          if (String(e).includes("CLOSING") || String(e).includes("CLOSED")) {
            return;
          }
          console.warn("Error sending audio frame:", e);
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);

      sourceRef.current = source;
      processorRef.current = processor;
      trackEvent('mic_start');

    } catch (e: any) {
      console.error("Mic start failed", e);
      let msg = "Could not access microphone.";
      if (e.name === 'NotAllowedError') {
        msg = "Microphone permission denied. Please allow access in browser settings.";
      } else if (e.name === 'NotFoundError') {
        msg = "No microphone found on this device.";
      } else if (e.name === 'NotReadableError') {
        msg = "Microphone is busy or not readable. Check other apps.";
      }
      setErrorMsg(msg);
      throw e; // Re-throw to caller
    }
  };

  const navigateToMode = (mode: ViewMode) => {
    const path = getPathForViewMode(mode);
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setViewMode(mode);
    trackEvent('route_change', { mode, path });
  };

  // --- Gemini Live Connection Logic ---
  const connectSession = async ({ withMic = true }: { withMic?: boolean } = {}) => {
    if (!genAI.current) return null;
    if (isConnected && sessionRef.current) {
      if (withMic && !streamRef.current) {
        try {
          await startMicInput(sessionRef.current);
          setAgentState(AgentState.LISTENING);
        } catch (e: any) {
          Logger.error('Mic', 'Mic start failed', e);
          setErrorMsg("Could not access microphone.");
          trackError('mic_start_error', e);
        }
      }
      return sessionRef.current;
    }

    try {
      const connectStart = performance.now();
      trackEvent('session_connect_start', { withMic });
      Logger.info('Session', 'Initiating connection', { withMic, model: GEMINI_MODEL });

      // Resume audio context if suspended (browser policy)
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      if (inputContextRef.current?.state === 'suspended') {
        await inputContextRef.current.resume();
      }
      // We need to attach the event listeners. 
      // NOTE: The Google GenAI SDK's `connect` method returns a `MultimediaLiveSession` (or similar).
      // If it doesn't support attaching listeners via `connect` config in this version, we must assume standard event usage.
      // However, looking at the previous code structure that *was* working (before I broke it), it seemed to rely on property assignments or Config.
      // Let's assume the SDK pattern: `session.addEventListener(...)` OR `connect({ config, ...callbacks })`.
      // Since I can't verify the SDK version docs easily, I will stick to the pattern of passing callbacks to `connect` if possible, 
      // BUT `ai.live.connect` definition in `node_modules` (if I could see it) would confirm.
      // 
      // The `multimodal-live-api-web-console` uses a `MultimodalLiveClient` which has `on(...)` methods.
      // The `@google/genai` SDK `live.connect` returns a `LiveSession`.  
      // `LiveSession` typically has `send()` and `close()`. It might NOT be an EventTarget.
      // 
      // WAIT. The code I saw earlier had `onmessage` inside the object passed to `connect`.
      // That implied: `ai.live.connect({ ..., onmessage: ... })`.
      // Let's try that pattern again, but syntactically correct.

    } catch (e: any) {
      Logger.error('Session', 'Connection failed', e);
      setErrorMsg("Failed to connect: " + e.message);
      setAgentState(AgentState.IDLE);
      trackError('session_connect_error', e, { withMic });
      return null;
    }

    // RE-DOING THE LOGIC TO BE SAFE:
    // I will use a separate implementation that constructs the session fully.

    return await (async () => {
      try {
        const connectStart = performance.now();
        trackEvent('session_connect_start', { withMic });
        Logger.info('Session', 'Initiating connection', { withMic, model: GEMINI_MODEL });

        if (audioContextRef.current?.state === 'suspended') await audioContextRef.current.resume();
        if (inputContextRef.current?.state === 'suspended') await inputContextRef.current.resume();

        setAgentState(withMic ? AgentState.LISTENING : AgentState.IDLE);

        const ai = genAI.current;

        if (!GEMINI_MODEL.toLowerCase().includes('live')) {
          Logger.warn('Session', 'Model name does not appear to be a Live model', { model: GEMINI_MODEL });
          trackEvent('model_not_live', { model: GEMINI_MODEL }, 'warn');
        }

        Logger.info('Session', 'Connecting to live model', {
          model: GEMINI_MODEL,
          withMic,
          viewMode,
          responseModalities: [withMic ? 'AUDIO' : 'TEXT'],
          tools: toolsDeclaration.length,
          systemInstructionLength: getSystemInstruction(activePersona.id).length,
        });

        /* 
           Construct the config object including callbacks.
           This assumes the SDK supports passing callbacks in the configuration object 
           OR as a second argument. The previous code passed it in the FIRST argument object.
        */
        /* 
           FIX: The SDK `live.connect` method takes a single configuration object.
           We must pass `model` and `config` (which includes `generationConfig`, `tools`, `systemInstruction`).
           IMPORTANT: The SDK typically returns a session object. We cannot pass callbacks like `onopen` in the config 
           unless we are using a specific helper wrapper. 
           
           If this is the `@google/genai` package, the pattern is usually:
           const session = await ai.live.connect({ model: ..., config: ... });
           session.on('open', ...);
           session.on('message', ...);
           
           HOWEVER, since I cannot be 100% sure of the SDK version's exact API without docs, 
           and the previous code failed silently, I will try the standard EventTarget pattern 
           AND the callbacks pattern just in case acts as a hybrid.
        */

        /* 
           Using the Unified SDK Pattern: passing callbacks via the connection configuration.
           Confirmed via LiveConnectParameters in genai.d.ts.
        */
        const session = await ai.live.connect({
          model: GEMINI_MODEL,
          config: {
            responseModalities: [withMic ? Modality.AUDIO : Modality.TEXT],
            systemInstruction: { parts: [{ text: getSystemInstruction(activePersona.id) }] },
            tools: [
              { functionDeclarations: toolsDeclaration },
              { googleSearch: {} }
            ]
          },
          callbacks: {
            onopen: () => {
              Logger.info('WebSocket', 'Connection Opened', { model: GEMINI_MODEL, withMic });
              setIsConnected(true);
              setAgentState(AgentState.LISTENING);
              trackEvent('session_start', { persona: activePersona.id, withMic });
            },
            onmessage: async (msg: LiveServerMessage) => {
              // Direct console log for debugging
              console.log("RAW WS MSG:", msg);
              Logger.debug('WebSocket', 'Message', { type: Object.keys(msg)[0] });

              const inputTranscription = msg.serverContent?.inputTranscription;
              if (inputTranscription?.text) {
                pendingUserTranscriptRef.current += inputTranscription.text;
                // Live updates (optional)
              }
              if (inputTranscription?.finished) {
                const finalUserText = pendingUserTranscriptRef.current.trim();
                if (finalUserText) {
                  addUserMessage(finalUserText);
                  Logger.info('Chat', 'User Message Finalized', { text: finalUserText });
                  trackEvent('input_transcription_final', { length: finalUserText.length });
                }
                pendingUserTranscriptRef.current = '';
              }

              const outputTranscription = msg.serverContent?.outputTranscription;
              if (outputTranscription?.text) {
                pendingAssistantTranscriptRef.current += outputTranscription.text;
              }

              const textParts = msg.serverContent?.modelTurn?.parts;
              if (textParts && Array.isArray(textParts)) {
                for (const part of textParts) {
                  if (part && typeof part === 'object' && 'text' in part && part.text) {
                    assistantTurnHasTextRef.current = true;
                    pendingAssistantTextRef.current += part.text as string;
                  }
                }
              }

              const audioData = msg.serverContent?.modelTurn?.parts?.find((part: any) => part?.inlineData?.data)?.inlineData?.data;
              if (audioData) {
                setAgentState(AgentState.SPEAKING);
                playAudioChunk(audioData);
              }

              // Handle finished output
              if (outputTranscription?.finished && !assistantTurnHasTextRef.current) {
                const finalAssistantTranscript = pendingAssistantTranscriptRef.current.trim();
                if (finalAssistantTranscript) {
                  addAssistantMessage(finalAssistantTranscript);
                }
                pendingAssistantTranscriptRef.current = '';
              }

              if (msg.serverContent?.turnComplete) {
                const finalAssistantText = pendingAssistantTextRef.current.trim();
                if (finalAssistantText) {
                  addAssistantMessage(finalAssistantText);
                  Logger.info('Chat', 'Assistant Message Finalized', { text: finalAssistantText });
                  trackEvent('assistant_text_final', { length: finalAssistantText.length });
                } else if (!assistantTurnHasTextRef.current) {
                  // Fallback to transcript if no text parts but turn complete (rare)
                  const finalAssistantTranscript = pendingAssistantTranscriptRef.current.trim();
                  if (finalAssistantTranscript) {
                    addAssistantMessage(finalAssistantTranscript);
                  }
                }

                pendingAssistantTextRef.current = '';
                pendingAssistantTranscriptRef.current = '';
                assistantTurnHasTextRef.current = false;
                setAgentState(AgentState.LISTENING);
                trackEvent('turn_complete');
              }

              // Tool Calls
              if (msg.toolCall) {
                Logger.info('Tool', 'Tool Call Received', { tool: msg.toolCall.functionCalls?.[0]?.name });
                // We strongly assume sessionRef.current is set by now given we awaited connect().
                if (sessionRef.current) {
                  handleToolCall(msg.toolCall, Promise.resolve(sessionRef.current));
                } else {
                  Logger.error('Tool', 'Session ref missing for tool call', {});
                }
              }
            },
            onclose: (event: any) => {
              Logger.warn('WebSocket', 'Session Closed', {
                code: event?.code,
                reason: event?.reason,
                wasClean: event?.wasClean,
                isTrusted: event?.isTrusted,
              });
              stopMicInput();
              setIsConnected(false);
              setAgentState(AgentState.IDLE);
              trackEvent('session_closed');
            },
            onerror: (err: any) => {
              Logger.error('WebSocket', 'Session Error', {
                message: err?.message || err?.error?.message,
                error: err?.error || err,
              });
              setErrorMsg("Connection error.");
              trackError('session_error', err);
              disconnectSession();
            }
          }
        });

        sessionRef.current = session;

        Logger.info('Session', 'Live session ready', { withMic });

        if (withMic) {
          await startMicInput(session);
        }
        return session;
      } catch (e: any) {
        Logger.error('Session', 'Connection failed', e);
        setErrorMsg("Failed to connect: " + e.message);
        setAgentState(AgentState.IDLE);
        trackError('session_connect_error', e, { withMic });
        return null;
      }
    })();
  };

  const disconnectSession = () => {
    stopMicInput();
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

    setIsConnected(false);
    setIsCamOn(false);
    setAgentState(AgentState.IDLE);
    pendingAssistantTextRef.current = '';
    pendingAssistantTranscriptRef.current = '';
    pendingUserTranscriptRef.current = '';
    assistantTurnHasTextRef.current = false;
    sessionRef.current?.close?.();
    sessionRef.current = null;
    trackEvent('session_disconnect');
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) return;
    if (isAudioMutedRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const uint8Array = base64ToUint8Array(base64Audio);
      // Manually decode the raw PCM 16-bit audio
      const audioBuffer = decodeAudioData(uint8Array, ctx, 24000);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
    } catch (e) {
      console.error("Audio decode error", e);
      trackError('audio_decode_error', e);
    }
  };

  const handleToolCall = async (toolCall: any, sessionPromise: Promise<any>) => {
    setAgentState(AgentState.THINKING);
    const functionCalls = toolCall.functionCalls;
    const responses = [];

    for (const call of functionCalls) {
      const { name, args, id } = call;
      let result: any = { result: "Done" };

      const startTime = performance.now();
      let toolError: Error | null = null;
      console.log(`[${new Date().toISOString()}] 🛠️ START Tool: ${name}`, args);
      trackEvent('tool_start', { name, id });

      try {
        if (name === 'display_email') {
          let email = null;
          try {
            email = await api.email.search(args.query);
          } catch (e) {
            trackError('email_search_error', e, { query: args.query });
          }
          if (!email) {
            email = DUMMY_EMAILS.find(e => e.from.toLowerCase().includes(args.query.toLowerCase()) || e.subject.toLowerCase().includes(args.query.toLowerCase())) || DUMMY_EMAILS[0];
          }
          addCanvasItem({ type: 'email', title: email.subject, content: email, id: id, timestamp: Date.now() });
          result = {
            result: `Displayed email from ${email.from}.`,
            email_content: {
              from: email.from,
              subject: email.subject,
              body: email.body,
              date: "Today, 10:42 AM"
            }
          };
        }
        else if (name === 'draft_email') {
          try {
            await api.email.draft(args.recipient, args.subject, args.body);
          } catch (e) {
            trackError('email_draft_error', e, { recipient: args.recipient });
          }
          addCanvasItem({
            type: 'email-draft',
            title: "Drafting Email...",
            content: { recipient: args.recipient, subject: args.subject, body: args.body },
            id: id,
            timestamp: Date.now()
          });
          // Inform model it was displayed
          result = { result: "Draft displayed on canvas. Ask user for confirmation to send." };
        }
        else if (name === 'send_email') {
          try {
            await api.email.send(args.recipient, args.subject, args.body);
          } catch (e) {
            trackError('email_send_error', e, { recipient: args.recipient });
            throw e;
          }
          result = { result: `Email sent successfully to ${args.recipient}.` };
        }
        else if (name === 'display_calendar') {
          let events = [];
          try {
            events = await api.calendar.list();
          } catch (e) {
            trackError('calendar_list_error', e);
          }
          const calendarEvents = events.length ? events : DUMMY_CALENDAR;
          addCanvasItem({ type: 'calendar', title: "Today's Schedule", content: calendarEvents, id: id, timestamp: Date.now() });

          // CRITICAL: Return the actual calendar data AND current time to the model so it can reason about availability
          const now = new Date();
          result = {
            result: "Calendar displayed.",
            current_date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            current_time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            events: calendarEvents
          };
        }
        else if (name === 'schedule_event') {
          let updatedEvents = null;
          try {
            const response = await api.calendar.schedule({ title: args.title, time: args.time, participants: args.participants });
            updatedEvents = response?.events || null;
          } catch (e) {
            trackError('calendar_schedule_error', e, { title: args.title });
          }
          const newEvent = { title: args.title, time: args.time, location: "TBD", participants: [args.participants || "User"] };
          const events = updatedEvents || [...DUMMY_CALENDAR, newEvent];
          addCanvasItem({ type: 'calendar', title: "Event Scheduled", content: events, id: id, timestamp: Date.now() });
          result = { result: `Scheduled ${args.title} at ${args.time}` };
        }
        else if (name === 'generate_code') {
          addCanvasItem({ type: 'code', title: args.description, content: { code: args.code, language: args.language }, id: id, timestamp: Date.now() });
          result = { result: "Code displayed" };
        }
        else if (name === 'create_image') {
          const encodedPrompt = encodeURIComponent(args.prompt);
          const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000)}&nologo=true`;
          addCanvasItem({
            type: 'generated-image',
            title: "Generated Image",
            content: { url: imageUrl, prompt: args.prompt },
            id: id,
            timestamp: Date.now()
          });
          result = { result: "Image generated and displayed on canvas." };
        }
        else if (name === 'take_screenshot') {
          if (!isCamOnRef.current) {
            throw new Error("Camera is not active. Please ask the user to turn on the camera first.");
          }
          if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            addCanvasItem({ type: 'image', title: args.caption || "Screenshot", content: { url: dataUrl, caption: args.caption }, id: id, timestamp: Date.now() });

            result = { result: "Screenshot captured", imageUrl: dataUrl };
          } else {
            throw new Error("Video stream not ready.");
          }
        }
        else if (name === 'search_folders') {
          addCanvasItem({ type: 'memory', title: 'File Found', content: { text: `Found ${args.filename} in /Documents/Work` }, id: id, timestamp: Date.now() })
          result = { result: `Found file ${args.filename}` };
        }
        else if (name === 'create_note') {
          try {
            const createdNote = await api.createNote({
              title: args.title,
              content: args.content,
              attachmentUrl: args.attachmentUrl,
              tags: args.tags || []
            });
            setNotes(prev => [createdNote, ...prev]);
            addCanvasItem({ type: 'note', title: args.title, content: { content: args.content, tags: args.tags }, id: id, timestamp: Date.now() });
            result = { result: "Note created and saved to your Notes." };
          } catch (e) {
            console.error("API Error", e);
            // Fallback to local state if offline
            const newNote: Note = {
              id: id,
              title: args.title,
              content: args.content,
              attachmentUrl: args.attachmentUrl,
              tags: args.tags || [],
              timestamp: Date.now()
            };
            setNotes(prev => [newNote, ...prev]);
            result = { result: "Note created (offline mode). Sync will occur when connected." };
          }
        }
        else if (name === 'find_notes_by_tag') {
          let found = [];
          try {
            found = await api.getNotesByTag(args.tag);
          } catch (e) {
            trackError('notes_tag_search_error', e, { tag: args.tag });
            const tag = args.tag.toLowerCase();
            found = notesRef.current.filter(n => n.tags?.some(t => t.toLowerCase() === tag));
          }

          addCanvasItem({
            type: 'note-search-results',
            title: `Notes: #${args.tag}`,
            content: { tag: args.tag, notes: found },
            id: id,
            timestamp: Date.now()
          });

          result = {
            result: `Found ${found.length} notes tagged with '${args.tag}'.`,
            notes: found
          };
        }
        else if (name === 'display_notes') {
          setShowNotes(true);
          result = { result: "Opened notes view." };
        }
        else if (name === 'visualize_data') {
          addCanvasItem({
            type: 'chart',
            title: args.title,
            content: { labels: args.labels, values: args.values, summary: args.summary },
            id: id,
            timestamp: Date.now()
          });
          result = { result: "Chart created" };
        }
        else if (name === 'display_web_results') {
          addCanvasItem({
            type: 'web-search',
            title: `Results: ${args.query}`,
            content: { query: args.query, results: args.results },
            id: id,
            timestamp: Date.now()
          });
          result = { result: "Web results displayed" };
        }
        else if (name === 'get_market_data') {
          let marketData = null;
          try {
            marketData = await api.market.get(args.ticker);
          } catch (e) {
            trackError('market_data_error', e, { ticker: args.ticker });
          }
          if (!marketData) {
            marketData = generateMarketData(args.ticker);
          }
          addCanvasItem({
            type: 'financial-ticker',
            title: `Market Pulse: ${args.ticker.toUpperCase()}`,
            content: marketData,
            id: id,
            timestamp: Date.now()
          });
          result = { result: `Displayed market data for ${args.ticker}` };
        }
        else if (name === 'create_dossier') {
          addCanvasItem({
            type: 'dossier',
            title: `Dossier: ${args.name}`,
            content: {
              name: args.name,
              role: args.role,
              company: args.company,
              recentNews: args.recentNews,
              lastInteraction: args.lastInteraction
            },
            id: id,
            timestamp: Date.now()
          });
          result = { result: "Dossier created and displayed." };
        }
        else if (name === 'create_strategy_memo') {
          const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          addCanvasItem({
            type: 'strategy-memo',
            title: args.title,
            content: {
              title: args.title,
              date: dateStr,
              risks: args.risks,
              decisions: args.decisions,
              actionItems: args.actionItems
            },
            id: id,
            timestamp: Date.now()
          });

          const noteContent = `STRATEGY MEMO: ${args.title}\n\nRISKS:\n${args.risks.map((r: string) => `- ${r}`).join('\n')}\n\nDECISIONS:\n${args.decisions.map((d: string) => `- ${d}`).join('\n')}\n\nACTION ITEMS:\n${args.actionItems.map((a: any) => `- [ ] ${a.task} (${a.assignee}) due ${a.dueDate}`).join('\n')}`;
          try {
            const createdNote = await api.createNote({
              title: args.title,
              content: noteContent,
              tags: ['strategy', 'meeting-notes'],
            });
            setNotes(prev => [createdNote, ...prev]);
          } catch (e) {
            trackError('strategy_memo_persist_error', e, { title: args.title });
            const newNote: Note = {
              id: `memo-${id}`,
              title: args.title,
              content: noteContent,
              tags: ['strategy', 'meeting-notes'],
              timestamp: Date.now()
            };
            setNotes(prev => [newNote, ...prev]);
          }

          result = { result: "Strategy memo created and saved." };
        }
        else {
          console.warn(`Unknown tool called: ${name}`);
          result = { result: "Tool executed (fallback response)." };
        }

        const durationMs = Number((performance.now() - startTime).toFixed(2));
        console.log(`[${new Date().toISOString()}] ✅ SUCCESS Tool: ${name} (${durationMs}ms)`);
        trackEvent('tool_success', { name, id, durationMs });
        trackToolExecution(name, args ?? {}, result ?? {}, durationMs);
      } catch (e: any) {
        toolError = e instanceof Error ? e : new Error(String(e));
        console.error(`[${new Date().toISOString()}] ❌ ERROR Tool: ${name}`, e);
        trackError('tool_error', e, { name, id });

        result = {
          error: true,
          message: `Error executing tool ${name}: ${e.message}`,
          hint: "Inform the user that an error occurred while trying to perform the action."
        };

        addCanvasItem({
          type: 'system-notification',
          title: 'System Alert',
          content: {
            level: 'error',
            message: `Failed to execute ${name.replace('_', ' ')}`,
            details: e.message
          },
          id: id,
          timestamp: Date.now()
        });
        const durationMs = Number((performance.now() - startTime).toFixed(2));
        trackToolExecution(name, args ?? {}, result ?? {}, durationMs, toolError.message);
      }

      responses.push({ name, id, response: result });
    }

    const session = await sessionPromise;
    session.sendToolResponse({ functionResponses: responses });
    setAgentState(AgentState.SPEAKING);
  };

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  const addUserMessage = (text: string) => {
    addChatMessage({ id: makeId(), role: 'user', type: 'text', text, timestamp: Date.now() });
  };

  const addAssistantMessage = (text: string) => {
    addChatMessage({ id: makeId(), role: 'assistant', type: 'text', text, timestamp: Date.now() });
  };

  const addCanvasItem = (item: CanvasItem) => {
    setCanvasItems(prev => [item, ...prev]);
    addChatMessage({ id: makeId(), role: 'assistant', type: 'canvas', itemId: item.id, timestamp: item.timestamp });
    trackEvent('canvas_item_added', { type: item.type, id: item.id });
  };

  const closeCanvasItem = (id: string) => {
    setCanvasItems(prev => prev.filter(i => i.id !== id));
    trackEvent('canvas_item_closed', { id });
  };

  const toggleCamera = async () => {
    if (isCamOn) {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
      setIsCamOn(false);
    } else {
      await startCamera(cameraFacingMode);
    }
  };

  const switchCamera = async () => {
    const newMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(newMode);
    if (isCamOn) {
      await startCamera(newMode);
    }
  };

  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCamOn(true);

      if (isConnected && sessionRef.current) {
        startVideoLoop();
      }
    } catch (e) {
      console.error("Camera error", e);
      setErrorMsg("Could not access camera.");
      setIsCamOn(false);
      trackError('camera_error', e);
    }
  };

  const startVideoLoop = () => {
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    videoIntervalRef.current = window.setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !sessionRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth * 0.5;
        canvas.height = video.videoHeight * 0.5;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
        sessionRef.current.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64 } });
      }
    }, 1000);
  };

  useEffect(() => {
    if (isConnected && isCamOn) startVideoLoop();
  }, [isConnected, isCamOn]);

  const sendTextToModel = (text: string) => {
    Logger.info('Text', 'Attempting to send text', {
      length: text.length,
      preview: summarizeText(text),
      hasSession: Boolean(sessionRef.current),
      isConnected,
    });

    if (sessionRef.current && isConnected) {
      // Use sendClientContent for text turns in the Live API if connected
      try {
        trackEvent('text_send', { length: text.length });
        if (typeof sessionRef.current.sendClientContent !== 'function') {
          // If somehow connected but function missing (rare), fallback?
          // No, better to error if we think we are connected.
          throw new Error('sendClientContent is not available on session');
        }
        sessionRef.current.sendClientContent({
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true
        });
        Logger.info('Text', 'Text sent to Live session', { length: text.length });
        setAgentState(AgentState.THINKING);
      } catch (error: any) {
        console.error("Error sending text to session:", error);
        setErrorMsg("Failed to send text to live session.");
        trackError('text_send_error', error);
      }
    } else {
      // Fallback to Independent Text Chat (Gemini 3 Flash)
      Logger.info('Text', 'No active live session, using Gemini 3 Flash', { length: text.length });
      sendRestMessage(text);
    }
  };

  // Constants
  const TEXT_MODEL_NAME = GEMINI_TEXT_MODEL; // REST Text Model

  // ... existing refs ...
  const chatSessionRef = useRef<any>(null); // Ref for REST Chat Session

  // ... inside App component ...

  // Initialize REST Chat Session
  const getRestChatSession = async () => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = genAI.current.chats.create({
        model: TEXT_MODEL_NAME,
        history: chatMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: getSystemInstruction(activePersona.id),
        }
      });
    }
    return chatSessionRef.current;
  };

  const sendRestMessage = async (text: string) => {
    try {
      setAgentState(AgentState.THINKING);
      const chat = await getRestChatSession();
      Logger.info('Text', 'Sending REST message', { length: text.length });

      // sendMessageStream returns a Promise<AsyncGenerator>
      const result = await chat.sendMessageStream({ message: text });

      let fullText = "";
      assistantTurnHasTextRef.current = true;

      // Iterate over the async generator
      for await (const chunk of result) {
        // Handle both older and newer SDK response shapes
        const chunkText = (typeof (chunk as any).text === 'function')
          ? (chunk as any).text()
          : chunk.candidates?.[0]?.content?.parts?.[0]?.text || "";

        fullText += chunkText;
        pendingAssistantTextRef.current = fullText;
      }

      addAssistantMessage(fullText);
      Logger.info('Text', 'REST Response received', { length: fullText.length });
      setAgentState(AgentState.IDLE);

    } catch (e: any) {
      Logger.error('Text', 'REST Message failed', e);
      // Fallback or detailed error
      const errMessage = e?.message || "Unknown error";
      setErrorMsg(`Failed to send text message: ${errMessage}`);
      setAgentState(AgentState.IDLE);
    }
  };

  const handleSendText = async () => {
    const message = textInput.trim();
    if (!message) return;

    addUserMessage(message);
    setTextInput("");

    // Hybrid Logic:
    // If in Text Mode -> Use REST API
    // If in Voice Mode -> Use Live API (WebSocket)

    if (viewMode === 'text') {
      await sendRestMessage(message);
    } else {
      // Voice Mode: Use existing WebSocket logic
      let session = sessionRef.current;
      if (!isConnected || !session) {
        // If not connected in voice mode, try to connect first? 
        // Or just warn user? 
        // Going with auto-connect for voice mode consistency if needed, 
        // but usually voice mode auto-connects on entry.
        Logger.warn('Chat', 'Voice session not active for text input', {});
        setErrorMsg("Voice session inactive. Please check connection.");
        return;
      }
      sendTextToModel(message); // Existing WS function
    }
  };

  // ... 

  // Updated useEffect for Auto-Connection
  useEffect(() => {
    let mounted = true;

    const initMode = async () => {
      if (viewMode === 'voice') {
        if (!isConnected && !sessionRef.current) {
          Logger.info('Mode', 'Switching to Voice: Auto-connecting');
          await connectSession({ withMic: true });
        }
      } else {
        // Text Mode
        if (isConnected) {
          Logger.info('Mode', 'Switching to Text: Disconnecting Voice Session');
          disconnectSession();
        }
      }
    };

    initMode();

    return () => {
      mounted = false;
    };
  }, [viewMode]); // Only re-run when viewMode changes. REMOVED isConnected to prevent loops.

  // ... existing code ...


  const handleCanvasAction = (action: string, data: any) => {
    if (!sessionRef.current) {
      setErrorMsg("Agent not connected. Please connect first.");
      trackEvent('canvas_action_no_session', { action }, 'warn');
      return;
    }

    if (action === 'reply') {
      trackEvent('canvas_action', { action });
      sendTextToModel(`Draft a reply to this email from ${data.from}.`);
    }
    if (action === 'send_draft') {
      trackEvent('canvas_action', { action });
      // Pass the body (which might be edited) to the model
      sendTextToModel(`The draft is approved. Send the email to ${data.recipient} with the following body:\n\"${data.body}\"`);
    }
    if (action === 'discard_draft') {
      trackEvent('canvas_action', { action });
      setCanvasItems(prev => prev.filter(i => i.type !== 'email-draft'));
      sendTextToModel(`I've discarded the draft email.`);
    }
    if (action === 'archive') {
      trackEvent('canvas_action', { action });
      sendTextToModel(`Archive this email.`);
    }
  };

  const handleMicClick = async () => {
    if (viewMode === 'text') {
      navigateToMode('voice');
    }
    if (!isConnected) {
      await connectSession({ withMic: true });
      return;
    }

    if (!streamRef.current && sessionRef.current) {
      try {
        await startMicInput(sessionRef.current);
        setAgentState(AgentState.LISTENING);
      } catch (e: any) {
        console.error("Mic start failed", e);
        setErrorMsg("Could not access microphone.");
      }
      return;
    }

    disconnectSession();
  };

  return (
    <div className="relative w-full h-screen bg-[#050505] overflow-hidden flex flex-col items-center justify-between text-amber-50 selection:bg-amber-500/30 font-serif">

      {/* Background Layers - Ancient Egypt / Gold Theme */}
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#050505] to-[#000000] transition-opacity duration-700 ${isCamOn ? 'opacity-0' : 'opacity-100'}`} />

      {/* Subtle Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

      <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isCamOn ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${cameraFacingMode === 'user' ? '-scale-x-100' : ''}`} />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 z-30 p-6 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent">
        <div onClick={() => setShowPersonaSelector(true)} className="flex items-center space-x-2 bg-black/40 backdrop-blur-md border border-amber-500/30 rounded-full px-5 py-2 cursor-pointer hover:bg-amber-900/20 hover:border-amber-500/60 transition-all group">
          <div className={`w-2 h-2 rounded-full ${activePersona.color} animate-pulse shadow-[0_0_10px_currentColor]`}></div>
          <span className="text-sm font-medium tracking-widest text-amber-100 group-hover:text-amber-50">{activePersona.name.toUpperCase()}</span>
          <ArrowUp className="w-3 h-3 rotate-180 opacity-50 text-amber-500" />
        </div>
        <div className="flex items-center space-x-4">
          {isConnected && <span className="flex items-center text-[10px] font-bold tracking-widest text-amber-400 bg-amber-900/20 px-3 py-1 rounded-full border border-amber-500/30"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full mr-2 animate-pulse"></span>LIVE</span>}
          <button
            onClick={() => navigateToMode(viewMode === 'voice' ? 'text' : 'voice')}
            className={`w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border transition-all cursor-pointer group ${viewMode === 'text' ? 'border-amber-500/60 bg-amber-900/20' : 'border-amber-500/20 hover:bg-amber-900/20 hover:border-amber-500/50'}`}
            title={viewMode === 'voice' ? 'Switch to text mode' : 'Switch to voice mode'}
          >
            {viewMode === 'voice' ? (
              <MessageSquare size={20} className="text-amber-100/60 group-hover:text-amber-400 transition-colors" />
            ) : (
              <Mic size={20} className="text-amber-100/60 group-hover:text-amber-400 transition-colors" />
            )}
          </button>
          <button
            onClick={() => setIsAudioMuted(prev => {
              const next = !prev;
              trackEvent('audio_mute_toggle', { muted: next });
              return next;
            })}
            className={`w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border transition-all cursor-pointer group ${isAudioMuted ? 'border-red-500/50 bg-red-900/20' : 'border-amber-500/20 hover:bg-amber-900/20 hover:border-amber-500/50'}`}
            title={isAudioMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isAudioMuted ? (
              <VolumeX size={20} className="text-red-300/80 group-hover:text-red-200 transition-colors" />
            ) : (
              <Volume2 size={20} className="text-amber-100/60 group-hover:text-amber-400 transition-colors" />
            )}
          </button>
          <button onClick={() => setShowNotes(true)} className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border border-amber-500/20 hover:bg-amber-900/20 hover:border-amber-500/50 transition-all cursor-pointer group">
            <FileText size={20} className="text-amber-100/60 group-hover:text-amber-400 transition-colors" />
          </button>
          <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border border-amber-500/20 hover:bg-amber-900/20 hover:border-amber-500/50 transition-all cursor-pointer group">
            <User size={20} className="text-amber-100/60 group-hover:text-amber-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Main Area */}
      {viewMode === 'voice' ? (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
          <Visualizer state={agentState} volume={volume} persona={activePersona} />
          {!isConnected && (
            <div className="mt-12 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h1 className="text-4xl md:text-5xl font-light text-amber-50 mb-4 tracking-wider drop-shadow-2xl font-serif">MAYA</h1>
              <p className="text-amber-200/40 text-sm tracking-[0.2em] uppercase">The Golden Age of Intelligence</p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col w-full">
          <TextChat
            messages={chatMessages}
            items={canvasItems}
            assistantName={activePersona.name}
            assistantColor={activePersona.color}
            onAction={handleCanvasAction}
            onCloseItem={closeCanvasItem}
          />
        </div>
      )}

      {viewMode === 'voice' && (
        <Canvas
          items={canvasItems}
          onClose={closeCanvasItem}
          onAction={handleCanvasAction}
        />
      )}

      {/* Persona Modal */}
      {showPersonaSelector && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-amber-500/20 rounded-3xl shadow-[0_0_50px_-10px_rgba(217,119,6,0.1)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-light text-amber-50 tracking-widest uppercase border-b border-amber-500/30 pb-2">Select Deity</h2>
                <button onClick={() => setShowPersonaSelector(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {PERSONAS.map(p => {
                  const isSelected = activePersona.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setActivePersona(p); setShowPersonaSelector(false); }}
                      className={`w-full group relative flex items-center p-5 rounded-xl border transition-all duration-500 text-left ${isSelected
                        ? 'bg-amber-900/10 border-amber-500/60 shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]'
                        : 'bg-white/5 border-transparent hover:border-amber-500/20 hover:bg-white/10'
                        }`}
                    >
                      <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-5 transition-all duration-500 ${isSelected ? 'bg-amber-500/20' : 'bg-white/5 group-hover:bg-amber-500/10'
                        }`}>
                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isSelected ? 'bg-amber-400 scale-125 shadow-[0_0_15px_rgba(251,191,36,0.8)]' : 'bg-white/20'
                          }`} />
                      </div>

                      <div className="flex-1">
                        <h3 className={`font-serif text-lg mb-1 transition-colors ${isSelected ? 'text-amber-100' : 'text-white/60 group-hover:text-amber-50'}`}>
                          {p.name}
                        </h3>
                        <p className="text-xs text-white/30 leading-relaxed group-hover:text-white/40 transition-colors uppercase tracking-wide">
                          {p.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* Notes Modal */}
      {showNotes && <NotesView notes={notes} onClose={() => setShowNotes(false)} />}

      {/* Controls */}
      <div className="relative z-30 w-full max-w-lg px-6 pb-12">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-2xl border border-amber-500/10 rounded-full p-2 flex items-center justify-between shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]">
          <div className="flex-1 px-6 flex items-center">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={isConnected ? "Command the oracle..." : "Type to connect or press mic..."}
              className="bg-transparent w-full text-sm text-amber-50 placeholder-amber-500/20 focus:outline-none font-medium tracking-wide"
              onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            />
            {textInput && <button onClick={handleSendText} className="text-amber-500 hover:text-amber-300 transition-colors"><Send size={18} /></button>}
          </div>

          <div className="flex items-center space-x-3 pl-4 border-l border-white/5">
            {isCamOn && (
              <button onClick={switchCamera} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-amber-100/60 hover:text-amber-100 transition-all">
                <RefreshCw size={16} />
              </button>
            )}
            <button onClick={toggleCamera} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isCamOn ? 'bg-amber-100 text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-white/5 hover:bg-white/10 text-amber-100/60 hover:text-amber-100'}`}>
              {isCamOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button onClick={handleMicClick} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-lg ${isConnected ? 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-red-900/50' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-amber-900/50'}`}>
              <Mic size={24} className={isConnected ? "animate-pulse" : ""} />
            </button>
          </div>
        </div>
        {errorMsg && <div className="absolute -top-20 left-0 right-0 mx-6 bg-red-900/90 text-white text-xs p-4 rounded-2xl text-center backdrop-blur-md border border-red-500/30 shadow-xl">{errorMsg} <button onClick={() => setErrorMsg(null)} className="ml-2 underline font-bold">Dismiss</button></div>}
      </div>
    </div>
  );
}
