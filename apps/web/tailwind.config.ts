import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#FFFFFF',
          app: '#FFFFFF',
          surface_card: '#FFFFFF',
          surface_subtle: '#F8FAFC',
          surface_hover: '#F1F5F9',
        },
        border: {
          DEFAULT: '#E2E8F0',
          default: '#E2E8F0',
          focused: '#4F46E5',
        },
        brand: {
          DEFAULT: '#4F46E5',
          primary: '#4F46E5',
          primary_hover: '#4338CA',
          primary_subtle_bg: '#EEF2FF',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        typography: {
          heading: '#0F172A',
          body: '#334155',
          muted: '#64748B',
        },
        status: {
          active: {
            text: '#059669',
            bg: '#ECFDF5',
            border: '#A7F3D0',
          },
          paused: {
            text: '#D97706',
            bg: '#FEF3C7',
            border: '#FDE68A',
          },
          overdue: {
            text: '#DC2626',
            bg: '#FEE2E2',
            border: '#FECACA',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.07)',
        dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
