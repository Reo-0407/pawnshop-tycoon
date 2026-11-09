"""사이트를 고쳐서 올릴 때마다 한 번 실행하세요: python tools/bump_version.py
모든 js/css 주소 뒤의 ?v=숫자 를 같은 새 번호로 바꿔서, 브라우저가 옛 파일(캐시)과 새 파일을 섞어 쓰다가 깨지는 걸 막아요.
(번호를 주면 그 번호로, 안 주면 지금 번호 + 1)
"""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [ROOT / 'index.html'] + sorted((ROOT / 'js').glob('*.js'))
PAT = re.compile(r"""((?:from\s+|import\s*\(?\s*|src=|href=)['"](?:\./|js/)?[\w./-]*?\.(?:js|css))(?:\?v=\d+)?(['"])""")

def current():
    m = re.search(r'main\.js\?v=(\d+)', (ROOT / 'index.html').read_text(encoding='utf-8'))
    return int(m.group(1)) if m else 0

new = int(sys.argv[1]) if len(sys.argv) > 1 else current() + 1
for f in FILES:
    s = f.read_text(encoding='utf-8')
    # 같은 폴더(./)나 js/, style.css 처럼 우리 파일만. 외부 주소(http...)는 건드리지 않아요.
    s2 = PAT.sub(lambda m: f"{m.group(1)}?v={new}{m.group(2)}", s)
    if s2 != s:
        f.write_text(s2, encoding='utf-8'); print('수정', f.relative_to(ROOT))
print('버전 =', new)
