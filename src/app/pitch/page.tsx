import type { Metadata } from "next";
import PitchDeck from "./PitchDeck";

export const metadata: Metadata = {
  title: "AIPMS — Sales Pitch Deck",
};

export default function PitchPage() {
  return <PitchDeck />;
}
