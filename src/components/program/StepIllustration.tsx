'use client';

import { cn } from '@/lib/utils';
import React from 'react';

interface StepIllustrationProps {
    step: number;
    done: boolean;
    active: boolean;
    className?: string;
}

export function StepIllustration({ step, done, active, className }: StepIllustrationProps) {
    const cssStyle = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
    const base = done
        ? (cssStyle?.getPropertyValue("--accent").trim() || "#f97316")
        : active ? "#C4883D" : "#CCCCCC";
    const bg = done
        ? (cssStyle?.getPropertyValue("--accent-light").trim() || "#ffedd5")
        : active ? "#FFF8F0" : "#F5F5F5";
    const accent = done
        ? (cssStyle?.getPropertyValue("--accent-400").trim() || "#fb923c")
        : active ? "#FDCB6E" : "#DDD";

    // Step 1: Configure program — document with animated lines
    if (step === 1) return (
        <svg width="100%" height="100%" viewBox="0 0 80 80" fill="none" className={cn("overflow-visible", className)}>
            <style>{`
        .s1-doc { transform-origin: 40px 40px; }
        .s1-doc-anim { animation: s1-float 3s ease-in-out infinite; }
        .s1-check { transform-origin: 55px 48px; opacity: 0; animation: s1-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: 0.2s; }
        .s1-line { stroke-dasharray: 20; stroke-dashoffset: 20; }
        .s1-line-anim { animation: s1-draw 1.5s ease-out forwards; }
        .s1-line-2 { animation-delay: 0.3s; }
        .s1-line-3 { animation-delay: 0.6s; }
        @keyframes s1-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(1.5deg); }
        }
        @keyframes s1-pop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes s1-draw { to { stroke-dashoffset: 0; } }
      `}</style>
            <circle cx="40" cy="40" r="36" fill={bg} />
            <g className={cn("s1-doc", active && !done && "s1-doc-anim")}>
                <rect x="28" y="22" width="24" height="32" rx="3" fill="#fff" stroke={base} strokeWidth="2" />
                <path d="M33 32h14" stroke={accent} strokeWidth="2" strokeLinecap="round" className={cn("s1-line", (active || done) && "s1-line-anim")} />
                <path d="M33 38h10" stroke={accent} strokeWidth="2" strokeLinecap="round" className={cn("s1-line s1-line-2", (active || done) && "s1-line-anim")} />
                <path d="M33 44h12" stroke={accent} strokeWidth="2" strokeLinecap="round" className={cn("s1-line s1-line-3", (active || done) && "s1-line-anim")} />
                {done && (
                    <g className="s1-check">
                        <circle cx="55" cy="48" r="10" fill={base} />
                        <path d="M51 48l2.5 2.5L59 45" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                )}
                {active && !done && (
                    <g className="s1-check">
                        <circle cx="55" cy="48" r="10" fill={base} />
                        <path d="M52 48a3 3 0 1 0 6 0 3 3 0 1 0 -6 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M55 43v2M55 51v2M50 48h2M58 48h2M51.5 44.5l1.5 1.5M57 50l1.5 1.5M51.5 51.5l1.5-1.5M57 46l1.5-1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                )}
            </g>
        </svg>
    );

    // Step 2: Add card information — card back with info lines and info badge
    if (step === 2) return (
        <svg width="100%" height="100%" viewBox="0 0 80 80" fill="none" className={cn("overflow-visible", className)}>
            <style>{`
        .s2b-card { transform-origin: 40px 42px; }
        .s2b-float { animation: s2b-float 3s ease-in-out infinite; }
        .s2b-line { stroke-dasharray: 18; stroke-dashoffset: 18; }
        .s2b-line-anim { animation: s2b-draw 1.2s ease-out forwards; }
        .s2b-line-2-d { animation-delay: 0.25s; }
        .s2b-line-3-d { animation-delay: 0.5s; }
        .s2b-badge { transform-origin: 54px 28px; opacity: 0; animation: s2b-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: 0.3s; }
        @keyframes s2b-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes s2b-draw { to { stroke-dashoffset: 0; } }
        @keyframes s2b-pop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
            <circle cx="40" cy="40" r="36" fill={bg} />
            <g className={cn("s2b-card", active && !done && "s2b-float")}>
                {/* Card body */}
                <rect x="22" y="24" width="36" height="28" rx="4" fill="#fff" stroke={base} strokeWidth="2" />
                {/* Card back top stripe */}
                <rect x="22" y="24" width="36" height="7" rx="4" fill={base} opacity="0.12" />
                {/* Row 1: dot + line */}
                <circle cx="29" cy="38" r="2" fill={accent} opacity={(active || done) ? 1 : 0.3} />
                <path d="M33.5 38h14" stroke={accent} strokeWidth="1.5" strokeLinecap="round" className={cn("s2b-line", (active || done) && "s2b-line-anim")} />
                {/* Row 2: dot + line */}
                <circle cx="29" cy="44" r="2" fill={accent} opacity={(active || done) ? 1 : 0.3} />
                <path d="M33.5 44h10" stroke={accent} strokeWidth="1.5" strokeLinecap="round" className={cn("s2b-line s2b-line-2-d", (active || done) && "s2b-line-anim")} />
                {/* Row 3: dot + line */}
                <circle cx="29" cy="50" r="2" fill={accent} opacity={(active || done) ? 1 : 0.3} />
                <path d="M33.5 50h12" stroke={accent} strokeWidth="1.5" strokeLinecap="round" className={cn("s2b-line s2b-line-3-d", (active || done) && "s2b-line-anim")} />
            </g>
            {done ? (
                <g className="s2b-badge">
                    <circle cx="54" cy="28" r="10" fill={base} />
                    <path d="M50 28l2.5 2.5L58 25" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            ) : active ? (
                <g className="s2b-badge">
                    <circle cx="54" cy="28" r="10" fill={base} />
                    <circle cx="54" cy="24.5" r="1.2" fill="#fff" />
                    <path d="M54 27v5" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                </g>
            ) : null}
        </svg>
    );

    // Step 3: Design your card — card with paintbrush animation
    if (step === 3) return (
        <svg width="100%" height="100%" viewBox="0 0 80 80" fill="none" className={cn("overflow-visible", className)}>
            <style>{`
        .s3-wand { transform-origin: 54px 30px; animation: s3-paint 2s infinite alternate ease-in-out; }
        .s3-stamp { opacity: 0; animation: s3-pop 1.5s infinite alternate ease-in-out; }
        .s3-stamp-2 { animation-delay: 0.5s; }
        .s3-stamp-3 { animation-delay: 1s; }
        @keyframes s3-paint {
          0% { transform: translate(0px, 0px) rotate(0deg); }
          100% { transform: translate(-5px, 3px) rotate(-12deg); }
        }
        @keyframes s3-pop {
          0%, 60% { transform: scale(0.8); opacity: 0; }
          80%, 100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
            <circle cx="40" cy="40" r="36" fill={bg} />
            <rect x="22" y="24" width="30" height="20" rx="4" fill="#fff" stroke={base} strokeWidth="2" />
            <rect x="22" y="24" width="30" height="8" rx="4" fill={base} opacity="0.15" />
            <circle cx="30" cy="28" r="3" fill={base} />
            <path d="M36 28h10" stroke={base} strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            <circle cx="29" cy="38" r="1.5" fill={accent} className={cn(active && !done && "s3-stamp")} />
            <circle cx="34" cy="38" r="1.5" fill={accent} className={cn(active && !done && "s3-stamp s3-stamp-2")} />
            <circle cx="39" cy="38" r="1.5" fill={accent} className={cn(active && !done && "s3-stamp s3-stamp-3")} />
            <circle cx="44" cy="38" r="1.5" fill="#EEEDEA" stroke="#DDD" strokeWidth="0.5" />
            {done ? (
                <g style={{ transformOrigin: '54px 30px', opacity: 0, animation: 's1-pop 0.5s forwards' }}>
                    <circle cx="56" cy="36" r="10" fill={base} />
                    <path d="M52 36l2.5 2.5L60 33" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            ) : active ? (
                <g className="s3-wand">
                    <path d="M54 30l6 6-16 16H38v-6L54 30z" fill={accent} stroke={base} strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M51 33l6 6" stroke={base} strokeWidth="1.5" strokeLinecap="round" />
                </g>
            ) : (
                <g>
                    <path d="M54 30l6 6-16 16H38v-6L54 30z" fill={accent} stroke={base} strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M51 33l6 6" stroke={base} strokeWidth="1.5" strokeLinecap="round" />
                </g>
            )}
        </svg>
    );

    // Step 4: Go live — card with radiating waves
    if (step === 4) return (
        <svg width="100%" height="100%" viewBox="0 0 80 80" fill="none" className={cn("overflow-visible", className)}>
            <style>{`
        .s4-card { transform-origin: 40px 40px; }
        .s4-float { animation: s4-float 3s infinite ease-in-out; }
        .s4-wave { transform-origin: 40px 40px; animation: s4-radiate 2.5s infinite ease-out; opacity: 0; }
        .s4-wave-2 { animation-delay: 0.8s; }
        .s4-wave-3 { animation-delay: 1.6s; }
        @keyframes s4-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        @keyframes s4-radiate {
          0% { transform: scale(0.8); opacity: 0.8; stroke-width: 3px; }
          100% { transform: scale(2); opacity: 0; stroke-width: 1px; }
        }
      `}</style>
            <circle cx="40" cy="40" r="36" fill={bg} />
            {active && !done && (
                <g>
                    <circle cx="40" cy="40" r="16" stroke={accent} fill="none" className="s4-wave" />
                    <circle cx="40" cy="40" r="16" stroke={accent} fill="none" className="s4-wave s4-wave-2" />
                    <circle cx="40" cy="40" r="16" stroke={accent} fill="none" className="s4-wave s4-wave-3" />
                </g>
            )}
            <g className={cn("s4-card", active && !done && "s4-float")}>
                <rect x="24" y="28" width="32" height="24" rx="4" fill="#fff" stroke={base} strokeWidth="2" />
                <rect x="24" y="28" width="32" height="8" rx="4" fill={base} opacity="0.15" />
                <circle cx="30" cy="32" r="2" fill={base} />
                <path d="M48 38a4 4 0 01-8 0 4 4 0 018 0" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4" />
                <circle cx="44" cy="38" r="2" fill={base} />
            </g>
            {done && (
                <g style={{ transformOrigin: '55px 45px', opacity: 0, animation: 's1-pop 0.5s forwards' }}>
                    <circle cx="55" cy="45" r="10" fill={base} />
                    <path d="M51 45l2.5 2.5L59 42" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            )}
        </svg>
    );

    // Step 5: Get your first customer — phone with wave animations
    return (
        <svg width="100%" height="100%" viewBox="0 0 80 80" fill="none" className={cn("overflow-visible", className)}>
            <style>{`
        .s5-phone { transform-origin: 40px 40px; }
        .s5-float { animation: s5-float 3s infinite ease-in-out; }
        .s5-check { stroke-dasharray: 12; stroke-dashoffset: 12; animation: s1-draw 1.5s ease-out forwards; animation-delay: 0.5s; }
        .s5-wave { animation: s5-wave 1.5s infinite linear; opacity: 0; }
        .s5-wave-2 { animation-delay: 0.5s; }
        @keyframes s5-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes s5-wave {
          0% { transform: translateX(-4px); opacity: 0; }
          30% { opacity: 0.8; }
          70% { opacity: 0.8; }
          100% { transform: translateX(6px); opacity: 0; }
        }
      `}</style>
            <circle cx="40" cy="40" r="36" fill={bg} />
            <circle cx="22" cy="36" r="6" fill={accent} opacity="0.3" />
            <circle cx="22" cy="36" r="3" fill={base} opacity="0.2" />
            {active && !done && (
                <g>
                    <path d="M56 28c0-2 3-5 5-3s-2 5-5 7" stroke={accent} strokeWidth="1.5" strokeLinecap="round" fill="none" className="s5-wave" />
                    <path d="M60 32c0-2 3-5 5-3s-2 5-5 7" stroke={accent} strokeWidth="1.5" strokeLinecap="round" fill="none" className="s5-wave s5-wave-2" />
                </g>
            )}
            <g className={cn("s5-phone", active && !done && "s5-float")}>
                <rect x="32" y="20" width="16" height="28" rx="3" fill="#fff" stroke={base} strokeWidth="2" />
                <rect x="35" y="23" width="10" height="18" rx="1" fill={bg} />
                <circle cx="40" cy="44" r="1.5" fill={base} opacity="0.5" />
                {done ? (
                    <g>
                        <circle cx="40" cy="32" r="5" fill={accent} opacity="0.9" />
                        <path d="M38 32l1.5 1.5L42 30" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                ) : active ? (
                    <g>
                        <circle cx="40" cy="32" r="5" fill={accent} opacity="0.9" />
                        <path d="M38 32l1.5 1.5L42 30" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="s5-check" />
                    </g>
                ) : (
                    <g>
                        <circle cx="40" cy="32" r="4" fill={accent} opacity="0.4" />
                    </g>
                )}
            </g>
            {done && (
                <g style={{ transformOrigin: '55px 48px', opacity: 0, animation: 's1-pop 0.5s forwards' }}>
                    <circle cx="55" cy="48" r="10" fill={base} />
                    <path d="M51 48l2.5 2.5L59 45" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </g>
            )}
        </svg>
    );
}
