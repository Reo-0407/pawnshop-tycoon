// 게임 규칙 (화면과 무관한 순수 함수). rng를 넘기면 테스트에서 고정할 수 있어요.
import { ITEMS, CUSTOMERS, CATS, COLLECTORS, COLLECTOR_MULT, COLLECTOR_CHANCE, PROMO, LOAN, STOLEN, FAKE_CHANCE, LOUPE, LOUPE_USES, START_CASH, CUSTOMERS_PER_DAY, RENT, UPGRADES } from './data.js?v=14';

const rand = (rng, a, b) => a + (b - a) * rng();
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const round100 = (n) => Math.max(100, Math.round(n / 100) * 100);

export function newState(nick) {
  return {
    nick, day: 1, cash: START_CASH, shelf: [],
    up: { loupe: 0, interior: 0 }, // 각 업그레이드의 현재 단계(0부터)
    trend: null, loupeLeft: 0, bonusCustomers: 0, pledges: [],
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
export const pledgedValue = (s) => (s.pledges || []).reduce((a, p) => a + p.loan, 0); // 빌려준 돈도 내 재산이에요
export const netWorth = (s) => s.cash + s.shelf.reduce((a, it) => a + trueValue(it), 0) + pledgedValue(s);

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
export function makeSeller(rng, state, stolen = false) {
  let item = makeItem(rng, state);
  if (stolen) for (let t = 0; t < 12 && item.fake; t++) item = makeItem(rng, state); // 장물은 진짜 물건이에요
  const believed = item.base * item.cond * trendMult(state, item); // 손님은 진품인 줄 알고 있음
  const min = round100(believed * (stolen ? rand(rng, 0.25, 0.4) : rand(rng, 0.55, 0.85)));
  const ask = round100(believed * (stolen ? rand(rng, 0.4, 0.6) : rand(rng, 1.0, 1.4)));
  // 돋보기로 보면 수상한 낌새가 보일 수 있어요: 장물이면 돋보기 정확도만큼, 보통 손님은 가끔 오해해요
  const acc = LOUPE.accuracy[loupeLevel(state)];
  const looksStolen = stolen ? rng() < acc : rng() < (1 - acc) * 0.3;
  return { kind: 'sell', stolen, looksStolen, who: pick(rng, CUSTOMERS), item, min, ask: Math.max(ask, min), patience: 3 };
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

// 대출 손님: 물건을 맡기고 돈을 빌리려고 해요. ask = 빌리고 싶은 돈, min = 이만큼은 받아야 맡기는 돈
export function makePawn(rng, state) {
  const item = makeItem(rng, state);
  const believed = item.base * item.cond * trendMult(state, item); // 손님은 진품인 줄 알고 있음
  const min = round100(believed * rand(rng, 0.35, 0.55));
  const ask = round100(believed * rand(rng, 0.5, 0.75));
  return { kind: 'pawn', who: pick(rng, CUSTOMERS), item, min, ask: Math.max(ask, min), patience: 3 };
}
// 대출 실행: 담보는 기한까지 내가 맡아 둬요 (재고에는 안 들어가요)
export function lend(s, c, loan) {
  const p = { item: c.item, loan, repay: round100(loan * (1 + LOAN.rate)), due: s.day + LOAN.days };
  s.cash -= loan; c.item.cost = loan; (s.pledges ||= []).push(p); return p;
}
// 하루를 시작할 때 기한이 된 담보 처리: 진품이면 일정 확률로 찾아가고(원금+이자), 가품이거나 안 찾아가면 내 재고가 돼요
export function settlePledges(rng, s) {
  const out = [], keep = [];
  for (const p of s.pledges || []) {
    if (p.due > s.day) { keep.push(p); continue; }
    if (!p.item.fake && rng() < LOAN.redeemChance) { s.cash += p.repay; out.push({ kind: 'redeem', p }); }
    else { p.item.cost = p.loan; s.shelf.push(p.item); out.push({ kind: 'forfeit', p }); }
  }
  s.pledges = keep; return out;
}

// ---------- 장물과 경찰 ----------
// 장물을 사면 하루나 이틀 뒤에 경찰이 와요. 그 전에 팔아 치우면 안전해요
export function acquire(s, c, price, rng = Math.random) {
  c.item.cost = price; s.cash -= price;
  if (c.stolen) { c.item.stolen = true; c.item.policeDay = s.day + STOLEN.policeDelay[Math.floor(rng() * STOLEN.policeDelay.length)]; }
  s.shelf.push(c.item);
}
export const dueStolen = (s) => s.shelf.filter((it) => it.stolen && it.policeDay <= s.day);
export function makePolice(rng, state) {
  const items = dueStolen(state); if (!items.length) return null;
  return { kind: 'police', who: { ...pick(rng, CUSTOMERS), role: '경찰관' }, items, patience: 3 };
}
// 협조하면 장물만 넘기고 끝. 모른 척하면 40%는 넘어가고, 들키면 장물을 뺏기고 벌금까지 내요
export function resolvePolice(rng, s, c, cooperate) {
  const items = c.items.filter((it) => s.shelf.includes(it));
  const value = items.reduce((a, it) => a + trueValue(it), 0);
  const seize = () => { for (const it of items) s.shelf.splice(s.shelf.indexOf(it), 1); };
  if (cooperate) { seize(); return { seized: items, fine: 0, escaped: false }; }
  if (rng() < STOLEN.bluffChance) { for (const it of items) { it.stolen = false; } return { seized: [], fine: 0, escaped: true }; }
  seize(); const fine = Math.min(s.cash, Math.max(STOLEN.minFine, round100(value * STOLEN.fineRate))); s.cash -= fine;
  return { seized: items, fine, escaped: false };
}

export function makeCustomer(rng, state) {
  if (state.day >= STOLEN.minDay && rng() < STOLEN.chance) return makeSeller(rng, state, true);
  if (state.day >= 2 && rng() < LOAN.chance) return makePawn(rng, state);
  if (rng() < 0.4) { const b = makeBuyer(rng, state); if (b) return b; }
  return makeSeller(rng, state);
}

// count 를 주면 하루 도중에 이어 하는 거예요(보너스·특별 손님은 이미 정해졌으니 다시 뽑지 않아요)
export function makeDay(rng, state, count) {
  if (count !== undefined) return Array.from({ length: count }, () => makeCustomer(rng, state));
  const n = CUSTOMERS_PER_DAY + (state.bonusCustomers || 0); state.bonusCustomers = 0;
  const list = Array.from({ length: n }, () => makeCustomer(rng, state));
  if (state.day >= 2 && rng() < PROMO.dayChance) list[Math.floor(rng() * n)] = makePromo(rng, state);
  if (rng() < COLLECTOR_CHANCE) {
    const c = makeCollector(rng, state);
    if (c) { let i; do { i = Math.floor(rng() * n); } while (list[i].kind === 'promo'); list[i] = c; }
  }
  const po = makePolice(rng, state); // 장물을 산 지 하루 이틀이 지났으면 경찰이 와요
  if (po) list.splice(Math.floor(rng() * (list.length + 1)), 0, po);
  return list;
}
// 손님 차례가 왔을 때 상황이 바뀌었을 수 있어요(물건을 이미 팔았거나 돈이 변함). 필요하면 다른 손님으로 바꿔 줘요.
export function fixCustomer(rng, state, c) {
  if (c.kind === 'promo') { c.price = promoPrice(state); return c; }
  if (c.kind === 'police') { const due = dueStolen(state); if (!due.length) return makeSeller(rng, state); c.items = due; return c; } // 그 사이 장물을 팔았으면 그냥 지나가요
  if (c.kind === 'buy' && !state.shelf.includes(c.item)) return (c.collector && makeCollector(rng, state)) || makeBuyer(rng, state) || makeSeller(rng, state);
  return c;
}

// 흥정: 결과 {status:'deal'|'counter'|'leave', price?, msg}
// 역제안은 한 방향으로만 움직여요: 사는 손님은 값을 올리기만, 파는 손님은 내리기만 해요.
export function haggle(c, offer) {
  c.rounds = (c.rounds || 0) + 1;
  if (c.kind === 'sell' || c.kind === 'pawn') { // 플레이어가 돈을 내는 쪽 (사 오기 / 대출)
    const pawn = c.kind === 'pawn';
    if (offer >= c.min) return { status: 'deal', price: Math.min(offer, c.ask ?? offer), msg: pawn ? '좋아요! 그 금액이면 맡길게요.' : '좋아요! 그 가격에 팔게요.' }; // 요구가보다 더 낼 필요는 없어요
    c.patience -= offer < c.min * 0.6 ? 2 : 1;
    if (c.patience <= 0) return { status: 'leave', msg: pawn ? '그것밖에 안 돼요? 다른 데 갈래요!' : '너무 박하네요! 안 팔아요!' };
    const floor = round100(c.min);
    const cp = Math.min(c.ask, Math.max(floor, round100(c.min * (1.2 - 0.08 * c.rounds)))); // 현재 요구가보다 낮게, 최저가 아래로는 안 내려감
    c.ask = cp;
    return { status: 'counter', price: cp, msg: c.kind === 'pawn' ? `음... ${cp.toLocaleString()}원은 빌려주셔야 맡길게요.` : `음... ${cp.toLocaleString()}원이면 팔게요.` };
  }
  // 플레이어가 파는 쪽
  if (offer <= c.max) return { status: 'deal', price: Math.max(offer, c.offer ?? offer), msg: '좋아요! 살게요.' }; // 손님이 먼저 부른 값보다 싸게 팔 필요는 없어요
  c.patience -= offer > c.max * 1.4 ? 2 : 1;
  if (c.patience <= 0) return { status: 'leave', msg: '너무 비싸요! 다른 데 갈래요!' };
  const cp = Math.min(c.max, Math.max(c.offer, round100(c.max * Math.min(1, 0.9 + 0.05 * c.rounds)))); // 현재 제안가보다 높게, 최대치를 넘지 않게
  c.offer = cp;
  return { status: 'counter', price: cp, msg: `음... ${cp.toLocaleString()}원이면 살게요.` };
}

export function junkValue(it) { return it.fake ? round100(it.base * 0.05) : round100(trueValue(it) * 0.5); }

export function endDay(s) {
  const rent = RENT(interiorLevel(s));
  s.cash -= rent;
  const sold = []; let soldFor = 0;
  if (s.cash < 0) { // 현금이 모자라면 싼 물건부터 고물상에 팔아서 월세를 내요
    for (const it of [...s.shelf].sort((a, b) => junkValue(a) - junkValue(b))) {
      if (s.cash >= 0) break;
      const v = junkValue(it); s.cash += v; soldFor += v; s.shelf.splice(s.shelf.indexOf(it), 1); sold.push(it);
    }
  }
  const bankrupt = s.cash < 0; // 재고를 다 팔아도 모자랄 때만 파산
  if (!bankrupt) s.day += 1;
  return { rent, bankrupt, sold, soldFor };
}

export function buyUpgrade(s, key) {
  const u = UPGRADES[key]; const lvl = s.up[key];
  if (lvl >= u.costs.length) return { ok: false, msg: '이미 최고 단계예요' };
  if (s.cash < u.costs[lvl]) return { ok: false, msg: '돈이 모자라요' };
  s.cash -= u.costs[lvl]; s.up[key] += 1; return { ok: true };
}
