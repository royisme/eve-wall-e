/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      boxShadow: {
        glow: "0 0 30px rgba(14, 165, 233, 0.25)",
      },
    },
  },
  plugins: [],
};
