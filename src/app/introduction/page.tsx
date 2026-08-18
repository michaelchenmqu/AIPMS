import type { Metadata } from "next";
import IntroductionDeck from "./IntroductionDeck";

export const metadata: Metadata = {
  title: "AIPMS — Introduction",
};

export default function IntroductionPage() {
  return <IntroductionDeck />;
}
