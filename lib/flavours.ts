/**
 * The card's aroma vocabulary, mirrored for the server.
 *
 * The scanner never reads this — it measures the printed card's own DOM, so the
 * bubble map cannot drift. But the wheel has to know which category a flavour
 * belongs to, the answer-key editor has to offer the same words, and the manual
 * card has to reproduce the paper one exactly. All three need the list here.
 *
 * That makes this a duplicate of public/card-v2.html, so `npm run check:vocab`
 * diffs the two and fails if they ever part company.
 */

export type Tier = "Primary" | "Secondary" | "Tertiary";

export type Category = {
  name: string;
  tier: Tier;
  options: string[];
};

const WHITE: Category[] = [
  { name: "Citrus fruit", tier: "Primary", options: ["Lemon", "Lime", "Grapefruit", "Orange", "Bergamot"] },
  { name: "Orchard fruit", tier: "Primary", options: ["Apple", "Pear", "Peach", "Apricot", "Quince"] },
  { name: "Tropical fruit", tier: "Primary", options: ["Pineapple", "Mango", "Melon", "Lychee", "Passion"] },
  { name: "Floral", tier: "Primary", options: ["Blossom", "Elderflower", "Honeysuckle", "Jasmine", "Acacia"] },
  { name: "Herbal", tier: "Primary", options: ["Grass", "Mint", "Dill", "Fennel", "Thyme"] },
  { name: "Vegetal", tier: "Primary", options: ["Capsicum", "Asparagus", "Nettle", "Pea", "Celery"] },
  { name: "Spice", tier: "Primary", options: ["Pepper", "Liquorice", "Anise", "Coriander", "Cardamom"] },
  { name: "Mineral", tier: "Primary", options: ["Stone", "Chalk", "Flint", "Slate", "Gravel"] },
  { name: "Saline", tier: "Primary", options: ["Salt", "Iodine", "Brine", "Oyster", "Seaweed"] },
  { name: "Dried fruit", tier: "Primary", options: ["Raisin", "Sultana", "Fig", "Date", "Candied"] },
  { name: "Ripeness", tier: "Primary", options: ["Ripe", "Unripe", "Cooked", "Stewed", "Baked"] },
  { name: "Other", tier: "Primary", options: ["Candy", "Bubblegum", "Wax", "Sherbet", "Cordial"] },
  { name: "Oak", tier: "Secondary", options: ["Vanilla", "Toast", "Smoke", "Cedar", "Coconut"] },
  { name: "Yeast / lees", tier: "Secondary", options: ["Biscuit", "Bread", "Brioche", "Pastry", "Dough"] },
  { name: "Malolactic", tier: "Secondary", options: ["Butter", "Cream", "Yogurt", "Cheese", "Milk"] },
  { name: "Nutty", tier: "Tertiary", options: ["Almond", "Hazelnut", "Walnut", "Marzipan", "Nougat"] },
  { name: "Honeyed", tier: "Tertiary", options: ["Honey", "Marmalade", "Beeswax", "Toffee", "Saffron"] },
  { name: "Aged", tier: "Tertiary", options: ["Petrol", "Caramel", "Cinnamon", "Nutmeg", "Ginger"] },
];

const RED: Category[] = [
  { name: "Red fruit", tier: "Primary", options: ["Cherry", "Raspberry", "Strawberry", "Cranberry", "Redcurrant"] },
  { name: "Black fruit", tier: "Primary", options: ["Blackberry", "Blackcurrant", "Plum", "Blueberry", "Mulberry"] },
  { name: "Dried fruit", tier: "Primary", options: ["Raisin", "Prune", "Fig", "Date", "Fruitcake"] },
  { name: "Floral", tier: "Primary", options: ["Violet", "Rose", "Lavender", "Lilac", "Potpourri"] },
  { name: "Herbal", tier: "Primary", options: ["Mint", "Eucalyptus", "Sage", "Thyme", "Bay"] },
  { name: "Vegetal", tier: "Primary", options: ["Capsicum", "Tomato", "Olive", "Beetroot", "Fennel"] },
  { name: "Spice", tier: "Primary", options: ["Pepper", "Liquorice", "Anise", "Juniper", "Chilli"] },
  { name: "Earth", tier: "Primary", options: ["Soil", "Dust", "Clay", "Ash", "Moss"] },
  { name: "Mineral", tier: "Primary", options: ["Graphite", "Iron", "Slate", "Gravel", "Blood"] },
  { name: "Pungent", tier: "Primary", options: ["Tar", "Menthol", "Camphor", "Resin", "Pine"] },
  { name: "Ripeness", tier: "Primary", options: ["Ripe", "Unripe", "Jammy", "Stewed", "Baked"] },
  { name: "Other", tier: "Primary", options: ["Candy", "Bubblegum", "Cola", "Balsamic", "Kirsch"] },
  { name: "Oak", tier: "Secondary", options: ["Vanilla", "Toast", "Cedar", "Smoke", "Coconut"] },
  { name: "Chocolate", tier: "Secondary", options: ["Cocoa", "Coffee", "Mocha", "Toffee", "Butterscotch"] },
  { name: "Malolactic", tier: "Secondary", options: ["Butter", "Cream", "Yogurt", "Cheese", "Milk"] },
  { name: "Aged", tier: "Tertiary", options: ["Leather", "Tobacco", "Cigar", "Tea", "Caramel"] },
  { name: "Savoury", tier: "Tertiary", options: ["Game", "Bacon", "Soy", "Broth", "Umami"] },
  { name: "Forest floor", tier: "Tertiary", options: ["Mushroom", "Truffle", "Leaves", "Undergrowth", "Compost"] },
];

export const VOCAB: Record<"WHITE" | "RED", Category[]> = { WHITE, RED };

export function categoriesFor(side: string): Category[] {
  return side === "RED" ? RED : WHITE;
}

/** Flavours are stored as "Category|Option", matching the card's own wording. */
export const flavourKey = (category: string, option: string) => `${category}|${option}`;

export const TIERS: Tier[] = ["Primary", "Secondary", "Tertiary"];

/** What each tier of the wheel actually tells you, for the legend. */
export const TIER_BLURB: Record<Tier, string> = {
  Primary: "from the grape",
  Secondary: "from the winemaking",
  Tertiary: "from the aging",
};
