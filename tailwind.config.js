export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Noto Sans Bengali"', 'system-ui', 'Arial', 'sans-serif'],
      },
      colors: {
        canvas: '#f3f5f8',
        navy: {
          DEFAULT: '#0f1f3d',
          deep: '#0c1a34',
          raised: '#15294d',
          hover: '#14233f',
          line: '#22395f',
          muted: '#7c8db0',
        },
        primary: {
          DEFAULT: '#0d9488',
          hover: '#0f766e',
          soft: '#f0fdfa',
          bright: '#2dd4bf',
        },
        metric: {
          mrc: '#4338ca',
          billed: '#0e7490',
          collected: '#059669',
          pipeline: '#c2410c',
          ops: '#475569',
        },
        status: {
          critical: '#be123c',
          warning: '#b45309',
          info: '#1d4ed8',
          ok: '#047857',
          neutral: '#64748b',
        },
      },
    },
  },
  plugins: [],
}
