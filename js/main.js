import { TIERS, TIER_COLORS, UPGRADES, RENT } from './data.js';
import * as G from './logic.js';
import { submitScore, fetchTop, boardEnabled } from './leaderboard.js';

const $ = (id) => document.getElementById(id);
const won = (n) => `${Math.round(n).toLocaleString()}원`;
const SAVE_KEY = 'pawn-tycoon-v1';
let S = null;          // 진행 상태
let queue = [];        // 오늘 남은 손님
let cur = null;        // 현재 손님
let total = 0;
let deal = null;       // 손님이 제시한 마지막 역제안 가격

const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {} };
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; } };
function toast(msg) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2200); }
function show(name) { for (const s of ['title', 'shop', 'night', 'over']) $('screen-' + s).hidden = s !== name; $('top').hidden = name === 'title'; }

// 그림 파일이 있으면 그림, 없으면 이모지
function pic(kind, id, emoji) {
  const img = document.createElement('img');
  img.src = `assets/${kind}/${id}.png`; img.alt = '';
  const span = document.createElement('span'); span.textContent = emoji;
  img.onerror = () => img.replaceWith(span);
  return img;
}
function setPic(el, kind, o) { el.replaceChildren(pic(kind, o.id, o.emoji)); }

function refreshTop() {
  $('nick').textContent = S.nick; $('day').textContent = S.day; $('cash').textContent = won(S.cash); $('worth').textContent = won(G.netWorth(S));
}

// ---------- 손님 ----------
function startDay() {
  queue = G.makeDay(Math.random, S); total = queue.length; save(); show('shop'); nextCustomer();
}
function nextCustomer() {
  cur = queue.shift(); deal = null;
  // 사는 손님이 왔는데 그 사이 물건이 사라졌으면 교체할 필요 없음(물건은 하루 중 직접 팔 때만 변함)
  if (!cur) return endOfDay();
  $('progress').textContent = '●'.repeat(total - queue.length) + '○'.repeat(queue.length);
  setPic($('who'), 'customers', cur.who);
  renderCustomer(); refreshTop(); renderShelf();
}
function renderItem(it, withHint) {
  const box = $('itemCard'); box.innerHTML = '';
  const img = document.createElement('div'); img.className = 'itemimg'; setPic(img, 'items', it);
  const txt = document.createElement('div');
  txt.innerHTML = `<div class="itemname">${it.name}<span class="tag" style="background:${TIER_COLORS[it.tier]}">${TIERS[it.tier]}</span></div>`;
  box.append(img, txt);
}
function renderCustomer() {
  const c = cur, it = c.item;
  renderItem(it);
  $('btnNext').hidden = true; $('negotiate').hidden = false; $('btnAccept').hidden = true; $('btnDecline').hidden = false;
  if (c.kind === 'sell') {
    $('bubble').textContent = `${c.who.name}: 이 물건을 ${won(c.ask)}에 팔고 싶어요!`;
    const h = it.hint;
    $('info').innerHTML = `🔍 감정 결과<br>시세: <b>${won(h.lo)} ~ ${won(h.hi)}</b><br>진품 판정: ` +
      (h.looksReal ? '<span class="ok">진품 같아요 ✔</span>' : '<span class="bad">가품 같아요 ✖</span>') +
      `<br><span class="small">(돋보기 ${G.loupeLevel(S)}단계 · 틀릴 수도 있어요)</span>`;
    $('price').value = Math.round(((h.lo + h.hi) / 2) * 0.6 / 100) * 100;
    $('btnOffer').textContent = '이 가격에 사기'; $('btnOffer').disabled = S.shelf.length >= G.slotCount(S) || false;
    if (S.shelf.length >= G.slotCount(S)) $('info').innerHTML += '<br><span class="bad">진열대가 가득 찼어요! 하나를 처분해야 살 수 있어요.</span>';
  } else {
    $('bubble').textContent = `${c.who.name}: 이 물건을 사고 싶어요. 얼마예요?`;
    $('info').innerHTML = `내 판단 시세: <b>${won(G.trueValue(it))}</b> 쯤<br><span class="small">손님이 낼 수 있는 돈은 비밀이에요. 너무 비싸면 화내요!</span>`;
    $('price').value = Math.round(G.trueValue(it) * 1.3 / 100) * 100;
    $('btnOffer').textContent = '이 가격에 팔기'; $('btnOffer').disabled = false;
  }
}
function say(msg) { $('bubble').textContent = `${cur.who.name}: ${msg}`; }
function finishCustomer(msg) { $('negotiate').hidden = true; $('btnNext').hidden = false; $('btnNext').textContent = queue.length ? '다음 손님' : '하루 마치기'; if (msg) say(msg); }

