// Pure score-driven world clock (Seasons + Day/Dusk/Night) for Grove.
// No DOM, no Three.js: safe to unit-test directly under `node --test tests/`.
//
// Score mapping (strictly monotonic as score grows):
//   Spring:     0 –  1,499  (Day 0–599,     Dusk 600–1,049,   Night 1,050–1,499)
//   Summer: 1,500 –  4,499  (Day 1,500–2,699, Dusk 2,700–3,599, Night 3,600–4,499)
//   Autumn: 4,500 –  9,999  (Day 4,500–6,699, Dusk 6,700–8,349, Night 8,350–9,999)
//   Winter: 10,000+         (Day 10,000–13,999, Dusk 14,000–16,999, Night 17,000+)
//
// Reaching the World Tree (state === "won") temporarily bathes the sanctuary in a
// special "Golden Dawn" eternal-spring bloom; continuing resumes the score clock.

export const SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter']);
export const TIMES_OF_DAY = Object.freeze(['day', 'dusk', 'night']);

export const SEASON_BANDS = Object.freeze([
  Object.freeze({ season: 'spring', start: 0, end: 1500 }),
  Object.freeze({ season: 'summer', start: 1500, end: 4500 }),
  Object.freeze({ season: 'autumn', start: 4500, end: 10000 }),
  Object.freeze({ season: 'winter', start: 10000, end: 20000 }),
]);

// Sub-phase thresholds within each season's normalized [0, 1] progress.
export const DUSK_START = 0.4;
export const NIGHT_START = 0.7;

const SEASON_LABELS = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

const TIME_LABELS = {
  day: 'Day',
  dusk: 'Dusk',
  night: 'Night',
  dawn: 'Dawn',
};

