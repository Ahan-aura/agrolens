import React from "react";
import { Leaf } from "lucide-react";

export default function AgrioLogo({ size = "md", dark = false }) {
  const isLarge = size === "lg";
  const isSmall = size === "sm";

  return (
    <div className="flex items-center gap-1.5 font-bold tracking-tight select-none">
      <span
        className={`font-sans tracking-tighter ${
          isLarge
            ? "text-3xl text-gray-900"
            : isSmall
            ? "text-lg text-gray-800"
            : "text-2xl text-gray-900"
        } ${dark ? "text-white" : ""}`}
      >
        agrio
      </span>
      <div className="relative flex items-center justify-center">
        <div
          className={`${
            isLarge ? "w-6 h-6" : isSmall ? "w-4 h-4" : "w-5 h-5"
          } bg-gradient-to-tr from-agrio-dark to-agrio rounded-full flex items-center justify-center shadow-xs transform rotate-12`}
        >
          <Leaf
            size={isLarge ? 14 : isSmall ? 10 : 12}
            className="text-white fill-white/80"
            strokeWidth={2.5}
          />
        </div>
      </div>
      <span className={`text-agrio text-xl font-black ${isLarge ? "text-2xl" : ""}`}>.</span>
    </div>
  );
}
