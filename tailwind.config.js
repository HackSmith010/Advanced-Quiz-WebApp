// tailwind.config.js
const colors = require("tailwindcss/colors");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        siemens: {
          primary: {
            DEFAULT: "rgb(var(--siemens-primary))",
            dark: "rgb(var(--siemens-primary-dark))",
            light: "rgb(var(--siemens-primary-light))",
            50: "rgb(var(--siemens-primary-50))",
          },
          secondary: {
            DEFAULT: "rgb(var(--siemens-secondary))",
            light: "rgb(var(--siemens-secondary-light))",
          },
          success: "rgb(var(--siemens-success))",
          error: "rgb(var(--siemens-error))",
        },
        background: "rgb(var(--color-background))",
        text: {
          primary: "rgb(var(--color-text-primary))",
          secondary: "rgb(var(--color-text-secondary))",
        },
        border: "rgb(var(--color-border))",
      },
    },
  },
  plugins: [],
};
