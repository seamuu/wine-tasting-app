// Shared vocabulary between the printed card (card-v1.html), the scan tool
// (scan-test.html), and the database enums in prisma/schema.prisma.

export const COLORS = ["Red", "Orange", "Yellow", "Green", "Blue"] as const;
export const ANIMALS = ["Fox", "Owl", "Bear", "Wolf"] as const;
export const FLIGHT_POSITIONS = ["A", "B", "C", "D"] as const;

export type ColorLabel = (typeof COLORS)[number];
export type AnimalLabel = (typeof ANIMALS)[number];
export type FlightPositionLabel = (typeof FLIGHT_POSITIONS)[number];

export function colorToEnum(label: string) {
  return label.toUpperCase() as Uppercase<ColorLabel>;
}
export function animalToEnum(label: string) {
  return label.toUpperCase() as Uppercase<AnimalLabel>;
}
export function tasterIdLabel(color: string, animal: string) {
  return `${color} ${animal}`;
}
