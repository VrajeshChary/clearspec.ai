import React, { useState, useEffect, useRef } from 'react';
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
  HelpCircle
} from 'lucide-react';
import { askLiveText } from '../services/api';

const QUICK_PROMPTS = [
  { label: 'Why is shipment blocked?', text: 'Why is consignment batch GNT-24A under a critical block?' },
  { label: 'Explain BLQ trap', text: 'Explain why Tricyclazole triggered the BLQ sensitivity trap.' },
  { label: 'తెలుగులో వివరించండి', text: 'ఈ కన్సైన్‌మెంట్ ఎందుకు ఆపివేయబడిందో తెలుగులో వివరించండి.', isTe: true },
  { label: 'Risk breakdown', text: 'Break down the ₹52.46 Lakh financial risk exposure in detail.' }
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
          text: 'Microphone unavailable in this environment. You can use text prompts or quick buttons below for instant answers.',
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
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] reg-card shadow-2xl border-rule-strong flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="px-4 py-3 hairline-b bg-paper-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-display font-semibold text-white tracking-tight flex items-center space-x-1.5">
              <span>ClearSpec Live Voice</span>
              <span className="text-[9px] font-mono px-1 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                Gemini 3.8
              </span>
            </h4>
            <span className="text-[10px] text-muted">Bilingual English + Telugu Auditor</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-1 rounded text-muted hover:text-ink hover:bg-paper-3 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink hover:bg-paper-3 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transcript Log */}
      <div className="h-64 overflow-y-auto p-3 space-y-2.5 bg-paper-well text-xs font-body">
        {transcripts.map((t, i) => {
          const isUser = t.speaker === 'user';
          const isSys = t.speaker === 'system';
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg p-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                    : isSys
                    ? 'bg-amber-950/60 text-amber-200 border border-amber-800/60'
                    : 'bg-paper-3 text-ink-2 border border-rule rounded-bl-none shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-70">
                  <span className="font-semibold">{isUser ? 'You' : isSys ? 'System' : 'Auditor (Live)'}</span>
                  <span className="font-mono text-[9px]">{t.time}</span>
                </div>
                <p className="whitespace-pre-wrap">{t.text}</p>
              </div>
            </div>
          );
        })}
        {isThinking && (
          <div className="flex items-center space-x-2 text-muted text-xs p-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span className="font-mono text-[11px]">Gemini reasoning over consignment ledger...</span>
          </div>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 hairline-t bg-paper-2 flex flex-wrap gap-1.5">
        {QUICK_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendText(p.text)}
            className="text-[10px] px-2 py-0.5 rounded bg-paper-3 hover:bg-emerald-600/20 text-ink-2 hover:text-emerald-300 border border-rule hover:border-emerald-500/40 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Mic & Input Controls */}
      <div className="p-3 hairline-t bg-paper-3 flex items-center space-x-2">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isConnecting}
          title={isRecording ? 'Stop Recording' : 'Push to Talk (Gemini 3.8 Live)'}
          className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            isRecording
              ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-900/50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
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
          className="flex-1 flex items-center space-x-1"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isRecording ? 'Streaming audio live...' : 'Ask in English or తెలుగు...'}
            disabled={isRecording}
            className="flex-1 bg-paper-well text-ink border border-rule rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isThinking || isRecording}
            className="p-1.5 rounded bg-emerald-600 text-white disabled:opacity-40 disabled:hover:bg-emerald-600 hover:bg-emerald-500 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
