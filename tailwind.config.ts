import type { Config } from "tailwindcss";

const config: Config = {
  // shutaMzala is a dark-only product surface: the design system specifies a
  // slate/indigo canvas with glassmorphic panels, so there is no light theme
  // to configure and no `dark:` variants should be introduced.
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The page canvas from the design system (#090D16). Panels then sit
        // on it as bg-slate-900/60 glass, per the surface spec.
        canvas: "#090D16",
      },
      fontFamily: {
        // Single family on purpose: the system calls for a clean sans
        // everywhere, including headings. --font-display is aliased to Inter
        // in globals.css so legacy `font-display` markup renders identically.
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 12px 40px -12px rgba(99, 102, 241, 0.55)",
        "glow-lg": "0 28px 80px -24px rgba(124, 58, 237, 0.65)",
        card: "0 1px 2px rgba(2, 6, 23, 0.4), 0 16px 40px -24px rgba(2, 6, 23, 0.8)",
        "card-lg": "0 1px 2px rgba(2, 6, 23, 0.4), 0 32px 64px -32px rgba(2, 6, 23, 0.9)",
        device: "0 40px 80px -32px rgba(2, 6, 23, 0.9), 0 8px 24px -12px rgba(2, 6, 23, 0.6)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        float: "float 7s ease-in-out infinite",
        "float-slow": "float 11s ease-in-out infinite",
        scan: "scan 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "pulse-ring": "pulseRing 2s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        "pop-in": "popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "gradient-pan": "gradientPan 6s ease infinite",
        "slide-in-right": "slideInRight 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        scan: {
          "0%": { top: "6%", opacity: "0" },
          "12%": { opacity: "1" },
          "88%": { opacity: "1" },
          "100%": { top: "94%", opacity: "0" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.75)", opacity: "0.7" },
          "70%": { transform: "scale(2.4)", opacity: "0" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.72) translateY(10px)" },
          "60%": { opacity: "1", transform: "scale(1.04) translateY(0)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        gradientPan: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(18px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateX(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
