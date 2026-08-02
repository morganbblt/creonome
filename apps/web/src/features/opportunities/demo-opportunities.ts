import type { Opportunity } from "@creonome/contracts";

export type DemoOpportunity = Opportunity & {
  badge: string;
  duration: string;
  hook: string;
  why: string;
  reserve: string;
  verdict: string;
  effort: string;
  channel: string;
};

export const demoOpportunities: DemoOpportunity[] = [
  {
    id: "7af6fdcc-8881-48c2-ae5d-3f45df1bd0a2",
    strategy: "signature",
    badge: "Natural fit",
    duration: "0:35",
    title: "Flip the crate find in one take",
    pitch:
      "One unbroken shot: needle drop, chop, stack, drop. No cuts, no commentary.",
    hook: "“€2 record. One take. No talking.”",
    why: "Six of your eight best videos open on a gesture before second three, and you already shoot single-take studio content.",
    reserve: "Clear the sample before the storyboard step.",
    score: 86,
    confidence: "high",
    freshness: "fresh",
    verdict: "Strong",
    effort: "low effort",
    channel: "TikTok first",
    nextLevel: "script",
    creditCost: 2,
  },
  {
    id: "c51ff70f-2aed-48ec-97b1-3163eb4247a4",
    strategy: "stretch",
    badge: "Emerging",
    duration: "0:28",
    title: "Silent studio: a beat built with zero voice",
    pitch: "Captions carry the whole narration while the room stays quiet.",
    hook: "“Nobody talks in this video. Watch the arrangement do it.”",
    why: "Your minimal on-screen text is the one habit this format asks you to break — a stretch you marked as a future direction.",
    reserve: "Caption writing is the real work here, not the shoot.",
    score: 81,
    confidence: "medium",
    freshness: "new",
    verdict: "Worth a bet",
    effort: "medium effort",
    channel: "Reels first",
    nextLevel: "script",
    creditCost: 2,
  },
  {
    id: "b37ea693-66d4-41fc-a260-768942277d10",
    strategy: "repeatable",
    badge: "Cross-sector",
    duration: "0:45",
    title: "Track recipe: four ingredients, one drop",
    pitch: "A recipe-card structure borrowed from cooking, moved onto a beat.",
    hook: "“Four ingredients. Three minutes. One track that isn’t bad.”",
    why: "The list structure survives the jump between niches, and you already film top-down on the desk.",
    reserve: "Thin evidence outside its home niche.",
    score: 74,
    confidence: "low",
    freshness: "fresh",
    verdict: "Experiment",
    effort: "medium effort",
    channel: "TikTok first",
    nextLevel: "script",
    creditCost: 2,
  },
];
