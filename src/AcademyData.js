import {
  SKILL_DESCRIPTORS,
  SKILL_DIFFICULTY_PRESETS,
} from "./SkillData.js?v=20260308-1";

export const ACADEMY_STORAGE_KEY = "futbol_academy_v1";

export const MEDAL_ORDER = ["none", "bronze", "silver", "gold"];

const CORE_ACADEMY_DRILLS = [
  {
    id: "finishing_frenzy",
    label: "Finishing Frenzy",
    shortLabel: "Frenzy",
    category: "Finishing",
    accent: "#ff9b46",
    duration: 75,
    spawn: { x: -23, z: 0 },
    ball: { x: -21.6, z: 0 },
    cameraYaw: -Math.PI / 2,
    targetGoal: "right",
    summary: "Qisa vaxtda ard-arda qollar vur, bullseye targetlari partlat, kombonu itirme.",
    coaching: "Ayaq alti kontrolu saxla, 0.6-0.9 guc araliginda at ve her resetden sonra yeni targeti tez oxu.",
    medals: { bronze: 900, silver: 1500, gold: 2200 },
    scoringHints: [
      "Qol = baza xal",
      "Bullseye = ekstra bonus",
      "Combo artdiqca her vurus daha baha olur",
    ],
    metrics: [
      { key: "goals", label: "Qollar" },
      { key: "bullseyes", label: "Bullseye" },
      { key: "bestCombo", label: "Best Combo" },
    ],
  },
  {
    id: "curve_master",
    label: "Curve Master",
    shortLabel: "Curve",
    category: "Technique",
    accent: "#5ecbff",
    duration: 80,
    spawn: { x: -24, z: -2.5 },
    ball: { x: -22.5, z: -2.5 },
    cameraYaw: -Math.PI / 2,
    targetGoal: "right",
    summary: "L ve K ile falso ver, topu kunc targetlarina bur ve curveli finishing qur.",
    coaching: "Duz zərbe deyerlidir, amma esas xal spin + target kombinasiyasindadir. Topa biraz en ver.",
    medals: { bronze: 850, silver: 1450, gold: 2050 },
    scoringHints: [
      "Curveli qol = bonus",
      "Kunc ringinden kecid = yuksek bonus",
      "Zəif spin plain goal sayilir",
    ],
    metrics: [
      { key: "curveGoals", label: "Curve Qol" },
      { key: "perfectShots", label: "Perfect Curl" },
      { key: "bestCombo", label: "Best Combo" },
    ],
  },
  {
    id: "gate_runner",
    label: "Gate Runner",
    shortLabel: "Gates",
    category: "Dribble",
    accent: "#7ef29c",
    duration: 70,
    spawn: { x: -28, z: 0 },
    ball: { x: -26.5, z: 0 },
    cameraYaw: -Math.PI / 2,
    targetGoal: "right",
    summary: "Topu sequential gate-lardan kecir, marşrutu bitir, sonra yeni lap ac.",
    coaching: "W ile duz basmaq kifayet deyil. Kamera bucağini qoru, sprinti olculu islet, topu ayagindan uzaqlasma.",
    medals: { bronze: 700, silver: 1200, gold: 1750 },
    scoringHints: [
      "Her gate = xal",
      "Lap tamamla = boyuk bonus",
      "Top nezeretden cixsa combo gedir",
    ],
    metrics: [
      { key: "gatesCleared", label: "Gate" },
      { key: "laps", label: "Lap" },
      { key: "bestCombo", label: "Best Combo" },
    ],
  },
  {
    id: "long_pass_lab",
    label: "Long Pass Lab",
    shortLabel: "Long Pass",
    category: "Passing",
    accent: "#c7a3ff",
    duration: 80,
    spawn: { x: -8, z: 0 },
    ball: { x: -6.6, z: 0 },
    cameraYaw: -Math.PI / 2,
    targetGoal: "right",
    summary: "KeyQ ile uzaq paslari glowing landing zonalara endir, havada qalma ve dogrulugu balansla.",
    coaching: "Duzgun arc qur. Zone merkezine ne qeder yaxin ensen, o qeder boyuk bonus alacaqsan.",
    medals: { bronze: 780, silver: 1320, gold: 1900 },
    scoringHints: [
      "Zoneya enis = xal",
      "Perfect landing = boyuk bonus",
      "Hava vaxti ve mesafe minimumu var",
    ],
    metrics: [
      { key: "landings", label: "Landing" },
      { key: "perfectLandings", label: "Perfect" },
      { key: "bestCombo", label: "Best Combo" },
    ],
  },
];