function clamp01(v) {
  return v <= 0 ? 0 : v >= 1 ? 1 : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpHex(hexA, hexB, t) {
  const ct = clamp01(t);
  const ar = (hexA >> 16) & 0xff;
  const ag = (hexA >> 8) & 0xff;
  const ab = hexA & 0xff;
  const br = (hexB >> 16) & 0xff;
  const bg = (hexB >> 8) & 0xff;
  const bb = hexB & 0xff;
  const r = Math.round(lerp(ar, br, ct));
  const g = Math.round(lerp(ag, bg, ct));
  const b = Math.round(lerp(ab, bb, ct));
  return (r << 16) | (g << 8) | b;
}

/**
 * Computes the monotonic world-clock phase for a given score and optional game state.
 * `progress` increases monotonically in [0, 4]:
 *   [0, 1) spring, [1, 2) summer, [2, 3) autumn, [3, 4] winter.
 */
export function getWorldPhase(score = 0, options = {}) {
  const safeScore = Number.isFinite(score) && score > 0 ? score : 0;
  const isWinBloom = Boolean(options.won || options.state === 'won');

  let seasonIndex = SEASON_BANDS.length - 1;
  let seasonProgress = 1;

  for (let i = 0; i < SEASON_BANDS.length; i++) {
    const band = SEASON_BANDS[i];
    if (safeScore < band.end) {
      seasonIndex = i;
      seasonProgress = clamp01((safeScore - band.start) / (band.end - band.start));
      break;
    }
  }

  const season = SEASON_BANDS[seasonIndex].season;
  const progress = seasonIndex + seasonProgress;

  let timeOfDay = 'day';
  if (seasonProgress >= NIGHT_START) {
    timeOfDay = 'night';
  } else if (seasonProgress >= DUSK_START) {
    timeOfDay = 'dusk';
  }

  // Smooth continuous dusk (0..1 peaking at dusk) and night (0..1 peaking at night) weights.
  let duskWeight = 0;
  let nightWeight = 0;
  if (seasonProgress >= DUSK_START && seasonProgress < NIGHT_START) {
    const u = (seasonProgress - DUSK_START) / (NIGHT_START - DUSK_START);
    duskWeight = Math.sin(u * Math.PI * 0.5);
    nightWeight = u * 0.35;
  } else if (seasonProgress >= NIGHT_START) {
    const u = (seasonProgress - NIGHT_START) / (1 - NIGHT_START);
    duskWeight = Math.max(0, 1 - u * 1.15);
    nightWeight = 0.35 + 0.65 * Math.min(1, u * 1.25);
  }

  if (isWinBloom) {
    return {
      score: safeScore,
      season: 'spring',
      seasonIndex: 0,
      timeOfDay: 'dawn',
      progress,
      seasonProgress,
      duskWeight: 0.35,
      nightWeight: 0,
      isWinBloom: true,
      label: 'Golden Dawn',
      dotColor: '#ffd966',
    };
  }

  const dotPalette = {
    spring: { day: '#8be05a', dusk: '#f4a27e', night: '#7aa9f5' },
    summer: { day: '#3cc76a', dusk: '#f59c4d', night: '#648ce8' },
    autumn: { day: '#e39236', dusk: '#e86842', night: '#9478d8' },
    winter: { day: '#8ed6ee', dusk: '#b99ce8', night: '#a8c8ff' },
  };

  return {
    score: safeScore,
    season,
    seasonIndex,
    timeOfDay,
    progress,
    seasonProgress,
    duskWeight,
    nightWeight,
    isWinBloom: false,
    label: `${SEASON_LABELS[season]} · ${TIME_LABELS[timeOfDay]}`,
    dotColor: dotPalette[season][timeOfDay],
  };
}

// Per-season island surface & weather palettes (trees keep their own 11-tier hues!).
const SEASON_SURFACES = {
  spring: {
    grassTop: 0x6fb053,
    grassHighlight: 0x84c45d,
    grassRim: 0x4f893b,
    vine: 0x46883c,
    tuft: 0x4b8a36,
    flowerA: 0xfff0b2,
    flowerB: 0xffb3cd, // spring sakura blossom accent
    water: 0x5cc7e8,
    waterEmissive: 0x1a6c8e,
    terrace: 0xb9a98f,
    rim: 0xc4b296,
    weather: 'spring',
  },
  summer: {
    grassTop: 0x4e9e44,
    grassHighlight: 0x64b54d,
    grassRim: 0x387832,
    vine: 0x337530,
    tuft: 0x3b7d31,
    flowerA: 0xffd552,
    flowerB: 0xf47a55,
    water: 0x3cbbe2,
    waterEmissive: 0x126486,
    terrace: 0xbba889,
    rim: 0xc6b190,
    weather: 'summer',
  },
  autumn: {
    grassTop: 0xb8893f,
    grassHighlight: 0xcfa04c,
    grassRim: 0x8d6329,
    vine: 0xa6532a,
    tuft: 0x9e6c2b,
    flowerA: 0xf5c44c,
    flowerB: 0xe25d36,
    water: 0x4ea3bc,
    waterEmissive: 0x1e536b,
    terrace: 0xc1a583,
    rim: 0xcab08f,
    weather: 'autumn',
  },
  winter: {
    grassTop: 0xa8cad4, // frosted glacier-sage (high contrast vs golden World Tree)
    grassHighlight: 0xc5dfe7,
    grassRim: 0x7b9fae,
    vine: 0x6c8fa0,
    tuft: 0x85a9b8,
    flowerA: 0xe3f6ff,
    flowerB: 0xb2dcf5,
    water: 0x82d8f0,
    waterEmissive: 0x2c6f94,
    terrace: 0xb8c5cf,
    rim: 0xc6d3dc,
    weather: 'winter',
  },
};

// Sky + lighting targets per time-of-day (tuned so all 11 tree tiers stay vibrant & distinct!).
const SKY_BY_TIME = {
  day: {
    zenith: 0x2565a8,
    mid: 0x64acd9,
    horizon: 0xc5e4f5,
    bottom: 0x5b8fb8,
    fog: 0xadd5ee,
    sunGlow: 0xffe9bf,
    sunStrength: 1.0,
    sunColor: 0xfff0cc,
    sunIntensity: 2.55,
    sunPos: [9.5, 14.5, 6.2],
    hemiSky: 0xe4f4ff,
    hemiGround: 0x90ab82,
    hemiIntensity: 0.88,
    rimColor: 0x9fd0f8,
    rimIntensity: 0.58,
    underColor: 0x9acae8,
    underIntensity: 0.62,
    cloudUpper: 0xfffdf8,
    cloudUpperEmissive: 0xdeeeff,
    cloudLower: 0xe6f3fc,
    starOpacity: 0.0,
    moonOpacity: 0.0,
    lanternEmissive: 0.55,
    lanternLight: 0.0,
    exposure: 1.08,
  },
  dusk: {
    zenith: 0x2b3670,
    mid: 0x7d5889,
    horizon: 0xf09f74,
    bottom: 0x4c4c7a,
    fog: 0xb97c7e,
    sunGlow: 0xffb76b,
    sunStrength: 1.25,
    sunColor: 0xffb978,
    sunIntensity: 2.15,
    sunPos: [12.5, 7.2, 4.5],
    hemiSky: 0xffd0b0,
    hemiGround: 0x6e6878,
    hemiIntensity: 0.94,
    rimColor: 0x8eaef5,
    rimIntensity: 0.72,
    underColor: 0x7b7fa8,
    underIntensity: 0.56,
    cloudUpper: 0xffdfc8,
    cloudUpperEmissive: 0xe69570,
    cloudLower: 0xc595a8,
    starOpacity: 0.32,
    moonOpacity: 0.42,
    lanternEmissive: 1.55,
    lanternLight: 1.05,
    exposure: 1.06,
  },
  night: {
    zenith: 0x0e1b3b,
    mid: 0x1c3463,
    horizon: 0x35578a,
    bottom: 0x182b4d,
    fog: 0x28436e,
    sunGlow: 0x9fc8ff,
    sunStrength: 0.35,
    // Crisp cool moonlight key + strong balanced fill + warm corner lanterns so
    // EVERY one of the 11 tree hues remains vivid and readable at a glance!
    sunColor: 0xc6deff,
    sunIntensity: 1.65,
    sunPos: [-8.5, 13.5, 7.5],
    hemiSky: 0x94bbf2,
    hemiGround: 0x6b7c74,
    hemiIntensity: 1.02,
    rimColor: 0x7ab8f0,
    rimIntensity: 0.82,
    underColor: 0x5c80b0,
    underIntensity: 0.58,
    cloudUpper: 0x7d9ac4,
    cloudUpperEmissive: 0x385482,
    cloudLower: 0x45608a,
    starOpacity: 0.94,
    moonOpacity: 1.0,
    lanternEmissive: 2.35,
    lanternLight: 1.85,
    exposure: 1.12,
  },
  dawn: {
    // Special "Golden Dawn" celestial sunrise when the World Tree (2048) blooms!
    zenith: 0x3266a8,
    mid: 0x88b4dc,
    horizon: 0xffd7a3,
    bottom: 0x6c8fb8,
    fog: 0xd9d4cc,
    sunGlow: 0xffe49c,
    sunStrength: 1.45,
    sunColor: 0xffe6a8,
    sunIntensity: 2.7,
    sunPos: [10.5, 11.5, 5.5],
    hemiSky: 0xfff0d4,
    hemiGround: 0x98b082,
    hemiIntensity: 0.98,
    rimColor: 0xaad8ff,
    rimIntensity: 0.68,
    underColor: 0xa8cae6,
    underIntensity: 0.64,
    cloudUpper: 0xfff6e5,
    cloudUpperEmissive: 0xffd59c,
    cloudLower: 0xf0e0d4,
    starOpacity: 0.14,
    moonOpacity: 0.0,
    lanternEmissive: 1.35,
    lanternLight: 0.75,
    exposure: 1.12,
  },
};

/**
 * Resolves the full visual target palette for a world phase (from getWorldPhase).
 * Pure function returning plain hex colors and numeric intensities for smooth lerping.
 */
export function getAtmosphereTarget(phase) {
  const surface = SEASON_SURFACES[phase.season] || SEASON_SURFACES.spring;
  const skyBase = SKY_BY_TIME[phase.timeOfDay] || SKY_BY_TIME.day;

  // Subtle seasonal sky tinting while keeping day/dusk/night identity clear.
  let zenith = skyBase.zenith;
  let mid = skyBase.mid;
  let horizon = skyBase.horizon;
  let fog = skyBase.fog;

  if (!phase.isWinBloom) {
    if (phase.season === 'summer' && phase.timeOfDay === 'day') {
      zenith = lerpHex(zenith, 0x1a56a3, 0.4);
      mid = lerpHex(mid, 0x4ca2d9, 0.35);
    } else if (phase.season === 'autumn') {
      horizon = lerpHex(horizon, phase.timeOfDay === 'night' ? 0x4a4272 : 0xf4bc82, 0.36);
      fog = lerpHex(fog, phase.timeOfDay === 'night' ? 0x393a66 : 0xdcb995, 0.3);
    } else if (phase.season === 'winter') {
      zenith = lerpHex(zenith, phase.timeOfDay === 'night' ? 0x0b1a3c : 0x2f6ba6, 0.35);
      horizon = lerpHex(horizon, phase.timeOfDay === 'night' ? 0x3b6294 : 0xd2ecfa, 0.35);
      fog = lerpHex(fog, phase.timeOfDay === 'night' ? 0x2b4a78 : 0xc0e0f2, 0.35);
    }
  }

  return {
    phase,
    sky: {
      zenith,
      mid,
      horizon,
      bottom: skyBase.bottom,
      fog,
      sunGlow: skyBase.sunGlow,
      sunStrength: skyBase.sunStrength,
      sunColor: skyBase.sunColor,
      sunIntensity: skyBase.sunIntensity,
      sunPos: skyBase.sunPos,
      hemiSky: skyBase.hemiSky,
      hemiGround: skyBase.hemiGround,
      hemiIntensity: skyBase.hemiIntensity,
      rimColor: skyBase.rimColor,
      rimIntensity: skyBase.rimIntensity,
      underColor: skyBase.underColor,
      underIntensity: skyBase.underIntensity,
      cloudUpper: skyBase.cloudUpper,
      cloudUpperEmissive: skyBase.cloudUpperEmissive,
      cloudLower: skyBase.cloudLower,
      starOpacity: skyBase.starOpacity,
      moonOpacity: skyBase.moonOpacity,
      exposure: skyBase.exposure,
    },
    island: {
      grassTop: surface.grassTop,
      grassHighlight: surface.grassHighlight,
      grassRim: surface.grassRim,
      vine: surface.vine,
      tuft: surface.tuft,
      flowerA: surface.flowerA,
      flowerB: surface.flowerB,
      water: surface.water,
      waterEmissive: surface.waterEmissive,
      terrace: surface.terrace,
      rim: surface.rim,
      lanternEmissive: skyBase.lanternEmissive,
      lanternLight: skyBase.lanternLight,
    },
    weather: {
      season: phase.isWinBloom ? 'spring' : surface.weather,
      fireflyFactor: phase.isWinBloom ? 1.0 : Math.max(phase.duskWeight * 0.75, phase.nightWeight),
    },
  };
}
