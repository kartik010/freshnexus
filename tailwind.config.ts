import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        moss: "#2f6f4e",
        lime: "#b5e48c",
        cream: "#fbf8f2",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto"],
        serif: ["ui-serif", "Georgia", "Cambria"],
      },
    },
  },
  plugins: [],
};

export default config;