const SKILL_DIFFICULTY_ACCENT = {
  basic: "#7ef29c",
  advanced: "#5ecbff",
  elite: "#ff9b46",
};

const SKILL_ACADEMY_DRILLS = SKILL_DESCRIPTORS.map((descriptor) => {
  const preset = SKILL_DIFFICULTY_PRESETS[descriptor.difficulty];
  return {
    id: `skill_${descriptor.id}`,
    mode: "skill_duel",
    skillId: descriptor.id,
    label: `${descriptor.label} Duel`,
    shortLabel: descriptor.label,
    category: "Skill Duel",
    accent: SKILL_DIFFICULTY_ACCENT[descriptor.difficulty] || "#7ef29c",
    duration: preset.duration,
    difficulty: descriptor.difficulty,
    spawn: { x: -18, z: 0 },
    ball: { x: -16.7, z: 0 },
    cameraYaw: -Math.PI / 2,
    targetGoal: "right",
    summary: descriptor.summary,
    coaching: descriptor.coaching,
    medals: { ...preset.medals },
    scoringHints: [
      "Beat the defender on the first read",
      "Clean gate exit keeps the combo alive",
      isArcSkillDescriptor(descriptor) ? "Recover the flick after the lift" : "Perfect timing is worth extra points",
    ],
    metrics: [
      { key: "successfulDuels", label: "Successful Duels" },
      { key: "cleanExits", label: "Clean Exits" },
      { key: "perfectTiming", label: "Perfect Timing" },
    ],
  };
});

export const ACADEMY_DRILLS = [...CORE_ACADEMY_DRILLS, ...SKILL_ACADEMY_DRILLS];

export function getAcademyDrill(drillId) {
  return ACADEMY_DRILLS.find((drill) => drill.id === drillId) || ACADEMY_DRILLS[0];
}

export function getNextAcademyDrillId(drillId) {
  const index = Math.max(0, ACADEMY_DRILLS.findIndex((drill) => drill.id === drillId));
  return ACADEMY_DRILLS[(index + 1) % ACADEMY_DRILLS.length].id;
}

export function createDefaultAcademyProgress() {
  return {
    xp: 0,
    sessions: 0,
    totalScore: 0,
    bestCombo: 0,
    medals: {},
    drills: {},
    lastPlayedDrillId: ACADEMY_DRILLS[0].id,
  };
}

export function normalizeAcademyProgress(raw = {}) {
  const next = {
    ...createDefaultAcademyProgress(),
    ...(raw || {}),
  };

  next.xp = clampInt(next.xp, 0, 999999, 0);
  next.sessions = clampInt(next.sessions, 0, 999999, 0);
  next.totalScore = clampInt(next.totalScore, 0, 9999999, 0);
  next.bestCombo = clampInt(next.bestCombo, 0, 99999, 0);
  next.lastPlayedDrillId = getAcademyDrill(next.lastPlayedDrillId).id;
  next.medals = typeof next.medals === "object" && next.medals ? { ...next.medals } : {};
  next.drills = typeof next.drills === "object" && next.drills ? { ...next.drills } : {};

  for (const drill of ACADEMY_DRILLS) {
    const rawEntry = next.drills[drill.id] || {};
    next.drills[drill.id] = {
      bestScore: clampInt(rawEntry.bestScore, 0, 999999, 0),
      plays: clampInt(rawEntry.plays, 0, 999999, 0),
      bestCombo: clampInt(rawEntry.bestCombo, 0, 99999, 0),
      bestMetric: clampInt(rawEntry.bestMetric, 0, 99999, 0),
      bestAccuracy: clampInt(rawEntry.bestAccuracy, 0, 100, 0),
      medal: normalizeMedal(rawEntry.medal || next.medals[drill.id] || "none"),
      lastScore: clampInt(rawEntry.lastScore, 0, 999999, 0),
      updatedAt: clampInt(rawEntry.updatedAt, 0, 9999999999999, 0),
    };
    next.medals[drill.id] = next.drills[drill.id].medal;
  }

  return next;
}

