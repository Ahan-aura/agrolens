/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canopy: { DEFAULT: "#16302A", light: "#274B3F", dark: "#0D1F1A" },
        leaf: { DEFAULT: "#4E8C5A", soft: "#DCEBDD", dim: "#8FB89A" },
        soil: "#6B4F3B",
        amber: { DEFAULT: "#C97A2B", soft: "#F3E1C8" },
        parchment: "#F4F1E8",
        agrio: {
          DEFAULT: "#58B95F",
          light: "#74C776",
          dark: "#2A7232",
          soft: "#E8F5E9",
          mint: "#C8E6C9",
          bg: "#F7FAF7"
        }
      },
      fontFamily: {
        display: ["'Source Serif 4'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(22,48,42,0.06), 0 8px 24px rgba(22,48,42,0.06)",
      },
    },
  },
  plugins: [],
};
