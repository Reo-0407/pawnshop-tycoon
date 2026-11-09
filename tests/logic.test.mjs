import assert from 'node:assert/strict';
import { newState, makeDay, makeItem, haggle, netWorth, endDay, buyUpgrade, trueValue, junkValue } from '../js/logic.js';
let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const s = newState('테스트');
assert.equal(netWorth(s), 100000);
const day = makeDay(rng, s); assert.equal(day.length, 8);
// 파는 손님: 최저가 이상이면 거래, 낮으면 인내심 소모 후 떠남
const c = { kind: 'sell', min: 10000, ask: 14000, patience: 3, item: makeItem(rng, s) };
assert.equal(haggle(c, 10000).status, 'deal');
assert.equal(haggle(c, 5000).status, 'counter'); // 인내심 3 -> 1
assert.equal(haggle(c, 5000).status, 'leave');
// 사는 손님
const b = { kind: 'buy', max: 20000, patience: 3 };
assert.equal(haggle(b, 20000).status, 'deal');
assert.equal(haggle(b, 25000).status, 'counter');
// 시세 범위에 진짜 가치가 들어있는지(진품)
for (let i = 0; i < 500; i++) { const it = makeItem(rng, s); const v = it.base * it.cond; assert.ok(it.hint.lo <= v + 100 && v - 100 <= it.hint.hi, 'hint range'); }
// 가품 가치 0, 고물상 5%
const f = { ...makeItem(rng, s), fake: true }; assert.equal(trueValue(f), 0); assert.ok(junkValue(f) < f.base * 0.06);
// 월세와 업그레이드
s.cash = 1000; assert.equal(endDay(s).bankrupt, true);
s.cash = 50000; assert.equal(buyUpgrade(s, 'slots').ok, true); assert.equal(s.cash, 20000);
assert.equal(buyUpgrade(s, 'slots').ok, false);
console.log('모든 테스트 통과');

// ---- 시세·감정·제안가 ----
{
  const { rollDay, appraise, trendMult, roughRange, makeCustomer, newState: ns } = await import('../js/logic.js');
  const t = ns('시세'); rollDay(rng, t);
  assert.notEqual(t.trend.up, t.trend.down); assert.equal(t.loupeLeft, 3);
  assert.equal(trendMult(t, { cat: t.trend.up }), 1.3); assert.equal(trendMult(t, { cat: t.trend.down }), 0.8);
  const c = { appraised: false }; assert.equal(appraise(t, c), true); assert.equal(t.loupeLeft, 2); assert.equal(appraise(t, c), false);
  t.loupeLeft = 0; assert.equal(appraise(t, { appraised: false }), false);
  const it = makeItem(rng, t); const rr = roughRange(it); assert.ok(rr.lo < it.hint.lo + 1 && rr.hi > it.hint.hi - 1);
  { const { addToStock } = await import('../js/logic.js'); const x = makeItem(rng, t, 2); x.fake = false; addToStock(t, x); }
  let buy = null; for (let i = 0; i < 200 && !buy; i++) { const x = makeCustomer(rng, t); if (x.kind === 'buy') buy = x; }
  assert.ok(buy && buy.offer <= buy.max);
  const r = haggle({ ...buy, patience: 3 }, buy.max * 3); assert.equal(r.status, 'counter');
}
console.log('시세·감정 테스트 통과');

// ---- 보관은 무제한, 진열만 칸 수 제한 ----
{
  const L = await import('../js/logic.js');
  const u = L.newState('보관'); L.rollDay(rng, u);
  assert.equal(L.slotCount(u), 4);
  const shown = []; for (let i = 0; i < 10; i++) shown.push(L.addToStock(u, L.makeItem(rng, u)));
  assert.equal(u.shelf.length, 10);                       // 10개 보관 가능
  assert.equal(L.displayedCount(u), 4);                   // 진열은 4칸까지만
  assert.deepEqual(shown.slice(0, 4), [true, true, true, true]); assert.equal(shown[4], false);
  const stored = u.shelf.find((it) => !it.shown);
  assert.equal(L.setShown(u, stored, true), false);       // 칸이 가득 차면 진열 불가
  const on = u.shelf.find((it) => it.shown); assert.equal(L.setShown(u, on, false), true); assert.equal(L.setShown(u, stored, true), true);
  // 사는 손님은 진열 중인 진품만 고른다
  for (const it of u.shelf) { it.fake = false; it.shown = false; } u.shelf[0].shown = true;
  for (let i = 0; i < 300; i++) { const c = L.makeCustomer(rng, u); if (c.kind === 'buy') assert.equal(c.item, u.shelf[0]); }
  // 옛 저장 데이터 정리
  const old = L.newState('옛날'); old.shelf = [L.makeItem(rng, old), L.makeItem(rng, old), L.makeItem(rng, old), L.makeItem(rng, old), L.makeItem(rng, old)];
  for (const it of old.shelf) delete it.shown; L.migrateStock(old); assert.equal(L.displayedCount(old), 4);
}
console.log('보관·진열 테스트 통과');
