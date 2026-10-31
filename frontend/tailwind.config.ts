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
        ink: "#1A2433",
        brand: {
          50:  "#fdf4e7",
          100: "#fae3be",
          500: "#e8962a",
          600: "#d07d18",
          700: "#a86010",
        },
      },
      fontFamily: {
        // Mukta covers Devanagari and Latin in one family, so Marathi and English match.
        sans: ["Mukta", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};

export default config;
