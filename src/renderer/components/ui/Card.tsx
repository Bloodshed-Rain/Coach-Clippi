import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type CardTone = "default" | "chrome-plate";

interface CardProps extends HTMLMotionProps<"div"> {
  tone?: CardTone;
  title?: string;
  children: ReactNode;
}

export function Card({ tone = "default", title, className, children, ...rest }: CardProps) {
  const toneClass = tone === "chrome-plate" ? "chrome-plate" : "";
  return (
    <motion.div
      className={["card", toneClass, className].filter(Boolean).join(" ")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", bounce: 0.4 }}
      {...rest}
    >
      {title && <div className="card-title">{title}</div>}
      {children}
    </motion.div>
  );
}
