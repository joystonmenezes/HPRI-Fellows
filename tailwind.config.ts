import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // USC official palette
        cardinal: { DEFAULT: "#990000", dark: "#7a0000", light: "#b51f1f" },
        gold: { DEFAULT: "#ffcc00", dark: "#f5b800", light: "#ffe17a" },
      },
      fontFamily: {
        serif: ["Georgia", "'Times New Roman'", "serif"],
        sans: [
          "system-ui",
          "-apple-system",
          "'Segoe UI'",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};

export default config;
