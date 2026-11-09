// Supabase 리더보드 (config.js 가 비어 있으면 조용히 꺼짐)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const boardEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const headers = () => ({ apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' });

export async function submitScore(state, worth) {
  if (!boardEnabled()) return { ok: false, reason: 'off' };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_score`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ p_nick: state.nick, p_secret: state.secret, p_day: state.day, p_worth: worth }),
    });
    if (!r.ok) return { ok: false, reason: 'http' };
    const res = await r.json(); // 'ok' | 'nick_taken' | 'rejected'
    return { ok: res === 'ok', reason: res };
  } catch { return { ok: false, reason: 'network' }; }
}

export async function fetchTop(limit = 20) {
  if (!boardEnabled()) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leaderboard_public?select=nick,worth,day&order=worth.desc&limit=${limit}`, { headers: headers() });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
