// 게임 규칙 (화면과 무관한 순수 함수). rng를 넘기면 테스트에서 고정할 수 있어요.
import { ITEMS, CUSTOMERS, CATS, COLLECTORS, COLLECTOR_MULT, COLLECTOR_CHANCE, PROMO, FAKE_CHANCE, LOUPE, LOUPE_USES, START_CASH, CUSTOMERS_PER_DAY, RENT, UPGRADES } from './data.js';

const rand = (rng, a, b) => a + (b - a) * rng();
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const round100 = (n) => Math.max(100, Math.round(n / 100) * 100);

export function newState(nick) {
  return {
    nick, day: 1, cash: START_CASH, shelf: [],
    up: { loupe: 0, interior: 0 }, // 각 업그레이드의 현재 단계(0부터)
    trend: null, loupeLeft: 0, bonusCustomers: 0,
    secret: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36),
  };
}
export const loupeLevel = (s) => UPGRADES.loupe.levels[s.up.loupe];
export const interiorLevel = (s) => UPGRADES.interior.levels[s.up.interior];

// 하루를 시작할 때: 오늘의 시세(한 분류는 +30%, 한 분류는 -20%)와 감정 횟수 정하기
export function rollDay(rng, s) {
  const up = pick(rng, CATS); const down = pick(rng, CATS.filter((c) => c !== up));
  s.trend = { up, down }; s.loupeLeft = LOUPE_USES(loupeLevel(s));
}
export const trendMult = (s, it) => (s.trend ? (it.cat === s.trend.up ? 1.3 : it.cat === s.trend.down ? 0.8 : 1) : 1);
// 감정 전에 보이는 넓은 시세 범위
export const roughRange = (it) => { const c = (it.hint.lo + it.hint.hi) / 2; return { lo: round100(c * 0.5), hi: round100(c * 1.7) }; };
export function appraise(s, c) {
  if (c.appraised || s.loupeLeft <= 0) return false;
  s.loupeLeft -= 1; c.appraised = true; return true;
}
export const conditionLabel = (cond) => (cond >= 1.1 ? '상태 상' : cond >= 0.85 ? '상태 중' : '상태 하');

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
  const apparent = base.base * cond * trendMult(state, base); // 진품이라면의 오늘 가치
  const spread = LOUPE.spread[L];
  const center = apparent * (1 + rand(rng, -spread / 2, spread / 2));
  it.hint = {
    lo: round100(center * (1 - spread)), hi: round100(center * (1 + spread)),
    looksReal: rng() < LOUPE.accuracy[L] ? !fake : fake, // 정확도만큼 맞는 판정
  };
  return it;
}

const stockOf = (s) => s.shelf.filter((it) => !it.fake); // 손님은 재고 전체에서 진품만 사러 와요 (진열대 없음)
const matches = (it, want) => (want.id ? it.id === want.id : it.cat === want.cat);

