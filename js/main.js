import { TIERS, UPGRADES, RENT } from './data.js';
import * as G from './logic.js';
import { submitScore, fetchTop, boardEnabled } from './leaderboard.js';

const $ = (id) => document.getElementById(id);
const won = (n) => `${Math.round(n).toLocaleString()}원`;
const signed = (n) => `${n >= 0 ? '+' : '-'}${won(Math.abs(n))}`;
const man = (n) => { n = Math.round(n); const m = Math.floor(n / 10000), r = n % 10000; return m ? `${m.toLocaleString()}만${r ? ` ${r.toLocaleString()}` : ''} 원` : `${n.toLocaleString()} 원`; };
const SAVE_KEY = 'pawn-tycoon-v1';
let S = null;     // 진행 상태
let queue = [];   // 오늘 남은 손님
let cur = null;   // 현재 손님
let total = 0;

const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} };
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } };
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2200); }
function show(name) { for (const s of ['title', 'shop', 'night', 'over']) $('screen-' + s).hidden = s !== name; $('top').hidden = name === 'title'; }

// 그림 파일이 있으면 그림, 없으면 이모지
function pic(kind, id, emoji) {
  const img = document.createElement('img'); img.src = `assets/${kind}/${id}.png`; img.alt = '';
  const span = document.createElement('span'); span.textContent = emoji;
  img.onerror = () => img.replaceWith(span);
  return img;
}
const setPic = (el, kind, o) => el.replaceChildren(pic(kind, o.id, o.emoji));

function refreshTop() {
  $('nick').textContent = S.nick; $('day').textContent = S.day; $('cash').textContent = won(S.cash);
  $('custNo').textContent = `${Math.min(total - queue.length, total)}/${total}`;
  $('loupeLeft').textContent = `${S.loupeLeft}회`;
  const n = `${S.shelf.length}/${G.slotCount(S)}`; $('shelfCount').textContent = n; $('shelfCount2').textContent = n;
}
function renderTrend() {
  const t = S.trend; $('trend').innerHTML = t ? `<b>오늘의 시세</b><span class="t up">▲ ${t.up} +30%</span><span class="t down">▼ ${t.down} -20%</span>` : '';
}

// ---------- 하루 / 손님 ----------
function startDay() {
  G.rollDay(Math.random, S);
  queue = G.makeDay(Math.random, S); total = queue.length; cur = null; save(); show('shop'); renderTrend(); nextCustomer();
}
function nextCustomer() {
  const next = queue.shift();
  if (!next) { cur = null; return endOfDay(); }
  const spr = $('customerSprite');
  const go = () => {
    cur = next; cur.done = false;
    setPic(spr, 'customers', cur.who);
    $('bubble').hidden = true; $('tableItem').replaceChildren();
    spr.className = 'customer enter';
    spr.onanimationend = () => { if (spr.classList.contains('enter')) spr.className = 'customer idle'; };
    const it = cur.item;
    say(cur.kind === 'sell' ? `${it.name}을(를) ${won(cur.ask)}에 팔고 싶어요!` : `${it.name} 사고 싶어요. ${won(cur.offer)}에 어때요?`);
    const t = $('tableItem'); setPic(t, 'items', it); t.className = 'tableitem'; void t.offsetWidth; t.className = 'tableitem drop';
    initPrice(); render(); refreshTop();
    setTimeout(() => { if (cur === next) $('bubble').hidden = false; }, 700);
  };
  if (cur && spr.classList.contains('idle')) { spr.className = 'customer leave'; $('bubble').hidden = true; setTimeout(go, 450); } else go();
}
function say(msg) { $('bubbleWho').textContent = `${cur.who.name} · ${cur.who.role}`; $('bubbleMsg').textContent = msg; }
function floatText(text) { const f = $('float'); f.textContent = text; f.className = 'float'; void f.offsetWidth; f.className = 'float go'; }

// 사 오는 값(매입가) 기준: 내 재고에 없던 옛 저장 데이터는 정상 시세로 대신
const basis = (it) => it.cost ?? G.trueValue(it);
const isSell = () => cur.kind === 'sell';

function initPrice() {
  const c = cur;
  setPrice(c.kind === 'sell' ? c.ask * 0.7 : Math.max(c.offer * 1.2, basis(c.item) * 1.3));
}
function setPrice(v) {
  v = Math.max(100, Math.round(v / 100) * 100); $('price').value = v; updatePreview();
}
const getPrice = () => Math.max(0, Math.round(Number($('price').value) || 0));

