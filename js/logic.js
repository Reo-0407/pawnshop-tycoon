// 게임 규칙 (화면과 무관한 순수 함수). rng를 넘기면 테스트에서 고정할 수 있어요.
import { ITEMS, CUSTOMERS, FAKE_CHANCE, LOUPE, START_CASH, CUSTOMERS_PER_DAY, RENT, UPGRADES } from './data.js';

const rand = (rng, a, b) => a + (b - a) * rng();
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const round100 = (n) => Math.max(100, Math.round(n / 100) * 100);

export function newState(nick) {
  return {
    nick, day: 1, cash: START_CASH, shelf: [],
    up: { slots: 0, loupe: 0, interior: 0 }, // 각 업그레이드의 현재 단계(0부터)
    secret: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36),
  };
}
export const slotCount = (s) => UPGRADES.slots.levels[s.up.slots];
export const loupeLevel = (s) => UPGRADES.loupe.levels[s.up.loupe];
export const interiorLevel = (s) => UPGRADES.interior.levels[s.up.interior];

export const trueValue = (it) => (it.fake ? 0 : Math.round(it.base * it.cond));
export const netWorth = (s) => s.cash + s.shelf.reduce((a, it) => a + trueValue(it), 0);

function pickTier(rng, interior) {
  const w = [50 - 8 * (interior - 1), 35 - 2 * (interior - 1), 13 + 6 * (interior - 1), 2 + 4 * (interior - 1)].map((x) => Math.max(1, x));
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < 4; i++) { r -= w[i]; if (r < 0) return i; }
  return 0;
}

// 물건 한 개 만들기 + 현재 돋보기로 감정 결과(힌트) 미리 계산
export function makeItem(rng, state, tier = null) {
  const t = tier ?? pickTier(rng, interiorLevel(state));
  const base = pick(rng, ITEMS.filter((i) => i.tier === t));
  const cond = Math.round(rand(rng, 0.6, 1.4) * 100) / 100;
  const fake = rng() < FAKE_CHANCE[t];
  const it = { ...base, cond, fake };
  const L = loupeLevel(state);
  const apparent = base.base * cond; // 진품이라면의 가치
  const spread = LOUPE.spread[L];
  const center = apparent * (1 + rand(rng, -spread / 2, spread / 2));
  it.hint = {
    lo: round100(center * (1 - spread)), hi: round100(center * (1 + spread)),
    looksReal: rng() < LOUPE.accuracy[L] ? !fake : fake, // 정확도만큼 맞는 판정
  };
  return it;
}

export function makeCustomer(rng, state) {
  const genuine = state.shelf.filter((it) => !it.fake);
  const c = pick(rng, CUSTOMERS);
  const interior = interiorLevel(state);
  if (genuine.length && rng() < 0.4) {
    const item = pick(rng, genuine);
    const max = round100(trueValue(item) * rand(rng, 1.1, 1.6) * (1 + 0.05 * (interior - 1)));
    return { kind: 'buy', who: c, item, max, patience: 3 };
  }
  const item = makeItem(rng, state);
  const believed = item.base * item.cond; // 손님은 진품인 줄 알고 있음
  const min = round100(believed * rand(rng, 0.55, 0.85));
  const ask = round100(believed * rand(rng, 1.0, 1.4));
  return { kind: 'sell', who: c, item, min, ask: Math.max(ask, min), patience: 3 };
}

export function makeDay(rng, state) {
  return Array.from({ length: CUSTOMERS_PER_DAY }, () => makeCustomer(rng, state));
}

// 흥정: 결과 {status:'deal'|'counter'|'leave', price?, msg}
export function haggle(c, offer) {
  if (c.kind === 'sell') { // 플레이어가 사는 쪽
    if (offer >= c.min) return { status: 'deal', price: offer, msg: '좋아요! 그 가격에 팔게요.' };
    c.patience -= offer < c.min * 0.6 ? 2 : 1;
    if (c.patience <= 0) return { status: 'leave', msg: '너무 박하네요! 안 팔아요!' };
    const counter = round100(c.min * (1 + 0.12 * c.patience));
    return { status: 'counter', price: Math.max(counter, round100(c.min)), msg: `음... ${Math.max(counter, round100(c.min)).toLocaleString()}원이면 팔게요.` };
  }
  // 플레이어가 파는 쪽
  if (offer <= c.max) return { status: 'deal', price: offer, msg: '좋아요! 살게요.' };
  c.patience -= offer > c.max * 1.4 ? 2 : 1;
  if (c.patience <= 0) return { status: 'leave', msg: '너무 비싸요! 다른 데 갈래요!' };
  const counter = round100(c.max * (1 - 0.04 * (3 - c.patience)));
  return { status: 'counter', price: counter, msg: `음... ${counter.toLocaleString()}원이면 살게요.` };
}

export function junkValue(it) { return it.fake ? round100(it.base * 0.05) : round100(trueValue(it) * 0.5); }

export function endDay(s) {
  const rent = RENT(interiorLevel(s));
  s.cash -= rent;
  const bankrupt = s.cash < 0;
  if (!bankrupt) s.day += 1;
  return { rent, bankrupt };
}

export function buyUpgrade(s, key) {
  const u = UPGRADES[key]; const lvl = s.up[key];
  if (lvl >= u.costs.length) return { ok: false, msg: '이미 최고 단계예요' };
  if (s.cash < u.costs[lvl]) return { ok: false, msg: '돈이 모자라요' };
  s.cash -= u.costs[lvl]; s.up[key] += 1; return { ok: true };
}
