import React from "react";

export default function AgroLensLogo({ size = "md", dark = false, showTagline = true, fullBadge = false }) {
  const isLarge = size === "lg";
  const isSmall = size === "sm";

  // If full badge requested, display the full official square logo
  if (fullBadge) {
    return (
      <div className="flex flex-col items-center select-none group">
        <img
          src="/agrolens_logo.jpeg"
          alt="AgroLens Official Logo"
          className={`${
            isLarge ? "h-24 sm:h-28" : isSmall ? "h-12" : "h-16"
          } w-auto object-contain rounded-2xl filter drop-shadow-[0_0_20px_rgba(82,183,136,0.3)] group-hover:scale-105 transition-transform duration-300`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 select-none group">
      {/* Official Glowing Leaf Aperture Camera Emblem from uploaded logo */}
      <div className="relative flex items-center justify-center shrink-0">
        <img
          src="/agrolens_emblem.png"
          alt="AgroLens Emblem"
          className={`${
            isLarge ? "w-12 h-12" : isSmall ? "w-7 h-7" : "w-10 h-10"
          } object-contain filter drop-shadow-[0_0_12px_rgba(82,183,136,0.35)] group-hover:scale-105 transition-transform duration-300`}
        />
      </div>

      {/* Official Brand Typography matching logo: AgroLens - SEE. DETECT. PROTECT. */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline">
          <span
            className={`font-sans font-black tracking-tight ${
              isLarge ? "text-2xl sm:text-3xl" : isSmall ? "text-base" : "text-xl sm:text-2xl"
            } text-[#2D6A4F] dark:text-[#52B788]`}
          >
            Agro
          </span>
          <span
            className={`font-sans font-extrabold tracking-tight ${
              isLarge ? "text-2xl sm:text-3xl" : isSmall ? "text-base" : "text-xl sm:text-2xl"
            } ${dark ? "text-white" : "text-gray-900"}`}
          >
            Lens
          </span>
        </div>

        {showTagline && (
          <span
            className={`font-mono uppercase font-bold tracking-[0.22em] text-[#52B788] ${
              isLarge ? "text-[10px]" : isSmall ? "text-[7px]" : "text-[8px]"
            } mt-0.5`}
          >
            SEE. DETECT. PROTECT.
          </span>
        )}
      </div>
    </div>
  );
}