function onOffer() {
  const offer = Math.round(Number($('price').value));
  if (!(offer > 0)) return toast('가격을 입력하세요');
  if (cur.kind === 'sell') {
    if (offer > S.cash) return toast('가진 돈보다 비싸요');
    if (S.shelf.length >= G.slotCount(S)) return toast('진열대가 가득 찼어요');
  }
  settle(G.haggle(cur, offer));
}
function settle(r) {
  if (r.status === 'deal') {
    if (cur.kind === 'sell') { S.cash -= r.price; S.shelf.push(cur.item); finishCustomer(r.msg + ' 🤝'); toast(`${cur.item.name}을(를) ${won(r.price)}에 샀어요`); }
    else {
      S.cash += r.price; S.shelf = S.shelf.filter((x) => x !== cur.item);
      const gain = r.price - G.trueValue(cur.item); finishCustomer(r.msg + ' 🤝'); toast(`${won(r.price)}에 팔았어요! (${gain >= 0 ? '+' : ''}${won(gain)})`);
    }
    save(); refreshTop(); renderShelf();
  } else if (r.status === 'leave') { finishCustomer(r.msg + ' 😤'); }
  else {
    deal = r.price; say(r.msg + ` (인내심 ${'❤'.repeat(Math.max(cur.patience, 0))})`);
    $('btnAccept').hidden = false; $('btnAccept').textContent = `${won(r.price)}에 ${cur.kind === 'sell' ? '사기' : '팔기'}`;
    $('price').value = r.price;
  }
}
function onAccept() {
  if (cur.kind === 'sell' && deal > S.cash) return toast('가진 돈보다 비싸요');
  if (cur.kind === 'sell' && S.shelf.length >= G.slotCount(S)) return toast('진열대가 가득 찼어요');
  settle({ status: 'deal', price: deal, msg: cur.kind === 'sell' ? '거래 성사!' : '거래 성사!' });
}
function onDecline() { finishCustomer(cur.kind === 'sell' ? '아쉽네요, 다음에 올게요.' : '그럼 다음에 올게요.'); }

// ---------- 진열대 ----------
function renderShelf() {
  const n = G.slotCount(S); $('shelfCount').textContent = `${S.shelf.length}/${n}`;
  const box = $('shelf'); box.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const it = S.shelf[i], d = document.createElement('div'); d.className = 'slot' + (it ? '' : ' empty');
    if (!it) { d.textContent = '빈칸'; box.append(d); continue; }
    const e = document.createElement('div'); e.className = 'e'; setPic(e, 'items', it);
    const nm = document.createElement('div'); nm.textContent = it.name;
    const b = document.createElement('button'); b.textContent = `고물상 ${won(G.junkValue(it))}`;
    b.onclick = () => { if (confirm(`${it.name}을(를) 고물상에 ${won(G.junkValue(it))}에 팔까요?`)) { S.cash += G.junkValue(it); S.shelf.splice(i, 1); save(); refreshTop(); renderShelf(); if (cur && cur.kind === 'buy' && cur.item === it) finishCustomer('어... 물건이 없어졌네요.'); else if (cur && cur.kind === 'sell' && !$('negotiate').hidden) renderCustomer(); } };
    d.append(e, nm, b); box.append(d);
  }
}

// ---------- 밤: 정산과 업그레이드 ----------
async function endOfDay() {
  const worthBefore = G.netWorth(S);
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
    const b = document.createElement('button'); b.className = 'mini'; b.textContent = maxed ? '최고!' : `${won(u.costs[lvl])}`; b.disabled = maxed || S.cash < u.costs[lvl];
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
function begin(state) { S = state; refreshTop(); renderShelf(); startDay(); }
$('btnStart').onclick = () => {
  const nick = $('nickInput').value.trim();
  if (!nick) return toast('닉네임을 입력하세요');
  const saved = load();
  begin(saved && saved.nick === nick ? saved : G.newState(nick));
};
$('btnRestart').onclick = () => { $('nickInput').value = S.nick; show('title'); };
$('btnNext').onclick = nextCustomer;
$('btnOffer').onclick = onOffer; $('btnAccept').onclick = onAccept; $('btnDecline').onclick = onDecline;
$('btnNextDay').onclick = startDay;
$('btnBoard').onclick = $('btnTitleBoard').onclick = openBoard;
$('btnCloseBoard').onclick = () => ($('modal').hidden = true);
document.querySelectorAll('[data-adj]').forEach((b) => (b.onclick = () => { const v = Number($('price').value) || 0; $('price').value = Math.max(100, Math.round(v * (1 + Number(b.dataset.adj)) / 100) * 100); }));
const prev = load(); if (prev) $('nickInput').value = prev.nick;
show('title');
// 개발용: 브라우저 콘솔에서 상태를 볼 수 있게 (조작은 서버가 막아요)
window.__pawn = { get S() { return S; } };
