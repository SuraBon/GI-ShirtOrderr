/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)"
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)"
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          50: "#fef9f5",
          100: "#fde9d9",
          200: "#fad4b3",
          300: "#f5b48d",
          400: "#ee8e61",
          500: "#e86d3f",
          600: "#da5a2a",
          700: "#c04620",
          800: "#a2381b",
          900: "#7a2816"
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)"
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)"
        },
        // Professional Corporate Palette
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          50: "#f5f7fa",
          100: "#eaeff5",
          200: "#d5dfeb",
          300: "#b5c5dd",
          400: "#8fa5c9",
          500: "#6d88bb",
          600: "#4f68a8",
          700: "#3d5399",
          800: "#2f407a",
          900: "#1a2847"
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)"
        },
        neutral: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827"
        },
        success: "#10b981",
        warning: "#f59e0b",
        error: "#ef4444",
        info: "#3b82f6"
      },
      fontFamily: {
        sans: ['"Noto Sans Thai"', '"Segoe UI"', '"Leelawadee UI"', "system-ui", "sans-serif"],
        display: ['"Noto Sans Thai"', '"Segoe UI"', "system-ui", "sans-serif"]
      },
      fontSize: {
        xs: ["12px", { lineHeight: "1.5" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["14px", { lineHeight: "1.6" }],
        lg: ["16px", { lineHeight: "1.6" }],
        xl: ["18px", { lineHeight: "1.5" }],
        "2xl": ["20px", { lineHeight: "1.5" }],
        "3xl": ["24px", { lineHeight: "1.3" }],
        "4xl": ["32px", { lineHeight: "1.2" }]
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px"
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px"
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.08)",
        md: "0 4px 8px 0 rgba(0, 0, 0, 0.1)",
        lg: "0 8px 16px 0 rgba(0, 0, 0, 0.12)",
        xl: "0 12px 24px 0 rgba(0, 0, 0, 0.15)",
        "2xl": "0 16px 32px 0 rgba(0, 0, 0, 0.2)",
        elevation: "0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 4px 16px 0 rgba(0, 0, 0, 0.08)",
        "elevation-lg": "0 4px 16px 0 rgba(0, 0, 0, 0.12), 0 8px 24px 0 rgba(0, 0, 0, 0.12)",
        inset: "inset 0 1px 3px 0 rgba(0, 0, 0, 0.05)"
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" }
        },
        "slide-in-from-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-in-from-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" }
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" }
        }
      },
      animation: {
        "fade-in": "fade-in 300ms ease-out",
        "fade-in-up": "fade-in-up 300ms ease-out",
        "fade-in-down": "fade-in-down 300ms ease-out",
        "scale-in": "scale-in 300ms ease-out",
        "pulse-subtle": "pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in-left": "slide-in-from-left 300ms ease-out",
        "slide-in-right": "slide-in-from-right 300ms ease-out",
        shimmer: "shimmer 2s infinite",
        "bounce-subtle": "bounce-subtle 1s infinite"
      },
      transitionDuration: {
        DEFAULT: "300ms"
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)"
      }
    }
  },
  plugins: []
};
