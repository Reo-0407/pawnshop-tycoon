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
## 그림
`assets/items/<id>.png`, `assets/customers/<id>.png` 가 있으면 자동으로 쓰이고, 없으면 이모지가 나와요. (id 는 `js/data.js` 참고)
