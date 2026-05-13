/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Markeiro brand
        brand: {
          DEFAULT: "#4B6040",   // verde musgo principal
          light:   "#6B8560",
          dark:    "#2F3D28",
        },
        copper: {
          DEFAULT: "#B87333",   // cobre/destaque
          light:   "#D4935A",
          dark:    "#8F5A25",
        },
        cream: {
          DEFAULT: "#F2E8D5",   // bege principal
          light:   "#F8F2E6",
          medium:  "#E0D4BC",
        },
        charcoal: {
          DEFAULT: "#1A1A1A",
          soft:    "#2C2C2C",
          mid:     "#4A4A4A",
        },
        muted: {
          DEFAULT: "#7A6A58",
        },
        // shadcn/ui semantic tokens
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:            "hsl(var(--sidebar-background))",
          foreground:         "hsl(var(--sidebar-foreground))",
          border:             "hsl(var(--sidebar-border))",
          accent:             "hsl(var(--sidebar-accent))",
          "accent-foreground":"hsl(var(--sidebar-accent-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        sans:    ["DM Sans", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-brand":   "linear-gradient(135deg, #4B6040 0%, #6B8560 100%)",
        "gradient-surface": "linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
        "gradient-copper":  "linear-gradient(135deg, #B87333 0%, #D4935A 100%)",
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
