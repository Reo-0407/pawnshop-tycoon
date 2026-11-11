# Graph Report - 전당포타이쿤  (2026-11-11)

## Corpus Check
- 67 files · ~283,432 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 2 file(s) not represented in the graph (top: (none) 1, .css 1)

## Summary
- 194 nodes · 405 edges · 12 communities (11 shown, 1 thin omitted)
- Extraction: 92% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 84,707 input · 0 output

## Community Hubs (Navigation)
- Game Logic Core
- Design Spec Concepts
- Game Data Tables
- Image & Build Tools
- Save & Session State
- Price Slider UI
- Day Cycle Flow
- Customer Deal Actions
- Supabase Leaderboard
- Sound Effects
- Shelf Rendering
- Package Config

## God Nodes (most connected - your core abstractions)
1. `won()` - 16 edges
2. `render()` - 16 edges
3. `save()` - 14 edges
4. `settle()` - 14 edges
5. `round100()` - 12 edges
6. `refreshTop()` - 12 edges
7. `S()` - 12 edges
8. `Pawnshop Tycoon Design Spec` - 12 edges
9. `makeItem()` - 10 edges
10. `makeBuyer()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Leaderboard Modal` --implements--> `Total Wealth Leaderboard`  [INFERRED]
  index.html → docs/superpowers/specs/2026-11-09-pawnshop-tycoon-design.md
- `Title Screen` --conceptually_related_to--> `Total Wealth Leaderboard`  [INFERRED]
  index.html → docs/superpowers/specs/2026-11-09-pawnshop-tycoon-design.md
- `Supabase Leaderboard Setup` --conceptually_related_to--> `Supabase Backend (table + RPC + public view)`  [INFERRED]
  README.md → docs/superpowers/specs/2026-11-09-pawnshop-tycoon-design.md
- `Image Generation Pipeline (FLUX.1-schnell)` --implements--> `Art Style (cute cartoon animals, FLUX pregenerated)`  [INFERRED]
  README.md → docs/superpowers/specs/2026-11-09-pawnshop-tycoon-design.md
- `Responsive Screen Layout` --references--> `Top Header Chips (day, customer, cash, loupe, shelf, rank, sound)`  [INFERRED]
  README.md → index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Customer Negotiation Loop** — docs_superpowers_specs_2026_11_09_pawnshop_tycoon_design_seller_customer, docs_superpowers_specs_2026_11_09_pawnshop_tycoon_design_buyer_customer, docs_superpowers_specs_2026_11_09_pawnshop_tycoon_design_haggling, docs_superpowers_specs_2026_11_09_pawnshop_tycoon_design_appraisal, index_negotiate_panel [INFERRED 0.85]
- **Leaderboard System** — docs_superpowers_specs_2026_11_09_pawnshop_tycoon_design_leaderboard, docs_superpowers_specs_2026_11_09_pawnshop_tycoon_design_supabase_backend, docs_superpowers_specs_2026_11_09_pawnshop_tycoon_design_anti_cheat, readme_leaderboard_setup, index_board_modal [INFERRED 0.85]

## Communities (12 total, 1 thin omitted)

### Community 0 - "Game Logic Core"
Cohesion: 0.13
Nodes (31): dueStolen(), endDay(), fixCustomer(), haggle(), interiorLevel(), junkValue(), lend(), loupeLevel() (+23 more)

### Community 1 - "Design Spec Concepts"
Cohesion: 0.08
Nodes (35): Pawnshop Tycoon Design Spec, Anti-cheat (device secret, growth cap), Appraisal with Loupe (range & authenticity accuracy), Art Style (cute cartoon animals, FLUX pregenerated), Buying Customer, Counterfeit Items, Daily Flow (8 customers), Haggling / Patience Mechanic (+27 more)

### Community 2 - "Game Data Tables"
Cohesion: 0.08
Nodes (23): CAT_OF, CATS, COLLECTOR_CHANCE, COLLECTOR_MULT, COLLECTORS, CUSTOMERS, CUSTOMERS_PER_DAY, FAKE_CHANCE (+15 more)

### Community 3 - "Image & Build Tools"
Cohesion: 0.11
Nodes (16): concurrent_futures, gradio_client, pathlib, pil, re, rembg, shutil, sys (+8 more)

### Community 4 - "Save & Session State"
Cohesion: 0.15
Nodes (14): c2(), freshState(), isSell(), load(), onDecline(), openBoard(), queue, renderTrend() (+6 more)

### Community 5 - "Price Slider UI"
Cohesion: 0.23
Nodes (12): basis(), btn(), getPrice(), initPrice(), isPawn(), man(), render(), setPrice() (+4 more)

### Community 6 - "Day Cycle Flow"
Cohesion: 0.47
Nodes (11): begin(), endOfDay(), nextCustomer(), refreshTop(), renderNight(), renderUpgrades(), S(), show() (+3 more)

### Community 7 - "Customer Deal Actions"
Cohesion: 0.44
Nodes (11): canBuy(), finish(), floatText(), onAppraise(), onOffer(), onPolice(), onPromo(), save() (+3 more)

### Community 8 - "Supabase Leaderboard"
Cohesion: 0.60
Nodes (5): boardEnabled(), fetchTop(), headers(), submitScore(), ref_config_js_v_14

### Community 9 - "Sound Effects"
Cohesion: 0.40
Nodes (3): audio(), play(), SOUNDS

### Community 10 - "Shelf Rendering"
Cohesion: 0.67
Nodes (4): pic(), renderShelf(), setPic(), slot()

## Ambiguous Edges - Review These
- `Selling Customer` → `Out of Scope: loans, police/stolen goods, trading`  [AMBIGUOUS]
  docs/superpowers/specs/2026-11-09-pawnshop-tycoon-design.md · relation: conceptually_related_to

## Knowledge Gaps
- **28 isolated node(s):** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TIERS`, `TIER_COLORS`, `FAKE_CHANCE` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 61 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Selling Customer` and `Out of Scope: loans, police/stolen goods, trading`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Total Wealth Leaderboard` connect `Design Spec Concepts` to `Supabase Leaderboard`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TIERS` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Game Logic Core` be split into smaller, more focused modules?**
  _Cohesion score 0.13360323886639677 - nodes in this community are weakly interconnected._
- **Should `Design Spec Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.07657657657657657 - nodes in this community are weakly interconnected._
- **Should `Game Data Tables` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._
- **Should `Image & Build Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._