module.exports = {
  'src/**/*.{ts,tsx}': [
    'prettier --write',
    'tsc --noEmit'
  ],
  'src/**/*.{js,jsx,json}': [
    'prettier --write'
  ],
  '*.{json,md}': [
    'prettier --write'
  ]
}