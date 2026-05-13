/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        espresso: "#1A1209",
        walnut: "#2C1F0E",
        mahogany: "#3D2B14",
        gold: "#C9A84C",
        ivory: "#E8DDD0",
        linen: "#A0917E",
        warm: "#F5F0E8"
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"]
      },
      boxShadow: {
        gold: "0 18px 60px rgba(201,168,76,.18)",
        insetGold: "inset 0 0 0 1px rgba(201,168,76,.35)"
      },
      keyframes: {
        stitch: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "42px 0" }
        },
        sheetUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" }
        }
      },
      animation: {
        stitch: "stitch .7s linear infinite",
        sheetUp: "sheetUp .32s cubic-bezier(.2,.8,.2,1)"
      }
    }
  },
  plugins: []
};
