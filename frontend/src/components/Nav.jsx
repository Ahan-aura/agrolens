import React from "react";
import { Link } from "react-router-dom";
import { Camera, Sparkles, BookOpen, Cpu, RotateCcw } from "lucide-react";
import AgroLensLogo from "./AgroLensLogo.jsx";

export default function Nav({ onReplayVideo = null, onScrollToSection = null }) {
  return (
    <nav className="sticky top-0 z-40 w-full bg-[#0A1612]/90 backdrop-blur-md border-b border-[#1F4A39]/70 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-all">
      {/* Brand Logo */}
      <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
        <AgroLensLogo size="md" dark={true} showTagline={true} />
      </Link>

      {/* Nav Links (Desktop) */}
      <div className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-gray-300">
        <a
          href="#scanner"
          onClick={(e) => {
            if (onScrollToSection) {
              e.preventDefault();
              onScrollToSection("scanner");
            }
          }}
          className="hover:text-[#52B788] transition-colors flex items-center gap-1.5"
        >
          <Camera size={14} className="text-[#52B788]" />
          <span>Scanner</span>
        </a>

        <a
          href="#library"
          onClick={(e) => {
            if (onScrollToSection) {
              e.preventDefault();
              onScrollToSection("library");
            }
          }}
          className="hover:text-[#52B788] transition-colors flex items-center gap-1.5"
        >
          <BookOpen size={14} className="text-[#52B788]" />
          <span>Disease Library</span>
        </a>

        <a
          href="#how-it-works"
          onClick={(e) => {
            if (onScrollToSection) {
              e.preventDefault();
              onScrollToSection("how-it-works");
            }
          }}
          className="hover:text-[#52B788] transition-colors flex items-center gap-1.5"
        >
          <Sparkles size={14} className="text-[#52B788]" />
          <span>How It Works</span>
        </a>

        <a
          href="#rl-engine"
          onClick={(e) => {
            if (onScrollToSection) {
              e.preventDefault();
              onScrollToSection("rl-engine");
            }
          }}
          className="hover:text-[#52B788] transition-colors flex items-center gap-1.5"
        >
          <Cpu size={14} className="text-[#52B788]" />
          <span>RL Engine</span>
        </a>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {onReplayVideo && (
          <button
            type="button"
            onClick={onReplayVideo}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-[#11241E] border border-[#234B3D] px-3 py-1.5 rounded-full transition-all hover:border-[#52B788]"
            title="Replay Cinematic Intro Video"
          >
            <RotateCcw size={13} className="text-[#52B788]" />
            <span className="hidden sm:inline">Intro Video</span>
          </button>
        )}

        <a
          href="#scanner"
          onClick={(e) => {
            if (onScrollToSection) {
              e.preventDefault();
              onScrollToSection("scanner");
            }
          }}
          className="flex items-center gap-1.5 bg-[#52B788] hover:bg-[#40916C] text-[#0A1612] hover:text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-[#52B788]/20 transition-all active:scale-95 cursor-pointer"
        >
          <Camera size={14} />
          <span>Scan Leaf</span>
        </a>
      </div>
    </nav>
  );
}
