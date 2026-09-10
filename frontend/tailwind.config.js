/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ---- Primary (Blue) — headings, nav, links, primary buttons ----
        primary: {
          DEFAULT: "#185FA5",
          light: "#378ADD",
          dark: "#0C447C",
        },
        // ---- Secondary (Teal) — progress bars, growth/skill indicators ----
        secondary: {
          DEFAULT: "#0F6E56",
          light: "#1D9E75",
          dark: "#085041",
        },
        // ---- Accent (Coral) — main CTA buttons only ----
        accent: {
          DEFAULT: "#D85A30",
          light: "#F0997B",
          dark: "#993C1D",
        },
        // ---- Semantic colors ----
        success: {
          DEFAULT: "#639922",
          light: "#97C459",
          dark: "#3B6D11",
        },
        warning: {
          DEFAULT: "#EF9F27",
          light: "#FAC775",
          dark: "#854F0B",
        },
        danger: {
          DEFAULT: "#E24B4A",
          light: "#F09595",
          dark: "#A32D2D",
        },
        // ---- Neutrals ----
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F1EFE8",
        },
        border: {
          DEFAULT: "#E5E4DF",
        },
        text: {
          primary: "#2C2C2A",
          secondary: "#5F5E5A",
          muted: "#888780",
        },
      },
      borderRadius: {
        card: "12px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        blob: "blob 7s infinite",
        "gradient-x": "gradient-x 15s ease infinite",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center"
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center"
          },
        },
      },
    },
  },
  plugins: [],
};