function stepsFor(v) {
  const big = 10 ** Math.max(3, Math.floor(Math.log10(Math.max(v, 1000))));
  const small = Math.max(100, big / 100), mid = Math.max(small, big / 10);
  return [...new Set([big, mid, small])];
}
const stepLabel = (n) => (n >= 10000 ? `${n / 10000}만` : n >= 1000 ? `${n / 1000}천` : `${n}`);

function updatePreview() {
  if (!cur || cur.done) { $('priceTag').textContent = ''; return; }
  const p = getPrice(), it = cur.item;
  $('priceTag').textContent = man(p);
  const m = $('margin');
  if (isSell()) {
    const r = cur.appraised ? it.hint : G.roughRange(it);
    const mid = (r.lo + r.hi) / 2, d = mid - p;
    m.textContent = `이 가격에 사면 예상 차익 ${signed(d)} (시세 중간값 기준)`; m.className = 'margin ' + (d >= 0 ? 'gain' : 'loss');
  } else {
    const d = p - basis(it);
    m.textContent = `이 가격에 팔면 차익 ${signed(d)}`; m.className = 'margin ' + (d >= 0 ? 'gain' : 'loss');
  }
}

function render() {
  const c = cur, it = c.item, sell = isSell(), done = c.done;
  // 상단: 상태·기분·이름·인내심
  $('stateTag').textContent = (sell ? '매입 상담' : '판매 상담') + (done ? ` · ${c.result || '종료'}` : ' · 흥정 중');
  const p = Math.max(c.patience, 0);
  $('moodTag').textContent = p >= 3 ? '좋음' : p === 2 ? '보통' : '나쁨';
  $('whoName').textContent = c.who.name; $('whoRole').textContent = c.who.role;
  $('dots').innerHTML = '●'.repeat(p) + `<span class="off">${'●'.repeat(3 - p)}</span>`;
  // 물건 카드
  setPic($('thumb'), 'items', it);
  $('iname').textContent = it.name;
  const tags = [];
  const mult = G.trendMult(S, it);
  tags.push(`<span class="tag">${sell ? G.conditionLabel(it.cond) : G.conditionLabel(it.cond)}</span>`, `<span class="tag">${it.cat}</span>`, `<span class="tag">${TIERS[it.tier]}</span>`);
  if (mult > 1) tags.push('<span class="tag up">인기 ▲</span>'); else if (mult < 1) tags.push('<span class="tag down">비인기 ▼</span>');
  if (sell && c.appraised) tags.push(it.hint.looksReal ? '<span class="tag real">진품 같음 ✔</span>' : '<span class="tag fake">가품 같음 ✖</span>');
  $('itags').innerHTML = tags.join('');
  if (sell) {
    if (c.appraised) { $('irange').textContent = `감정 시세 ${won(it.hint.lo)} ~ ${won(it.hint.hi)}`; $('icost').textContent = `돋보기 ${G.loupeLevel(S)}단계 · 틀릴 수도 있어요`; }
    else { const r = G.roughRange(it); $('irange').textContent = `추정 시세 ${won(r.lo)} ~ ${won(r.hi)} (미감정)`; $('icost').textContent = '감정하면 시세와 진품 여부를 알 수 있어요'; }
  } else {
    $('irange').textContent = `내 판단 시세 ${won(G.trueValue(it) * mult)}`;
    $('icost').textContent = it.cost != null ? `내 매입가 ${won(it.cost)}` : '';
  }
  // 가격 줄
  $('offerLabel').textContent = sell ? '손님 요구가' : '손님 제안가';
  $('offerVal').textContent = won(sell ? c.ask : c.offer);
  $('askLabel').textContent = sell ? '내 제안가' : '내 요구가';
  // 빠른 버튼
  const st = stepsFor(sell ? c.ask : basis(it) * 1.5); const sb = $('steps'); sb.innerHTML = '';
  sb.style.gridTemplateColumns = `repeat(${st.length * 2},1fr)`;
  for (const s of [...st].reverse()) sb.append(btn(`-${stepLabel(s)}`, () => setPrice(getPrice() - s)));
  for (const s of st) sb.append(btn(`+${stepLabel(s)}`, () => setPrice(getPrice() + s)));
  const mb = $('mults'); mb.innerHTML = '';
  const base = sell ? c.ask : basis(it), facs = sell ? [0.5, 0.7, 0.9] : [1.3, 1.6, 2];
  for (const f of facs) mb.append(btn(`${sell ? '요구가' : it.cost != null ? '매입가' : '시세'}×${f}`, () => setPrice(base * f)));
  // 버튼들
  $('negotiate').hidden = done; $('btnNext').hidden = !done; $('btnNext').textContent = queue.length ? '다음 손님' : '하루 마치기';
  $('btnAppraise').hidden = !sell || done; $('btnOffer').hidden = done; $('btnDeal').hidden = done; $('btnDecline').hidden = done;
  document.querySelector('.row2').style.display = done ? 'none' : '';
  document.querySelector('.row2').style.gridTemplateColumns = sell ? '' : '1fr';
  $('btnAppraise').textContent = c.appraised ? '감정 완료 ✔' : `감정하기 (돋보기 ${S.loupeLeft})`;
  $('btnAppraise').disabled = c.appraised || S.loupeLeft <= 0;
  $('btnOffer').textContent = sell ? '이 가격 제안' : '이 가격 요구';
  if (sell) $('btnDeal').textContent = `요구가에 구매 (${won(c.ask)})`;
  else $('btnDeal').textContent = `제안가에 판매 (${won(c.offer)}, 차익 ${signed(c.offer - basis(it))})`;
  $('btnDecline').textContent = sell ? '사지 않기' : '팔지 않기';
  updatePreview();
}
function btn(label, fn) { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; return b; }

