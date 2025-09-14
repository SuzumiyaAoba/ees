module.exports = {
  'src/**/*.{ts,tsx,js,jsx,json}': [
    'biome check --apply --no-errors-on-unmatched',
    'tsc --noEmit'
  ],
  '*.{json,md}': [
    'biome format --write --no-errors-on-unmatched'
  ]
}