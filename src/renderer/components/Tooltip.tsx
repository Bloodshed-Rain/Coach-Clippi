import { useState, useRef, useCallback, type ReactNode } from "react";

interface TooltipProps {
  text: string;
  children: ReactNode;
  /** Position relative to trigger element */
  position?: "top" | "bottom" | "left" | "right";
  /** Delay before showing in ms */
  delay?: number;
}

export function Tooltip({ text, children, position = "top", delay = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }, []);

  return (
    <span className="tooltip-wrap" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span className={`tooltip tooltip-${position}`} role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
