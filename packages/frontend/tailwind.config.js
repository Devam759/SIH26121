/** @type {import('tailwindcss').Config} */

// Tailwind can't apply an opacity modifier to a raw var(). color-mix can, so
// `bg-surface/60` keeps working across the whole token set.
//
// For a utility with no modifier Tailwind passes the *string*
// `var(--tw-bg-opacity)` rather than a number, so anything that assumes a
// numeric opacityValue produces `color-mix(… NaN%, transparent)` — invalid CSS
// that browsers drop silently, leaving the element with an inherited colour.
// Only a genuinely numeric modifier gets the color-mix; everything else uses
// the token directly.
const token = (name) => ({ opacityValue }) => {
  const alpha = Number(opacityValue);
  return Number.isFinite(alpha) && alpha !== 1
    ? `color-mix(in oklch, var(--${name}) ${alpha * 100}%, transparent)`
    : `var(--${name})`;
};

const tokens = Object.fromEntries(
  [
    'bg',
    'bg-deep',
    'surface',
    'raised',
    'line',
    'line-soft',
    'ink',
    'ink-2',
    'ink-3',
    'accent',
    'accent-solid',
    'accent-ink',
    'accent-wash',
    'accent-line',
    'brand',
    'brand-solid',
    'brand-ink',
    'brand-wash',
    'brand-line',
    'warn',
    'warn-ink',
    'warn-wash',
    'warn-line',
    'ok',
    'ok-ink',
    'ok-wash',
    'ok-line',
  ].map((name) => [name, token(name)])
);

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: tokens,
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Fixed rem scale — instrumentation, not fluid marketing type.
        micro: ['0.625rem', { lineHeight: '0.875rem', letterSpacing: '0.01em' }],
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.005em' }],
        body: ['0.75rem', { lineHeight: '1.125rem' }],
        title: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '-0.008em' }],
        readout: ['1.625rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
        hero: ['2.375rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
      },
      spacing: {
        px2: '2px',
      },
      boxShadow: {
        // Modules are separated by borders. Shadow is only for true overlays.
        overlay: '0 12px 32px -8px rgba(0, 0, 0, 0.75)',
      },
      transitionTimingFunction: {
        out: 'linear',
      },
      zIndex: {
        sticky: '20',
        overlay: '9990',
        modal: '9999',
      },
    },
    // Radius is deliberately capped. Rounded-lg through rounded-3xl all resolve
    // to a hairline curve so a stray `rounded-2xl` can never soften the UI, and
    // `rounded-full` stays circular for the things that are genuinely round:
    // status LEDs, the operator avatar, map markers.
    borderRadius: {
      none: '0',
      DEFAULT: '2px',
      sm: '2px',
      md: '2px',
      lg: '3px',
      xl: '3px',
      '2xl': '3px',
      '3xl': '4px',
      full: '9999px',
    },
  },
  plugins: [],
};