// ---------- 흥정 ----------
function canBuy(price) {
  if (price > S.cash) { toast('가진 돈보다 비싸요'); return false; }
  if (S.shelf.length >= G.slotCount(S)) { toast('진열대가 가득 찼어요. 재고를 처분하세요'); return false; }
  return true;
}
function onOffer() {
  const offer = getPrice(); if (!(offer > 0)) return toast('가격을 입력하세요');
  if (isSell() && !canBuy(offer)) return;
  settle(G.haggle(cur, offer));
}
function onDeal() {
  const price = isSell() ? cur.ask : cur.offer;
  if (isSell() && !canBuy(price)) return;
  settle({ status: 'deal', price, msg: '거래 성사!' });
}
function onAppraise() {
  if (!G.appraise(S, cur)) return toast('돋보기 횟수가 없어요');
  save(); refreshTop(); render();
  say(cur.item.hint.looksReal ? '(돋보기로 보니 진품 같아요!)' : '(돋보기로 보니 뭔가 수상한데요...)');
}
function finish(result, msg) {
  cur.done = true; cur.result = result; if (msg) say(msg);
  $('tableItem').className = 'tableitem take'; $('priceTag').textContent = ''; render();
}
function settle(r) {
  const c = cur;
  if (r.status === 'deal') {
    if (c.kind === 'sell') { c.item.cost = r.price; S.cash -= r.price; S.shelf.push(c.item); floatText(`-${won(r.price)}`); toast(`${c.item.name}을(를) ${won(r.price)}에 샀어요`); }
    else {
      S.cash += r.price; S.shelf = S.shelf.filter((x) => x !== c.item); floatText(`+${won(r.price)} 💰`);
      toast(`${won(r.price)}에 팔았어요! (차익 ${signed(r.price - basis(c.item))})`);
    }
    save(); refreshTop(); finish('거래 성사 🤝', r.msg + ' 🤝');
  } else if (r.status === 'leave') finish('손님이 떠남 😤', r.msg + ' 😤');
  else { say(r.msg); render(); }
}
function onDecline() { finish('거절', c2(cur.kind === 'sell' ? '아쉽네요, 다음에 올게요.' : '그럼 다음에 올게요.')); }
const c2 = (m) => m;

// ---------- 재고(진열대) ----------
function renderShelf() {
  const n = G.slotCount(S); refreshTop();
  const box = $('shelf'); box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const it = S.shelf[i], d = document.createElement('div'); d.className = 'slot' + (it ? '' : ' empty');
    if (!it) { d.textContent = '빈칸'; box.append(d); continue; }
    const e = document.createElement('div'); e.className = 'e'; setPic(e, 'items', it);
    const nm = document.createElement('div'); nm.textContent = it.name;
    const cost = document.createElement('div'); cost.className = 'small'; cost.textContent = it.cost != null ? `매입 ${won(it.cost)}` : '';
    const b = document.createElement('button'); b.textContent = `고물상 ${won(G.junkValue(it))}`;
    b.onclick = () => {
      if (!confirm(`${it.name}을(를) 고물상에 ${won(G.junkValue(it))}에 팔까요?`)) return;
      S.cash += G.junkValue(it); S.shelf.splice(i, 1); save(); renderShelf();
      if (cur && !cur.done) { if (cur.kind === 'buy' && cur.item === it) finish('물건이 없어짐', '어... 물건이 없어졌네요.'); else render(); }
    };
    d.append(e, nm, cost, b); box.append(d);
  }
}

