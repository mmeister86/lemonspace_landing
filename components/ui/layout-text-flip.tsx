"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export const LayoutTextFlip = ({
  text = "Build Amazing",
  words = ["Landing Pages", "Component Blocks", "Page Sections", "3D Shaders"],
  duration = 3000,
  showText = true,
  className,
  wordClassName,
}: {
  text?: string;
  words: string[];
  duration?: number;
  showText?: boolean;
  className?: string;
  wordClassName?: string;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <>
      {showText && text && (
        <motion.span
          layoutId="subtext"
          className={cn(
            "text-2xl font-bold tracking-tight drop-shadow-lg md:text-4xl",
            className
          )}
        >
          {text}
        </motion.span>
      )}

      <motion.span
        layout
        className={cn(
          "relative w-fit overflow-hidden rounded-md border border-transparent bg-white px-4 py-2 font-sans text-2xl font-bold tracking-tight text-black shadow-sm ring shadow-black/10 ring-black/10 md:text-4xl dark:bg-neutral-900 dark:text-white dark:shadow-sm dark:ring-1 dark:shadow-white/10 dark:ring-white/10",
          wordClassName
        )}
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={currentIndex}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{
              rotateX: 0,
              opacity: 1,
            }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
            className={cn("inline-block whitespace-nowrap")}
            style={{
              display: "inline-block",
              backfaceVisibility: "hidden",
              transformStyle: "preserve-3d",
            }}
          >
            {words[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </>
  );
};
