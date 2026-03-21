import { useState, useEffect, useRef, useMemo } from "react";

/**
 * Returns a function that generates stagger animation delays for list items.
 */
export function useStagger(delayMs: number = 40) {
  return (index: number): React.CSSProperties => ({
    animationDelay: `${index * delayMs}ms`,
  });
}

/**
 * Simulates a typewriter effect, revealing text character by character.
 */
export function useTypewriter(
  text: string,
  charsPerTick: number = 2,
  enabled: boolean = true,
): {
  displayText: string;
  isTyping: boolean;
} {
  const [index, setIndex] = useState(enabled ? 0 : text.length);
  const prevText = useRef(text);

  useEffect(() => {
    if (text !== prevText.current) {
      prevText.current = text;
      setIndex(enabled ? 0 : text.length);
    }
  }, [text, enabled]);

  useEffect(() => {
    if (!enabled || index >= text.length) return;

    const id = requestAnimationFrame(() => {
      setIndex((i) => Math.min(i + charsPerTick, text.length));
    });

    return () => cancelAnimationFrame(id);
  }, [index, text, charsPerTick, enabled]);

  return {
    displayText: text.slice(0, index),
    isTyping: index < text.length,
  };
}

/**
 * Animated counter that counts up from 0 to target with easing.
 */
export function useCountUp(target: number, duration: number = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// Glitch character set — module-level to avoid recreation per render
const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

/**
 * Generates a glitch-text effect: randomly distorts characters for a duration.
 * Used for page titles on mount for that "system boot" feel.
 */
export function useGlitchText(text: string, durationMs: number = 600, enabled: boolean = true) {
  const [display, setDisplay] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) { setDisplay(text); return; }
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);

      // Reveal characters left to right with random noise
      const revealedCount = Math.floor(progress * text.length);
      let result = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealedCount) {
          result += text[i];
        } else if (i === revealedCount && text[i] !== " ") {
          result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        } else {
          result += text[i] === " " ? " " : GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
      }
      setDisplay(result);

      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setDisplay(text);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, durationMs, enabled]);

  return display;
}

/**
 * System uptime counter -- counts seconds since mount.
 * Displays in the sidebar status area for that "always running" feel.
 */
export function useUptime() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
