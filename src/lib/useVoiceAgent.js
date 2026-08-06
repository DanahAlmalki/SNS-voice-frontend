import { useCallback, useEffect, useRef, useState } from "react";

const WS_URL =
  "wss://voice-containerapp.jollygrass-66012e86.westus3.azurecontainerapps.io/ws";
const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 512;

// Connects to the voice-agent WebSocket: streams mic audio up, plays TTS down,
// and exposes conversation/state for the UI.
export function useVoiceAgent() {
  const wsRef = useRef(null);
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const procRef = useRef(null);
  const sourceRef = useRef(null);
  const queueRef = useRef([]);
  const playingRef = useRef(false);
  const srcRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [state, setState] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [vadProb, setVadProb] = useState(0);
  const [error, setError] = useState(null);

  const playNext = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || queueRef.current.length === 0) {
      playingRef.current = false;
      return;
    }
    playingRef.current = true;
    const buf = queueRef.current.shift();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.onended = playNext;
    srcRef.current = src;
    src.start();
  }, []);

  const stopAudio = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    try {
      srcRef.current?.stop();
    } catch {
      /* already stopped */
    }
    srcRef.current = null;
  }, []);

  const handleMessage = useCallback(
    (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      switch (data.type) {
        case "connected":
          setConnected(true);
          break;
        case "vad_status":
          setVadProb(data.speech_prob ?? 0);
          break;
        case "state":
          setState(data.state);
          if (data.state === "interrupted") stopAudio();
          break;
        case "transcription":
          setMessages((m) => [...m, { role: "user", text: data.text }]);
          break;
        case "response":
          setMessages((m) => [...m, { role: "assistant", text: data.text }]);
          break;
        case "audio": {
          const ctx = ctxRef.current;
          if (!ctx) return;
          const bin = atob(data.data);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const floats = new Float32Array(bytes.buffer);
          const buf = ctx.createBuffer(1, floats.length, data.sample_rate);
          buf.copyToChannel(floats, 0);
          queueRef.current.push(buf);
          if (!playingRef.current) playNext();
          break;
        }
        case "error":
          setError(data.message || "حدث خطأ في الاتصال");
          break;
        default:
          break;
      }
    },
    [playNext, stopAudio],
  );

  const stop = useCallback(() => {
    stopAudio();
    try {
      procRef.current?.disconnect();
      sourceRef.current?.disconnect();
    } catch {
      /* noop */
    }
    ctxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    procRef.current = null;
    sourceRef.current = null;
    ctxRef.current = null;
    streamRef.current = null;
    wsRef.current = null;
    setConnected(false);
    setState("idle");
    setVadProb(0);
  }, [stopAudio]);

  const start = useCallback(async () => {
    setError(null);
    setMessages([]);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const ctx = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE,
      });
      await ctx.resume(); // unlock playback inside the click gesture
      ctxRef.current = ctx;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onmessage = handleMessage;
      ws.onerror = () => setError("تعذّر الاتصال بالخادم");
      ws.onclose = () => setConnected(false);
      ws.onopen = () => {
        const source = ctx.createMediaStreamSource(streamRef.current);
        const proc = ctx.createScriptProcessor(CHUNK_SIZE, 1, 1);
        sourceRef.current = source;
        procRef.current = proc;
        proc.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const input = e.inputBuffer.getChannelData(0);
          ws.send(new Float32Array(input).buffer);
        };
        source.connect(proc);
        proc.connect(ctx.destination);
      };
    } catch (err) {
      setError(
        err?.name === "NotAllowedError"
          ? "تم رفض إذن الميكروفون"
          : "تعذّر بدء المكالمة",
      );
      stop();
      throw err;
    }
  }, [handleMessage, stop]);

  useEffect(() => () => stop(), [stop]);

  return { start, stop, connected, state, messages, vadProb, error };
}
