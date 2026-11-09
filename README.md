# 🏪 전당포 타이쿤
흥정·감정으로 부자가 되는 웹 게임. 설계: `docs/superpowers/specs/`

## 실행
```
python -m http.server 8765   # 그다음 http://localhost:8765
node tests/logic.test.mjs     # 규칙 테스트
```
## 리더보드(Supabase)
1. supabase.com 에서 프로젝트 생성 → SQL Editor 에 `supabase.sql` 붙여넣고 Run
2. Project Settings > API 의 URL 과 anon public 키를 `js/config.js` 에 입력
## 그림 만들기
`python -I tools/gen_images.py all` (허깅페이스 FLUX.1-schnell Space, 토큰은 ~/.pawnshop/hf_tokens.txt) → `python -I tools/postprocess.py` (배경 제거·크기 조정)

## 그림 규칙
`assets/items/<id>.png`, `assets/customers/<id>.png` 가 있으면 자동으로 쓰이고, 없으면 이모지가 나와요. (id 는 `js/data.js` 참고)

## 화면
태블릿 가로: 장면 위에 오른쪽 상담 패널 / 세로·폰: 장면 아래에 패널. 위 칩: 일차·손님·현금·돋보기 횟수·재고·순위.

## 고쳐서 올릴 때
```
node tests/logic.test.mjs            # 규칙 테스트
python tools/bump_version.py         # 파일 버전(?v=N)을 한꺼번에 +1: 브라우저가 옛 파일과 새 파일을 섞어 쓰다 깨지는 걸 막아요
git add -A && git commit -m "..." && git push
```
