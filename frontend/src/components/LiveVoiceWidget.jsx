import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Radio,
  X,
  VolumeX,
  Languages,
  HelpCircle,
  Headphones
} from 'lucide-react';
import { askLiveText } from '../services/api';

const QUICK_PROMPTS = [
  { label: 'Why blocked?', text: 'Why is consignment batch GNT-24A under a critical block?' },
  { label: 'BLQ trap rationale', text: 'Explain why Tricyclazole triggered the BLQ sensitivity trap.' },
  { label: 'తెలుగులో వివరించండి', text: 'ఈ కన్సైన్‌మెంట్ ఎందుకు ఆపివేయబడిందో తెలుగులో వివరించండి.', isTe: true },
  { label: '₹52.46L risk breakdown', text: 'Break down the ₹52.46 Lakh financial risk exposure in detail.' }
];

export default function LiveVoiceWidget({ auditResult, isOpen, onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState([
    {
      speaker: 'model',
      text: 'ClearSpec Live connected. I can explain the regulatory violations and ₹52.46L risk for Batch GNT-24A in English or Telugu.',
      time: 'Just now'
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const playbackContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const transcriptEndRef = useRef(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/live/voice`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'init',
            context: auditResult || {
              consignment_batch: 'GNT-24A',
              declared_hs_code: '09042211',
            },
          })
        );
        resolve(ws);
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'transcript') {
            setTranscripts((prev) => [
              ...prev,
              { speaker: msg.speaker, text: msg.text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            ]);
            if (msg.speaker === 'model' && !isMuted && 'speechSynthesis' in window && !msg.hasAudio) {
              const u = new SpeechSynthesisUtterance(msg.text);
              u.rate = 1.05;
              window.speechSynthesis.speak(u);
            }
          } else if (msg.type === 'audio' && !isMuted) {
            playAudioChunk(msg.data);
          } else if (msg.type === 'interrupted') {
            nextPlayTimeRef.current = 0;
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
          }
        } catch (e) {
          console.error('WS Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WS error, fallback mode ready:', err);
        reject(err);
      };

      ws.onclose = () => {
        setIsRecording(false);
        setIsConnecting(false);
      };
    });
  };

  const playAudioChunk = (base64Pcm) => {
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = playbackContextRef.current;
      const rawBytes = atob(base64Pcm);
      const int16Array = new Int16Array(rawBytes.length / 2);
      for (let i = 0; i < int16Array.length; i++) {
        int16Array[i] = rawBytes.charCodeAt(i * 2) | (rawBytes.charCodeAt(i * 2 + 1) << 8);
      }
      const floatArray = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        floatArray[i] = int16Array[i] / 32768.0;
      }
      const audioBuffer = ctx.createBuffer(1, floatArray.length, 24000);
      audioBuffer.getChannelData(0).set(floatArray);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      await connectWebSocket();
      setIsConnecting(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const sourceNode = audioCtx.createMediaStreamSource(stream);
      const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptNode;

      scriptNode.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
        }
        let binary = '';
        const bytes = new Uint8Array(pcm16.buffer);
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        wsRef.current.send(JSON.stringify({ type: 'audio', data: b64 }));
      };

      sourceNode.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone error or permission denied:', err);
      setIsConnecting(false);
      setIsRecording(false);
      setTranscripts((prev) => [
        ...prev,
        {
          speaker: 'system',
          text: 'Microphone permission was not granted or is unavailable in this environment. You can use text prompts or quick buttons below for instant answers.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
      ]);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsConnecting(false);
    if (scriptProcessorRef.current) {
      try { scriptProcessorRef.current.disconnect(); } catch (_) {}
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (_) {}
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }
  };

  const handleSendText = async (textToSend) => {
    const q = (textToSend || textInput).trim();
    if (!q || isThinking) return;

    setTextInput('');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTranscripts((prev) => [...prev, { speaker: 'user', text: q, time: timeStr }]);
    setIsThinking(true);

    try {
      const isTe = /[\u0C00-\u0C7F]/.test(q) || q.toLowerCase().includes('telugu');
      const data = await askLiveText(q, auditResult, isTe ? 'te' : 'en');
      setTranscripts((prev) => [
        ...prev,
        {
          speaker: 'model',
          text: data.answer,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: data.model_used
        },
      ]);
      if (!isMuted && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(data.answer);
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      }
    } catch (err) {
      setTranscripts((prev) => [
        ...prev,
        { speaker: 'system', text: `Error: ${err.message}`, time: timeStr },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] rounded-2xl overflow-hidden backdrop-blur-2xl bg-[#070b13]/95 border border-emerald-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col"
      >
        {/* Top Header Cockpit */}
        <div className="px-4 py-3 bg-[#0a0f1c] border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 relative">
              <Radio className="w-4 h-4 text-emerald-400" />
              {isRecording && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <div>
              <h4 className="text-xs font-display font-bold text-white tracking-tight flex items-center space-x-1.5">
                <span>ClearSpec Live Voice</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Gemini 3.8 Live
                </span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">EN / TE Bilingual Auditor</span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Sound Wave visualizer strip (active when recording or thinking) */}
        {(isRecording || isThinking) && (
          <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-300 font-mono">
            <span className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isRecording ? 'Listening via Web Audio API...' : 'Gemini reasoning...'}</span>
            </span>
            <div className="flex items-center space-x-0.5 h-3">
              <span className="w-0.5 h-full bg-emerald-400 animate-pulse" />
              <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-75" />
              <span className="w-0.5 h-full bg-emerald-400 animate-pulse delay-150" />
              <span className="w-0.5 h-1.5 bg-emerald-400 animate-pulse delay-200" />
              <span className="w-0.5 h-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        )}

        {/* Transcript Dialogue Scrollable Stream */}
        <div className="h-64 overflow-y-auto p-4 space-y-3 bg-[#04070d]/90 text-xs font-sans">
          {transcripts.map((t, i) => {
            const isUser = t.speaker === 'user';
            const isSys = t.speaker === 'system';
            return (
              <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-emerald-500 text-slate-950 font-medium rounded-br-none shadow-md shadow-emerald-500/10'
                      : isSys
                      ? 'bg-rose-500/10 text-rose-200 border border-rose-500/30'
                      : 'bg-[#0f172a] text-slate-200 border border-white/[0.08] rounded-bl-none shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-75">
                    <span className="font-semibold">{isUser ? 'You' : isSys ? 'System' : 'Auditor (Live)'}</span>
                    <span className="font-mono text-[9px]">{t.time}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{t.text}</p>
                </div>
              </div>
            );
          })}
          {isThinking && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs p-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span className="font-mono text-[11px]">Gemini analyzing consignment ledger...</span>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-3.5 py-2.5 border-t border-white/[0.06] bg-[#070b13] flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSendText(p.text)}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/30 transition-all font-mono"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Mic & Input Controls */}
        <div className="p-3.5 border-t border-white/[0.08] bg-[#0a0f1c] flex items-center space-x-2.5">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isConnecting}
            title={isRecording ? 'Stop Recording' : 'Push to Talk (Gemini 3.8 Live)'}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40 ring-2 ring-rose-400/50'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
            }`}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendText();
            }}
            className="flex-1 flex items-center space-x-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={isRecording ? 'Streaming audio live...' : 'Ask in English or తెలుగు...'}
              disabled={isRecording}
              className="flex-1 bg-[#04070d] text-slate-100 border border-white/[0.1] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/60 placeholder:text-slate-500 font-sans"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isThinking || isRecording}
              className="p-2 rounded-xl bg-emerald-500 text-slate-950 disabled:opacity-30 disabled:hover:bg-emerald-500 hover:bg-emerald-400 transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}