-- Supabase SQL Editor 에 통째로 붙여넣고 Run 하세요.
-- 다른 게임과 같은 프로젝트를 써도 안 겹치게 모든 이름 앞에 pawn_ 이 붙어 있어요.
create table if not exists public.pawn_scores (
  nick        text primary key check (char_length(nick) between 1 and 8),
  secret_hash text not null,
  day         int  not null default 1,
  worth       bigint not null default 0,
  updated_at  timestamptz not null default now()
);
alter table public.pawn_scores enable row level security;  -- 정책이 없으니 표에는 직접 접근 불가

-- 공개용 뷰: 비밀 해시는 빼고 보여줌
create or replace view public.pawn_leaderboard as
  select nick, worth, day from public.pawn_scores;
grant select on public.pawn_leaderboard to anon;

-- 점수 제출 함수 (조작 방지 검사 포함)
create or replace function public.pawn_submit_score(p_nick text, p_secret text, p_day int, p_worth bigint)
returns text language plpgsql security definer set search_path = public as $$
declare
  h text := encode(sha256(convert_to(p_secret, 'utf8')), 'hex');
  cur public.pawn_scores%rowtype;
begin
  if p_nick is null or char_length(trim(p_nick)) not between 1 and 8 or length(p_secret) < 16 then return 'rejected'; end if;
  if p_day < 1 or p_worth < 0 or p_worth > 2000000000 then return 'rejected'; end if;
  select * into cur from public.pawn_scores where nick = p_nick;
  if not found then
    if p_worth > 300000 * p_day + 100000 then return 'rejected'; end if;
    insert into public.pawn_scores(nick, secret_hash, day, worth) values (p_nick, h, p_day, p_worth);
    return 'ok';
  end if;
  if cur.secret_hash <> h then return 'nick_taken'; end if;
  if p_day < cur.day then return 'rejected'; end if;
  if p_worth > cur.worth * 2.5 + 300000 * (p_day - cur.day + 1) then return 'rejected'; end if;
  update public.pawn_scores set day = p_day, worth = greatest(worth, p_worth), updated_at = now() where nick = p_nick;
  return 'ok';
end $$;
revoke all on function public.pawn_submit_score(text, text, int, bigint) from public;
grant execute on function public.pawn_submit_score(text, text, int, bigint) to anon;
