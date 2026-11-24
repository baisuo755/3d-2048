// 11-tier botanical progression for Grove (3D 2048).
// Pure data module: safe to import from both Node tests and browser code.

export const TIERS = Object.freeze([
  Object.freeze({
    tier: 1,
    value: 2,
    name: 'Seed',
    swatch: '#bce85c',
    leafColor: 0xbce85c,
    description: 'Tiny sprouting seed mound',
  }),
  Object.freeze({
    tier: 2,
    value: 4,
    name: 'Sprout',
    swatch: '#9ee048',
    leafColor: 0x9ee048,
    description: 'Short stem, first leaf pair',
  }),
  Object.freeze({
    tier: 3,
    value: 8,
    name: 'Sapling',
    swatch: '#6ac94a',
    leafColor: 0x6ac94a,
    description: 'Slim trunk, one small canopy',
  }),
  Object.freeze({
    tier: 4,
    value: 16,
    name: 'Young Tree',
    swatch: '#46b34a',
    leafColor: 0x46b34a,
    description: 'Taller, fuller single canopy',
  }),
  Object.freeze({
    tier: 5,
    value: 32,
    name: 'Mature Tree',
    swatch: '#2f994b',
    leafColor: 0x2f994b,
    description: 'Two-blob canopy',
  }),
  Object.freeze({
    tier: 6,
    value: 64,
    name: 'Great Tree',
    swatch: '#238257',
    leafColor: 0x238257,
    description: 'Broad trunk, three-blob canopy',
  }),
  Object.freeze({
    tier: 7,
    value: 128,
    name: 'Grand Tree',
    swatch: '#38966f',
    leafColor: 0x38966f,
    description: 'Layered canopy, visible branches',
  }),
  Object.freeze({
    tier: 8,
    value: 256,
    name: 'Elder Tree',
    swatch: '#9eb546',
    leafColor: 0x9eb546,
    description: 'Gnarled trunk, wide layered canopy',
  }),
  Object.freeze({
    tier: 9,
    value: 512,
    name: 'Ancient Tree',
    swatch: '#579c82',
    leafColor: 0x579c82,
    description: 'Massive, moss tones, multi-layer',
  }),
  Object.freeze({
    tier: 10,
    value: 1024,
    name: 'Giant Sequoia',
    swatch: '#c45a2d',
    leafColor: 0xc45a2d,
    description: 'Red-toned towering trunk',
  }),
  Object.freeze({
    tier: 11,
    value: 2048,
    name: 'World Tree',
    swatch: '#ffd966',
    leafColor: 0xffd966,
    description: 'Glowing canopy and fireflies',
  }),
]);

export const WIN_VALUE = 2048;

export function valueToTier(value) {
  if (!Number.isFinite(value) || value < 2) return 0;
  return Math.round(Math.log2(value));
}

export function getTierInfo(value) {
  const tier = valueToTier(value);
  if (tier <= 0) return null;
  if (tier <= TIERS.length) return TIERS[tier - 1];
  // Beyond 2048 in continue mode: mythic World Tree.
  return {
    tier,
    value,
    name: 'World Tree',
    swatch: '#ffe896',
    leafColor: 0xffe896,
    description: 'Radiant World Tree beyond the canopy',
  };
}
