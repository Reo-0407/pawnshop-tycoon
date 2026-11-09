import assert from 'node:assert/strict';
import * as L from '../js/logic.js';
import { COLLECTORS, COLLECTOR_MULT, PROMO } from '../js/data.js';
let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const { newState, makeDay, makeItem, haggle, netWorth, endDay, buyUpgrade, trueValue, junkValue } = L;

// ---- 기본 규칙 ----
const s = newState('테스트');
assert.equal(netWorth(s), 100000);
assert.equal(makeDay(rng, s).length, 8);
const c = { kind: 'sell', min: 10000, ask: 14000, patience: 3, item: makeItem(rng, s) };
assert.equal(haggle(c, 10000).status, 'deal');
assert.equal(haggle(c, 5000).status, 'counter');
assert.equal(haggle(c, 5000).status, 'leave');
const b = { kind: 'buy', max: 20000, patience: 3 };
assert.equal(haggle(b, 20000).status, 'deal');
assert.equal(haggle(b, 25000).status, 'counter');
for (let i = 0; i < 500; i++) { const it = makeItem(rng, s); const v = it.base * it.cond; assert.ok(it.hint.lo <= v + 100 && v - 100 <= it.hint.hi, 'hint range'); }
const f = { ...makeItem(rng, s), fake: true }; assert.equal(trueValue(f), 0); assert.ok(junkValue(f) < f.base * 0.06);
s.cash = 1000; assert.equal(endDay(s).bankrupt, true);
s.cash = 50000; assert.equal(buyUpgrade(s, 'loupe').ok, false);            // 80,000원짜리라 모자람
assert.equal(buyUpgrade(s, 'interior').ok, true); assert.equal(s.cash, 0);   // 50,000원짜리는 가능
console.log('기본 규칙 테스트 통과');

// ---- 시세·감정 ----
{
  const t = newState('시세'); L.rollDay(rng, t);
  assert.notEqual(t.trend.up, t.trend.down); assert.equal(t.loupeLeft, 3);
  assert.equal(L.trendMult(t, { cat: t.trend.up }), 1.3); assert.equal(L.trendMult(t, { cat: t.trend.down }), 0.8);
  const cc = { appraised: false }; assert.equal(L.appraise(t, cc), true); assert.equal(t.loupeLeft, 2); assert.equal(L.appraise(t, cc), false);
}
console.log('시세·감정 테스트 통과');

// ---- 진열대 없음: 재고 전체에서 사 가고, 재고는 무제한 ----
{
  const u = newState('재고'); L.rollDay(rng, u);
  for (let i = 0; i < 30; i++) { const it = makeItem(rng, u); it.fake = false; u.shelf.push(it); }
  assert.equal(u.shelf.length, 30);
  const seen = new Set();
  for (let i = 0; i < 600; i++) { const x = L.makeCustomer(rng, u); if (x.kind === 'buy') { assert.ok(u.shelf.includes(x.item)); seen.add(x.item); } }
  assert.ok(seen.size > 8, '재고 여러 개에서 골라 간다');
  // 가품은 사 가지 않는다
  const v = newState('가품'); v.shelf.push({ ...makeItem(rng, v), fake: true });
  for (let i = 0; i < 200; i++) assert.notEqual(L.makeCustomer(rng, v).kind, 'buy');
  assert.equal(L.slotCount, undefined);
}
console.log('재고 테스트 통과');