// ---------- 밤: 정산과 업그레이드 ----------
async function endOfDay() {
  const { rent, bankrupt } = G.endDay(S);
  refreshTop(); save();
  if (bankrupt) { $('overMsg').textContent = `월세 ${won(rent)}을 내지 못했어요. 최종 ${S.day}일차.`; localStorage.removeItem(SAVE_KEY); return show('over'); }
  $('nightTitle').textContent = `🌙 ${S.day - 1}일차 마감`;
  $('nightSummary').innerHTML = `월세 <b>-${won(rent)}</b><br>가진 돈 <b>${won(S.cash)}</b><br>진열품 가치 <b>${won(G.netWorth(S) - S.cash)}</b><br>총 재산 <b>${won(G.netWorth(S))}</b> <span id="subStatus" class="small"></span>`;
  renderUpgrades(); show('night');
  const r = await submitScore(S, G.netWorth(S));
  const el = $('subStatus'); if (!el) return;
  el.textContent = r.ok ? '· 순위에 올렸어요 ✔' : r.reason === 'nick_taken' ? '· 이미 쓰는 닉네임이에요 (순위 미등록)' : r.reason === 'off' ? '' : '· 순위 전송 실패';
}
function renderUpgrades() {
  const box = $('upgrades'); box.innerHTML = '';
  for (const [key, u] of Object.entries(UPGRADES)) {
    const lvl = S.up[key], maxed = lvl >= u.costs.length;
    const d = document.createElement('div'); d.className = 'up';
    d.innerHTML = `<div><b>${u.name}</b> ${u.levels[lvl]}${key === 'slots' ? '칸' : '단계'}<br><span class="small">${u.desc}</span></div>`;
    const b = document.createElement('button'); b.textContent = maxed ? '최고!' : `${won(u.costs[lvl])}`; b.disabled = maxed || S.cash < u.costs[lvl];
    b.onclick = () => { const r = G.buyUpgrade(S, key); if (r.ok) { save(); refreshTop(); renderUpgrades(); toast(`${u.name} 업그레이드!`); } else toast(r.msg); };
    d.append(b); box.append(d);
  }
  const rent = document.createElement('div'); rent.className = 'small'; rent.textContent = `내일 월세: ${won(RENT(G.interiorLevel(S)))}`; box.append(rent);
}

// ---------- 순위 ----------
async function openBoard() {
  $('modal').hidden = false; const box = $('board');
  if (!boardEnabled()) { box.textContent = '순위표를 준비하는 중이에요. (Supabase 연결 전)'; return; }
  box.textContent = '불러오는 중...'; const rows = await fetchTop(20);
  if (!rows) { box.textContent = '순위를 불러오지 못했어요.'; return; }
  box.innerHTML = rows.length ? '' : '아직 아무도 없어요. 첫 번째가 되어 보세요!';
  rows.forEach((r, i) => { const d = document.createElement('div'); d.className = 'rank' + (S && r.nick === S.nick ? ' me' : ''); d.innerHTML = `<span>${i + 1}. </span><span style="flex:1;padding-left:6px"></span><span></span>`; d.children[1].textContent = `${r.nick} (${r.day}일)`; d.children[2].textContent = won(r.worth); box.append(d); });
}

// ---------- 시작 ----------
function begin(state) { S = state; S.loupeLeft ??= 0; S.trend ??= null; for (const it of S.shelf) it.cat ??= undefined; startDay(); }
$('btnStart').onclick = () => {
  const nick = $('nickInput').value.trim();
  if (!nick) return toast('닉네임을 입력하세요');
  const saved = load();
  begin(saved && saved.nick === nick ? saved : G.newState(nick));
};
$('btnRestart').onclick = () => { $('nickInput').value = S.nick; show('title'); };
$('btnNext').onclick = nextCustomer;
$('btnOffer').onclick = onOffer; $('btnDeal').onclick = onDeal; $('btnDecline').onclick = onDecline; $('btnAppraise').onclick = onAppraise;
$('btnNextDay').onclick = startDay;
$('btnBoard').onclick = $('btnTitleBoard').onclick = openBoard;
$('btnCloseBoard').onclick = () => ($('modal').hidden = true);
$('btnShelf').onclick = () => { renderShelf(); $('shelfModal').hidden = false; };
$('btnCloseShelf').onclick = () => ($('shelfModal').hidden = true);
$('price').addEventListener('input', updatePreview);
$('price').addEventListener('keydown', (e) => { if (e.key === 'Enter') onOffer(); });
const prev = load(); if (prev) $('nickInput').value = prev.nick;
show('title');
window.__pawn = { get S() { return S; } };
