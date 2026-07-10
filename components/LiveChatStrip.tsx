"use client";

/**
 * AnonymousLiveChat — drop-in bottom chat dock for PoolCool.
 *
 * Integration into the real app/page.tsx:
 *   import { AnonymousLiveChat } from "@/components/AnonymousLiveChat";
 *   ...render it as the last child inside <main>, right after the
 *   "Map Container" div, so it sits fixed above the map like the other
 *   overlays (top bar, right sidebar, bottom heatmap toggle).
 *
 * Every message — mock or typed by the visitor — renders with no name
 * and no identity, just a themed icon. That is the point: this is a
 * public, anonymous community line, not a profile-based chat.
 *
 * The demo below (default export) wraps it in a lightweight mock of the
 * PoolCool header + map so you can see it in context. The reusable piece
 * is the named export `AnonymousLiveChat`.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, Eye, ThermometerSun, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

type Size = "sm" | "md" | "lg";
type Mood = "hot" | "cool" | "neutral";

interface Bubble {
  id: number;
  text: string;
  accent: string;
  size: Size;
  left: number;
  sway: number;
  rot: number;
  rise: number;
  duration: number;
}

const HOT_ACCENT = "#F97316"; 
const COOL_ACCENT = "#0EA5E9"; 
const NEUTRAL_ACCENT = "#2563EB"; 

function classify(text: string): Mood {
  if (/🥵|☀️|🔥/.test(text)) return "hot";
  if (/❄️|💧|🧊|🌊/.test(text)) return "cool";
  return "neutral";
}

function accentFor(mood: Mood) {
  return mood === "hot" ? HOT_ACCENT : mood === "cool" ? COOL_ACCENT : NEUTRAL_ACCENT;
}

const QUICK_EMOJIS = ["❄️", "💧", "🥵", "🙏", "🌳", "☀️"];

const SIZE_STYLES: Record<Size, { padding: string; font: string; maxWidth: number }> = {
  sm: { padding: "4px 8px", font: "10px", maxWidth: 140 },
  md: { padding: "5px 10px", font: "11px", maxWidth: 180 },
  lg: { padding: "6px 12px", font: "12px", maxWidth: 220 },
};

function pickSize(): Size {
  const r = Math.random();
  if (r < 0.5) return "md";
  if (r < 0.8) return "sm";
  return "lg";
}

function randRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function AnonymousLiveChat({ userLocation }: { userLocation?: { lat: number; lng: number } | null }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const idRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const dockRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stageHeightRef = useRef(320);
  const [dockHeight, setDockHeight] = useState(112);

  // Measure the dock so the stage above it always ends exactly at
  // half the viewport height, and measure the stage itself so bubbles
  // know how far they're allowed to travel before fading out.
  useEffect(() => {
    const measure = () => {
      if (dockRef.current) setDockHeight(dockRef.current.getBoundingClientRect().height);
      if (stageRef.current) stageHeightRef.current = stageRef.current.getBoundingClientRect().height;
    };
    measure();
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const spawnBubble = useCallback((text: string) => {
    const mood = classify(text);
    const stageH = stageHeightRef.current || 320;
    const bubble: Bubble = {
      id: idRef.current++,
      text,
      accent: accentFor(mood),
      size: pickSize(),
      left: randRange(5, 75),
      sway: 0,
      rot: (Math.random() < 0.5 ? -1 : 1) * randRange(3, 8),
      rise: randRange(0.76, 0.96) * stageH, // fully fades before reaching the top of the stage
      duration: randRange(7.5, 10),
    };
    setBubbles((prev) => [...prev, bubble]);
  }, []);

  const removeBubble = useCallback((id: number) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const cityId = userLocation 
    ? `city-${Math.round(userLocation.lat * 10)}-${Math.round(userLocation.lng * 10)}`
    : 'global';

  // Connect to Supabase Realtime and handle live messages
  useEffect(() => {
    const channel = supabase.channel(cityId);
    channelRef.current = channel;
    
    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        spawnBubble(payload.payload.text);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cityId, spawnBubble]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    // Optimistic update
    spawnBubble(trimmed);
    
    // Broadcast via socket
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: { text: trimmed }
      });
    }
    
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleQuickEmoji = (emoji: string) => {
    spawnBubble(emoji);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: { text: emoji }
      });
    }
  };

  return (
    <>
      <style>{`
        @keyframes floatUpHalf {
          0%   { transform: translateY(0px) rotate(0deg) scale(0.85); opacity: 0; }
          8%   { opacity: 1; }
          85%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(calc(var(--rise) * -1)) rotate(calc(var(--rot) * 0.5)) scale(0.94); }
        }
        .pc-quick-btn { transition: transform 0.15s ease, background 0.15s ease; }
        .pc-quick-btn:hover { transform: translateY(-2px) scale(1.07); background: #EFF6FF; }
        .pc-quick-btn:active { transform: scale(0.92); }
        .pc-send-btn { transition: transform 0.15s ease, filter 0.15s ease; }
        .pc-send-btn:hover { filter: brightness(1.06); }
        .pc-send-btn:active { transform: scale(0.94); }
        .pc-input::placeholder { color: #9CA3AF; }
        .pc-input:focus { border-color: #93C5FD !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        button:focus-visible, input:focus-visible {
          outline: 2px solid #2563EB;
          outline-offset: 2px;
        }
      `}</style>

      {/* Bubble stage: fixed above the dock, height = 30% of the screen minus the dock,
          so every bubble is fully faded by the time it reaches the screen's 30% point. */}
      <div
        ref={stageRef}
        className="fixed inset-x-0 z-20 pointer-events-none overflow-hidden"
        style={{
          bottom: dockHeight,
          height: `calc(30vh - ${dockHeight}px)`,
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 78%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 10%, black 78%, transparent 100%)",
        }}
      >
        {bubbles.map((b) => {
          const s = SIZE_STYLES[b.size];
          return (
            <div
              key={b.id}
              onAnimationEnd={() => removeBubble(b.id)}
              className="absolute bottom-0 flex items-center gap-1.5 font-sans"
              style={
                {
                  left: `${b.left}%`,
                  maxWidth: s.maxWidth,
                  padding: s.padding,
                  fontSize: s.font,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.92)",
                  border: `1px solid ${b.accent}40`,
                  color: "#1F2937",
                  backdropFilter: "blur(6px)",
                  lineHeight: 1.3,
                  boxShadow: `0 6px 18px -4px ${b.accent}33, 0 2px 6px rgba(15,23,42,0.06)`,
                  animationName: "floatUpHalf",
                  animationTimingFunction: "ease-out",
                  animationDuration: `${b.duration}s`,
                  animationFillMode: "forwards",
                  "--sway": `${b.sway}px`,
                  "--rot": `${b.rot}deg`,
                  "--rise": `${b.rise}px`,
                } as React.CSSProperties
              }
            >
              <span style={{ overflowWrap: "break-word", fontWeight: 500 }}>{b.text}</span>
            </div>
          );
        })}
      </div>

      {/* Dock: fixed to the bottom of the page, transparent. */}
      <div
        ref={dockRef}
        className="fixed inset-x-0 bottom-0 z-30 font-sans"
      >
        {isFocused && (
          <div className="flex items-center gap-2 px-4 pt-2.5 pb-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onMouseDown={(evt) => evt.preventDefault()}
                onClick={() => handleQuickEmoji(e)}
                className="pc-quick-btn text-base leading-none rounded-full flex items-center justify-center bg-gray-50 border border-gray-200"
                style={{ width: 30, height: 30 }}
                aria-label={`Send ${e} reaction anonymously`}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Post anonymously to everyone…"
            className="pc-input flex-1 text-xs outline-none bg-gray-50 border border-gray-200 rounded-full"
            style={{ padding: "8px 14px", color: "#1F2937" }}
          />
          <button
            onClick={handleSend}
            className="pc-send-btn flex items-center justify-center rounded-full bg-blue-600 border border-blue-700"
            style={{ width: 32, height: 32, flexShrink: 0 }}
            aria-label="Post message anonymously"
          >
            <Send size={14} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------
// Demo wrapper: a lightweight mock of the PoolCool home page so the dock
// and its bubbles can be seen in their real context. Only AnonymousLiveChat
// above is meant to be copied into the actual app/page.tsx.
// ---------------------------------------------------------------------
export default function PoolCoolHomePreview() {
  return (
    <div className="w-full h-screen relative overflow-hidden font-sans" style={{ background: "#EAF4FB" }}>
      {/* faux map background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 30%, rgba(56,189,248,0.25), transparent 55%), radial-gradient(circle at 80% 20%, rgba(45,212,191,0.2), transparent 50%), radial-gradient(circle at 60% 75%, rgba(37,99,235,0.14), transparent 55%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.15) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* header, matching the real app's top bar */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-4 z-10 flex justify-between items-start gap-3">
        <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-xl border border-gray-100 flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md shrink-0">
              <ThermometerSun className="text-white w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none">PoolCool</h1>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                Heat Wave Refuge Network
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 shadow-sm flex items-center gap-1.5 leading-none">
            <ThermometerSun className="w-4 h-4" />
            41°C
          </span>
        </div>
      </div>

      <AnonymousLiveChat />
    </div>
  );
}
