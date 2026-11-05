import { describe, it, expect } from "vitest";
import { dynamicPrice, roundHalf } from "./pricing";

describe("moteur de prix", () => {
  it("plancher à 30 % du prix de base", () => {
    expect(dynamicPrice(20, 0, 0).price).toBe(6);
  });
  it("arrondi à 0,5 TND", () => {
    expect(roundHalf(7.3)).toBe(7.5);
    expect(roundHalf(7.2)).toBe(7);
  });
  it("prix plein si frais et loin de la fermeture", () => {
    expect(dynamicPrice(12, 100, 300).price).toBe(12);
  });
});
