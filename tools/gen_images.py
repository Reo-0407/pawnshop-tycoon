"""허깅페이스 FLUX.1-schnell Space(gradio_client)로 게임 그림을 만들어 assets/ 에 저장한다. (이미 있는 파일은 건너뜀)
토큰은 저장소 밖 ~/.pawnshop/hf_tokens.txt 에서 읽고, 한도에 걸리면 다음 토큰으로 넘어간다.
사용: python -I tools/gen_images.py [items|customers|scene|all]
"""
import shutil, sys, time
from pathlib import Path
from threading import Lock
from concurrent.futures import ThreadPoolExecutor
from gradio_client import Client

ROOT = Path(__file__).resolve().parent.parent
TOKENS = (Path.home() / '.pawnshop' / 'hf_tokens.txt').read_text().split()
STYLE = 'cute cartoon game art, bright cheerful colors, clean thick outline, soft shading, kid friendly'
WHITE = 'single subject centered, plain pure white background, no text'

ITEMS = {
    'sock': 'a worn old sock with a hole', 'can': 'a dented tin can', 'umbrella': 'a broken umbrella', 'shoe': 'a worn old sneaker',
    'bottle': 'an empty glass bottle', 'comic': 'a tattered comic book', 'toy': 'a broken toy robot', 'cup': 'a cracked coffee cup',
    'clock': 'a stopped wall clock', 'key': 'a rusty old key', 'radio': 'a retro radio', 'guitar': 'a used acoustic guitar',
    'camera': 'a vintage film camera', 'bike': 'a bicycle', 'game': 'a handheld game console', 'phone': 'a used smartphone',
    'laptop': 'a laptop computer', 'watchcheap': 'a plain wrist watch', 'headphone': 'a pair of headphones', 'tv': 'a small old television',
    'vase': 'a painted porcelain vase', 'ring': 'a silver ring with a small gem', 'bag': 'a luxury leather handbag', 'watch': 'a golden luxury wrist watch',
    'violin': 'a violin', 'painting': 'a framed oil painting', 'necklace': 'a pearl necklace', 'sword': 'an ancient sword with a jeweled hilt',
    'crown': 'a small golden crown', 'telescope': 'a brass telescope', 'diamond': 'a huge sparkling diamond', 'goldbar': 'a stack of gold bars',
    'map': 'an old treasure map scroll with a red X', 'egg': 'a glowing dragon egg', 'book': 'a magic spell book glowing', 'orb': 'a crystal ball glowing',
    'scroll': 'an ancient scroll', 'trophy': 'a golden trophy cup', 'mask': 'a golden royal mask', 'lamp': 'a magic genie lamp',
}
ANIMALS = {'cat': 'cat', 'dog': 'dog', 'rabbit': 'rabbit', 'bear': 'brown bear', 'fox': 'fox',
           'panda': 'panda', 'frog': 'frog', 'lion': 'lion', 'owl': 'owl', 'penguin': 'penguin'}
SCENE = {
    'bg': ('cozy cartoon pawn shop interior, wooden shelves full of antiques on the back wall, warm lamp light, wooden floor, empty room, no people, no counter, game background', 1024, 576),
}

_lock = Lock()
_state = {'i': 0, 'clients': {}}


def client_for(idx):
    with _lock:
        if idx not in _state['clients']:
            _state['clients'][idx] = Client('black-forest-labs/FLUX.1-schnell', token=TOKENS[idx % len(TOKENS)], verbose=False)
        return _state['clients'][idx]


def make(job):
    path, prompt, w, h = job
    if path.exists():
        return 'skip'
    raw = path.with_suffix('.raw.png')
    if raw.exists():
        return 'raw'
    for attempt in range(12):
        idx = _state['i']
        try:
            res, _ = client_for(idx).predict(prompt=prompt, seed=100 + attempt * 7, randomize_seed=False, width=w, height=h, num_inference_steps=4, api_name='/infer')
            path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(res, raw)
            return 'ok'
        except Exception as e:
            msg = str(e)[:90].replace('\n', ' ')
            print(f'  [{path.name}] 토큰#{idx % len(TOKENS) + 1} 실패: {msg}', flush=True)
            if 'quota' in msg.lower() or 'limit' in msg.lower() or 'gpu' in msg.lower():
                with _lock:
                    if _state['i'] == idx:
                        _state['i'] += 1  # 다음 토큰으로
            time.sleep(4)
    return 'FAIL'


def main(which):
    jobs = []
    if which in ('scene', 'all'):
        jobs += [(ROOT / 'assets/scene' / f'{k}.png', f'{STYLE}, {p}', w, h) for k, (p, w, h) in SCENE.items()]
    if which in ('customers', 'all'):
        jobs += [(ROOT / 'assets/customers' / f'{k}.png', f'{STYLE}, cute {d} character standing, full figure, front view, wearing casual clothes, {WHITE}', 768, 768) for k, d in ANIMALS.items()]
    if which in ('items', 'all'):
        # 흰색 물건은 배경 제거 때 같이 지워지므로 다른 배경색을 쓴다
        bg = {'necklace': 'plain light green background'}
        jobs += [(ROOT / 'assets/items' / f'{k}.png', f'{STYLE}, game item icon of {d}, {WHITE}'.replace('plain pure white background', bg.get(k, 'plain pure white background')), 768, 768) for k, d in ITEMS.items()]
    with ThreadPoolExecutor(max_workers=2) as ex:  # 동시 2개
        for job, r in zip(jobs, ex.map(make, jobs)):
            print(r, job[0].relative_to(ROOT), flush=True)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'all')
