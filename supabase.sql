-- Supabase SQL Editor 에 통째로 붙여넣고 Run 하세요.
create table if not exists public.scores (
  nick        text primary key check (char_length(nick) between 1 and 8),
  secret_hash text not null,
  day         int  not null default 1,
  worth       bigint not null default 0,
  updated_at  timestamptz not null default now()
);
alter table public.scores enable row level security;  -- 정책이 없으니 표에는 직접 접근 불가

-- 공개용 뷰: 비밀 해시는 빼고 보여줌
create or replace view public.leaderboard_public as
  select nick, worth, day from public.scores;
grant select on public.leaderboard_public to anon;

-- 점수 제출 함수 (조작 방지 검사 포함)
create or replace function public.submit_score(p_nick text, p_secret text, p_day int, p_worth bigint)
returns text language plpgsql security definer set search_path = public as $$
declare
  h text := encode(sha256(convert_to(p_secret, 'utf8')), 'hex');
  cur public.scores%rowtype;
begin
  if p_nick is null or char_length(trim(p_nick)) not between 1 and 8 or length(p_secret) < 16 then return 'rejected'; end if;
  if p_day < 1 or p_worth < 0 or p_worth > 2000000000 then return 'rejected'; end if;
  select * into cur from public.scores where nick = p_nick;
  if not found then
    if p_worth > 300000 * p_day + 100000 then return 'rejected'; end if;
    insert into public.scores(nick, secret_hash, day, worth) values (p_nick, h, p_day, p_worth);
    return 'ok';
  end if;
  if cur.secret_hash <> h then return 'nick_taken'; end if;
  if p_day < cur.day then return 'rejected'; end if;
  if p_worth > cur.worth * 2.5 + 300000 * (p_day - cur.day + 1) then return 'rejected'; end if;
  update public.scores set day = p_day, worth = greatest(worth, p_worth), updated_at = now() where nick = p_nick;
  return 'ok';
end $$;
revoke all on function public.submit_score(text, text, int, bigint) from public;
grant execute on function public.submit_score(text, text, int, bigint) to anon;
