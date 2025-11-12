"use client";

import React from "react";
import { motion, useMotionValue, useTransform, useReducedMotion } from "framer-motion";

/* --------------------- Brand SVGs (professional, polished) -------------------- */
export const FigmaLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 256 384"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Figma"
    {...props}
  >
    <defs>
      <linearGradient id="figma-orange" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F24E1E" />
        <stop offset="100%" stopColor="#FF6B35" />
      </linearGradient>
      <linearGradient id="figma-purple" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#A259FF" />
        <stop offset="100%" stopColor="#8B46FF" />
      </linearGradient>
      <linearGradient id="figma-green" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0ACF83" />
        <stop offset="100%" stopColor="#00D9FF" />
      </linearGradient>
    </defs>
    {/* Left column */}
    <circle cx="64"  cy="64"  r="64" fill="url(#figma-orange)" />
    <circle cx="64"  cy="192" r="64" fill="#FF7262" />
    <circle cx="64"  cy="320" r="64" fill="url(#figma-green)" />
    
    {/* Right column */}
    <circle cx="192" cy="64"  r="64" fill="url(#figma-purple)" />
    <circle cx="192" cy="192" r="64" fill="#1ABCFE" />
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
  "relative rounded-3xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-white/[0.08] backdrop-blur-xl overflow-hidden shadow-2xl";

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.8, 
      ease: [0.21, 1.11, 0.81, 0.99] as const
    } 
  }
};

const container = {
  hidden: {},
  show: { 
    transition: { 
      staggerChildren: 0.1, 
      delayChildren: 0.3 
    } 
  }
};

const shimmer = {
  hidden: { x: "-100%" },
  show: { 
    x: "100%",
    transition: {
      repeat: Infinity,
      duration: 3,
      ease: "linear" as const
    }
  }
};

