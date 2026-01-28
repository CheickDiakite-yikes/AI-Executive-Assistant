
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, Video, VideoOff, User, ArrowUp, X, RefreshCw, Send, FileText } from 'lucide-react';
import Canvas from './components/Canvas';
import Visualizer from './components/Visualizer';
import Settings from './components/Settings';
import NotesView from './components/NotesView';
import { CanvasItem, AgentState, AgentPersona, Note } from './types';
import { GEMINI_MODEL, PERSONAS, getSystemInstruction } from './constants';
import { toolsDeclaration, DUMMY_EMAILS, DUMMY_CALENDAR, generateMarketData } from './services/tools';

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
  
  // Refs to track state for stale closures in callbacks
  const notesRef = useRef<Note[]>([]); 
  const isCamOnRef = useRef<boolean>(false); 

  // --- Initialization ---
  useEffect(() => {
    if (!process.env.API_KEY) {
      setErrorMsg("API Key missing. See metadata/instructions.");
    }
    genAI.current = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    // Initialize AudioContexts (lazy load when needed usually, but here on mount for readiness)
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

    return () => {
      disconnectSession();
    };
  }, []);

  // Sync state to refs for API callbacks
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    isCamOnRef.current = isCamOn;
  }, [isCamOn]);

  // --- Gemini Live Connection Logic ---
  const connectSession = async () => {
    if (!genAI.current) return null;
    if (isConnected && sessionRef.current) return sessionRef.current;

    try {
      // Resume audio context if suspended (browser policy)
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      if (inputContextRef.current?.state === 'suspended') {
        await inputContextRef.current.resume();
      }

      setAgentState(AgentState.LISTENING);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = genAI.current;
      
      const config = {
        model: GEMINI_MODEL,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: activePersona.voiceName } }
            },
            systemInstruction: getSystemInstruction(activePersona.id),
            // Enable Custom Tools AND Google Search (for real-world grounding)
            tools: [
              { functionDeclarations: toolsDeclaration },
              { googleSearch: {} }
            ]
        }
      };

      const connectPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Session Opened");
            setIsConnected(true);
            
            connectPromise.then((session) => {
                if (!inputContextRef.current) return;
                const ctx = inputContextRef.current;
                const source = ctx.createMediaStreamSource(stream);
                const processor = ctx.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                  const inputData = e.inputBuffer.getChannelData(0);
                  
                  // Calculate volume for visualizer
                  let sum = 0;
                  for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                  setVolume(Math.sqrt(sum / inputData.length) * 10);

                  // Convert Float32 to Int16 PCM
                  const pcmData = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) {
                    let s = Math.max(-1, Math.min(1, inputData[i]));
                    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                  }

                  const base64Data = arrayBufferToBase64(pcmData.buffer);
                  session.sendRealtimeInput({ 
                      media: {
                          mimeType: 'audio/pcm;rate=16000',
                          data: base64Data
                      }
                  });
                };

                source.connect(processor);
                processor.connect(ctx.destination);
                
                sourceRef.current = source;
                processorRef.current = processor;
            });
          },
          onmessage: async (msg: LiveServerMessage) => {
            console.log("Received message:", msg);
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setAgentState(AgentState.SPEAKING);
              playAudioChunk(audioData);
            }

            if (msg.serverContent?.turnComplete) {
               setAgentState(AgentState.LISTENING);
            }

            if (msg.toolCall) {
              handleToolCall(msg.toolCall, connectPromise);
            }
          },
          onclose: () => {
            console.log("Session Closed");
            setIsConnected(false);
            setAgentState(AgentState.IDLE);
          },
          onerror: (err) => {
            console.error("Session Error", err);
            setErrorMsg("Connection error.");
            disconnectSession();
          }
        }
      });
      
      const session = await connectPromise;
      sessionRef.current = session;
      return session;

    } catch (e: any) {
      console.error(e);
      setErrorMsg("Failed to connect: " + e.message);
      setAgentState(AgentState.IDLE);
      return null;
    }
  };

  const disconnectSession = () => {
    if (sourceRef.current) sourceRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    
    setIsConnected(false);
    setIsCamOn(false);
    setAgentState(AgentState.IDLE);
    sessionRef.current = null;
  };

  const playAudioChunk = async (base64Audio: string) => {
    if (!audioContextRef.current) return;
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
      console.log(`[${new Date().toISOString()}] 🛠️ START Tool: ${name}`, args);

      try {
        if (name === 'display_email') {
            const email = DUMMY_EMAILS.find(e => e.from.toLowerCase().includes(args.query.toLowerCase()) || e.subject.toLowerCase().includes(args.query.toLowerCase())) || DUMMY_EMAILS[0];
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
            result = { result: `Email sent successfully to ${args.recipient}.` };
        }
        else if (name === 'display_calendar') {
            addCanvasItem({ type: 'calendar', title: "Today's Schedule", content: DUMMY_CALENDAR, id: id, timestamp: Date.now() });
            
            // CRITICAL: Return the actual calendar data AND current time to the model so it can reason about availability
            const now = new Date();
            result = { 
                result: "Calendar displayed.",
                current_date: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                current_time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                events: DUMMY_CALENDAR 
            };
        }
        else if (name === 'schedule_event') {
            const newEvent = { title: args.title, time: args.time, location: "TBD", participants: [args.participants || "User"] };
            addCanvasItem({ type: 'calendar', title: "Event Scheduled", content: [...DUMMY_CALENDAR, newEvent], id: id, timestamp: Date.now() });
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
             const newNote: Note = {
                 id: id,
                 title: args.title,
                 content: args.content,
                 attachmentUrl: args.attachmentUrl,
                 tags: args.tags || [],
                 timestamp: Date.now()
             };
             
             setNotes(prev => [newNote, ...prev]);

             addCanvasItem({ type: 'note', title: args.title, content: { content: args.content, tags: args.tags }, id: id, timestamp: Date.now() });
             result = { result: "Note created and saved to your Notes." };
        }
        else if (name === 'find_notes_by_tag') {
            const tag = args.tag.toLowerCase();
            const found = notesRef.current.filter(n => n.tags?.some(t => t.toLowerCase() === tag));
            
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
            const marketData = generateMarketData(args.ticker);
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
            
            const noteContent = `STRATEGY MEMO: ${args.title}\n\nRISKS:\n${args.risks.map((r:string) => `- ${r}`).join('\n')}\n\nDECISIONS:\n${args.decisions.map((d:string) => `- ${d}`).join('\n')}\n\nACTION ITEMS:\n${args.actionItems.map((a:any) => `- [ ] ${a.task} (${a.assignee}) due ${a.dueDate}`).join('\n')}`;
            const newNote: Note = {
                 id: `memo-${id}`,
                 title: args.title,
                 content: noteContent,
                 tags: ['strategy', 'meeting-notes'],
                 timestamp: Date.now()
            };
            setNotes(prev => [newNote, ...prev]);

            result = { result: "Strategy memo created and saved." };
        }
        else {
             console.warn(`Unknown tool called: ${name}`);
             result = { result: "Tool executed (fallback response)." };
        }
        
        console.log(`[${new Date().toISOString()}] ✅ SUCCESS Tool: ${name} (${(performance.now() - startTime).toFixed(2)}ms)`);

      } catch (e: any) {
        console.error(`[${new Date().toISOString()}] ❌ ERROR Tool: ${name}`, e);
        
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
      }

      responses.push({ name, id, response: result });
    }

    const session = await sessionPromise;
    session.sendToolResponse({ functionResponses: responses });
    setAgentState(AgentState.SPEAKING);
  };

  const addCanvasItem = (item: CanvasItem) => {
    setCanvasItems(prev => [item, ...prev]);
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
    console.log("Attempting to send text:", text);
    if (sessionRef.current) {
         // Using send with clientContent is the correct way for text turns in Live API
         // Ensure turnComplete is true to trigger a response
         sessionRef.current.send({ clientContent: { turns: [{ role: 'user', parts: [{ text }] }], turnComplete: true } })
            .then(() => {
                console.log("Text sent to session");
                setAgentState(AgentState.THINKING);
            })
            .catch((error: any) => {
                console.error("Error sending text to session:", error);
                setErrorMsg("Failed to send text. Ensure connection is active.");
            });
    } else {
        console.warn("No active session to send text.");
        setErrorMsg("Please connect (Mic button) before typing.");
    }
  };

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    
    let session = sessionRef.current;
    if (!isConnected || !session) {
        console.log("Auto-connecting for text...");
        try {
            session = await connectSession();
        } catch (e) {
            console.error("Auto-connect failed", e);
            return;
        }
    }

    if (session) {
        sendTextToModel(textInput); 
        setTextInput("");
    }
  };

  const handleCanvasAction = (action: string, data: any) => {
     if (!sessionRef.current) {
        setErrorMsg("Agent not connected. Please connect first.");
        return;
     }

     if (action === 'reply') {
        sendTextToModel(`Draft a reply to this email from ${data.from}.`);
     }
     if (action === 'send_draft') {
        // Pass the body (which might be edited) to the model
        sendTextToModel(`The draft is approved. Send the email to ${data.recipient} with the following body:\n"${data.body}"`);
     }
     if (action === 'discard_draft') {
        setCanvasItems(prev => prev.filter(i => i.type !== 'email-draft'));
        sendTextToModel(`I've discarded the draft email.`);
     }
     if (action === 'archive') {
        sendTextToModel(`Archive this email.`);
     }
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
           <button onClick={() => setShowNotes(true)} className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border border-amber-500/20 hover:bg-amber-900/20 hover:border-amber-500/50 transition-all cursor-pointer group">
              <FileText size={20} className="text-amber-100/60 group-hover:text-amber-400 transition-colors" />
           </button>
           <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border border-amber-500/20 hover:bg-amber-900/20 hover:border-amber-500/50 transition-all cursor-pointer group">
              <User size={20} className="text-amber-100/60 group-hover:text-amber-400 transition-colors" />
           </button>
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
         <Visualizer state={agentState} volume={volume} persona={activePersona} />
         {!isConnected && (
           <div className="mt-12 text-center px-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <h1 className="text-4xl md:text-5xl font-light text-amber-50 mb-4 tracking-wider drop-shadow-2xl font-serif">MAYA</h1>
             <p className="text-amber-200/40 text-sm tracking-[0.2em] uppercase">The Golden Age of Intelligence</p>
           </div>
         )}
      </div>

      <Canvas 
         items={canvasItems} 
         onClose={(id) => setCanvasItems(prev => prev.filter(i => i.id !== id))} 
         onAction={handleCanvasAction}
      />

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
                         className={`w-full group relative flex items-center p-5 rounded-xl border transition-all duration-500 text-left ${
                            isSelected 
                              ? 'bg-amber-900/10 border-amber-500/60 shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]' 
                              : 'bg-white/5 border-transparent hover:border-amber-500/20 hover:bg-white/10'
                         }`}
                      >
                         <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-5 transition-all duration-500 ${
                             isSelected ? 'bg-amber-500/20' : 'bg-white/5 group-hover:bg-amber-500/10'
                         }`}>
                            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                               isSelected ? 'bg-amber-400 scale-125 shadow-[0_0_15px_rgba(251,191,36,0.8)]' : 'bg-white/20'
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
                   )})}
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
                placeholder={isConnected ? "Command the oracle..." : "Connect to speak..."}
                className="bg-transparent w-full text-sm text-amber-50 placeholder-amber-500/20 focus:outline-none font-medium tracking-wide"
                disabled={!isConnected}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
              />
              {textInput && <button onClick={handleSendText} className="text-amber-500 hover:text-amber-300 transition-colors"><Send size={18}/></button>}
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
             <button onClick={isConnected ? disconnectSession : connectSession} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 transform hover:scale-105 active:scale-95 shadow-lg ${isConnected ? 'bg-gradient-to-br from-red-600 to-red-800 text-white shadow-red-900/50' : 'bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-amber-900/50'}`}>
               <Mic size={24} className={isConnected ? "animate-pulse" : ""} />
             </button>
           </div>
        </div>
        {errorMsg && <div className="absolute -top-20 left-0 right-0 mx-6 bg-red-900/90 text-white text-xs p-4 rounded-2xl text-center backdrop-blur-md border border-red-500/30 shadow-xl">{errorMsg} <button onClick={() => setErrorMsg(null)} className="ml-2 underline font-bold">Dismiss</button></div>}
      </div>
    </div>
  );
}
