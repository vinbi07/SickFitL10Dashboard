import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "#e72027",
        app: {
          base: "#0a0a0a",
          panel: "#131313",
          border: "#262626",
          muted: "#a3a3a3",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
        heading: ["Gilroy-Bold", "var(--font-poppins)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
