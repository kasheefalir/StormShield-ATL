/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        civic: {
          ink: "#102033",
          bay: "#0e7490",
          river: "#0ea5e9",
          leaf: "#16a34a",
          moss: "#4d7c0f",
          sun: "#f59e0b",
          alert: "#ef4444",
        },
      },
      boxShadow: {
        panel: "0 20px 60px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};
