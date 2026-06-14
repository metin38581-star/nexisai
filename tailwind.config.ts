import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#ffffff",
        muted: "#71717a",
        border: "rgba(255, 255, 255, 0.05)",
        card: "rgba(24, 24, 27, 0.6)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "terminal-blink": "terminal-blink 1s step-end infinite",
        "fade-in": "fade-in 0.5s ease-out forwards",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "terminal-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "neon-gradient":
          "linear-gradient(135deg, #7c3aed 0%, #3b82f6 50%, #8b5cf6 100%)",
      },
      boxShadow: {
        neon: "0 0 40px rgba(124, 58, 237, 0.3), 0 0 80px rgba(59, 130, 246, 0.15)",
        "neon-hover":
          "0 0 60px rgba(124, 58, 237, 0.5), 0 0 100px rgba(59, 130, 246, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
