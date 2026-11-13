/** Receipt-specific comparisons, not general claims about price or quality.
 * Show them only while the flight's facts still support every clue. */
type PriceWine = { sourceRef?: string | null; side?: string; priceNok: unknown; tastingNote: string | null };
export function pricePuzzleClues(wines: PriceWine[]) {
  const codes = ['21132301', '10644301', '20576901', '16786001', '20063201', '19899302'];
  if (wines.length !== codes.length || codes.some(code => wines.filter(wine => wine.sourceRef === code).length !== 1)) return null;
  const get = (code: string) => wines.find(wine => wine.sourceRef === code)!;
  const price = (code: string) => Number(get(code).priceNok);
  const prices = codes.map(price);
  if (prices.some(value => !Number.isFinite(value) || value <= 0) || new Set(prices).size !== codes.length) return null;
  const lowWhite = get('10644301'), highWhite = get('20576901');
  const lowRed = get('16786001'), highRed = get('20063201');
  const oak = (wine: PriceWine) => /\bfat\b/i.test(wine.tastingNote ?? '');
  if (lowWhite.side !== 'WHITE' || highWhite.side !== 'WHITE' || lowRed.side !== 'RED' || highRed.side !== 'RED') return null;
  if (price('10644301') !== Math.min(...prices) || price('20576901') !== Math.max(...prices)) return null;
  if (!(price('16786001') < 250 && price('20063201') > 400 && price('16786001') < price('20063201'))) return null;
  if (oak(lowWhite) || !oak(highWhite) || oak(lowRed) || !oak(highRed)) return null;
  return [
    { title: 'The half-bottle', text: 'The sweet, honeyed wine comes in a 37.5 cl half-bottle. Match the price of that bottle, not a price per litre.' },
    { title: 'The two dry whites', text: 'The two still, dry whites are at opposite ends of the price list: one is the cheapest bottle and one is the most expensive.' },
    { title: 'The two reds', text: 'One red costs less than kr 250. The other costs more than kr 400.' },
    { title: 'The oak clue', text: 'In both the dry-white pair and the red pair, the pricier wine has fat (oak) in Polet’s tasting note. Ask the aroma master which glass fits those descriptions.' },
  ];
}
