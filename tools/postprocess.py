"""raw 그림 → 게임용 PNG. 손님·물건은 배경 제거(rembg) 후 여백을 잘라 정사각형 384px, 배경은 1024px 로 변환."""
import sys
from pathlib import Path
from PIL import Image
from rembg import remove, new_session

ROOT = Path(__file__).resolve().parent.parent
sess = new_session('u2net')

def trim_square(im, size):
    bbox = im.getbbox()
    if bbox: im = im.crop(bbox)
    s = max(im.size); canvas = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - im.width) // 2, s - im.height))  # 바닥 정렬
    return canvas.resize((size, size), Image.LANCZOS)

for kind in ('customers', 'items'):
    for raw in sorted((ROOT / 'assets' / kind).glob('*.raw.png')):
        out = raw.with_name(raw.name.replace('.raw.png', '.png'))
        if out.exists(): continue
        im = remove(Image.open(raw).convert('RGBA'), session=sess)
        a = im.getchannel('A').point(lambda v: 0 if v < 90 else 255 if v > 200 else v)  # 번진 반투명 자국 정리
        im.putalpha(a)
        trim_square(im, 384).save(out, optimize=True); print('ok', out.name, flush=True)
bg = ROOT / 'assets/scene/bg.raw.png'
if bg.exists():
    Image.open(bg).convert('RGB').resize((1024, 576), Image.LANCZOS).save(ROOT / 'assets/scene/bg.png', optimize=True); print('ok bg')