function makeBuyer(rng, state) {
  const genuine = stockOf(state); if (!genuine.length) return null;
  const item = pick(rng, genuine);
  const max = round100(trueValue(item) * trendMult(state, item) * rand(rng, 1.1, 1.6) * (1 + 0.05 * (interiorLevel(state) - 1)));
  return { kind: 'buy', who: pick(rng, CUSTOMERS), item, max, offer: round100(max * rand(rng, 0.55, 0.75)), patience: 3 };
}
function makeSeller(rng, state) {
  const item = makeItem(rng, state);
  const believed = item.base * item.cond * trendMult(state, item); // 손님은 진품인 줄 알고 있음
  const min = round100(believed * rand(rng, 0.55, 0.85));
  const ask = round100(believed * rand(rng, 1.0, 1.4));
  return { kind: 'sell', who: pick(rng, CUSTOMERS), item, min, ask: Math.max(ask, min), patience: 3 };
}
// 수집가: 원하는 물건이 재고에 있을 때만 생겨요. 처음 제안이 정상 시세의 2배
export function makeCollector(rng, state) {
  const opts = COLLECTORS.filter((co) => stockOf(state).some((it) => matches(it, co.want)));
  if (!opts.length) return null;
  const co = pick(rng, opts);
  const item = pick(rng, stockOf(state).filter((it) => matches(it, co.want)));
  const v = trueValue(item);
  return { kind: 'buy', collector: co, who: { ...pick(rng, CUSTOMERS), role: co.role }, item, offer: round100(v * COLLECTOR_MULT), max: round100(v * COLLECTOR_MULT * 1.15), patience: 3 };
}
// 마케팅 도우미: 홍보비를 내면 내일 손님이 늘지만, 사기(scam)면 돈만 잃어요
export const promoPrice = (s) => round100(Math.min(PROMO.maxPrice, Math.max(PROMO.minPrice, s.cash * PROMO.cashRate)));
export function makePromo(rng, state) {
  const scam = rng() < PROMO.scamChance;
  return { kind: 'promo', who: { ...pick(rng, CUSTOMERS), role: '마케팅 도우미' }, price: promoPrice(state), scam, looksScam: rng() < LOUPE.accuracy[loupeLevel(state)] ? scam : !scam, patience: 3 };
}
export function acceptPromo(s, c) {
  s.cash -= c.price;
  if (!c.scam) s.bonusCustomers = (s.bonusCustomers || 0) + PROMO.bonus;
  return { scam: c.scam, bonus: c.scam ? 0 : PROMO.bonus };
}

export function makeCustomer(rng, state) {
  if (rng() < 0.4) { const b = makeBuyer(rng, state); if (b) return b; }
  return makeSeller(rng, state);
}

export function makeDay(rng, state) {
  const n = CUSTOMERS_PER_DAY + (state.bonusCustomers || 0); state.bonusCustomers = 0;
  const list = Array.from({ length: n }, () => makeCustomer(rng, state));
  if (state.day >= 2 && rng() < PROMO.dayChance) list[Math.floor(rng() * n)] = makePromo(rng, state);
  if (rng() < COLLECTOR_CHANCE) {
    const c = makeCollector(rng, state);
    if (c) { let i; do { i = Math.floor(rng() * n); } while (list[i].kind === 'promo'); list[i] = c; }
  }
  return list;
}
// 손님 차례가 왔을 때 상황이 바뀌었을 수 있어요(물건을 이미 팔았거나 돈이 변함). 필요하면 다른 손님으로 바꿔 줘요.
export function fixCustomer(rng, state, c) {
  if (c.kind === 'promo') { c.price = promoPrice(state); return c; }
  if (c.kind === 'buy' && !state.shelf.includes(c.item)) return (c.collector && makeCollector(rng, state)) || makeBuyer(rng, state) || makeSeller(rng, state);
  return c;
}

// 흥정: 결과 {status:'deal'|'counter'|'leave', price?, msg}
export function haggle(c, offer) {
  if (c.kind === 'sell') { // 플레이어가 사는 쪽
    if (offer >= c.min) return { status: 'deal', price: offer, msg: '좋아요! 그 가격에 팔게요.' };
    c.patience -= offer < c.min * 0.6 ? 2 : 1;
    if (c.patience <= 0) return { status: 'leave', msg: '너무 박하네요! 안 팔아요!' };
    const counter = round100(c.min * (1 + 0.12 * c.patience));
    const cp = Math.max(counter, round100(c.min)); c.ask = cp;
    return { status: 'counter', price: cp, msg: `음... ${cp.toLocaleString()}원이면 팔게요.` };
  }
  // 플레이어가 파는 쪽
  if (offer <= c.max) return { status: 'deal', price: offer, msg: '좋아요! 살게요.' };
  c.patience -= offer > c.max * 1.4 ? 2 : 1;
  if (c.patience <= 0) return { status: 'leave', msg: '너무 비싸요! 다른 데 갈래요!' };
  const counter = round100(c.max * (1 - 0.04 * (3 - c.patience))); c.offer = counter;
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
