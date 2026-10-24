/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js",
    "./css/**/*.css"
  ],
  safelist: [
    'hidden',
    'block',
    'flex',
    'grid',
    'active',
    'page',
    'otp-digit',
    'bg-green-600',
    'bg-green-700',
    'bg-green-800',
    'bg-emerald-600',
    'bg-emerald-700',
    'bg-emerald-800',
    'text-green-600',
    'text-green-700',
    'text-green-800',
    'text-emerald-600',
    'text-emerald-700',
    'text-emerald-800',
    'text-red-500',
    'text-red-600',
    'bg-red-500',
    'bg-blue-500',
    'bg-amber-500',
    'text-amber-500',
    'border-green-500',
    'border-red-500'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