export function loadAcademyProgress() {
  try {
    return normalizeAcademyProgress(JSON.parse(localStorage.getItem(ACADEMY_STORAGE_KEY) || "{}"));
  } catch {
    return createDefaultAcademyProgress();
  }
}

export function saveAcademyProgress(progress) {
  const normalized = normalizeAcademyProgress(progress);
  localStorage.setItem(ACADEMY_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function calculateAcademyLevel(xp = 0) {
  let totalXp = clampInt(xp, 0, 999999, 0);
  let level = 1;
  let current = totalXp;
  let needed = getXpRequirement(level);

  while (current >= needed) {
    current -= needed;
    level += 1;
    needed = getXpRequirement(level);
  }

  return {
    level,
    currentXp: current,
    nextXp: needed,
    progress: needed > 0 ? current / needed : 1,
    totalXp,
  };
}

export function getXpRequirement(level = 1) {
  const safeLevel = clampInt(level, 1, 9999, 1);
  return 420 + (safeLevel - 1) * 150;
}

export function getDrillMedal(drill, score) {
  const safeScore = clampInt(score, 0, 999999, 0);
  if (safeScore >= drill.medals.gold) return "gold";
  if (safeScore >= drill.medals.silver) return "silver";
  if (safeScore >= drill.medals.bronze) return "bronze";
  return "none";
}

export function normalizeMedal(medal = "none") {
  return MEDAL_ORDER.includes(medal) ? medal : "none";
}

export function compareMedals(a = "none", b = "none") {
  return MEDAL_ORDER.indexOf(normalizeMedal(a)) - MEDAL_ORDER.indexOf(normalizeMedal(b));
}

export function getAcademySummary(progressInput = createDefaultAcademyProgress()) {
  const progress = normalizeAcademyProgress(progressInput);
  const medals = {
    gold: 0,
    silver: 0,
    bronze: 0,
  };
  let completed = 0;
  let bestScore = 0;

  for (const drill of ACADEMY_DRILLS) {
    const entry = progress.drills[drill.id];
    if (entry.bestScore > 0) completed += 1;
    bestScore = Math.max(bestScore, entry.bestScore);
    if (entry.medal === "gold") medals.gold += 1;
    if (entry.medal === "silver") medals.silver += 1;
    if (entry.medal === "bronze") medals.bronze += 1;
  }

  const levelInfo = calculateAcademyLevel(progress.xp);
  return {
    completed,
    bestScore,
    medals,
    levelInfo,
    totalDrills: ACADEMY_DRILLS.length,
    totalMedals: medals.gold + medals.silver + medals.bronze,
  };
}

export function mergeAcademySessionResult(progressInput, result) {
  const progress = normalizeAcademyProgress(progressInput);
  const drill = getAcademyDrill(result?.drillId);
  const entry = progress.drills[drill.id];
  const newMedal = getDrillMedal(drill, result?.score || 0);
  const bestMedal = compareMedals(newMedal, entry.medal) > 0 ? newMedal : entry.medal;
  const bestMetric = clampInt(result?.bestMetric, 0, 99999, entry.bestMetric);
  const bestAccuracy = clampInt(result?.accuracy, 0, 100, entry.bestAccuracy);

  entry.bestScore = Math.max(entry.bestScore, clampInt(result?.score, 0, 999999, 0));
  entry.lastScore = clampInt(result?.score, 0, 999999, 0);
  entry.plays += 1;
  entry.bestCombo = Math.max(entry.bestCombo, clampInt(result?.bestCombo, 0, 99999, 0));
  entry.bestMetric = Math.max(entry.bestMetric, bestMetric);
  entry.bestAccuracy = Math.max(entry.bestAccuracy, bestAccuracy);
  entry.medal = bestMedal;
  entry.updatedAt = Date.now();

  progress.medals[drill.id] = bestMedal;
  progress.xp += clampInt(result?.xp, 0, 999999, 0);
  progress.sessions += 1;
  progress.totalScore += clampInt(result?.score, 0, 999999, 0);
  progress.bestCombo = Math.max(progress.bestCombo, clampInt(result?.bestCombo, 0, 99999, 0));
  progress.lastPlayedDrillId = drill.id;
  return saveAcademyProgress(progress);
}

function isArcSkillDescriptor(descriptor) {
  return descriptor?.ballProfile?.mode === "arcFlick";
}

function clampInt(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}
