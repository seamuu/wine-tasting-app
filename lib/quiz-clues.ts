/** Supporting clues, not answers tied to glass letters. References live beside
 * each section so the printed pack can be checked without trusting a guess. */
export const REGION_CLUES = [
  { region: "Champagne", place: "North-east, around Reims", clue: "Chardonnay, Pinot Noir and Meunier. Bubbles, apple/citrus and sometimes bread or pastry. Other French regions also make sparkling wine." },
  { region: "Burgundy / Bourgogne", place: "East, Dijon to Mâcon", clue: "White: often Chardonnay, apple and citrus, sometimes oak. Red: often Pinot Noir, red berries and fresh acidity. Both colours can come from here." },
  { region: "Bordeaux", place: "South-west, around Bordeaux", clue: "Reds often blend Cabernet and Merlot. Sauternes makes sweet whites, often Sémillon, with honey and dried-fruit notes. Dry whites are made here too." },
  { region: "Loire", place: "West and centre, along the river", clue: "Sauvignon Blanc can smell of citrus and green herbs. Chenin can give apple or quince, in dry or sweet wines. Sweetness alone does not prove Bordeaux." },
  { region: "Alsace", place: "Eastern border, near Strasbourg", clue: "Often aromatic whites: Riesling with citrus; Gewürztraminer with rose or lychee. Wines can be dry or sweet." },
  { region: "Rhône", place: "South-east, Lyon towards Avignon", clue: "Syrah can give dark berries and black pepper; Grenache, ripe red fruit and spice. White wines can be full and floral." },
];

export const GRAPE_CLUES = [
  ["Chardonnay", "Apple, lemon or other citrus. Oak may add toast or vanilla; lees can add texture.", "Burgundy; also a main Champagne grape."],
  ["Pinot Noir", "Cherry, raspberry, flowers; sometimes herbs or earth. Often fresh, with varying tannin.", "Red Burgundy; also used in white Champagne."],
  ["Sémillon", "Dry styles can feel waxy. Sweet, botrytis styles can show honey, dried fruit, nuts or mushroom.", "Bordeaux, especially sweet Sauternes; not always sweet."],
  ["Sauvignon Blanc", "Citrus, green herbs, grass or blackcurrant leaf. Usually fresh and aromatic.", "Loire, including Sancerre; also Bordeaux."],
  ["Chenin Blanc", "Apple, quince or honey. Often high acidity. Can be dry, sweet or sparkling.", "Loire, including Vouvray and Anjou."],
  ["Syrah", "Blackberry, black pepper and sometimes olive. Usually a firmer red than a light Pinot.", "Especially northern Rhône."],
];

export const AROMA_CLUES = [
  ["Apple / citrus / herbs", "A fresh-fruit description may fit. Check body and oak to separate two similar whites."],
  ["Cherry / strawberry / raspberry", "Look among the red-berry descriptions. Then compare herbs, oak and drying tannin."],
  ["Toast / bread / pastry", "May point to lees ageing or oak. With bubbles, lees-aged sparkling wine is worth considering."],
  ["Honey / apricot / dried fruit", "Try the richer descriptions. Taste again: does it actually taste sweet, or only smell fruity?"],
];

export const SENSORY_CLUES = [
  ["Acidity", "Makes your mouth water, like lemon. Sourness is different from bitterness."],
  ["Tannin", "Dries the gums and cheeks, like strong black tea. It is not the same as a dry, unsweet wine."],
  ["Body", "How light or weighty it feels, rather than how much flavour it has."],
  ["Sweetness", "Sugar on the palate. A wine can smell of ripe fruit but still taste dry; acidity can mask sweetness."],
];

export const CLUE_SOURCES = {
  grapes: "https://www.vinmonopolet.no/fag/drueleksikon",
  regions: "https://www.vinmonopolet.no/fag/vinland/frankrike",
  oak: "https://www.vinmonopolet.no/fag/artikler/vin-med-fatpreg",
  sweetness: "https://www.vinmonopolet.no/fag/artikler/grunnsmak-sodme",
  champagne: "https://www.champagne.fr/en/about-champagne/how-champagne-is-made/maturation",
};

/** Bottle-specific production facts checked in the product JSON. No glass
 * letters or bottle identities are printed on the participant's price sheet. */
export const PRODUCTION_CLUES = [
  { sourceRef: "21132301", title: "Time on yeast", text: "One sparkling wine spent 36 months on lees, the spent yeast after fermentation. Bread, biscuit or pastry can be a clue. The producer has to store the wine before selling it." },
  { sourceRef: "10644301", title: "Texture without proof of oak", text: "One still white spent 7 months on lees. This can add texture. A fuller or creamy white is not automatically oaked, expensive or sweet." },
  { sourceRef: "20063201", title: "Barrels and red fruit", text: "One red spent 12 months in French barrels, 15% new. Oak may add toast, wood or spice. Compare the two reds before deciding which description this fits." },
  { sourceRef: "19899302", title: "Concentrated sweet fruit", text: "One sweet wine used selected botrytis-affected grapes and spent 18 months in oak. Think honey or dried fruit alongside real sweetness. Careful picking and ageing take work and time." },
];
