/**
 * Entry Quality Scoring System
 * Evaluates signal quality based on multiple factors
 * Only allows trades with score >= 70
 */

import type { EntryQualityScore, EntryZoneStrength, VolumeConfirmation, EntryConfirmation } from "./types";

export function calculateEntryQualityScore(
  confirmationStrength: number, // 0-100
  volumeConfirmed: boolean,
  volumeRatio: number,
  entryZoneStrength: EntryZoneStrength,
  trendAlignment: boolean,
  timeframeAlignment: boolean,
  distanceToZone: number | null
): EntryQualityScore {
  // 1. CONFIRMATION STRENGTH (0-100)
  // Based on type and reliability
  let confirmationScore = confirmationStrength;
  if (confirmationScore < 0) confirmationScore = 0;
  if (confirmationScore > 100) confirmationScore = 100;

  // 2. VOLUME STRENGTH (0-100)
  let volumeScore = 40; // baseline
  if (volumeConfirmed) {
    volumeScore = 60 + Math.min(volumeRatio * 10, 40); // 60-100
  }

  // 3. ZONE STRENGTH (0-100)
  // Direct from entry zone strength score
  const zoneScore = entryZoneStrength.score;

  // 4. TREND ALIGNMENT (0-100)
  // HTF trend matches signal direction
  const trendAlignmentScore = trendAlignment ? 100 : 30;

  // 5. TIMEFRAME ALIGNMENT (0-100)
  // LTF confirmation of HTF trend
  const timeframeAlignmentScore = timeframeAlignment ? 100 : 35;

  // WEIGHTED CALCULATION
  const weights = {
    confirmation: 0.25,
    volume: 0.20,
    zone: 0.20,
    trend: 0.20,
    timeframe: 0.15,
  };

  const finalScore =
    confirmationScore * weights.confirmation +
    volumeScore * weights.volume +
    zoneScore * weights.zone +
    trendAlignmentScore * weights.trend +
    timeframeAlignmentScore * weights.timeframe;

  // Clamp between 0-100
  const clampedScore = Math.max(0, Math.min(100, Math.round(finalScore)));

  // Assessment
  let assessment: "excellent" | "good" | "acceptable" | "poor";
  if (clampedScore >= 85) {
    assessment = "excellent";
  } else if (clampedScore >= 70) {
    assessment = "good";
  } else if (clampedScore >= 50) {
    assessment = "acceptable";
  } else {
    assessment = "poor";
  }

  return {
    score: clampedScore,
    components: {
      confirmationStrength: confirmationScore,
      volumeStrength: volumeScore,
      zoneStrength: zoneScore,
      trendAlignment: trendAlignmentScore,
      timeframeAlignment: timeframeAlignmentScore,
    },
    assessment,
    passFilter: clampedScore >= 70,
  };
}

export function getEntryQualityAssessment(score: number): string {
  if (score >= 85) {
    return "Excellent setup - high probability entry";
  } else if (score >= 70) {
    return "Good setup - proceed with entry";
  } else if (score >= 50) {
    return "Acceptable setup - use smaller position size";
  } else {
    return "Poor setup - consider waiting for better confirmation";
  }
}
