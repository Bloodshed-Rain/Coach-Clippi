import { useEffect, useRef, useState, type CSSProperties } from "react";

import bowserArt from "../assets/characters/bowser.webp";
import dkArt from "../assets/characters/dk.webp";
import docArt from "../assets/characters/doc.webp";
import falcoArt from "../assets/characters/falco.webp";
import falconArt from "../assets/characters/falcon.webp";
import foxArt from "../assets/characters/fox.webp";
import ganonArt from "../assets/characters/ganon.webp";
import icsArt from "../assets/characters/ics.webp";
import kirbyArt from "../assets/characters/kirby.webp";
import linkArt from "../assets/characters/link.webp";
import luigiArt from "../assets/characters/luigi.webp";
import marioArt from "../assets/characters/mario.webp";
import marthArt from "../assets/characters/marth.webp";
import mewtwoArt from "../assets/characters/mewtwo.webp";
import nessArt from "../assets/characters/ness.webp";
import peachArt from "../assets/characters/peach.webp";
import pichuArt from "../assets/characters/pichu.webp";
import pikachuArt from "../assets/characters/pikachu.webp";
import puffArt from "../assets/characters/puff.webp";
import royArt from "../assets/characters/roy.webp";
import samusArt from "../assets/characters/samus.webp";
import sheikArt from "../assets/characters/sheik.webp";
import ylinkArt from "../assets/characters/ylink.webp";
import yoshiArt from "../assets/characters/yoshi.webp";
import zeldaArt from "../assets/characters/zelda.webp";

const ROSTER = [
  bowserArt,
  dkArt,
  docArt,
  falcoArt,
  falconArt,
  foxArt,
  ganonArt,
  icsArt,
  kirbyArt,
  linkArt,
  luigiArt,
  marioArt,
  marthArt,
  mewtwoArt,
  nessArt,
  peachArt,
  pichuArt,
  pikachuArt,
  puffArt,
  royArt,
  samusArt,
  sheikArt,
  ylinkArt,
  yoshiArt,
  zeldaArt,
] as const;

const MAX_LIVE_CHARACTERS = 3;

type CharacterBackdropStyle = CSSProperties & {
  "--liquid-char-left": string;
  "--liquid-char-top": string;
  "--liquid-char-height": string;
  "--liquid-char-peak": string;
  "--liquid-char-rotate": string;
  "--liquid-char-end-rotate": string;
  "--liquid-char-scale": string;
  "--liquid-char-end-scale": string;
  "--liquid-char-drift-x": string;
  "--liquid-char-drift-y": string;
  "--liquid-char-life": string;
  "--liquid-char-drift-life": string;
};

interface CharacterBackdropItem {
  id: number;
  src: string;
  lifeMs: number;
  isStatic: boolean;
  style: CharacterBackdropStyle;
}

