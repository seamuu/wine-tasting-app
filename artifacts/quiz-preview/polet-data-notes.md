# What is in the Polet data

Checked the six receipt wines’ embedded product JSON and one search response on 13 November 2026. The relevant source fields are saved in `lib/receipt-wine-facts.json`.

No popularity rank, customer rating, review count or sales volume was present in these records. The search response offers relevance, name, price and alcohol sorting. Relevance is not a popularity ranking. This does not establish that no sales data exists elsewhere at Vinmonopolet.

Useful fields:

| JSON field | What it contains |
| --- | --- |
| `method` | Production details, when supplied. Sometimes vague or absent. |
| `content.characteristics` | Body, freshness/acidity, sweetness and (for reds) tannin ratings, with explanations. These are sensory reference values, not quality scores. |
| `content.traits` | Alcohol, sugar and acid. Preserve text qualifiers such as “Under 3 g/l”. |
| `content.isGoodFor` | Suggested food pairings. Useful discussion material, not uniquely correct matches. |
| `content.ingredients` | Grape names, percentages and descriptions. Kept as clues; no grape question in the new pack. |
| `main_sub_category` | Categories such as Champagne, brut, where available. |
| `content.storagePotential` | Drink-now/ageing guidance, where available. |
| `price`, `volume`, `year`, `main_country`, `district`, `sub_District` | Price, bottle size, vintage and origin, where available. |

Verified production details:

- [Thiebault, 21132301](https://www.vinmonopolet.no/p/21132301): 40% reserve wine, 36 months on lees.
- [Paquet, 10644301](https://www.vinmonopolet.no/p/10644301): 7 months on lees, natural yeast and gentle filtration. The record does not specify tank versus oak.
- [Jobard, 20576901](https://www.vinmonopolet.no/p/20576901): no `method` field. Do not invent a duration or barrel regime.
- [Pascerette, 16786001](https://www.vinmonopolet.no/p/16786001): “Tradisjonell metode.” This is a still red. That phrase does not establish traditional-method sparkling production.
- [Belleville, 20063201](https://www.vinmonopolet.no/p/20063201): east-facing clay-limestone site, vines planted in the 1980s, 12 months in French barrels with 15% new oak.
- [Madame de Rayne, 19899302](https://www.vinmonopolet.no/p/19899302): selected botrytis grapes, oak vinification, 18 months in oak with 30% new oak.

# Printing and game

Print `team-pack.pdf` once per team, single-sided: shared answers, map master, aroma master, price master. `cheat-sheets.pdf` contains just the three question-master sheets. Keep the same glass letters and bottle order as the test tasting.

Three scored questions: region, tasting note, purchase price. One point per question, 18 points across six wines. There is no coordinator role. Grapes are explanatory clues only. Region scoring is deliberately broader than a single map square.

This is a paper-scored pack. The existing live quiz engine still uses its original category and map rules; do not assume it implements the paper scoring.

# Illustration

The original still life below has been replaced. The current asset is `public/illustrations/wine-editorial-v2.png`. See `artwork-v2.md` for the current prompt, references and built-in generation details.

Built-in image generation was used. Final asset: `public/illustrations/wine-charcoal-v1.png`, transparent PNG, 2172 × 724.

Prompt: “Use case: illustration-story. Asset type: a small editorial illustration banner for printable A4 wine-tasting clue sheets, adults at a casual wine night. One cohesive charming still life: a slender half-filled wine glass, a cut lemon, a few cherries, a small piece of crusty bread, a honey dipper with one small drop, and a tiny wine barrel, casually arranged along a low horizontal baseline. Style: original loose charcoal and graphite drawing, confident imperfect outlines, delicate cross-hatching and light smudges, playful French sketchbook feel, artsy and understated rather than polished clip art. Monochrome black and grey; true transparent background. Wide landscape composition, generous transparent space around objects, light ink coverage so home printing is economical, every object distinct at small print size. No lettering, no labels, no watermark, no frame, no beige paper rectangle. No grapes or faces.”
