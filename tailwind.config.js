/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        blueprint: {
          DEFAULT: '#1B2A41',
          light: '#28405F',
          dark: '#101B2B',
        },
        concrete: '#EDEAE3',
        chalk: '#FCFBF9',
        amber: {
          DEFAULT: '#E8A33D',
          dark: '#C7822A',
        },
        rust: {
          DEFAULT: '#B14A2C',
          light: '#F3E1D9',
        },
        ink: '#22262B',
        slate: '#5B6472',
        line: '#DCD7CC',
        moss: {
          DEFAULT: '#4E7A5C',
          light: '#E3ECE4',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backgroundImage: {
        'blueprint-grid':
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: '24px 24px',
      },
    },
  },
  plugins: [],
}
