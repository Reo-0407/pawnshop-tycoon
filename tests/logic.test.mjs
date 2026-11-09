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