// ---- 수집가: 재고에 원하는 물건이 있을 때만, 정상 시세의 2배 ----
{
  const w = newState('수집'); L.rollDay(rng, w);
  assert.equal(L.makeCollector(rng, w), null);                           // 재고가 비었으면 안 옴
  const can = { id: 'can', name: '찌그러진 깡통', cat: '생활용품', tier: 0, base: 800, cond: 1, fake: false, hint: { lo: 0, hi: 0 } };
  w.shelf.push(can);
  let got = null; for (let i = 0; i < 100 && !got; i++) { const k = L.makeCollector(rng, w); if (k && k.collector.want.id === 'can') got = k; }
  assert.ok(got, '깡통 수집가가 생김'); assert.equal(got.collector.role, '깡통 수집가'); assert.equal(got.who.role, '깡통 수집가');
  assert.equal(got.offer, 800 * COLLECTOR_MULT); assert.ok(got.max > got.offer); assert.equal(got.item, can);
  assert.equal(haggle({ ...got }, got.offer).status, 'deal');
  // 날마다 한 번쯤은 나오고 하루에 한 명 이하
  let days = 0, withCollector = 0;
  for (let i = 0; i < 400; i++) { const d = makeDay(rng, w); const n = d.filter((x) => x.collector).length; assert.ok(n <= 1); if (n) withCollector++; days++; }
  assert.ok(withCollector > 50 && withCollector < 250, `수집가 빈도 ${withCollector}/400`);
  // 물건을 이미 팔았으면 차례가 왔을 때 다른 손님으로 바뀜
  const k = L.makeCollector(rng, w); w.shelf = []; const fixed = L.fixCustomer(rng, w, k);
  assert.notEqual(fixed, k); assert.equal(fixed.kind, 'sell');
}
console.log('수집가 테스트 통과');

// ---- 마케팅 도우미: 사기일 수도 있다 ----
{
  const m = newState('홍보'); m.day = 3; L.rollDay(rng, m); m.cash = 500000;
  assert.equal(L.promoPrice(m), 60000); m.cash = 1000; assert.equal(L.promoPrice(m), PROMO.minPrice); m.cash = 5000000; assert.equal(L.promoPrice(m), PROMO.maxPrice);
  m.cash = 500000;
  let scams = 0; const N = 1000;
  for (let i = 0; i < N; i++) { const p = L.makePromo(rng, m); if (p.scam) scams++; assert.equal(p.kind, 'promo'); }
  assert.ok(scams > 330 && scams < 470, `사기 비율 ${scams}/1000`);
  const ok = { ...L.makePromo(rng, m), scam: false }, bad = { ...L.makePromo(rng, m), scam: true };
  const before = m.cash;
  assert.equal(L.acceptPromo(m, ok).bonus, PROMO.bonus); assert.equal(m.bonusCustomers, PROMO.bonus); assert.equal(m.cash, before - ok.price);
  const cash2 = m.cash; assert.equal(L.acceptPromo(m, bad).scam, true); assert.equal(m.bonusCustomers, PROMO.bonus); assert.equal(m.cash, cash2 - bad.price); // 사기: 돈만 나감
  // 다음 날 손님이 늘고 보너스는 한 번만
  const d = makeDay(rng, m); assert.equal(d.length, 8 + PROMO.bonus); assert.equal(m.bonusCustomers, 0); assert.equal(makeDay(rng, m).length, 8);
  // 첫날엔 안 옴
  const first = newState('첫날'); L.rollDay(rng, first); for (let i = 0; i < 200; i++) assert.ok(!makeDay(rng, first).some((x) => x.kind === 'promo'));
  // 돋보기 정확도만큼 판정이 맞는다 (3단계 95%)
  const sharp = newState('눈'); sharp.up.loupe = 2; let right = 0; for (let i = 0; i < 1000; i++) { const p = L.makePromo(rng, sharp); if (p.looksScam === p.scam) right++; }
  assert.ok(right > 920, `3단계 판정 정확도 ${right}/1000`);
}
console.log('마케팅 도우미 테스트 통과');

