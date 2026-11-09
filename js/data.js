// 게임 데이터: 물건 40종, 손님 10종, 업그레이드 가격
export const TIERS = ['잡동사니', '생활용품', '명품', '보물'];
export const TIER_COLORS = ['#9aa5b1', '#4db6ac', '#ab47bc', '#ffb300'];
export const FAKE_CHANCE = [0.05, 0.1, 0.25, 0.35];

// [id, 이름, 이모지, 등급(0~3), 기본시세]
const RAW = [
  ['sock', '구멍 난 양말', '🧦', 0, 500], ['can', '찌그러진 깡통', '🥫', 0, 800],
  ['umbrella', '부러진 우산', '☂️', 0, 1500], ['shoe', '낡은 운동화', '👟', 0, 3000],
  ['bottle', '빈 유리병', '🍾', 0, 1200], ['comic', '너덜한 만화책', '📚', 0, 2500],
  ['toy', '고장 난 장난감', '🧸', 0, 2000], ['cup', '금 간 컵', '☕', 0, 1800],
  ['clock', '멈춘 벽시계', '🕰️', 0, 4000], ['key', '녹슨 열쇠', '🗝️', 0, 3500],
  ['radio', '지지직 라디오', '📻', 1, 12000], ['guitar', '중고 기타', '🎸', 1, 35000],
  ['camera', '필름 카메라', '📷', 1, 28000], ['bike', '자전거', '🚲', 1, 50000],
  ['game', '게임기', '🎮', 1, 45000], ['phone', '중고 폰', '📱', 1, 60000],
  ['laptop', '노트북', '💻', 1, 90000], ['watchcheap', '손목시계', '⌚', 1, 30000],
  ['headphone', '헤드폰', '🎧', 1, 25000], ['tv', '작은 TV', '📺', 1, 70000],
  ['vase', '도자기 꽃병', '🏺', 2, 150000], ['ring', '은반지', '💍', 2, 180000],
  ['bag', '명품 가방', '👜', 2, 450000], ['watch', '금장 시계', '⌚', 2, 600000],
  ['violin', '바이올린', '🎻', 2, 380000], ['painting', '유화 그림', '🖼️', 2, 320000],
  ['necklace', '진주 목걸이', '📿', 2, 280000], ['sword', '옛날 검', '🗡️', 2, 500000],
  ['crown', '작은 왕관', '👑', 2, 700000], ['telescope', '황동 망원경', '🔭', 2, 240000],
  ['diamond', '큰 다이아몬드', '💎', 3, 2000000], ['goldbar', '금괴', '🪙', 3, 3000000],
  ['map', '보물 지도', '🗺️', 3, 1500000], ['egg', '용의 알', '🥚', 3, 5000000],
  ['book', '마법서', '📖', 3, 2500000], ['orb', '수정 구슬', '🔮', 3, 3500000],
  ['scroll', '고대 두루마리', '📜', 3, 1800000], ['trophy', '황금 트로피', '🏆', 3, 2200000],
  ['mask', '왕의 가면', '🎭', 3, 4000000], ['lamp', '요술 램프', '🪔', 3, 6000000],
];
// 분류: 오늘의 시세(분류별 오름/내림)에 쓰여요
const CAT_OF = {
  시계: ['clock', 'watchcheap', 'watch'],
  전자기기: ['radio', 'camera', 'game', 'phone', 'laptop', 'headphone', 'tv', 'toy'],
  악기: ['guitar', 'violin'],
  보석: ['ring', 'necklace', 'diamond', 'goldbar', 'crown'],
  골동품: ['vase', 'sword', 'painting', 'telescope', 'map', 'scroll', 'key', 'book', 'orb', 'mask', 'lamp', 'trophy', 'egg'],
  생활용품: ['sock', 'can', 'umbrella', 'shoe', 'bottle', 'comic', 'cup', 'bike', 'bag'],
};
export const CATS = Object.keys(CAT_OF);
export const ITEMS = RAW.map(([id, name, emoji, tier, base]) => ({
  id, name, emoji, tier, base, cat: CATS.find((c) => CAT_OF[c].includes(id)),
}));

// 손님: 동물 캐릭터
export const CUSTOMERS = [
  ['cat', '고양이 나비', '🐱', '길냥이 탐정'], ['dog', '강아지 멍멍', '🐶', '동네 산책가'], ['rabbit', '토끼 토토', '🐰', '당근 상인'],
  ['bear', '곰돌이 곰곰', '🐻', '캠핑 마니아'], ['fox', '여우 여리', '🦊', '눈치 빠른 상인'], ['panda', '판다 판판', '🐼', '느긋한 여행가'],
  ['frog', '개구리 개굴', '🐸', '연못 수집가'], ['lion', '사자 레오', '🦁', '부자 사업가'], ['owl', '부엉 박사', '🦉', '부엉이 수집가'],
  ['penguin', '펭귄 펭이', '🐧', '얼음나라 손님'],
].map(([id, name, emoji, role]) => ({ id, name, emoji, role }));

export const UPGRADES = {
  loupe: { name: '돋보기', desc: '시세 범위가 좁아지고 가품을 더 잘 찾아요', levels: [1, 2, 3], costs: [80000, 300000] },
  interior: { name: '인테리어', desc: '비싼 물건과 부자 손님이 더 자주 와요', levels: [1, 2, 3, 4, 5], costs: [50000, 150000, 400000, 1000000] },
};

export const LOUPE = {
  spread: [0, 0.4, 0.25, 0.1],     // 시세 범위 ±
  accuracy: [0, 0.65, 0.82, 0.95], // 진품 판정 정확도
};
// 가끔 오는 수집가: 원하는 물건이 재고에 있으면 보통 시세의 2배를 쳐줘요
export const COLLECTORS = [
  { role: '깡통 수집가', want: { id: 'can' } },
  { role: '양말 수집가', want: { id: 'sock' } },
  { role: '시계 수집가', want: { cat: '시계' } },
  { role: '악기 수집가', want: { cat: '악기' } },
  { role: '보석 수집가', want: { cat: '보석' } },
  { role: '골동품 수집가', want: { cat: '골동품' } },
];
export const COLLECTOR_MULT = 2;      // 원래 값의 2배
export const COLLECTOR_CHANCE = 0.3;  // 하루에 올 확률 (재고에 맞는 물건이 있을 때만)
// 마케팅 도우미: 홍보비를 받고 내일 손님을 늘려 준다고 하지만 사기일 수도 있어요
export const PROMO = { dayChance: 0.45, scamChance: 0.4, bonus: 4, minPrice: 5000, maxPrice: 300000, cashRate: 0.12 };
// 전당포 대출: 물건을 맡기고 돈을 빌려가요. 기한 안에 찾아가면 원금+이자를 받고, 안 찾아가면 담보가 내 재고가 돼요
export const LOAN = { chance: 0.15, rate: 0.2, days: 3, redeemChance: 0.6 };
export const LOUPE_USES = (level) => 1 + 2 * level; // 하루 감정 횟수 (1단계 3회, 3단계 7회)
export const START_CASH = 100000;
export const CUSTOMERS_PER_DAY = 8;
export const RENT = (interior) => 3000 + 2000 * (interior - 1);
