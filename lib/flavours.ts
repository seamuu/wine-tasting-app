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
  /** What this family tastes like, as a colour: citrus is lemon, red fruit is
   *  red, earth is brown. Read round the wheel it makes a spectrum, and it
   *  means a bulge is recognisable before you have read a single label. */
  colour: string;
};

const WHITE: Category[] = [
  { name: "Citrus fruit", tier: "Primary", options: ["Lemon", "Lime", "Grapefruit", "Orange", "Bergamot"], colour: "#E3B02F" },
  { name: "Orchard fruit", tier: "Primary", options: ["Apple", "Pear", "Peach", "Apricot", "Quince"], colour: "#C4C24E" },
  { name: "Tropical fruit", tier: "Primary", options: ["Pineapple", "Mango", "Melon", "Lychee", "Passion"], colour: "#E39440" },
  { name: "Floral", tier: "Primary", options: ["Blossom", "Elderflower", "Honeysuckle", "Jasmine", "Acacia"], colour: "#D98CA8" },
  { name: "Herbal", tier: "Primary", options: ["Grass", "Mint", "Dill", "Fennel", "Thyme"], colour: "#6FA05C" },
  { name: "Vegetal", tier: "Primary", options: ["Capsicum", "Asparagus", "Nettle", "Pea", "Celery"], colour: "#4A8A57" },
  { name: "Spice", tier: "Primary", options: ["Pepper", "Liquorice", "Anise", "Coriander", "Cardamom"], colour: "#B4652A" },
  { name: "Mineral", tier: "Primary", options: ["Stone", "Chalk", "Flint", "Slate", "Gravel"], colour: "#7F93A6" },
  { name: "Saline", tier: "Primary", options: ["Salt", "Iodine", "Brine", "Oyster", "Seaweed"], colour: "#6BA6BC" },
  { name: "Dried fruit", tier: "Primary", options: ["Raisin", "Sultana", "Fig", "Date", "Candied"], colour: "#9A6E48" },
  { name: "Ripeness", tier: "Primary", options: ["Ripe", "Unripe", "Cooked", "Stewed", "Baked"], colour: "#C2836C" },
  { name: "Other", tier: "Primary", options: ["Candy", "Bubblegum", "Wax", "Sherbet", "Cordial"], colour: "#A98FC0" },
  { name: "Oak", tier: "Secondary", options: ["Vanilla", "Toast", "Smoke", "Cedar", "Coconut"], colour: "#B08A55" },
  { name: "Yeast / lees", tier: "Secondary", options: ["Biscuit", "Bread", "Brioche", "Pastry", "Dough"], colour: "#C9A97B" },
  { name: "Malolactic", tier: "Secondary", options: ["Butter", "Cream", "Yogurt", "Cheese", "Milk"], colour: "#D9C289" },
  { name: "Nutty", tier: "Tertiary", options: ["Almond", "Hazelnut", "Walnut", "Marzipan", "Nougat"], colour: "#96784F" },
  { name: "Honeyed", tier: "Tertiary", options: ["Honey", "Marmalade", "Beeswax", "Toffee", "Saffron"], colour: "#D9A63C" },
  { name: "Aged", tier: "Tertiary", options: ["Petrol", "Caramel", "Cinnamon", "Nutmeg", "Ginger"], colour: "#8C6E3F" },
];

const RED: Category[] = [
  { name: "Red fruit", tier: "Primary", options: ["Cherry", "Raspberry", "Strawberry", "Cranberry", "Redcurrant"], colour: "#C0392B" },
  { name: "Black fruit", tier: "Primary", options: ["Blackberry", "Blackcurrant", "Plum", "Blueberry", "Mulberry"], colour: "#6B3161" },
  { name: "Dried fruit", tier: "Primary", options: ["Raisin", "Prune", "Fig", "Date", "Fruitcake"], colour: "#8A5A3A" },
  { name: "Floral", tier: "Primary", options: ["Violet", "Rose", "Lavender", "Lilac", "Potpourri"], colour: "#B06FA8" },
  { name: "Herbal", tier: "Primary", options: ["Mint", "Eucalyptus", "Sage", "Thyme", "Bay"], colour: "#6FA05C" },
  { name: "Vegetal", tier: "Primary", options: ["Capsicum", "Tomato", "Olive", "Beetroot", "Fennel"], colour: "#5E7A46" },
  { name: "Spice", tier: "Primary", options: ["Pepper", "Liquorice", "Anise", "Juniper", "Chilli"], colour: "#A9462C" },
  { name: "Earth", tier: "Primary", options: ["Soil", "Dust", "Clay", "Ash", "Moss"], colour: "#7A5B43" },
  { name: "Mineral", tier: "Primary", options: ["Graphite", "Iron", "Slate", "Gravel", "Blood"], colour: "#6E7480" },
  { name: "Pungent", tier: "Primary", options: ["Tar", "Menthol", "Camphor", "Resin", "Pine"], colour: "#3F7A6A" },
  { name: "Ripeness", tier: "Primary", options: ["Ripe", "Unripe", "Jammy", "Stewed", "Baked"], colour: "#B4553F" },
  { name: "Other", tier: "Primary", options: ["Candy", "Bubblegum", "Cola", "Balsamic", "Kirsch"], colour: "#9A7FA8" },
  { name: "Oak", tier: "Secondary", options: ["Vanilla", "Toast", "Cedar", "Smoke", "Coconut"], colour: "#B08A55" },
  { name: "Chocolate", tier: "Secondary", options: ["Cocoa", "Coffee", "Mocha", "Toffee", "Butterscotch"], colour: "#6B4A32" },
  { name: "Malolactic", tier: "Secondary", options: ["Butter", "Cream", "Yogurt", "Cheese", "Milk"], colour: "#D9C289" },
  { name: "Aged", tier: "Tertiary", options: ["Leather", "Tobacco", "Cigar", "Tea", "Caramel"], colour: "#8A6440" },
  { name: "Savoury", tier: "Tertiary", options: ["Game", "Bacon", "Soy", "Broth", "Umami"], colour: "#7A3B3B" },
  { name: "Forest floor", tier: "Tertiary", options: ["Mushroom", "Truffle", "Leaves", "Undergrowth", "Compost"], colour: "#6E6350" },
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
