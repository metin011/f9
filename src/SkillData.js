export const SKILL_DIFFICULTY_PRESETS = {
  basic: {
    duration: 60,
    medals: { bronze: 650, silver: 1050, gold: 1500 },
  },
  advanced: {
    duration: 65,
    medals: { bronze: 725, silver: 1150, gold: 1650 },
  },
  elite: {
    duration: 70,
    medals: { bronze: 800, silver: 1250, gold: 1800 },
  },
};

function makeAnimation(id, fallbackPose = id) {
  return {
    clipName: id,
    clipPath: `/animasyonlar/skills/${id}.fbx`,
    fallbackPose,
  };
}

function makeExit(vectorMode = "context", multiplier = 1.5, duration = 0.45) {
  return {
    multiplier,
    duration,
    vectorMode,
  };
}

export const SKILL_DESCRIPTORS = [
  {
    slot: 1,
    id: "stepover",
    label: "Stepover",
    difficulty: "basic",
    summary: "Sell the scissors, hold the ball still, then burst past the bite.",
    coaching: "Drop weight on one leg, lean the shoulders into the fake, then explode out with the far foot.",
    requires: {
      grounded: true,
      maxBallHeight: 0.42,
      maxCarrierSpeed: 12,
    },
    animation: makeAnimation("stepover", "stepover"),
    phases: [
      { name: "telegraph", duration: 0.22 },
      { name: "contact", duration: 0.18 },
      { name: "exit", duration: 0.22 },
    ],
    ballProfile: {
      mode: "orbit",
      spin: 2.0,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.28, 0.52],
    },
    exit: makeExit("context", 1.6),
  },
  {
    slot: 2,
    id: "roulette",
    label: "Roulette",
    difficulty: "advanced",
    summary: "Pin the ball, shield the defender, and spin out through the turn.",
    coaching: "Use the sole stop first, keep the body between defender and ball, then release into the new lane.",
    requires: {
      grounded: true,
      maxBallHeight: 0.42,
      maxCarrierSpeed: 11,
    },
    animation: makeAnimation("roulette", "roulette"),
    phases: [
      { name: "telegraph", duration: 0.18 },
      { name: "contact", duration: 0.2 },
      { name: "shield", duration: 0.2 },
      { name: "exit", duration: 0.2 },
    ],
    ballProfile: {
      mode: "soleSpin",
      spin: 2.8,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.3, 0.56],
      shieldWindow: [0.36, 0.66],
    },
    exit: makeExit("context", 1.45),
  },
  {
    slot: 3,
    id: "elastico",
    label: "Elastico",
    difficulty: "advanced",
    summary: "Snap the ball outside and inside with the same foot before the defender can reset.",
    coaching: "Keep the ankle loose and let the ball feel attached to the boot through the snap.",
    requires: {
      grounded: true,
      maxBallHeight: 0.38,
      maxCarrierSpeed: 13,
    },
    animation: makeAnimation("elastico", "elastico"),
    phases: [
      { name: "telegraph", duration: 0.14 },
      { name: "contact", duration: 0.14 },
      { name: "exit", duration: 0.18 },
    ],
    ballProfile: {
      mode: "snap",
      spin: 4.4,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.2, 0.42],
    },
    exit: makeExit("context", 1.85),
  },
  {
    slot: 4,
    id: "rainbow_flick",
    label: "Rainbow Flick",
    difficulty: "elite",
    summary: "Clamp the ball, pop it over the defender, then chase the drop.",
    coaching: "Lean forward through the heel pop and attack the recovery line immediately after the lift.",
    requires: {
      grounded: true,
      maxBallHeight: 0.34,
      maxCarrierSpeed: 10,
    },
    animation: makeAnimation("rainbow_flick", "rainbow"),
    phases: [
      { name: "telegraph", duration: 0.2 },
      { name: "contact", duration: 0.16 },
      { name: "exit", duration: 0.46 },
    ],
    ballProfile: {
      mode: "arcFlick",
      parabola: { apex: 2.2, travel: 4.0 },
      spin: 2.6,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.26, 0.5],
    },
    exit: makeExit("recoveryChase", 1.65),
  },
  {
    slot: 5,
    id: "cruyff_turn",
    label: "Cruyff Turn",
    difficulty: "basic",
    summary: "Fake the shot, drag the ball behind the standing leg, and turn out the other way.",
    coaching: "Make the fake shot big with the arms and head, then snap the body through the 180 turn.",
    requires: {
      grounded: true,
      maxBallHeight: 0.4,
      maxCarrierSpeed: 11,
    },
    animation: makeAnimation("cruyff_turn", "cruyff"),
    phases: [
      { name: "telegraph", duration: 0.22 },
      { name: "contact", duration: 0.18 },
      { name: "exit", duration: 0.22 },
    ],
    ballProfile: {
      mode: "dragBack",
      spin: 2.2,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.26, 0.5],
    },
    exit: makeExit("context", 1.6),
  },
  {
    slot: 6,
    id: "mcgeady_spin",
    label: "McGeady Spin",
    difficulty: "advanced",
    summary: "Hook the ball, whip through the spin, and blast away with the outside foot.",
    coaching: "Stay compact at the start, then let the turn open aggressively into the outside release.",
    requires: {
      grounded: true,
      maxBallHeight: 0.42,
      maxCarrierSpeed: 11,
    },
    animation: makeAnimation("mcgeady_spin", "mcgeady"),
    phases: [
      { name: "telegraph", duration: 0.16 },
      { name: "contact", duration: 0.18 },
      { name: "shield", duration: 0.16 },
      { name: "exit", duration: 0.2 },
    ],
    ballProfile: {
      mode: "orbit",
      spin: 3.2,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.28, 0.5],
      shieldWindow: [0.34, 0.62],
    },
    exit: makeExit("context", 1.7),
  },
  {
    slot: 7,
    id: "la_croqueta",
    label: "La Croqueta",
    difficulty: "basic",
    summary: "Two touches, one lane change, no wasted space.",
    coaching: "Keep the ball skimming the grass and transfer it across the body before the tackle arrives.",
    requires: {
      grounded: true,
      maxBallHeight: 0.34,
      maxCarrierSpeed: 12,
    },
    animation: makeAnimation("la_croqueta", "croqueta"),
    phases: [
      { name: "telegraph", duration: 0.12 },
      { name: "contact", duration: 0.14 },
      { name: "exit", duration: 0.18 },
    ],
    ballProfile: {
      mode: "snap",
      spin: 1.6,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.18, 0.36],
    },
    exit: makeExit("context", 1.65),
  },
  {
    slot: 8,
    id: "rabona_fake",
    label: "Rabona Fake",
    difficulty: "advanced",
    summary: "Sell the cross-legged strike, freeze the ball, then pull the defender back inside.",
    coaching: "Keep balance through the crossed leg animation, stop the ball hard, then snap the retreat touch.",
    requires: {
      grounded: true,
      maxBallHeight: 0.4,
      maxCarrierSpeed: 10,
    },
    animation: makeAnimation("rabona_fake", "rabona"),
    phases: [
      { name: "telegraph", duration: 0.24 },
      { name: "contact", duration: 0.16 },
      { name: "exit", duration: 0.2 },
    ],
    ballProfile: {
      mode: "dragBack",
      spin: 2.0,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.3, 0.54],
    },
    exit: makeExit("context", 1.55),
  },
  {
    slot: 9,
    id: "hocus_pocus",
    label: "Hocus Pocus",
    difficulty: "elite",
    summary: "Wrap the leg around the ball, bend it through the gap, and escape before the defender recovers.",
    coaching: "Bring the knees tight together, keep the touch curved, and attack the nutmeg lane immediately.",
    requires: {
      grounded: true,
      maxBallHeight: 0.36,
      maxCarrierSpeed: 11,
    },
    animation: makeAnimation("hocus_pocus", "hocus"),
    phases: [
      { name: "telegraph", duration: 0.18 },
      { name: "contact", duration: 0.18 },
      { name: "exit", duration: 0.22 },
    ],
    ballProfile: {
      mode: "nutmegArc",
      spin: 5.2,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.24, 0.48],
      nutmeg: true,
    },
    exit: makeExit("context", 1.75),
  },
  {
    slot: 10,
    id: "sombrero_flick",
    label: "Sombrero Flick",
    difficulty: "elite",
    summary: "Lift the ball over the marker and run around for the take-back.",
    coaching: "Time the loft to your running speed and enter the recovery run as soon as the flick leaves the foot.",
    requires: {
      grounded: true,
      maxBallHeight: 0.45,
      maxCarrierSpeed: 11,
    },
    animation: makeAnimation("sombrero_flick", "sombrero"),
    phases: [
      { name: "telegraph", duration: 0.16 },
      { name: "contact", duration: 0.14 },
      { name: "exit", duration: 0.44 },
    ],
    ballProfile: {
      mode: "arcFlick",
      parabola: { apex: 1.85, travel: 3.6 },
      spin: 2.5,
    },
    defenderCue: {
      biteSide: "context",
      biteWindow: [0.22, 0.46],
    },
    exit: makeExit("recoveryChase", 1.7),
  },
];

export const SKILL_CLIP_SOURCES = Object.fromEntries(
  SKILL_DESCRIPTORS.map((descriptor) => [descriptor.animation.clipName, descriptor.animation.clipPath])
);

export function getSkillBySlot(slot) {
  return SKILL_DESCRIPTORS.find((descriptor) => descriptor.slot === Number(slot)) || SKILL_DESCRIPTORS[0];
}

export function getSkillById(id) {
  return SKILL_DESCRIPTORS.find((descriptor) => descriptor.id === id) || SKILL_DESCRIPTORS[0];
}

export function isArcSkill(skillOrId) {
  const descriptor = typeof skillOrId === "string" ? getSkillById(skillOrId) : skillOrId;
  return descriptor.ballProfile.mode === "arcFlick";
}

export function isNutmegSkill(skillOrId) {
  const descriptor = typeof skillOrId === "string" ? getSkillById(skillOrId) : skillOrId;
  return descriptor.ballProfile.mode === "nutmegArc";
}
