"use client";

import React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

/* --------------------- Brand SVGs (clean, lightweight) -------------------- */
export const FigmaLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 256 384"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Figma"
    {...props}
  >
    {/* Left column */}
    <circle cx="64"  cy="64"  r="64" fill="#F24E1E" />  {/* top-left (orange) */}
    <circle cx="64"  cy="192" r="64" fill="#FF7262" />  {/* middle-left (salmon) */}
    <circle cx="64"  cy="320" r="64" fill="#0ACF83" />  {/* bottom-left (green) */}

    {/* Right column */}
    <circle cx="192" cy="64"  r="64" fill="#A259FF" />  {/* top-right (purple) */}
    <circle cx="192" cy="192" r="64" fill="#1ABCFE" />  {/* middle-right (blue) */}
  </svg>
);

const AppleLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 256 312" {...props} aria-label="Apple">
    <path fill="currentColor" d="M212 167c0-44 36-65 37-66-21-31-54-35-65-35-28-3-54 17-68 17-14 0-36-17-59-17-30 0-58 18-73 45-31 53-8 131 22 174 15 21 33 45 56 45 22-1 31-14 58-14 26 0 35 14 59 14 24 0 39-22 54-43 17-25 24-50 24-52-1 0-47-18-47-68z"/>
    <path fill="currentColor" d="M176 20c12-15 20-36 18-57-17 1-37 11-48 26-11 14-20 36-18 56 19 1 37-10 48-25z"/>
  </svg>
);

export const AndroidLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Android"
    {...props}
  >
    {/* Antennas */}
    <g stroke="currentColor" strokeWidth={28} strokeLinecap="round" fill="none">
      <line x1="182" y1="86" x2="144" y2="24" />
      <line x1="330" y1="86" x2="368" y2="24" />
    </g>

    {/* Head (semi-circle) */}
    <path
      d="M128 184
         A128 128 0 0 1 384 184
         L128 184 Z"
      fill="currentColor"
    />

    {/* Eyes */}
    <g fill="#FFFFFF">
      <circle cx="208" cy="140" r="12" />
      <circle cx="304" cy="140" r="12" />
    </g>

    {/* Body */}
    <rect x="112" y="184" width="288" height="224" rx="36" fill="currentColor" />

    {/* Arms */}
    <rect x="48"  y="204" width="48" height="184" rx="24" fill="currentColor" />
    <rect x="416" y="204" width="48" height="184" rx="24" fill="currentColor" />

    {/* Legs */}
    <rect x="176" y="408" width="56" height="96" rx="28" fill="currentColor" />
    <rect x="280" y="408" width="56" height="96" rx="28" fill="currentColor" />
  </svg>
);

/* --------------------------- Shared helpers ------------------------------- */
const glass =
  "relative rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-md overflow-hidden";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
};