interface LiquidCharacterBackdropProps {
  active: boolean;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

const randBetween = (min: number, max: number) => rand(min, Math.max(min, max));

function shuffle<T>(items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function createBackdropItem(id: number, src: string, isStatic = false): CharacterBackdropItem {
  const viewportWidth = Math.max(window.innerWidth, 320);
  const viewportHeight = Math.max(window.innerHeight, 320);
  const isMobile = viewportWidth < 700;
  const heightVh = isMobile ? rand(90, 118) : rand(64, 104);
  const characterHeight = (heightVh / 100) * viewportHeight;
  const characterWidth = characterHeight * 0.68;
  const left = isMobile
    ? randBetween(viewportWidth - characterWidth * 0.9, viewportWidth - characterWidth * 0.42)
    : randBetween(-characterWidth * 0.2, viewportWidth - characterWidth * 0.78);
  const top = isMobile
    ? randBetween(viewportHeight - characterHeight * 0.92, viewportHeight - characterHeight * 0.48)
    : randBetween(-characterHeight * 0.16, viewportHeight - characterHeight * 0.82);
  const rotation = rand(-5, 5);
  const endRotation = rotation + rand(-3, 3);
  const scale = rand(0.92, 1.05);
  const lifeMs = isStatic ? 0 : Math.round(rand(12_500, 18_500));

  return {
    id,
    src,
    lifeMs,
    isStatic,
    style: {
      "--liquid-char-left": `${left}px`,
      "--liquid-char-top": `${top}px`,
      "--liquid-char-height": `${heightVh}vh`,
      "--liquid-char-peak": `${isMobile ? rand(0.42, 0.6) : rand(0.32, 0.5)}`,
      "--liquid-char-rotate": `${rotation}deg`,
      "--liquid-char-end-rotate": `${endRotation}deg`,
      "--liquid-char-scale": `${scale}`,
      "--liquid-char-end-scale": `${scale + rand(0.02, 0.08)}`,
      "--liquid-char-drift-x": `${rand(-28, 28)}px`,
      "--liquid-char-drift-y": `${rand(-24, 24)}px`,
      "--liquid-char-life": `${lifeMs}ms`,
      "--liquid-char-drift-life": `${Math.round(rand(22_000, 34_000))}ms`,
    },
  };
}

export function LiquidCharacterBackdrop({ active }: LiquidCharacterBackdropProps) {
  const [items, setItems] = useState<CharacterBackdropItem[]>([]);
  const idRef = useRef(0);
  const liveCountRef = useRef(0);
  const queueRef = useRef<string[]>([]);
  const lastSourceRef = useRef<string>("");

  useEffect(() => {
    if (!active) {
      liveCountRef.current = 0;
      setItems([]);
      return;
    }

    const nextSource = () => {
      if (queueRef.current.length === 0) {
        queueRef.current = shuffle(ROSTER);
        if (queueRef.current[0] === lastSourceRef.current && queueRef.current.length > 1) {
          [queueRef.current[0], queueRef.current[1]] = [queueRef.current[1]!, queueRef.current[0]!];
        }
      }

      const src = queueRef.current.shift() ?? marthArt;
      lastSourceRef.current = src;
      return src;
    };

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (prefersReducedMotion) {
      liveCountRef.current = MAX_LIVE_CHARACTERS;
      setItems(
        Array.from({ length: MAX_LIVE_CHARACTERS }, () => {
          idRef.current += 1;
          return createBackdropItem(idRef.current, nextSource(), true);
        }),
      );
      return;
    }

    let disposed = false;
    liveCountRef.current = 0;
    const timers = new Set<number>();
    const schedule = (fn: () => void, delay: number) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!disposed) fn();
      }, delay);
      timers.add(timer);
    };

    const spawn = () => {
      if (liveCountRef.current < MAX_LIVE_CHARACTERS) {
        idRef.current += 1;
        const item = createBackdropItem(idRef.current, nextSource());
        liveCountRef.current += 1;
        setItems((current) => [...current, item]);

        schedule(() => {
          liveCountRef.current = Math.max(0, liveCountRef.current - 1);
          setItems((current) => current.filter((candidate) => candidate.id !== item.id));
        }, item.lifeMs + 300);
      }

      schedule(spawn, liveCountRef.current <= 1 ? rand(4_800, 6_800) : rand(6_800, 9_200));
    };

    spawn();

    return () => {
      disposed = true;
      liveCountRef.current = 0;
      timers.forEach((timer) => window.clearTimeout(timer));
      setItems([]);
    };
  }, [active]);

  if (!active && items.length === 0) return null;

  return (
    <div className="liquid-character-backdrop" aria-hidden="true">
      {items.map((item) => (
        <img
          key={item.id}
          className={`liquid-character-backdrop__art${item.isStatic ? " is-static" : ""}`}
          src={item.src}
          alt=""
          decoding="async"
          draggable={false}
          loading="lazy"
          style={item.style}
        />
      ))}
    </div>
  );
}
