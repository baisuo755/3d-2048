import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEASONS,
  SEASON_BANDS,
  getWorldPhase,
  getAtmosphereTarget,
} from '../src/atmosphere.js';

test('getWorldPhase starts at Spring Day for score 0 and negative/invalid scores', () => {
  for (const s of [0, -10, NaN, undefined]) {
    const p = getWorldPhase(s);
    assert.equal(p.season, 'spring');
    assert.equal(p.timeOfDay, 'day');
    assert.equal(p.label, 'Spring · Day');
    assert.equal(p.isWinBloom, false);
  }
});

test('getWorldPhase progresses monotonically through all four seasons and day -> dusk -> night', () => {
  const checkpoints = [
    { score: 0, season: 'spring', timeOfDay: 'day' },
    { score: 750, season: 'spring', timeOfDay: 'dusk' },
    { score: 1200, season: 'spring', timeOfDay: 'night' },
    { score: 1600, season: 'summer', timeOfDay: 'day' },
    { score: 3000, season: 'summer', timeOfDay: 'dusk' },
    { score: 4000, season: 'summer', timeOfDay: 'night' },
    { score: 5000, season: 'autumn', timeOfDay: 'day' },
    { score: 7200, season: 'autumn', timeOfDay: 'dusk' },
    { score: 9200, season: 'autumn', timeOfDay: 'night' },
    { score: 11000, season: 'winter', timeOfDay: 'day' },
    { score: 15000, season: 'winter', timeOfDay: 'dusk' },
    { score: 18500, season: 'winter', timeOfDay: 'night' },
    { score: 50000, season: 'winter', timeOfDay: 'night' },
  ];

  let prevProgress = -1;
  let prevSeasonIdx = -1;
  for (const cp of checkpoints) {
    const p = getWorldPhase(cp.score);
    assert.equal(p.season, cp.season, `score ${cp.score} season`);
    assert.equal(p.timeOfDay, cp.timeOfDay, `score ${cp.score} timeOfDay`);
    assert.ok(p.progress >= prevProgress, `expected monotonic progress at score ${cp.score}`);
    assert.ok(p.seasonIndex >= prevSeasonIdx, `expected monotonic seasonIndex at score ${cp.score}`);
    prevProgress = p.progress;
    prevSeasonIdx = p.seasonIndex;
  }

  // Dense monotonicity sweep across 0..25000
  let last = -1;
  for (let s = 0; s <= 25000; s += 125) {
    const p = getWorldPhase(s);
    assert.ok(p.progress >= last, `progress regressed at score ${s}`);
    assert.ok(SEASONS.includes(p.season));
    last = p.progress;
  }
});

test('getWorldPhase triggers Golden Dawn win bloom when state is won, and resumes score clock on continue', () => {
  const winPhase = getWorldPhase(18500, { state: 'won' });
  assert.equal(winPhase.isWinBloom, true);
  assert.equal(winPhase.timeOfDay, 'dawn');
  assert.equal(winPhase.label, 'Golden Dawn');

  const contPhase = getWorldPhase(18500, { state: 'continue' });
  assert.equal(contPhase.isWinBloom, false);
  assert.equal(contPhase.season, 'winter');
  assert.equal(contPhase.timeOfDay, 'night');
});

test('getAtmosphereTarget returns coherent lighting, stars, moon, lanterns, and seasonal weather', () => {
  const springDay = getAtmosphereTarget(getWorldPhase(100));
  assert.equal(springDay.sky.starOpacity, 0);
  assert.equal(springDay.sky.moonOpacity, 0);
  assert.equal(springDay.island.lanternLight, 0);
  assert.equal(springDay.weather.season, 'spring');
  assert.equal(springDay.weather.fireflyFactor, 0);

  const autumnDusk = getAtmosphereTarget(getWorldPhase(7400));
  assert.equal(autumnDusk.weather.season, 'autumn');
  assert.ok(autumnDusk.island.lanternLight > 0);
  assert.ok(autumnDusk.weather.fireflyFactor > 0.3);

  const winterNight = getAtmosphereTarget(getWorldPhase(19000));
  assert.equal(winterNight.weather.season, 'winter');
  assert.ok(winterNight.sky.starOpacity > 0.8);
  assert.equal(winterNight.sky.moonOpacity, 1);
  assert.ok(winterNight.island.lanternLight > 1.2);
  // Readability guard: moonlight + hemi intensity must remain well-lit at night
  assert.ok(winterNight.sky.hemiIntensity >= 0.95);
  assert.ok(winterNight.sky.sunIntensity >= 1.5);

  const dawn = getAtmosphereTarget(getWorldPhase(18000, { state: 'won' }));
  assert.equal(dawn.weather.season, 'spring');
  assert.equal(dawn.weather.fireflyFactor, 1);
  assert.equal(SEASON_BANDS.length, 4);
});