// ---- 흥정: 역제안은 한 방향으로만 (버그 수정: 사는 손님이 30,000 -> 28,500 으로 내려가던 문제) ----
{
  for (let n = 0; n < 500; n++) {
    const q = newState('흥정'); L.rollDay(rng, q);
    // 사는 손님(내가 파는 쪽): 계속 너무 비싸게 불러도 손님 제안가는 내려가면 안 된다
    const max = 20000 + Math.floor(rng() * 80000), b = { kind: 'buy', max, offer: Math.round(max * (0.55 + rng() * 0.2) / 100) * 100, patience: 3 };
    let prev = b.offer;
    for (let r = 0; r < 4; r++) { const res = haggle(b, max * (1.1 + rng())); if (res.status !== 'counter') break; assert.ok(res.price >= prev, `사는 손님 제안가가 내려감 ${prev} -> ${res.price}`); assert.ok(res.price <= max); prev = res.price; }
    // 파는 손님(내가 사는 쪽): 계속 낮게 불러도 손님 요구가는 올라가면 안 되고 최저가 아래로도 안 내려간다
    const min = 5000 + Math.floor(rng() * 50000), sl = { kind: 'sell', min, ask: Math.round(min * (1.18 + rng() * 0.5) / 100) * 100, patience: 3 };
    let pa = sl.ask;
    for (let r = 0; r < 4; r++) { const res = haggle(sl, min * 0.7); if (res.status !== 'counter') break; assert.ok(res.price <= pa, `파는 손님 요구가가 올라감 ${pa} -> ${res.price}`); assert.ok(res.price >= Math.round(min / 100) * 100); pa = res.price; }
  }
  // 사용자가 겪은 상황: 손님 제안가 30,000 -> 내가 35,000 -> 그다음 역제안이 30,000 아래로 내려가면 안 된다
  const k = { kind: 'buy', max: 31300, offer: 30000, patience: 3 };
  const r1 = haggle(k, 35000); assert.equal(r1.status, 'counter'); assert.ok(r1.price >= 30000);
  const r2 = haggle(k, 35000); if (r2.status === 'counter') assert.ok(r2.price >= r1.price);
}
console.log('흥정 방향 테스트 통과');

// ---- 버그 수정 모음 ----
{
  // 파는 손님에게 요구가보다 훨씬 많이 적어도 요구가만 낸다 / 사는 손님은 자기 제안가보다 싸게 사지 않는다
  assert.equal(haggle({ kind: 'sell', min: 10000, ask: 14000, patience: 3 }, 1400000).price, 14000);
  assert.equal(haggle({ kind: 'sell', min: 10000, ask: 14000, patience: 3 }, 12000).price, 12000);
  assert.equal(haggle({ kind: 'buy', max: 40000, offer: 30000, patience: 3 }, 20000).price, 30000);
  assert.equal(haggle({ kind: 'buy', max: 40000, offer: 30000, patience: 3 }, 35000).price, 35000);

  // 월세: 현금이 모자라면 싼 물건부터 팔아서 내고, 다 팔아도 모자랄 때만 파산
  const mk = (cash, items) => { const z = newState('월세'); z.cash = cash; z.shelf = items.map((v) => ({ id: 'x', name: 'x', base: v, cond: 1, fake: false })); return z; };
  let z = mk(500, [100000, 20000, 6000]);                       // 월세 3,000원: 500 - 3,000 = -2,500
  let r = L.endDay(z); assert.equal(r.bankrupt, false); assert.equal(r.sold.length, 1);   // 6,000원짜리 하나(고물상 3,000원)만 팔면 됨
  assert.equal(z.shelf.length, 2); assert.equal(z.cash, 500 - 3000 + 3000); assert.equal(z.day, 2);
  z = mk(0, [2000]);                                           // 다 팔아도(1,000원) 3,000원 월세 못 냄
  r = L.endDay(z); assert.equal(r.bankrupt, true); assert.equal(z.day, 1);
  z = mk(10000, [100000]); r = L.endDay(z); assert.equal(r.sold.length, 0); assert.equal(z.cash, 7000);

  // 이어하기: count 를 주면 그 수만큼만, 보너스는 건드리지 않는다
  const q = newState('이어'); q.bonusCustomers = 4; L.rollDay(rng, q);
  assert.equal(makeDay(rng, q, 3).length, 3); assert.equal(q.bonusCustomers, 4); assert.equal(makeDay(rng, q, 0).length, 0);
}
console.log('버그 수정 테스트 통과');