/* ------------------------------- Component -------------------------------- */
const ChooseUsAnimated: React.FC = () => {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useTransform(my, [-40, 40], [2, -2]);
  const rotateY = useTransform(mx, [-40, 40], [-2, 2]);
  const prefersReducedMotion = useReducedMotion();
  const headingId = React.useId();

  // Small helper to optionally disable animations for users who prefer reduced motion
  const animated = <T,>(val: T, fallback: T) => (prefersReducedMotion ? fallback : val);

  interface TopCardConfig {
    key: string;
    title: string;
    subtitle?: string;
    body?: string;
    gradientFrom: string;
    gradientTo: string;
    icon: React.ReactNode;
    extraContent?: React.ReactNode;
  }

  const topCards: TopCardConfig[] = [
    {
      key: 'ai-dev',
      title: 'AI-Powered Development',
      body: 'Harness the power of artificial intelligence to transform your ideas into fully functional applications without writing a single line of code.',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-purple-600',
      icon: (
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V8z" clipRule="evenodd" />
        </svg>
      ),
      extraContent: (
        <motion.div
          style={{ x: useTransform(mx, v => v * 0.03), y: useTransform(my, v => v * 0.03) }}
          className="absolute right-[-18px] bottom-[-18px] opacity-20 group-hover:opacity-30 transition-opacity duration-500"
          aria-hidden="true"
        >
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <rect x="20" y="10" width="80" height="100" rx="16" stroke="currentColor" strokeWidth="2"/>
            <circle cx="60" cy="22" r="3" fill="currentColor"/>
            <rect x="30" y="75" width="60" height="20" rx="6" fill="currentColor" opacity="0.35"/>
            <rect x="30" y="35" width="60" height="35" rx="4" fill="currentColor" opacity="0.12"/>
          </svg>
        </motion.div>
      )
    },
    {
      key: 'velocity',
      title: '10X Faster',
      subtitle: 'Faster Development',
      body: 'Build applications in minutes, not months. Our platform accelerates your workflow beyond traditional development.',
      gradientFrom: 'from-emerald-400',
      gradientTo: 'to-purple-500',
      icon: (
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2l4 8H8l4-8Z" />
          <path d="M8 14h8l-4 8-4-8Z" />
        </svg>
      ),
      extraContent: (
        <motion.div
          style={{ x: useTransform(mx, v => v * -0.02), y: useTransform(my, v => v * -0.02) }}
          className="absolute -right-6 -bottom-8 opacity-15 group-hover:opacity-25 transition-opacity duration-500"
          aria-hidden="true"
        >
          <svg width="100" height="60" viewBox="0 0 100 60" fill="none">
            <rect x="10" y="10" width="80" height="40" rx="8" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="20" cy="20" r="3" fill="currentColor"/>
            <circle cx="30" cy="20" r="3" fill="currentColor"/>
            <circle cx="40" cy="20" r="3" fill="currentColor"/>
            <rect x="20" y="30" width="60" height="2" rx="1" fill="currentColor" opacity="0.6"/>
            <rect x="20" y="35" width="40" height="2" rx="1" fill="currentColor" opacity="0.4"/>
          </svg>
        </motion.div>
      )
    },
    {
      key: 'deploy',
      title: 'Lightning Deploy',
      body: 'From concept to live app in minutes. Zero configuration, zero hassle.',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-red-500',
      icon: (
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
        </svg>
      ),
      extraContent: (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={animated({ y: 0, opacity: 1 }, { y: 0, opacity: 1 })}
          transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
          className="absolute -right-4 -bottom-6 opacity-20 group-hover:opacity-40 transition-opacity duration-500"
          aria-hidden="true"
        >
          <motion.svg
            animate={animated({ y: [0, -8, 0], rotate: [0, 2, -2, 0] }, { y: 0, rotate: 0 })}
            transition={{ duration: 3, repeat: prefersReducedMotion ? 0 : Infinity, ease: 'easeInOut' }}
            width="60" height="60" viewBox="0 0 60 60" fill="none"
          >
            <path d="M30 10L35 25H25L30 10Z" fill="currentColor"/>
            <circle cx="30" cy="30" r="8" fill="currentColor" opacity="0.6"/>
            <path d="M22 38L18 50H20L23 40" fill="currentColor" opacity="0.4"/>
            <path d="M38 38L42 50H40L37 40" fill="currentColor" opacity="0.4"/>
          </motion.svg>
        </motion.div>
      )
    }
  ];

  return (
    <section
      aria-labelledby={headingId}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 60);
        my.set(((e.clientY - rect.top) / rect.height - 0.5) * 60);
      }}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="relative w-full bg-gradient-to-b from-[#0a0a0b] via-[#0f0f10] to-[#0a0a0b] text-white py-20 lg:py-32 select-none overflow-hidden"
    >
      {/* Enhanced background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Main radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_20%,rgba(120,119,198,0.15),transparent_70%)]" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Subtle noise overlay */}
        <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay" 
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
             }} 
        />
        
        {/* Floating orbs */}
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{ 
            duration: 6, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-20 left-1/4 w-32 h-32 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl"
        />
        <motion.div 
          animate={{ 
            y: [0, 30, 0],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-20 right-1/4 w-24 h-24 rounded-full bg-gradient-to-r from-green-500/20 to-teal-500/20 blur-xl"
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="text-center mb-16 lg:mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 ring-1 ring-white/10 mb-6"
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-white/80">Why Choose Us</span>
          </motion.div>
          
          <motion.h2
            id={headingId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-[-0.02em] mb-6"
          >
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Built for the
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Next Generation
            </span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed"
          >
            Transform your ideas into reality with our cutting-edge platform designed for creators, developers, and innovators.
          </motion.p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="grid gap-6 lg:gap-8 grid-cols-1 md:grid-cols-3"
            role="list"
            aria-label="Key platform advantages"
        >
          {topCards.map((card, index) => (
            <motion.div
              key={card.key}
              variants={fadeUp}
              style={index === 0 ? { rotateX, rotateY } : undefined}
              role="listitem"
              className={`${glass} relative min-h-[260px] lg:min-h-[300px] p-8 group hover:ring-white/20 transition-all duration-500 focus-within:ring-white/30 outline-none`}>
              <span className="sr-only">Card: {card.title}</span>
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 70%)' }} />
              {/* Glare */}
              <div className="absolute -top-1/2 -left-1/2 h-[220%] w-[220%] rotate-12 bg-[conic-gradient(from_210deg,rgba(120,119,198,0.15),transparent_35%)] group-hover:opacity-80 transition-opacity duration-500" aria-hidden="true" />
              <div className="relative z-10 flex flex-col h-full">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={animated({ scale: 1 }, { scale: 1 })}
                  transition={{ delay: 0.35 + index * 0.1, duration: 0.5, ease: 'backOut' }}
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} flex items-center justify-center mb-5 shadow-lg shadow-black/30`}
                >
                  {card.icon}
                </motion.div>
                <h3 className="text-xl lg:text-2xl font-semibold mb-2 tracking-tight text-white/95">
                  {card.title}
                </h3>
                {card.subtitle && (
                  <p className="text-sm font-medium text-white/70 mb-1">{card.subtitle}</p>
                )}
                {card.body && (
                  <p className="text-sm text-white/60 leading-relaxed line-clamp-5">
                    {card.body}
                  </p>
                )}
                <div className="mt-auto" />
              </div>
              {card.extraContent}
            </motion.div>
          ))}

          {/* BOTTOM-WIDE CARD - Enhanced Design to Deployment */}
          <motion.div variants={fadeUp} className={`${glass} col-span-1 md:col-span-3 lg:col-span-3 p-8 lg:p-12 group hover:ring-white/20 transition-all duration-500 mt-6 lg:mt-8`}>
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.9, duration: 0.5, ease: "backOut" }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center"
                >
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010 2h1.586l-2.293 2.293a1 1 0 001.414 1.414L15 8.414V10a1 1 0 102 0V6a1 1 0 00-1-1h-4z" clipRule="evenodd" />
                  </svg>
                </motion.div>
                
                <div>
                  <h3 className="text-2xl lg:text-3xl font-bold mb-4 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                    Design → Import → Deploy
                  </h3>
                  <p className="text-white/70 text-lg leading-relaxed max-w-lg">
                    Seamlessly bring your Figma designs to life. Our intelligent platform understands your design language and converts it into production-ready applications for iOS and Android.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {['Figma Integration', 'Auto-Code Generation', 'Cross-Platform'].map((feature, i) => (
                    <motion.span
                      key={feature}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 + i * 0.1, duration: 0.5 }}
                      className="px-3 py-1 text-xs font-medium bg-white/10 rounded-full text-white/80"
                    >
                      {feature}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Enhanced Orbit Animation */}
              <div className="relative h-56 lg:h-64">
                {/* Main orbit path */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                  <defs>
                    <linearGradient id="orbit-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
                      <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M50,160 C120,40 280,40 350,160"
                    stroke="url(#orbit-gradient)"
                    strokeWidth="2"
                    fill="none"
                    className="group-hover:stroke-white/40 transition-all duration-500"
                  />
                </svg>

                {/* Orbiting brand icons */}
                <motion.div
                  className="absolute left-[8%] top-[70%]"
                  animate={{ 
                    x: [0, 20, 0], 
                    y: [0, -20, 0] 
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 4, 
                    ease: "easeInOut" 
                  }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="p-3 rounded-xl bg-white/10 backdrop-blur-sm"
                  >
                    <FigmaLogo className="w-8 h-8 drop-shadow-lg" />
                  </motion.div>
                </motion.div>

                <motion.div
                  className="absolute left-[45%] top-[8%]"
                  animate={{ 
                    y: [0, 10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 3.5, 
                    ease: "easeInOut" 
                  }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-teal-500/20 backdrop-blur-sm text-green-400"
                  >
                    <AndroidLogo className="w-10 h-10" />
                  </motion.div>
                </motion.div>

                <motion.div
                  className="absolute right-[8%] bottom-[10%]"
                  animate={{ 
                    y: [0, -15, 0],
                    x: [0, -10, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 4.2, 
                    ease: "easeInOut" 
                  }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className="p-3 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-400/20 backdrop-blur-sm text-white"
                  >
                    <AppleLogo className="w-10 h-10" />
                  </motion.div>
                </motion.div>

                {/* Floating connection nodes */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400"
                    style={{
                      left: `${20 + i * 15}%`,
                      top: `${80 - i * 15}%`,
                    }}
                    animate={{
                      opacity: [0.3, 1, 0.3],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2 + i * 0.3,
                      ease: "easeInOut",
                    }}
                  />
                ))}

                {/* Data flow lines */}
                <motion.div
                  className="absolute inset-0"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeInOut", delay: 1.5 }}
                >
                  <svg className="w-full h-full" viewBox="0 0 400 200">
                    <motion.path
                      d="M100,140 L200,80 L300,140"
                      stroke="rgba(120,119,198,0.4)"
                      strokeWidth="1"
                      fill="none"
                      strokeDasharray="4 4"
                      animate={{ strokeDashoffset: [0, -8] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Enhanced bottom gradient */}
            <div className="pointer-events-none absolute inset-x-0 -bottom-8 h-16 bg-gradient-to-t from-white/[0.02] to-transparent group-hover:from-white/[0.04] transition-all duration-500" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ChooseUsAnimated;
