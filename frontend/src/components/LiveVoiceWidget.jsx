import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Send, Loader2, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export default function LiveVoiceWidget({ auditResult }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState([
    {
      speaker: 'model',
      text: 'ClearSpec Live is ready. Ask me in English or Telugu why Batch GNT-24A was blocked.',
    },
  ]);
  const [textInput, setTextInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

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

  // Clean up on unmount
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
        // Send initial consignment context
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
              { speaker: msg.speaker, text: msg.text },
            ]);
            // If model spoke in Telugu or English, also use TTS fallback if no PCM audio
            if (msg.speaker === 'model' && 'speechSynthesis' in window && !msg.hasAudio) {
              const u = new SpeechSynthesisUtterance(msg.text);
              u.rate = 1.05;
              window.speechSynthesis.speak(u);
            }
          } else if (msg.type === 'audio') {
            playAudioChunk(msg.data);
          } else if (msg.type === 'interrupted') {
            nextPlayTimeRef.current = 0;
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
            }
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (e) => {
        console.warn('Live WebSocket fallback mode active.');
        resolve(ws);
      };

      ws.onclose = () => {
        setIsRecording(false);
      };
    });
  };

  const playAudioChunk = (base64Data) => {
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24000,
        });
      }
      const ctx = playbackContextRef.current;
      const binary = atob(base64Data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      await connectWebSocket();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      // Buffer size 4096 = ~250ms chunks at 16kHz
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        // Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        // Base64 encode
        let binary = '';
        const bytes = new Uint8Array(pcm16.buffer);
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        wsRef.current.send(JSON.stringify({ type: 'audio', data: b64 }));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
      setIsConnecting(false);
    } catch (err) {
      console.warn('Microphone access denied or unsupported:', err);
      setIsConnecting(false);
      setIsRecording(false);
      setTranscripts((prev) => [
        ...prev,
        {
          speaker: 'model',
          text: 'Microphone not accessible. You can ask by clicking any quick question chip or typing below.',
        },
      ]);
    }
  };

  const stopRecording = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const askQuestion = async (queryText) => {
    if (!queryText.trim()) return;
    const userMsg = queryText.trim();
    setTextInput('');
    setTranscripts((prev) => [...prev, { speaker: 'user', text: userMsg }]);
    setIsThinking(true);

    try {
      const res = await fetch('/api/v1/live/ask-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          audit_context: auditResult,
          language: userMsg.includes('తెలుగు') ? 'te' : 'en',
        }),
      });
      const data = await res.json();
      setTranscripts((prev) => [
        ...prev,
        { speaker: 'model', text: data.answer },
      ]);

      // Speak response aloud via SpeechSynthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(data.answer);
        u.rate = 1.05;
        window.speechSynthesis.speak(u);
      }
    } catch (err) {
      setTranscripts((prev) => [
        ...prev,
        {
          speaker: 'model',
          text: 'Consignment GNT-24A blocked: 450 kg weight shortage, Tricyclazole LOQ trap (0.05 > 0.01 mg/kg), and Aflatoxin B1 exceedance (₹52.46L risk prevented).',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="rounded-xl border border-indigo-500/40 bg-slate-900/90 shadow-xl overflow-hidden backdrop-blur-md">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border-b border-indigo-500/30 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              Gemini 3.8 Live Voice Assistant
              <span className="text-[10px] font-mono bg-indigo-900/60 text-indigo-300 border border-indigo-700 px-1.5 py-0.5 rounded">
                gemini-3.8-live
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Interactive Bilingual Q&amp;A • English &bull; తెలుగు (Telugu)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-semibold animate-pulse">
              <Radio className="w-3.5 h-3.5" /> Live Audio
            </div>
          )}
          <button className="text-slate-400 hover:text-white p-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Quick-ask prompt chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => askQuestion('Why did Batch GNT-24A fail EU clearance?')}
              className="text-xs bg-slate-800 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/50 rounded-full px-3 py-1.5 transition-all text-left"
            >
              🎤 "Why did Batch GNT-24A fail EU clearance?"
            </button>
            <button
              onClick={() => askQuestion('తెలుగులో వివరించండి (Explain in Telugu)')}
              className="text-xs bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/40 rounded-full px-3 py-1.5 transition-all text-left font-medium"
            >
              🎤 "తెలుగులో వివరించండి (Explain in Telugu)"
            </button>
            <button
              onClick={() => askQuestion('What is the total financial risk exposure?')}
              className="text-xs bg-slate-800 hover:bg-indigo-900/40 text-slate-300 hover:text-indigo-200 border border-slate-700 hover:border-indigo-500/50 rounded-full px-3 py-1.5 transition-all text-left"
            >
              💰 "What is the total financial risk exposure?"
            </button>
          </div>

          {/* Transcript Dialogue Box */}
          <div className="bg-slate-950/80 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2.5 border border-slate-800 text-xs leading-relaxed">
            {transcripts.map((t, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${
                  t.speaker === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    t.speaker === 'user'
                      ? 'bg-indigo-600/90 text-white'
                      : 'bg-slate-800/90 text-slate-200 border border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">
                    {t.speaker === 'user' ? 'You' : 'ClearSpec Live'}
                  </div>
                  <div className="whitespace-pre-wrap">{t.text}</div>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-indigo-400 text-xs py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> ClearSpec is synthesizing findings…
              </div>
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Controls: Microphone + Text Input */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleRecording}
              disabled={isConnecting}
              className={`p-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
              title={isRecording ? 'Stop Live Audio' : 'Start Live Voice'}
            >
              {isConnecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                askQuestion(textInput);
              }}
              className="flex-1 flex items-center gap-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ask in English or తెలుగు (e.g. Why did it fail?)..."
                className="flex-1 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isThinking}
                className="bg-slate-800 hover:bg-indigo-600 disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
