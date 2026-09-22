/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background & Surfaces
        background: "#FFFFFF",
        surface: {
          DEFAULT: "#F1EFE8",
          card: "#F1EFE8",
          muted: "#F7F6F2",
          white: "#FFFFFF",
        },
        // Borders & Dividers
        border: {
          DEFAULT: "#E5E4DF",
          muted: "#EAE9E4",
        },
        // Text Hierarchy
        "text-primary": "#185FA5",
        "text-body": "#5F5E5A",
        "text-secondary": "#5F5E5A",
        "text-muted": "#8A8984",
        "text-dark": "#1A1A18",
        text: {
          primary: "#185FA5",
          body: "#5F5E5A",
          secondary: "#5F5E5A",
          muted: "#8A8984",
          dark: "#1A1A18",
        },
        // Primary Identity (Blue) — headings, nav, links, primary text
        primary: {
          DEFAULT: "#185FA5",
          light: "#2575C0",
          dark: "#124B84",
          subtle: "#EBF3FA",
        },
        // Secondary (Teal) — progress bars & growth indicators ONLY
        secondary: {
          DEFAULT: "#0F6E56",
          light: "#148B6D",
          dark: "#0A4E3D",
          subtle: "#E6F4F0",
        },
        // Accent (Coral) — exactly ONE main CTA per screen
        accent: {
          DEFAULT: "#D85A30",
          light: "#E26E47",
          dark: "#BD4B24",
          subtle: "#FCEFEA",
        },
        // Semantic: Success (Green) — good scores, completed tasks
        success: {
          DEFAULT: "#639922",
          light: "#79B92B",
          dark: "#4E7B1A",
          subtle: "#EFF7E6",
        },
        // Semantic: Warning (Amber) — skill gaps, warnings
        warning: {
          DEFAULT: "#EF9F27",
          light: "#F3AF47",
          dark: "#D48714",
          subtle: "#FDF5E8",
        },
        // Semantic: Danger (Red) — errors only
        danger: {
          DEFAULT: "#E24B4A",
          light: "#EA6867",
          dark: "#C53635",
          subtle: "#FCEEEF",
        },
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        "xs": "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
      },
      backdropBlur: {
        "xs": "2px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
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
