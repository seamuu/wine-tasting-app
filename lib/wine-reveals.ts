import type { WineMapLocation } from "./france-wine-map";

/** Bottle stories matched by Polet product number. See
 * artifacts/imeto-julebord/wine-reveal-research.md for source scope and conflicts.
 * Tasting suggestions are prompts, not a prediction of anyone's experience. */
export type WineReveal = {
  style: string;
  volumeCl: number;
  location?: WineMapLocation;
  summary: string;
  lookFor: string[];
  highlights: { title: string; text: string }[];
  question: string;
  website: { title: string; url: string };
  sources: { title: string; url: string }[];
};
const REVEALS: Record<string, WineReveal> = {
  "21132301": {
    style: "Champagne · brut", volumeCl: 75,
    location: { region: "champagne", title: "Champagne", place: "Pargny-lès-Reims · Montagne de Reims",
      caption: "The marker shows the producer’s village.", point: { longitude: 3.9236, latitude: 49.2183 } },
    summary: "Frédéric Thiébault is the fifth generation of his family making Champagne in Pargny-lès-Reims. His son Fabian has joined him. This Brut spends three years ageing before it is ready.",
    lookFor: ["Apple and citrus", "Toast and pastry", "Creamy bubbles"],
    highlights: [
      { title: "Three years on the yeast", text: "Polet lists 36 months on lees, the spent yeast left after fermentation. That contact can bring bread and pastry aromas alongside the apple and citrus." },
      { title: "More than one harvest", text: "Polet lists 40% reserve wine: wine held back from earlier harvests for blending. The aim is a consistent house style, with fresh fruit and some maturity together." },
    ],
    question: "Can you pick out the fresh apple and the pastry separately?",
    website: { title: "Thiébault’s Brut · producer website", url: "https://www.champagnethiebaultfrederic.fr/store/en/champagnes/champagne-brut/" },
    sources: [
      { title: "Champagne growers: Frédéric Thiebault", url: "https://www.champagnedevignerons.fr/vignerons/champagne-frederic-thiebault/" },
      { title: "Comité Champagne: ageing on lees", url: "https://www.champagne.fr/en/about-champagne/how-champagne-is-made/maturation" },
    ],
  },
  "20688001": {
    style: "Alcohol-free sparkling tea · 0%", volumeCl: 75,
    summary: "A Danish sparkling tea with grape juice and lemon juice. Green tea, including Sencha, is part of the blend. Polet lists 0% alcohol and describes citrus, green tea and a little bitterness.",
    lookFor: ["Green tea", "Citrus", "A slightly bitter finish"],
    highlights: [{ title: "What is in the bottle", text: "The producer lists green, white and herbal teas, grape juice, lemon juice and added carbon dioxide. The bubbles are added rather than made by a second wine fermentation." }],
    question: "Did the tea bitterness make it seem drier than the sugar figure suggests?",
    website: { title: "Lysegrøn · producer website", url: "https://sparklingtea.co/products/sparkling-tea-lysegron/" },
    sources: [{ title: "Copenhagen Sparkling Tea: Lysegrøn", url: "https://sparklingtea.co/products/sparkling-tea-lysegron/" }],
  },
  "10644301": {
    style: "Dry white · Chardonnay", volumeCl: 75,
    location: { region: "burgundy", title: "Burgundy / Bourgogne", place: "Lugny · Mâconnais",
      caption: "Les Charmes is in Lugny, in southern Burgundy. Village shown.", point: { longitude: 4.8192, latitude: 46.4797 } },
    summary: "Jocelyne and Michel Paquet started the family domaine in 1980. Their three sons now carry it on, with Camille looking after the vines and cellar. This Chardonnay comes from Lugny in southern Burgundy.",
    lookFor: ["Ripe apple", "Citrus and white flowers", "A rounded texture"],
    highlights: [
      { title: "Fullness from time on the yeast", text: "Polet lists seven months on lees. The producer describes ageing this cuvée in tanks for six to seven months. Lees can add texture while the fruit stays fresh." },
      { title: "Smell for flowers as well as fruit", text: "The family describes jasmine and orchard fruit; Polet adds ripe apple, citrus and a little nuttiness. See which of those survives as you swallow." },
    ],
    question: "Keep a little to compare with the Jobard. Which feels rounder?",
    website: { title: "Les Charmes · producer website", url: "https://famille-paquet.com/macon-lugny-les-charmes/?lang=en" },
    sources: [
      { title: "Famille Paquet: Les Charmes and its tank ageing", url: "https://famille-paquet.com/macon-lugny-les-charmes/?lang=en" },
      { title: "Famille Paquet: the family and Camille’s role", url: "https://famille-paquet.com/our-history/?lang=en" },
    ],
  },
  "20576901": {
    style: "Dry white · Chardonnay", volumeCl: 75,
    location: { region: "burgundy", title: "Burgundy / Bourgogne", place: "Bourgogne regional appellation",
      caption: "Burgundy is highlighted. A single village origin hasn’t been confirmed for this bottle." },
    summary: "Rémi Jobard took over from his father Charles in 1993. He stopped using herbicides and moved the family vineyards to organic farming. He is best known for Meursault; this is his broader Bourgogne bottling.",
    lookFor: ["Citrus and apple", "Some oak", "How long the flavour lasts"],
    highlights: [
      { title: "The wood should leave room for the fruit", text: "Jobard’s distributor describes his aim as precision without obvious woody aromas. Polet does note some oak here. See where it sits alongside the apple and citrus." },
      { title: "Give the finish a moment", text: "Both dry whites are Chardonnay. After swallowing, compare how long the flavour lasts, how your mouth feels, and whether the oak becomes easier to notice." },
    ],
    question: "At over twice the Paquet’s price, did you prefer this one blind?",
    website: { title: "Jobard · distributor’s producer profile", url: "https://www.dvp-vins-domaines.com/en/domain/91/domaine-remi-jobard" },
    sources: [
      { title: "DVP: Rémi Jobard’s family estate and farming", url: "https://www.dvp-vins-domaines.com/en/domain/91/domaine-remi-jobard" },
      { title: "DVP: Bourgogne Chardonnay and the producer’s approach to oak", url: "https://vincod.com/J0I21E/get/tech-sheet/3731PY2VNB" },
    ],
  },
  "16786001": {
    style: "Red · Pinot Noir", volumeCl: 75,
    location: { region: "burgundy", title: "Sologny, Burgundy", place: "La Pascerette des Vignes · Mâconnais", producerBase: true,
      caption: "The domaine’s base is shown. Polet lists this wine’s origin as France; the vineyard hasn’t been confirmed.", point: { longitude: 4.6739, latitude: 46.3743 } },
    summary: "Céline Robergeot-Cienki trained as an engineer before starting this domaine in 2013. She and Vincent also raise sheep. Pascerette comes from a word meaning ‘to graze’, a nod to the farm’s two jobs.",
    lookFor: ["Strawberry and cherry", "Herbs and anise", "Softness versus drying tannin"],
    highlights: [
      { title: "Berries, then something herbal", text: "Polet describes strawberry and cherry with herbs and a little anise. Smell once for the fruit, then again for that less obvious savoury side." },
      { title: "What does ‘soft’ feel like?", text: "Polet calls the texture fairly soft and lists under 3 g/L sugar. Notice the gentle grip on your gums separately from the ripe fruit flavour." },
    ],
    question: "Against the Rully, which Pinot leaves your mouth feeling drier?",
    website: { title: "La Pascerette · producer website", url: "https://www.pascerettedesvignes.com/" },
    sources: [{ title: "La Pascerette: Céline, Vincent, sheep and the domaine’s name", url: "https://www.pascerettedesvignes.com/" }],
  },
  "20063201": {
    style: "Red · Pinot Noir", volumeCl: 75,
    location: { region: "burgundy", title: "Burgundy / Bourgogne", place: "Rully · Côte Chalonnaise",
      caption: "Chaponnière is a vineyard in Rully. The marker shows the village.", point: { longitude: 4.7601, latitude: 46.871 } },
    summary: "Belleville makes this Pinot from Chaponnière, a named vineyard in Rully. The name comes from ‘chapons’, the Burgundian word for vine cuttings.",
    lookFor: ["Raspberry and cherry", "A little smoke", "Herbs and forest floor"],
    highlights: [
      { title: "One east-facing slope", text: "Belleville describes clay-limestone soils on an east-facing slope. Polet dates the vines to the 1980s. This Pinot comes with a specific vineyard address." },
      { title: "A year in barrels, mostly used", text: "The 2023 spent 12 months in French oak, only 15% of it new. Look for red berries with subtle smoke or savoury notes, rather than expecting obvious vanilla." },
    ],
    question: "Did you notice more savoury flavour here than in the Pascerette?",
    website: { title: "Chaponnière · producer website", url: "https://www.domainebelleville.com/en/wines/11/rully-quot-chaponniere-quot" },
    sources: [{ title: "Domaine Belleville: Rully Chaponnière", url: "https://www.domainebelleville.com/en/wines/11/rully-quot-chaponniere-quot" }],
  },
  "19899302": {
    style: "Sweet white · Sauternes", volumeCl: 37.5,
    location: { region: "bordeaux", title: "Bordeaux · Sauternes", place: "Bommes · Château de Rayne Vigneau",
      caption: "The estate is in Bommes, in the Sauternes appellation. Commune shown.", point: { longitude: -0.3454, latitude: 44.5546 } },
    summary: "Madame de Rayne honours Catherine de Pontac, who bought the estate in 1834. Under her ownership it became a Sauternes first growth in 1855. This is the estate’s second wine, intended to be enjoyed younger.",
    lookFor: ["Apricot and honey", "Dried fruit", "Acidity alongside sweetness"],
    highlights: [
      { title: "The grapes shrivel on purpose", text: "The grapes are selected by hand for noble rot, a fungus that helps berries lose water and concentrate their sugars. Look for honey, apricot and dried fruit." },
      { title: "Sweetness with a fresh edge", text: "Polet lists 105 g/L sugar and 6.3 g/L acid. Notice whether the citrus-like sharpness makes that sweetness feel lighter, and keeps you wanting another sip." },
    ],
    question: "Does the finish feel sticky, fresh, or somewhere between?",
    website: { title: "Madame de Rayne · producer website", url: "https://www.raynevigneau.fr/fr/3-madame-de-rayne" },
    sources: [
      { title: "Rayne Vigneau: Madame de Rayne’s history and style", url: "https://www.raynevigneau.fr/document/vins/Madame-de-Rayne-EN.pdf" },
      { title: "UC Davis: Botrytis and noble rot", url: "https://wine.ucdavis.edu/industry-info/enology/wine-microbiology/yeast-mold/botrytis-cinerea" },
    ],
  },
};

export function wineReveal(sourceRef?: string | null, sourceUrl?: string | null): WineReveal | null {
  const code = sourceRef ?? sourceUrl?.match(/\/p\/(\d+)/)?.[1];
  return code ? REVEALS[code] ?? null : null;
}