/* ------------------------------- Component -------------------------------- */
const ChooseUsAnimated: React.FC = () => {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const r = useTransform(mx, [-40, 40], [-6, 6]); // subtle tilt

  return (
    <section
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 80);
        my.set(((e.clientY - rect.top) / rect.height - 0.5) * 80);
      }}
      className="relative w-full bg-[#0f0f10] text-white py-16 select-none"
    >
      {/* soft vignette + grid glow */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_10%,rgba(255,255,255,.08),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,transparent_24px,rgba(255,255,255,.04)_25px),linear-gradient(90deg,transparent_24px,rgba(255,255,255,.04)_25px)] bg-[size:26px_26px]" />

      <motion.h2
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="text-center text-[28px] md:text-5xl font-semibold tracking-[-0.02em] mb-12"
      >
        But Why Choose Us?
      </motion.h2>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="mx-auto max-w-6xl grid gap-5 md:gap-6 grid-cols-2 md:grid-cols-3 auto-rows-[180px] md:auto-rows-[220px]"
      >
        {/* LEFT TALL CARD */}
        <motion.div
          variants={fadeUp}
          style={{ rotateY: r }}
          className={`${glass} row-span-2 p-6`}
        >
          {/* glare */}
          <div className="absolute -top-1/2 -left-1/2 h-[220%] w-[220%] rotate-12 bg-[conic-gradient(from_210deg,rgba(255,255,255,.08),transparent_35%)]" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <p className="text-lg md:text-xl font-medium leading-snug">
              Power of Code with <br /> AI, for non coders
            </p>

            {/* phone silhouette with parallax */}
            <motion.div
              style={{ x: useTransform(mx, v => v * 0.05), y: useTransform(my, v => v * 0.05) }}
              className="absolute right-[-18px] bottom-[-24px] opacity-15"
            >
              <svg width="170" height="170" viewBox="0 0 200 200" fill="none">
                <rect x="40" y="10" width="120" height="180" rx="26" stroke="white" strokeOpacity=".5" strokeWidth="2"/>
                <circle cx="102" cy="26" r="6" fill="white" opacity=".5"/>
                <rect x="62" y="140" width="76" height="26" rx="8" fill="white" opacity=".12"/>
              </svg>
            </motion.div>
          </div>
        </motion.div>

        {/* TOP-MIDDLE CARD (10X) */}
        <motion.div variants={fadeUp} className={`${glass} p-6`}>
          {/* fake browser bar */}
          <div className="relative w-2/3 h-3 rounded-md bg-white/10 mb-4 overflow-hidden">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
              className="absolute inset-y-0 w-2/5 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          </div>

          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-6xl md:text-7xl font-extrabold tracking-tight"
            >
              10X
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-sm mt-2"
            >
              Faster, cheaper, and easier.
            </motion.p>
          </div>

          {/* subtle UI chrome */}
          <motion.div
            style={{ x: useTransform(mx, v => v * -0.05), y: useTransform(my, v => v * -0.05) }}
            className="absolute -right-4 -bottom-6 opacity-10"
          >
            <svg width="180" height="90" viewBox="0 0 260 120" fill="none">
              <rect x="20" y="16" width="220" height="72" rx="12" stroke="white" strokeOpacity=".6" strokeWidth="2"/>
              <circle cx="40" cy="32" r="6" fill="white" opacity=".5"/>
              <circle cx="60" cy="32" r="6" fill="white" opacity=".5"/>
              <circle cx="80" cy="32" r="6" fill="white" opacity=".5"/>
            </svg>
          </motion.div>
        </motion.div>

        {/* TOP-RIGHT CARD (clock + swinging tag) */}
        <motion.div variants={fadeUp} className={`${glass} p-6`}>
          {/* clock face */}
          <motion.div
            style={{ x: useTransform(mx, v => v * -0.03), y: useTransform(my, v => v * -0.04) }}
            className="absolute -left-10 -top-14 opacity-10"
          >
            <svg width="210" height="210" viewBox="0 0 210 210" fill="none">
              <circle cx="105" cy="105" r="94" stroke="white" strokeOpacity=".7" strokeWidth="2"/>
              <line x1="105" y1="105" x2="105" y2="36" stroke="white" strokeOpacity=".7" strokeWidth="2" />
              <line x1="105" y1="105" x2="162" y2="105" stroke="white" strokeOpacity=".7" strokeWidth="2" />
            </svg>
          </motion.div>

          {/* swinging tag */}
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 10 }}
            transition={{ repeat: Infinity, repeatType: "reverse", duration: 2.4, ease: "easeInOut" }}
            className="origin-top"
          >
            <div className="mx-auto w-8 h-8 rounded-sm bg-white/80" />
            <div className="mx-auto w-0.5 h-10 bg-white/50" />
          </motion.div>

          <p className="mt-6 text-right text-sm font-medium leading-snug">
            From Idea to App, <br /> in Minutes
          </p>
        </motion.div>

        {/* BOTTOM-WIDE CARD (design/import/deploy + orbit) */}
        <motion.div variants={fadeUp} className={`${glass} col-span-2 p-6 md:p-8`}>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-xl font-semibold mb-2">Design, Import, Deploy</h3>
              <p className="text-sm opacity-90 max-w-md">
                Bring in your Figma designs, refine the flow visually, and ship to iOS and Android.
              </p>
            </div>

            {/* Orbit scene */}
            <div className="relative h-40 md:h-44">
              {/* arc */}
              <svg className="absolute inset-0" viewBox="0 0 400 160">
                <path
                  d="M20,140 C140,60 260,60 380,140"
                  stroke="rgba(255,255,255,.18)"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>

              {/* orbiting icons along the path */}
              <motion.div
                className="absolute left-[10%] top-[58%]"
                initial={{ x: -10, y: 10 }}
                animate={{ x: 10, y: -10 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 3.6, ease: "easeInOut" }}
              >
                <FigmaLogo className="w-10 h-10 drop-shadow" />
              </motion.div>

              <motion.div
                className="absolute left-[48%] top-[6%] text-[#9ae66e]"
                initial={{ y: -4 }}
                animate={{ y: 6 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 2.8, ease: "easeInOut" }}
              >
                <AndroidLogo className="w-12 h-12" />
              </motion.div>

              <motion.div
                className="absolute right-[4%] bottom-0 text-white"
                initial={{ y: 6 }}
                animate={{ y: -6 }}
                transition={{ repeat: Infinity, repeatType: "reverse", duration: 3.2, ease: "easeInOut" }}
              >
                <AppleLogo className="w-14 h-14" />
              </motion.div>

              {/* floating nodes on the arc */}
              {[0,1,2,3].map((i) => (
                <motion.span
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white/60"
                  style={{
                    left: `${15 + i*18}%`,
                    top: `${60 - i*10}%`,
                  }}
                  initial={{ opacity: .5, scale: .8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ repeat: Infinity, repeatType: "reverse", duration: 1.4 + i*0.2 }}
                />
              ))}
            </div>
          </div>

          {/* subtle bottom gradient */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-10 h-24 bg-gradient-to-t from-white/5 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default ChooseUsAnimated;
