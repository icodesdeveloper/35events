"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function HeroContent() {
  const shouldReduceMotion = useReducedMotion();
  const initial = shouldReduceMotion ? undefined : { opacity: 0, y: 20 };
  const animate = shouldReduceMotion ? undefined : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative mx-auto w-full max-w-6xl px-4 pb-16 md:px-8"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="bg-accent h-px w-8" />
        <span className="font-mono-label text-accent text-xs">Auto rondritten &amp; meets</span>
      </div>

      <h1 className="font-display max-w-2xl text-4xl leading-[1.05] font-medium tracking-tight md:text-6xl">
        Welcome to 35events
      </h1>
      <h3 className="font-display text-accent mt-2 max-w-2xl text-xl font-medium tracking-tight md:text-2xl">
        Where cars create memories!
      </h3>
      <p className="mt-5 max-w-xl text-base text-white/70 md:text-lg">
        Waar passie voor exclusieve auto&rsquo;s en onvergetelijke ervaringen
        samenkomen. Wij organiseren premium roadtrips en unieke evenementen
        voor liefhebbers van sport-, luxe- en performancewagens.
      </p>

      <a
        href="#aankomende-events"
        className="group mt-9 inline-flex items-center gap-3 border border-white/25 px-6 py-3 text-sm font-medium transition-colors hover:border-accent hover:bg-accent hover:text-zinc-950"
      >
        <span className="font-mono-label text-xs">Bekijk aankomende events</span>
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </a>
    </motion.div>
  );
}
