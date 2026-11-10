// 효과음: 소리 파일 없이 브라우저에서 바로 만들어요 (WebAudio). 끄고 켜는 설정은 기기에 기억해요.
let ctx = null;
let muted = false;
try { muted = localStorage.getItem('pawn-muted') === '1'; } catch {}

function audio() {
  if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
// [주파수, 시작(초), 길이(초), 파형, 크기]
const SOUNDS = {
  coin: [[988, 0, 0.09, 'square', 0.07], [1319, 0.09, 0.25, 'square', 0.07]],        // 돈을 받았어요
  pay: [[523, 0, 0.09, 'triangle', 0.12], [392, 0.09, 0.18, 'triangle', 0.12]],      // 돈을 냈어요
  leave: [[196, 0, 0.3, 'sawtooth', 0.08]],                                          // 손님이 화나서 떠나요
  click: [[660, 0, 0.04, 'sine', 0.08]],
  news: [[659, 0, 0.1, 'sine', 0.12], [880, 0.12, 0.25, 'sine', 0.12]],
  siren: [[740, 0, 0.22, 'sawtooth', 0.08], [554, 0.22, 0.22, 'sawtooth', 0.08], [740, 0.44, 0.22, 'sawtooth', 0.08], [554, 0.66, 0.22, 'sawtooth', 0.08]],
  bad: [[392, 0, 0.14, 'sawtooth', 0.09], [311, 0.14, 0.14, 'sawtooth', 0.09], [196, 0.28, 0.35, 'sawtooth', 0.09]],
  good: [[523, 0, 0.1, 'triangle', 0.12], [659, 0.1, 0.1, 'triangle', 0.12], [784, 0.2, 0.3, 'triangle', 0.12]],
};

export function play(name) {
  if (muted) return;
  try {
    const c = audio(); if (!c || !SOUNDS[name]) return;
    const t0 = c.currentTime;
    for (const [f, st, dur, type, vol] of SOUNDS[name]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + st); g.gain.exponentialRampToValueAtTime(vol, t0 + st + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + st + dur);
      o.connect(g); g.connect(c.destination); o.start(t0 + st); o.stop(t0 + st + dur + 0.02);
    }
  } catch {}
}
export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('pawn-muted', muted ? '1' : '0'); } catch {}
  return muted;
}
