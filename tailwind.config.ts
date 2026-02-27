import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Agency Gold — Paleta principal
        gold: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#F5CC50',
          400: '#D4AF37', // ← Accent principal (ouro clássico)
          500: '#B8860B',
          600: '#A8861A',
          700: '#92400E',
          800: '#78350F',
          900: '#5C2D0A',
        },
        // Agency Bronze — Secundário
        bronze: {
          300: '#DBA05A',
          400: '#CD7F32', // ← Accent secundário (bronze)
          500: '#B87333',
          600: '#A0522D',
          700: '#8B4513',
        },
        // Dark Surfaces — Sistema de elevação
        surface: {
          base: '#0A0A0A', // Fundo base (mais escuro)
          '1':  '#111111', // Sidebar, nav
          '2':  '#1A1A1A', // Cards, panels
          '3':  '#222222', // Hover, inputs
          '4':  '#2A2A2A', // Borders, dividers
        },
        // Bordas
        border: {
          DEFAULT: '#222222',   // habilita border-border (shadcn compat)
          subtle:  '#2A2A2A',
          muted:   '#333333',
          gold:    '#D4AF3740',
        },
        // Texto
        text: {
          primary:  '#F5F5F5',
          secondary:'#A1A1A1',
          muted:    '#525252',
          disabled: '#3A3A3A',
        },
        // Status
        status: {
          success: '#22C55E',
          warning: '#F59E0B',
          danger:  '#EF4444',
          info:    '#3B82F6',
        },
        // shadcn/ui compatibility
        background: '#0A0A0A',
        foreground: '#F5F5F5',
        card: {
          DEFAULT:    '#1A1A1A',
          foreground: '#F5F5F5',
        },
        popover: {
          DEFAULT:    '#111111',
          foreground: '#F5F5F5',
        },
        primary: {
          DEFAULT:    '#D4AF37',
          foreground: '#0A0A0A',
        },
        secondary: {
          DEFAULT:    '#CD7F32',
          foreground: '#0A0A0A',
        },
        muted: {
          DEFAULT:    '#222222',
          foreground: '#A1A1A1',
        },
        accent: {
          DEFAULT:    '#D4AF37',
          foreground: '#0A0A0A',
        },
        destructive: {
          DEFAULT:    '#EF4444',
          foreground: '#F5F5F5',
        },
        input: '#222222',
        ring:  '#D4AF37',
      },
      backgroundImage: {
        // Gradientes institucionais
        'gold-bronze':         'linear-gradient(135deg, #D4AF37, #CD7F32)',
        'gradient-gold-bronze':'linear-gradient(135deg, #D4AF37, #CD7F32)', // alias para compat
        'gold-shine':          'linear-gradient(135deg, #F5CC50, #D4AF37, #CD7F32)',
        'gold-dark':           'linear-gradient(135deg, #D4AF37, #B8860B)',
        'gold-radial':         'radial-gradient(circle, #D4AF37, #CD7F32)',
        // Gradientes de superfície
        'surface-gradient':    'linear-gradient(180deg, #111111 0%, #0A0A0A 100%)',
      },
      boxShadow: {
        'gold-sm':  '0 0 8px rgba(212, 175, 55, 0.15)',
        'gold-md':  '0 0 16px rgba(212, 175, 55, 0.20)',
        'gold-lg':  '0 0 32px rgba(212, 175, 55, 0.25)',
        'surface':  '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card':     '0 2px 8px rgba(0, 0, 0, 0.3)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0'  },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 175, 55, 0.4)' },
          '50%':       { boxShadow: '0 0 0 6px rgba(212, 175, 55, 0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)'    },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)'   },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)'    },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)'   },
          '50%':       { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'shimmer':         'shimmer 2s infinite linear',
        'pulse-gold':      'pulse-gold 2s infinite',
        'slide-in-right':  'slide-in-right 0.3s ease-out',
        'fade-in':         'fade-in 0.25s ease-out',
        'slide-up':        'slide-up 0.25s ease-out',
        'scale-in':        'scale-in 0.15s ease-out',
        'float':           'float 3s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
