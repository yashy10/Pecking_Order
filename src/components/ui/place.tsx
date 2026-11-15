import { createContext, useContext } from "react";
import { places, type Place, type PlaceColors } from "@/theme";

// Each screen sits in one "place", and the place decides the colour of its main button,
// header and backdrop. Screen provides it; primitives read it, so screens rarely pass colours.

const PlaceContext = createContext<Place>("home");

export const PlaceProvider = PlaceContext.Provider;

export function usePlace(): PlaceColors {
  return places[useContext(PlaceContext)];
}
