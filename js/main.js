import { TIERS, UPGRADES, RENT, PROMO, COLLECTOR_MULT } from './data.js?v=12';
import * as G from './logic.js?v=12';
import { submitScore, fetchTop, boardEnabled } from './leaderboard.js?v=12';

const $ = (id) => document.getElementById(id);
const won = (n) => `${Math.round(n).toLocaleString()}원`;
const signed = (n) => `${n >= 0 ? '+' : '-'}${won(Math.abs(n))}`;
const man = (n) => { n = Math.round(n); const m = Math.floor(n / 10000), r = n % 10000; return m ? `${m.toLocaleString()}만${r ? ` ${r.toLocaleString()}` : ''} 원` : `${n.toLocaleString()} 원`; };
const OLD_KEY = 'pawn-tycoon-v1', LAST_KEY = 'pawn-last-nick';
const saveKey = (n) => `pawn-save:${n}`, secretKey = (n) => `pawn-secret:${n}`;
let S = null;     // 진행 상태
let queue = [];   // 오늘 남은 손님
let cur = null;   // 현재 손님
let total = 0;

const save = () => { try { localStorage.setItem(saveKey(S.nick), JSON.stringify(S)); localStorage.setItem(secretKey(S.nick), S.secret); localStorage.setItem(LAST_KEY, S.nick); } catch {} };
const load = (nick) => { try { let v = JSON.parse(localStorage.getItem(saveKey(nick))); if (!v) { const old = JSON.parse(localStorage.getItem(OLD_KEY)); if (old && old.nick === nick) v = old; } return v; } catch { return null; } };
const lastNick = () => { try { return localStorage.getItem(LAST_KEY) || (JSON.parse(localStorage.getItem(OLD_KEY)) || {}).nick || ''; } catch { return ''; } };
// 비밀키는 닉네임별로 따로 기억해요: 파산 후 다시 시작해도 순위표에서 내 닉네임이 잠기지 않게
function freshState(nick) { const st = G.newState(nick); try { const k = localStorage.getItem(secretKey(nick)); if (k) st.secret = k; } catch {} return st; }
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2200); }
function show(name) { for (const s of ['title', 'shop', 'night', 'over']) $('screen-' + s).hidden = s !== name; $('top').hidden = name === 'title'; document.body.classList.toggle('title', name === 'title'); }

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
  $('shelfCount').textContent = `${S.shelf.length}개`;
  $('shelfCount2').textContent = `${S.shelf.length}개 · 가치 ${won(S.shelf.reduce((a, it) => a + G.trueValue(it), 0))}`;
}
function renderTrend() {
  const t = S.trend; $('trend').innerHTML = t ? `<b>오늘의 시세</b><span class="t up">▲ ${t.up} +30%</span><span class="t down">▼ ${t.down} -20%</span>` : '';
}

// ---------- 하루 / 손님 ----------
function startDay(resume = false) {
  if (resume) { queue = G.makeDay(Math.random, S, S.remain); total = S.dayTotal || queue.length; } // 하루 도중 새로고침: 돋보기 횟수·시세는 그대로
  else { G.rollDay(Math.random, S); queue = G.makeDay(Math.random, S); total = queue.length; S.dayTotal = total; S.remain = total; S.phase = 'day'; }
  cur = null; save(); show('shop'); renderTrend(); nextCustomer();
}
let busy = false; // 손님이 걸어 나가는 동안 '다음 손님'을 또 눌러도 한 명만 넘어가게
function nextCustomer() {
  if (busy) return;
  const raw = queue.shift();
  if (!raw) { cur = null; return endOfDay(); }
  busy = true;
  const next = G.fixCustomer(Math.random, S, raw); // 그 사이 재고가 바뀌었으면 손님을 바꿔 줘요
  const spr = $('customerSprite');
  const go = () => {
    cur = next; cur.done = false;
    setPic(spr, 'customers', cur.who);
    $('bubble').hidden = true; $('tableItem').replaceChildren();
    spr.className = 'customer enter';
    spr.onanimationend = () => { if (spr.classList.contains('enter')) spr.className = 'customer idle'; };
    const it = cur.item, t = $('tableItem');
    if (cur.kind === 'promo') {
      say(`안녕하세요! 마케팅 도우미예요. 홍보비 ${won(cur.price)}만 주시면 내일 손님이 ${PROMO.bonus}명 더 오게 해 드려요!`);
      const sp = document.createElement('span'); sp.textContent = '📣'; t.replaceChildren(sp);
    } else if (cur.collector) {
      say(`${cur.who.role}예요! ${it.name}을(를) 시세의 ${COLLECTOR_MULT}배, ${won(cur.offer)}에 꼭 사고 싶어요!`);
      setPic(t, 'items', it);
    } else {
      say(cur.kind === 'sell' ? `${it.name}을(를) ${won(cur.ask)}에 팔고 싶어요!` : `${it.name} 사고 싶어요. ${won(cur.offer)}에 어때요?`);
      setPic(t, 'items', it);
    }
    t.className = 'tableitem'; void t.offsetWidth; t.className = 'tableitem drop';
    if (cur.kind !== 'promo') initPrice();
    render(); refreshTop(); busy = false;
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
  if (cur.kind === 'promo') { $('priceTag').textContent = man(cur.price); return; }
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
  const c = cur, it = c.item, promo = c.kind === 'promo', sell = c.kind === 'sell', done = c.done;
  // 상단: 상태·기분·이름·인내심
  $('stateTag').textContent = (promo ? '마케팅 제안' : sell ? '매입 상담' : c.collector ? '수집가 상담' : '판매 상담') + (done ? ` · ${c.result || '종료'}` : promo ? ' · 검토 중' : ' · 흥정 중');
  const p = Math.max(c.patience, 0);
  $('moodTag').textContent = promo ? '수상?' : p >= 3 ? '좋음' : p === 2 ? '보통' : '나쁨';
  $('whoName').textContent = c.who.name; $('whoRole').textContent = c.who.role;
  $('dots').innerHTML = promo ? '' : '●'.repeat(p) + `<span class="off">${'●'.repeat(3 - p)}</span>`;
  document.querySelector('.patience').style.visibility = promo ? 'hidden' : '';
  const tags = [];
  if (promo) {
    const sp = document.createElement('span'); sp.textContent = '📣'; $('thumb').replaceChildren(sp);
    $('iname').textContent = '홍보 패키지';
    tags.push('<span class="tag">서비스</span>', `<span class="tag up">내일 손님 +${PROMO.bonus}명 (?)</span>`);
    if (c.appraised) tags.push(c.looksScam ? '<span class="tag fake">사기 같음 ✖</span>' : '<span class="tag real">믿을 만함 ✔</span>');
    $('itags').innerHTML = tags.join('');
    $('irange').textContent = `홍보비 ${won(c.price)}`;
    $('icost').textContent = c.appraised ? `돋보기 ${G.loupeLevel(S)}단계 · 틀릴 수도 있어요` : '돋보기로 수상한 점이 있는지 살펴볼 수 있어요';
    $('offerLabel').textContent = '홍보비'; $('offerVal').textContent = won(c.price);
  } else {
    setPic($('thumb'), 'items', it);
    $('iname').textContent = it.name;
    const mult = G.trendMult(S, it);
    tags.push(`<span class="tag">${G.conditionLabel(it.cond)}</span>`, `<span class="tag">${it.cat}</span>`, `<span class="tag">${TIERS[it.tier]}</span>`);
    if (c.collector) tags.push(`<span class="tag up">수집가 특가 ×${COLLECTOR_MULT}</span>`);
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
    $('offerLabel').textContent = sell ? '손님 요구가' : c.collector ? '수집가 제안가' : '손님 제안가';
    $('offerVal').textContent = won(sell ? c.ask : c.offer);
    $('askLabel').textContent = sell ? '내 제안가' : '내 요구가';
    // 빠른 버튼
    const st = stepsFor(sell ? c.ask : basis(it) * 1.5); const sb = $('steps'); sb.innerHTML = '';
    sb.style.gridTemplateColumns = `repeat(${st.length * 2},1fr)`;
    for (const x of [...st].reverse()) sb.append(btn(`-${stepLabel(x)}`, () => setPrice(getPrice() - x)));
    for (const x of st) sb.append(btn(`+${stepLabel(x)}`, () => setPrice(getPrice() + x)));
    const mb = $('mults'); mb.innerHTML = '';
    const base = sell ? c.ask : basis(it), facs = sell ? [0.5, 0.7, 0.9] : [1.3, 1.6, 2];
    for (const f of facs) mb.append(btn(`${sell ? '요구가' : it.cost != null ? '매입가' : '시세'}×${f}`, () => setPrice(base * f)));
  }
  // 버튼들
  $('negotiate').hidden = done || promo; $('btnNext').hidden = !done; $('btnNext').textContent = queue.length ? '다음 손님' : '하루 마치기';
  $('btnAppraise').hidden = !(sell || promo) || done; $('btnOffer').hidden = done; $('btnDecline').hidden = done;
  document.querySelector('.row2').style.display = done ? 'none' : '';
  document.querySelector('.row2').style.gridTemplateColumns = (sell || promo) ? '' : '1fr';
  $('btnAppraise').textContent = c.appraised ? '감정 완료 ✔' : promo ? `수상한 점 찾기 (돋보기 ${S.loupeLeft})` : `감정하기 (돋보기 ${S.loupeLeft})`;
  $('btnAppraise').disabled = c.appraised || S.loupeLeft <= 0;
  $('btnOffer').textContent = promo ? `맡기기 (${won(c.price)})` : sell ? '이 가격 제안' : '이 가격 요구';
  $('btnDecline').textContent = promo ? '거절하기' : sell ? '사지 않기' : '팔지 않기';
  updatePreview();
}
function btn(label, fn) { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; return b; }

// ---------- 흥정 ----------
function canBuy(price) {
  if (price > S.cash) { toast('가진 돈보다 비싸요'); return false; }
  return true;
}
function onPromo() {
  if (S.cash < cur.price) return toast('가진 돈이 모자라요');
  const r = G.acceptPromo(S, cur); save(); refreshTop();
  if (r.scam) { floatText(`-${won(cur.price)} 😭`); toast('사기였어요! 홍보비만 날렸어요'); finish('사기였어요 😭', '하하, 고마워요! (홍보는... 음... 안 해요)'); }
  else { floatText(`내일 손님 +${r.bonus}명 📣`); toast(`홍보 성공! 내일 손님이 ${r.bonus}명 더 와요`); finish('홍보 성공 📣', '맡겨 주세요! 내일은 손님이 북적일 거예요!'); }
}
function onOffer() {
  if (cur.kind === 'promo') return onPromo();
  const offer = getPrice(); if (!(offer > 0)) return toast('가격을 입력하세요');
  if (isSell() && !canBuy(offer)) return;
  settle(G.haggle(cur, offer));
}
function onAppraise() {
  if (!G.appraise(S, cur)) return toast('돋보기 횟수가 없어요');
  save(); refreshTop(); render();
  if (cur.kind === 'promo') say(cur.looksScam ? '(돋보기로 보니... 서류가 영 수상한데요?)' : '(돋보기로 보니 꽤 믿을 만한 업체 같아요!)');
  else say(cur.item.hint.looksReal ? '(돋보기로 보니 진품 같아요!)' : '(돋보기로 보니 뭔가 수상한데요...)');
}
function finish(result, msg) {
  if (cur.done) return;
  S.remain = Math.max(0, (S.remain ?? 1) - 1); save(); // 몇 명 남았는지 저장해 두면 새로고침해도 이어서 해요
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
  else { say(r.msg); setPrice(r.price); render(); }  // 역제안 가격을 입력칸에 넣어 한 번에 받아들일 수 있게
}
function onDecline() { finish('거절', c2(cur.kind === 'sell' ? '아쉽네요, 다음에 올게요.' : '그럼 다음에 올게요.')); }
const c2 = (m) => m;

// ---------- 재고: 개수 제한 없음. 손님은 재고 전체에서 사 가요 ----------
function renderShelf() {
  refreshTop();
  const box = $('shelf'); box.innerHTML = '';
  const g = document.createElement('div'); g.className = 'shelfgrid'; box.append(g);
  if (!S.shelf.length) { const e = document.createElement('div'); e.className = 'small'; e.textContent = '재고가 비었어요. 손님한테서 물건을 사 오세요!'; g.append(e); }
  for (const it of S.shelf) g.append(slot(it));
}
function slot(it) {
  const d = document.createElement('div'); d.className = 'slot';
  const e = document.createElement('div'); e.className = 'e'; setPic(e, 'items', it);
  const nm = document.createElement('div'); nm.textContent = it.name;
  const cost = document.createElement('div'); cost.className = 'small'; cost.textContent = it.cost != null ? `매입 ${won(it.cost)}` : '';
  const b = document.createElement('button'); b.textContent = `고물상 ${won(G.junkValue(it))}`;
  b.onclick = () => {
    if (!confirm(`${it.name}을(를) 고물상에 ${won(G.junkValue(it))}에 팔까요?`)) return;
    S.cash += G.junkValue(it); S.shelf.splice(S.shelf.indexOf(it), 1); save(); renderShelf();
    if (cur && !cur.done) { if (cur.kind === 'buy' && cur.item === it) finish('물건이 없어짐', '어... 물건이 없어졌네요.'); else render(); }
  };
  d.append(e, nm, cost, b); return d;
}

// ---------- 밤: 정산과 업그레이드 ----------
async function endOfDay() {
  const info = G.endDay(S);
  S.remain = null; S.phase = 'night'; S.lastNight = { rent: info.rent, soldN: info.sold.length, soldFor: info.soldFor };
  refreshTop(); save();
  if (info.bankrupt) {
    $('overMsg').textContent = `월세 ${won(info.rent)}을 내지 못했어요. 재고를 다 팔아도 모자랐어요. 최종 ${S.day}일차.`;
    try { localStorage.removeItem(saveKey(S.nick)); localStorage.removeItem(OLD_KEY); } catch {} // 비밀키는 남겨 둬요
    return show('over');
  }
  renderNight(); show('night');
  const r = await submitScore(S, G.netWorth(S));
  const el = $('subStatus'); if (!el) return;
  el.textContent = r.ok ? '· 순위에 올렸어요 ✔' : r.reason === 'nick_taken' ? '· 이미 쓰는 닉네임이에요 (순위 미등록)' : r.reason === 'off' ? '' : r.reason === 'rejected' ? '· 이번 기록은 순위에 반영되지 않았어요' : '· 순위 전송 실패';
}
function renderNight() {
  const n = S.lastNight || { rent: 0, soldN: 0, soldFor: 0 };
  $('nightTitle').textContent = `🌙 ${S.day - 1}일차 마감`;
  $('nightSummary').innerHTML = `월세 <b>-${won(n.rent)}</b>${n.soldN ? `<br><span class="small">현금이 모자라서 재고 ${n.soldN}개를 고물상에 ${won(n.soldFor)}에 팔았어요</span>` : ''}<br>가진 돈 <b>${won(S.cash)}</b><br>재고 가치 <b>${won(G.netWorth(S) - S.cash)}</b><br>총 재산 <b>${won(G.netWorth(S))}</b> <span id="subStatus" class="small"></span>${S.bonusCustomers ? `<br>📣 내일 손님 <b>+${S.bonusCustomers}명</b>` : ''}`;
  renderUpgrades();
}
function renderUpgrades() {
  const box = $('upgrades'); box.innerHTML = '';
  for (const [key, u] of Object.entries(UPGRADES)) {
    const lvl = S.up[key], maxed = lvl >= u.costs.length;
    const d = document.createElement('div'); d.className = 'up';
    d.innerHTML = `<div><b>${u.name}</b> ${u.levels[lvl]}단계<br><span class="small">${u.desc}</span></div>`;
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
function begin(state) {
  S = state; S.loupeLeft ??= 0; S.trend ??= null; S.bonusCustomers ??= 0; refreshTop();
  if (S.phase === 'night') { renderNight(); show('night'); }  // 정산 화면에서 새로고침했으면 거기로
  else if (S.remain != null) startDay(true);                   // 하루 도중이면 이어서
  else startDay();
}
$('btnStart').onclick = () => {
  const nick = $('nickInput').value.trim();
  if (!nick) return toast('닉네임을 입력하세요');
  const saved = load(nick);
  begin(saved && saved.nick === nick ? saved : freshState(nick));
};
$('btnRestart').onclick = () => { $('nickInput').value = S.nick; show('title'); };
$('btnNext').onclick = nextCustomer;
$('btnOffer').onclick = onOffer; $('btnDecline').onclick = onDecline; $('btnAppraise').onclick = onAppraise;
$('btnNextDay').onclick = () => startDay();
$('btnBoard').onclick = $('btnTitleBoard').onclick = openBoard;
$('btnCloseBoard').onclick = () => ($('modal').hidden = true);
$('btnShelf').onclick = () => { renderShelf(); $('shelfModal').hidden = false; };
$('btnCloseShelf').onclick = () => ($('shelfModal').hidden = true);
$('price').addEventListener('input', updatePreview);
$('price').addEventListener('keydown', (e) => { if (e.key === 'Enter') onOffer(); });
{ const n = lastNick(); if (n) $('nickInput').value = n; }
show('title');
window.__pawn = { get S() { return S; } };
