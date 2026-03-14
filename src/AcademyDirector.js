import * as THREE from "three";
import {
  calculateAcademyLevel,
  getAcademyDrill,
  getDrillMedal,
  getNextAcademyDrillId,
  loadAcademyProgress,
  mergeAcademySessionResult,
  getAcademySummary,
} from "./AcademyData.js?v=20260308-1";
import { isArcSkill } from "./SkillData.js?v=20260308-1";

const tmpVecA = new THREE.Vector3();
const tmpVecB = new THREE.Vector3();
const tmpVecC = new THREE.Vector3();

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value || 0)));
}

function formatMedalLabel(medal) {
  if (medal === "gold") return "GOLD";
  if (medal === "silver") return "SILVER";
  if (medal === "bronze") return "BRONZE";
  return "UNRANKED";
}

function getMedalColor(medal) {
  if (medal === "gold") return "#ffd25a";
  if (medal === "silver") return "#d8e3ef";
  if (medal === "bronze") return "#ff9c6a";
  return "#8ca6bf";
}

function metersToKmh(speed) {
  return Math.round(Math.max(0, speed) * 3.6);
}

function stripChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function maybeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createDisposables(root) {
  root.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return root;
}

export class AcademyDirector {
  constructor({ scene, player, physics, ball, onExitToMenu = null, skillDuelDirector = null }) {
    this.scene = scene;
    this.player = player;
    this.physics = physics;
    this.ball = ball;
    this.onExitToMenu = onExitToMenu;
    this.skillDuelDirector = skillDuelDirector;

    this.progress = loadAcademyProgress();
    this.runtime = null;
    this.worldObjects = [];
    this.ui = this.createUi();
    this.hideUi();
  }

  createUi() {
    this.injectStyles();

    const root = document.createElement("div");
    root.className = "academy-ui-root";
    root.innerHTML = `
      <div class="academy-topbar">
        <section class="academy-card academy-score-card">
          <div class="academy-kicker">Academy Drill</div>
          <div class="academy-head-row">
            <div>
              <h2 class="academy-drill-title">--</h2>
              <div class="academy-drill-subtitle">Challenge offline mode</div>
            </div>
            <div class="academy-timer" data-academy-timer>00:00</div>
          </div>
          <div class="academy-score-grid">
            <div class="academy-stat-box">
              <span>Score</span>
              <strong data-academy-score>0</strong>
            </div>
            <div class="academy-stat-box">
              <span>Combo</span>
              <strong data-academy-combo>x1</strong>
            </div>
            <div class="academy-stat-box">
              <span>Medal Pace</span>
              <strong data-academy-medal>UNRANKED</strong>
            </div>
          </div>
          <div class="academy-track">
            <div class="academy-track-fill" data-academy-track-fill></div>
          </div>
          <div class="academy-track-labels">
            <span data-track-bronze>Bronze</span>
            <span data-track-silver>Silver</span>
            <span data-track-gold>Gold</span>
          </div>
        </section>

        <section class="academy-card academy-objective-card">
          <div class="academy-kicker">Objective</div>
          <h3 data-academy-objective-title>--</h3>
          <div class="academy-objective-copy" data-academy-objective-copy>--</div>
          <div class="academy-objective-list" data-academy-objectives></div>
        </section>
      </div>

      <section class="academy-feed-panel academy-card">
        <div class="academy-feed-head">
          <span class="academy-kicker">Live Feed</span>
          <span class="academy-feed-mini" data-academy-feed-mini>Hot streak offline lab</span>
        </div>
        <div class="academy-feed-list" data-academy-feed></div>
      </section>

      <section class="academy-telemetry-panel academy-card">
        <div class="academy-feed-head">
          <span class="academy-kicker">Telemetry</span>
          <span class="academy-feed-mini" data-academy-pace>0% accuracy</span>
        </div>
        <div class="academy-telemetry-grid" data-academy-telemetry></div>
      </section>

      <div class="academy-countdown" data-academy-countdown></div>
    `;

    const report = document.createElement("div");
    report.className = "academy-report-overlay";
    report.innerHTML = `
      <div class="academy-report-card">
        <div class="academy-kicker">Academy Report</div>
        <h2 data-report-title>Session Complete</h2>
        <div class="academy-report-medal" data-report-medal>UNRANKED</div>
        <div class="academy-report-score" data-report-score>0</div>
        <div class="academy-report-meta" data-report-meta>Score</div>
        <div class="academy-report-grid" data-report-grid></div>
        <div class="academy-report-rewards" data-report-rewards></div>
        <div class="academy-report-actions">
          <button type="button" data-report-restart>Tekrarla</button>
          <button type="button" data-report-next>Novbeti Drill</button>
          <button type="button" data-report-menu>Menyu</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    document.body.appendChild(report);

    const ui = {
      root,
      report,
      title: root.querySelector(".academy-drill-title"),
      subtitle: root.querySelector(".academy-drill-subtitle"),
      timer: root.querySelector("[data-academy-timer]"),
      score: root.querySelector("[data-academy-score]"),
      combo: root.querySelector("[data-academy-combo]"),
      medal: root.querySelector("[data-academy-medal]"),
      trackFill: root.querySelector("[data-academy-track-fill]"),
      trackBronze: root.querySelector("[data-track-bronze]"),
      trackSilver: root.querySelector("[data-track-silver]"),
      trackGold: root.querySelector("[data-track-gold]"),
      objectiveTitle: root.querySelector("[data-academy-objective-title]"),
      objectiveCopy: root.querySelector("[data-academy-objective-copy]"),
      objectives: root.querySelector("[data-academy-objectives]"),
      feed: root.querySelector("[data-academy-feed]"),
      feedMini: root.querySelector("[data-academy-feed-mini]"),
      telemetry: root.querySelector("[data-academy-telemetry]"),
      pace: root.querySelector("[data-academy-pace]"),
      countdown: root.querySelector("[data-academy-countdown]"),
      reportTitle: report.querySelector("[data-report-title]"),
      reportMedal: report.querySelector("[data-report-medal]"),
      reportScore: report.querySelector("[data-report-score]"),
      reportMeta: report.querySelector("[data-report-meta]"),
      reportGrid: report.querySelector("[data-report-grid]"),
      reportRewards: report.querySelector("[data-report-rewards]"),
      reportRestart: report.querySelector("[data-report-restart]"),
      reportNext: report.querySelector("[data-report-next]"),
      reportMenu: report.querySelector("[data-report-menu]"),
    };

    ui.reportRestart.onclick = () => {
      if (!this.runtime?.drill?.id) return;
      this.startDrill(this.runtime.drill.id);
    };
    ui.reportNext.onclick = () => {
      if (!this.runtime?.drill?.id) return;
      this.startDrill(getNextAcademyDrillId(this.runtime.drill.id));
    };
    ui.reportMenu.onclick = () => {
      this.stopSession();
      this.onExitToMenu?.();
    };

    return ui;
  }

  injectStyles() {
    if (document.getElementById("academy-ui-styles")) return;
    const style = document.createElement("style");
    style.id = "academy-ui-styles";
    style.textContent = `
      .academy-ui-root {
        position: fixed;
        inset: 0;
        z-index: 60;
        pointer-events: none;
        display: none;
      }

      .academy-topbar {
        position: fixed;
        top: 16px;
        left: 16px;
        right: 360px;
        display: grid;
        grid-template-columns: minmax(320px, 1.1fr) minmax(300px, 0.82fr);
        gap: 12px;
      }

      .academy-card {
        background: linear-gradient(180deg, rgba(6, 18, 30, 0.92), rgba(7, 22, 36, 0.84));
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        backdrop-filter: blur(10px);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
      }

      .academy-score-card,
      .academy-objective-card,
      .academy-feed-panel,
      .academy-telemetry-panel {
        padding: 14px 16px;
      }

      .academy-kicker {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 5px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.06);
        color: #dbeeff;
        font: 800 10px/1.2 Sora, Manrope, sans-serif;
        letter-spacing: 1px;
        text-transform: uppercase;
      }

      .academy-head-row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        margin: 12px 0 14px;
      }

      .academy-drill-title {
        margin: 0;
        font: 800 25px/1 Sora, Manrope, sans-serif;
        color: #f6fbff;
      }

      .academy-drill-subtitle {
        margin-top: 7px;
        font: 600 12px/1.4 Manrope, sans-serif;
        color: rgba(232, 244, 255, 0.62);
      }

      .academy-timer {
        min-width: 92px;
        text-align: center;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.05);
        font: 800 24px/1 Sora, Manrope, sans-serif;
        color: #ffffff;
      }

      .academy-score-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .academy-stat-box {
        padding: 12px;
        border-radius: 13px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
      }

      .academy-stat-box span {
        display: block;
        font: 700 11px/1 Manrope, sans-serif;
        color: rgba(221, 235, 248, 0.62);
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }

      .academy-stat-box strong {
        display: block;
        margin-top: 8px;
        font: 800 23px/1 Sora, Manrope, sans-serif;
        color: #ffffff;
      }

      .academy-track {
        position: relative;
        height: 12px;
        margin-top: 14px;
        border-radius: 999px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.06);
      }

      .academy-track-fill {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #ff9e57, #ffe26f, #dfe8f2);
        box-shadow: 0 0 18px rgba(255, 210, 90, 0.3);
        transition: width 180ms ease;
      }

      .academy-track-labels {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 7px;
        font: 700 11px/1 Manrope, sans-serif;
        color: rgba(220, 234, 246, 0.6);
      }

      .academy-objective-card h3 {
        margin: 12px 0 10px;
        font: 800 20px/1.1 Sora, Manrope, sans-serif;
        color: #ffffff;
      }

      .academy-objective-copy {
        color: rgba(231, 242, 252, 0.74);
        font: 600 13px/1.55 Manrope, sans-serif;
      }

      .academy-objective-list {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }

      .academy-objective-item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 11px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
        font: 700 12px/1.35 Manrope, sans-serif;
        color: #eef6ff;
      }

      .academy-objective-item span:last-child {
        color: rgba(220, 235, 248, 0.72);
        text-align: right;
      }

      .academy-feed-panel {
        position: fixed;
        left: 16px;
        bottom: 16px;
        width: min(390px, calc(100vw - 32px));
      }

      .academy-feed-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .academy-feed-mini {
        color: rgba(222, 235, 247, 0.66);
        font: 700 11px/1 Manrope, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }

      .academy-feed-list {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }

      .academy-feed-item {
        padding: 10px 11px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        color: #eaf6ff;
        font: 700 12px/1.45 Manrope, sans-serif;
      }

      .academy-feed-item[data-tone="accent"] {
        border-color: rgba(255, 188, 95, 0.3);
        background: linear-gradient(135deg, rgba(255, 170, 82, 0.14), rgba(255, 255, 255, 0.03));
      }

      .academy-feed-item[data-tone="warn"] {
        border-color: rgba(255, 120, 110, 0.28);
        background: linear-gradient(135deg, rgba(197, 60, 60, 0.15), rgba(255, 255, 255, 0.03));
      }

      .academy-feed-item[data-tone="cool"] {
        border-color: rgba(90, 196, 255, 0.26);
        background: linear-gradient(135deg, rgba(58, 124, 214, 0.14), rgba(255, 255, 255, 0.03));
      }

      .academy-telemetry-panel {
        position: fixed;
        top: 16px;
        right: 16px;
        width: min(330px, calc(100vw - 32px));
      }

      .academy-telemetry-grid {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }

      .academy-telemetry-item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 11px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.04);
        font: 700 12px/1.35 Manrope, sans-serif;
        color: #eef6ff;
      }

      .academy-telemetry-item span:last-child {
        text-align: right;
        color: rgba(219, 236, 249, 0.72);
      }

      .academy-countdown {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: none;
        min-width: 160px;
        text-align: center;
        padding: 18px 24px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: rgba(6, 18, 30, 0.92);
        box-shadow: 0 22px 44px rgba(0, 0, 0, 0.32);
        color: #ffffff;
        font: 800 56px/1 Sora, Manrope, sans-serif;
      }

      .academy-report-overlay {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 2001;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(8px);
      }

      .academy-report-card {
        width: min(760px, calc(100vw - 32px));
        padding: 24px;
        border-radius: 22px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: linear-gradient(180deg, rgba(7, 18, 28, 0.96), rgba(10, 24, 38, 0.92));
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.38);
        color: #f4f8fc;
      }

      .academy-report-card h2 {
        margin: 14px 0 8px;
        font: 800 34px/1 Sora, Manrope, sans-serif;
      }

      .academy-report-medal {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.05);
        font: 800 13px/1 Sora, Manrope, sans-serif;
        letter-spacing: 0.8px;
        text-transform: uppercase;
      }

      .academy-report-score {
        margin-top: 16px;
        font: 800 54px/1 Sora, Manrope, sans-serif;
      }

      .academy-report-meta {
        margin-top: 6px;
        color: rgba(229, 241, 252, 0.68);
        font: 600 13px/1.45 Manrope, sans-serif;
      }

      .academy-report-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
      }

      .academy-report-stat {
        padding: 12px 13px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
      }

      .academy-report-stat span {
        display: block;
        font: 700 11px/1 Manrope, sans-serif;
        color: rgba(226, 239, 250, 0.62);
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }

      .academy-report-stat strong {
        display: block;
        margin-top: 8px;
        font: 800 22px/1 Sora, Manrope, sans-serif;
        color: #ffffff;
      }

      .academy-report-rewards {
        display: grid;
        gap: 8px;
        margin-top: 18px;
      }

      .academy-reward-line {
        padding: 11px 13px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.035);
        font: 700 13px/1.45 Manrope, sans-serif;
        color: #edf6ff;
      }

      .academy-report-actions {
        display: flex;
        gap: 10px;
        margin-top: 18px;
      }

      .academy-report-actions button {
        flex: 1;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 14px 16px;
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
        font: 800 14px/1 Manrope, sans-serif;
        cursor: pointer;
        transition: background 160ms ease, transform 160ms ease, border-color 160ms ease;
      }

      .academy-report-actions button:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
        border-color: rgba(255, 255, 255, 0.18);
      }

      @media (max-width: 1100px) {
        .academy-topbar {
          right: 16px;
          grid-template-columns: 1fr;
        }

        .academy-telemetry-panel {
          top: auto;
          bottom: 16px;
          right: 16px;
        }

        .academy-feed-panel {
          bottom: 232px;
        }
      }

      @media (max-width: 760px) {
        .academy-topbar {
          left: 12px;
          right: 12px;
          top: 12px;
        }

        .academy-feed-panel,
        .academy-telemetry-panel {
          position: fixed;
          left: 12px;
          right: 12px;
          width: auto;
        }

        .academy-feed-panel {
          bottom: 164px;
        }

        .academy-telemetry-panel {
          bottom: 12px;
        }

        .academy-score-grid,
        .academy-report-grid {
          grid-template-columns: 1fr;
        }

        .academy-report-actions {
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(style);
  }

  startDrill(drillId) {
    const drill = getAcademyDrill(drillId);
    this.progress = loadAcademyProgress();
    this.skillDuelDirector?.stopAcademyDrill();
    this.cleanupWorldObjects();
    this.hideReport();

    this.runtime = {
      drill,
      active: true,
      score: 0,
      combo: 0,
      bestCombo: 0,
      shots: 0,
      hits: 0,
      misses: 0,
      goals: 0,
      bullseyes: 0,
      curveGoals: 0,
      perfectShots: 0,
      gatesCleared: 0,
      laps: 0,
      landings: 0,
      perfectLandings: 0,
      successfulDuels: 0,
      cleanExits: 0,
      perfectTiming: 0,
      failedTackles: 0,
      maxShotSpeed: 0,
      bestMetric: 0,
      remaining: drill.duration,
      countdown: 3.2,
      pendingReset: null,
      reportOpen: false,
      lastEvent: "Hazir ol",
      lastSpin: 0,
      lastShotSpeed: 0,
      lastShotType: "--",
      currentShot: null,
      feed: [],
      milestoneState: { bronze: false, silver: false, gold: false },
      gateRouteIndex: 0,
      gateDirectionLostTimer: 0,
      target: null,
      zone: null,
      gates: [],
      lastSkillAttemptId: null,
      lastResolvedSkillAttemptId: null,
      lastBallPos: new THREE.Vector3(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z),
      wrongGoalPenaltyCount: 0,
    };

    this.showUi();
    this.stageSpawn({ resetBall: true });
    this.buildDrillWorld();
    this.pushFeed(`${drill.label} yuklendi. 3...2...1`, "cool");
    this.updateUi(true);
  }

  stopSession() {
    this.cleanupWorldObjects();
    this.skillDuelDirector?.stopAcademyDrill();
    this.hideUi();
    this.hideReport();
    this.runtime = null;
  }

  quickReset() {
    if (!this.runtime?.active || this.runtime.reportOpen) return;
    this.scheduleReset("Quick reset", {
      delay: 0.15,
      preserveCombo: false,
      newTarget: this.runtime.drill.id !== "gate_runner" && this.runtime.drill.mode !== "skill_duel",
      keepRoute: this.runtime.drill.id === "gate_runner",
    });
  }

  isSimulationFrozen() {
    return !!(this.runtime && this.runtime.active && (
      this.runtime.countdown > 0 ||
      this.runtime.pendingReset ||
      this.runtime.reportOpen
    ));
  }

  stageSpawn({ resetBall = true } = {}) {
    if (!this.runtime?.drill) return;
    const { drill } = this.runtime;

    this.player.mesh.position.set(drill.spawn.x, 0, drill.spawn.z);
    this.player.mesh.rotation.set(0, Math.PI / 2, 0);
    this.player.velocity.set(0, 0, 0);
    this.player.moveDir.set(0, 0, 0);
    this.player.turnLean = 0;
    this.player.cameraYaw = drill.cameraYaw;
    this.player.pBody.position.copy(this.player.mesh.position);
    this.player.pBody.position.y += 1;
    this.player.pBody.quaternion.copy(this.player.mesh.quaternion);

    if (resetBall) {
      this.ball.body.position.set(drill.ball.x, 0.225, drill.ball.z);
      this.ball.body.velocity.set(0, 0, 0);
      this.ball.body.angularVelocity.set(0, 0, 0);
      this.ball.body.quaternion.set(0, 0, 0, 1);
      this.syncBallMesh();
    }

    if (drill.mode === "skill_duel") {
      this.skillDuelDirector?.resetPositions(true);
    }

    this.runtime.lastBallPos.set(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);
  }

  buildDrillWorld() {
    if (!this.runtime?.drill) return;
    if (this.runtime.drill.mode === "skill_duel") {
      this.skillDuelDirector?.startAcademyDrill(this.runtime.drill);
      return;
    }
    switch (this.runtime.drill.id) {
      case "finishing_frenzy":
        this.spawnGoalTarget("frenzy");
        break;
      case "curve_master":
        this.spawnGoalTarget("curve");
        break;
      case "gate_runner":
        this.spawnGateRoute();
        break;
      case "long_pass_lab":
        this.spawnLandingZone();
        break;
      default:
        break;
    }
  }

  cleanupWorldObjects() {
    for (const object of this.worldObjects) {
      this.scene.remove(object);
      object.traverse?.((child) => {
        if (child.geometry) child.geometry.dispose?.();
        if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose?.());
        else child.material?.dispose?.();
      });
    }
    this.worldObjects = [];
    if (this.runtime) {
      this.runtime.target = null;
      this.runtime.zone = null;
      this.runtime.gates = [];
    }
  }

  spawnGoalTarget(mode = "frenzy") {
    if (!this.runtime) return;
    if (this.runtime.target?.mesh) this.removeWorldObject(this.runtime.target.mesh);

    const baseZ = mode === "curve"
      ? (Math.random() < 0.5 ? -3.05 : 3.05)
      : clamp((Math.random() - 0.5) * 6.8, -3.25, 3.25);
    const baseY = mode === "curve"
      ? clamp(2.15 + Math.random() * 0.45, 2.1, 2.58)
      : clamp(0.85 + Math.random() * 1.55, 0.85, 2.4);
    const radius = mode === "curve" ? 0.62 : 0.72 - Math.random() * 0.12;
    const color = new THREE.Color(mode === "curve" ? 0x6ccfff : 0xffae58);
    const mesh = new THREE.Group();

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.06, 14, 42),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color.clone().multiplyScalar(0.46),
        emissiveIntensity: 0.95,
        roughness: 0.34,
        metalness: 0.1,
      })
    );
    ring.rotation.y = Math.PI / 2;
    mesh.add(ring);

    const halo = new THREE.Mesh(
      new THREE.CircleGeometry(radius * 0.82, 48),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: mode === "curve" ? 0.18 : 0.12,
        side: THREE.DoubleSide,
      })
    );
    halo.rotation.y = Math.PI / 2;
    mesh.add(halo);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.18, 16, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 0.7,
        roughness: 0.24,
        metalness: 0.0,
      })
    );
    mesh.add(core);

    mesh.position.set(45.15, baseY, baseZ);
    createDisposables(mesh);
    this.scene.add(mesh);
    this.worldObjects.push(mesh);

    this.runtime.target = {
      mode,
      mesh,
      radius,
      pulse: Math.random() * Math.PI * 2,
      hit: false,
    };
  }

  spawnLandingZone() {
    if (!this.runtime) return;
    if (this.runtime.zone?.mesh) this.removeWorldObject(this.runtime.zone.mesh);

    const x = 10 + Math.random() * 25;
    const z = clamp((Math.random() - 0.5) * 30, -18, 18);
    const outer = 2.5;
    const inner = 1.08;
    const color = new THREE.Color(0xc5a3ff);
    const mesh = new THREE.Group();

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(outer - 0.18, outer, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    outerRing.rotation.x = -Math.PI / 2;
    mesh.add(outerRing);

    const midRing = new THREE.Mesh(
      new THREE.RingGeometry(inner, inner + 0.16, 48),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.66, side: THREE.DoubleSide })
    );
    midRing.rotation.x = -Math.PI / 2;
    mesh.add(midRing);

    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(inner, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
    );
    fill.rotation.x = -Math.PI / 2;
    fill.position.y = 0.01;
    mesh.add(fill);

    mesh.position.set(x, 0.04, z);
    this.scene.add(mesh);
    this.worldObjects.push(mesh);

    this.runtime.zone = {
      mesh,
      outer,
      inner,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  spawnGateRoute() {
    if (!this.runtime) return;
    for (const gate of this.runtime.gates || []) {
      this.removeWorldObject(gate.mesh);
    }
    this.runtime.gates = [];

    const routeTemplates = [
      [
        { x: -18, z: -7, axis: "x" },
        { x: -9, z: 5, axis: "z" },
        { x: 4, z: -8, axis: "x" },
        { x: 15, z: 7, axis: "z" },
        { x: 28, z: -1, axis: "x" },
      ],
      [
        { x: -20, z: 8, axis: "x" },
        { x: -7, z: -6, axis: "z" },
        { x: 7, z: 6, axis: "x" },
        { x: 18, z: -8, axis: "z" },
        { x: 30, z: 2, axis: "x" },
      ],
      [
        { x: -19, z: 0, axis: "x" },
        { x: -5, z: 10, axis: "z" },
        { x: 8, z: -2, axis: "x" },
        { x: 20, z: 11, axis: "z" },
        { x: 31, z: -6, axis: "x" },
      ],
    ];

    const chosen = routeTemplates[Math.floor(Math.random() * routeTemplates.length)];
    const mirror = Math.random() < 0.5 ? 1 : -1;
    this.runtime.gateRouteIndex += 1;

    this.runtime.gates = chosen.map((item, index) => {
      const center = new THREE.Vector3(item.x, 0.98, item.z * mirror);
      const mesh = this.createGateMesh(this.runtime.drill.accent, item.axis);
      mesh.position.copy(center);
      this.scene.add(mesh);
      this.worldObjects.push(mesh);
      return {
        center,
        axis: item.axis,
        width: 3.5,
        height: 1.85,
        mesh,
        index,
        cleared: false,
      };
    });
  }

  createGateMesh(accent, axis = "x") {
    const color = new THREE.Color(accent);
    const root = new THREE.Group();
    const postMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color.clone().multiplyScalar(0.25),
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.12,
    });
    const haloMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });

    const createPost = () => new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.9, 12), postMaterial);
    const left = createPost();
    const right = createPost();
    left.position.set(0, 0, -1.75);
    right.position.set(0, 0, 1.75);

    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.5, 12), postMaterial);
    top.rotation.x = Math.PI / 2;
    top.position.y = 0.95;

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.55), haloMaterial);
    if (axis === "x") glow.rotation.y = Math.PI / 2;

    root.add(left, right, top, glow);
    if (axis === "z") root.rotation.y = Math.PI / 2;
    createDisposables(root);
    return root;
  }

  update(dt, elapsed) {
    if (!this.runtime?.active) return;
    this.animateWorld(elapsed, dt);

    if (this.runtime.reportOpen) {
      this.updateUi();
      return;
    }

    if (this.runtime.countdown > 0) {
      this.runtime.countdown = Math.max(0, this.runtime.countdown - dt);
      const display = this.runtime.countdown > 0.25
        ? String(Math.max(1, Math.ceil(this.runtime.countdown)))
        : "GO";
      this.showCountdown(display);
      if (this.runtime.countdown === 0) {
        this.showCountdown("");
        this.pushFeed("Basla. Akademiya aktivdir.", "accent");
      }
      this.updateUi();
      return;
    }

    if (this.runtime.pendingReset) {
      this.runtime.pendingReset.time -= dt;
      this.showCountdown(this.runtime.pendingReset.label || "RESET");
      if (this.runtime.pendingReset.time <= 0) {
        this.executeReset(this.runtime.pendingReset);
        this.showCountdown("");
      }
      this.updateUi();
      return;
    }

    this.runtime.remaining = Math.max(0, this.runtime.remaining - dt);
    if (this.runtime.remaining <= 0) {
      this.finishSession("Time complete");
      return;
    }

    if (this.runtime.drill.mode !== "skill_duel") {
      this.trackShot(dt);
      this.trackDrift(dt);
    }

    switch (this.runtime.drill.id) {
      case "finishing_frenzy":
        this.updateGoalTargetDetection();
        break;
      case "curve_master":
        this.updateGoalTargetDetection();
        break;
      case "gate_runner":
        this.updateGateRunner();
        break;
      case "long_pass_lab":
        this.updateLongPassLab();
        break;
      default:
        if (this.runtime.drill.mode === "skill_duel") this.updateSkillDuelDrill();
        break;
    }

    this.updateUi();
  }

  handleGoal(goalSide) {
    if (!this.runtime?.active || this.runtime.reportOpen) return;
    const { drill } = this.runtime;

    if (drill.id === "finishing_frenzy") {
      if (goalSide !== drill.targetGoal) {
        this.registerMiss("Wrong side goal", { penalty: 60, hardReset: true });
        return;
      }

      const combo = this.bumpCombo();
      const shot = this.runtime.currentShot;
      const bullseye = !!this.runtime.target?.hit;
      const speedBonus = Math.min(110, Math.round((shot?.speed || 0) * 4.2));
      const points = 140 + combo * 22 + speedBonus + (bullseye ? 180 : 0);
      this.runtime.goals += 1;
      if (bullseye) this.runtime.bullseyes += 1;
      this.runtime.hits += 1;
      this.addScore(points);
      this.resolveShot("goal");
      this.pushFeed(
        bullseye
          ? `Bullseye finish. +${points}`
          : `Clean finish. Combo x${this.runtime.combo}. +${points}`,
        bullseye ? "accent" : "cool"
      );
      this.scheduleReset("NEXT", {
        delay: 0.95,
        preserveCombo: true,
        newTarget: true,
      });
      return;
    }

    if (drill.id === "curve_master") {
      if (goalSide !== drill.targetGoal) {
        this.registerMiss("Wrong side goal", { penalty: 70, hardReset: true });
        return;
      }

      const shot = this.runtime.currentShot;
      const spin = Math.abs(shot?.spin || 0);
      const targetHit = !!this.runtime.target?.hit;
      const curved = spin >= 4.5;
      const combo = this.bumpCombo();
      const speedBonus = Math.min(90, Math.round((shot?.speed || 0) * 3.4));
      const points = 110 + combo * 24 + speedBonus + (curved ? 95 : 0) + (targetHit ? 170 : 0);

      this.runtime.goals += 1;
      if (curved) this.runtime.curveGoals += 1;
      if (curved && targetHit) this.runtime.perfectShots += 1;
      this.runtime.hits += 1;
      this.addScore(points);
      this.resolveShot("goal");
      this.pushFeed(
        curved && targetHit
          ? `Perfect curl. Ring + curve bonus. +${points}`
          : curved
            ? `Curve goal. Daha da kunc axtar. +${points}`
            : `Goal var, amma spin azdir. +${points}`,
        curved ? "accent" : "cool"
      );
      this.scheduleReset("NEXT", {
        delay: 1.0,
        preserveCombo: true,
        newTarget: true,
      });
      return;
    }

    if (drill.mode === "skill_duel") {
      this.registerMiss("Goal deyil. Defenderi kec ve gate-den cix.", { penalty: 20, hardReset: true });
      return;
    }

    if (drill.id === "gate_runner") {
      this.registerMiss("Goal counts yoxdur. Gate route bitir.", { penalty: 35, hardReset: true });
      return;
    }

    if (drill.id === "long_pass_lab") {
      this.registerMiss("Long Pass Lab gol deyil, landing drill-dir.", { penalty: 30, hardReset: true });
    }
  }

  noteKick(payload = {}) {
    if (!this.runtime?.active || this.runtime.reportOpen) return;
    if (this.runtime.countdown > 0 || this.runtime.pendingReset) return;

    const speed = Math.sqrt(
      maybeNumber(payload.velocity?.x) ** 2 +
      maybeNumber(payload.velocity?.y) ** 2 +
      maybeNumber(payload.velocity?.z) ** 2
    );
    const spin = maybeNumber(payload.angularVelocity?.y);
    const position = new THREE.Vector3(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);

    this.runtime.shots += 1;
    this.runtime.lastShotSpeed = metersToKmh(speed);
    this.runtime.lastSpin = Math.round(Math.abs(spin) * 10) / 10;
    this.runtime.lastShotType = payload.type || "--";
    this.runtime.maxShotSpeed = Math.max(this.runtime.maxShotSpeed, this.runtime.lastShotSpeed);
    this.runtime.currentShot = {
      type: payload.type || "--",
      hold: maybeNumber(payload.hold),
      spin,
      speed,
      startedAt: performance.now(),
      origin: position.clone(),
      distance: 0,
      airTime: 0,
      airborne: false,
      maxHeight: position.y,
      landed: false,
      settled: 0,
      resolved: false,
      targetHit: false,
    };

    const speedText = `${metersToKmh(speed)} km/h`;
    if (this.runtime.drill.id === "curve_master" && Math.abs(spin) > 3.6) {
      this.pushFeed(`Curveli zarbe. Spin ${this.runtime.lastSpin} | ${speedText}`, "accent");
    } else if (this.runtime.drill.id === "long_pass_lab" && payload.type === "KeyQ") {
      this.pushFeed(`Loft pas cixdi. ${speedText}`, "cool");
    } else {
      this.pushFeed(`Shot qeyd olundu. ${speedText}`, "cool");
    }

    this.updateUi();
  }

  noteSkillEvent(payload = {}) {
    if (!this.runtime?.active || this.runtime.reportOpen) return;
    if (this.runtime.drill.mode !== "skill_duel") return;
    if (this.runtime.countdown > 0 || this.runtime.pendingReset) return;

    if (payload.phase === "telegraph") {
      if (this.runtime.lastSkillAttemptId !== payload.attemptId) {
        this.runtime.lastSkillAttemptId = payload.attemptId;
        this.runtime.shots += 1;
        this.runtime.lastShotType = payload.skillId || "--";
        this.runtime.lastShotSpeed = payload.exitSpeedApplied ? 1 : 0;
        this.runtime.lastSpin = 0;
        this.pushFeed(`${payload.skillId || "skill"} set. Beat the first bite.`, "cool");
      }
      return;
    }

    if (payload.phase === "blocked") {
      if (this.runtime.lastResolvedSkillAttemptId === payload.attemptId) return;
      this.runtime.lastResolvedSkillAttemptId = payload.attemptId;
      this.runtime.failedTackles += 1;
      this.registerMiss("Skill blocked before duel", { penalty: 12, hardReset: true });
      return;
    }

    if (payload.phase !== "finished") return;
    if (this.runtime.lastResolvedSkillAttemptId === payload.attemptId) return;
    this.runtime.lastResolvedSkillAttemptId = payload.attemptId;

    const completedCleanly = isArcSkill(this.runtime.drill.skillId)
      ? !!payload.airRecovery
      : !!payload.cleanExit;

    if (payload.success && payload.beatDefender && completedCleanly) {
      const combo = this.bumpCombo();
      const flickFinish = !!payload.airRecovery;
      const base = flickFinish ? 185 : 145;
      const cleanBonus = payload.cleanExit ? 78 : 0;
      const perfectBonus = payload.perfectTiming ? 64 : 0;
      const recoveryBonus = flickFinish ? 86 : 0;
      const points = base + combo * 18 + cleanBonus + perfectBonus + recoveryBonus;

      this.runtime.successfulDuels += 1;
      if (payload.cleanExit) this.runtime.cleanExits += 1;
      if (payload.perfectTiming) this.runtime.perfectTiming += 1;
      this.runtime.hits += 1;
      this.addScore(points);
      this.pushFeed(
        payload.cleanExit
          ? `${payload.skillId} clean exit. +${points}`
          : `${payload.skillId} beat the bite. +${points}`,
        payload.perfectTiming ? "accent" : "cool"
      );
      this.scheduleReset("NEXT", {
        delay: 0.85,
        preserveCombo: true,
        newTarget: false,
      });
      return;
    }

    this.runtime.failedTackles += 1;
    this.registerMiss(
      payload.success && payload.beatDefender
        ? "Defender beaten, but exit gate not secured"
        : "Defender won the duel",
      { penalty: 25, hardReset: true }
    );
  }

  updateSkillDuelDrill() {
    if (!this.runtime?.active || this.runtime.drill.mode !== "skill_duel") return;
    if (!this.runtime.lastSkillAttemptId && this.runtime.feed.length === 0) {
      this.pushFeed("Use C + number, then pick the lane with movement input.", "cool");
    }
  }

  updateGoalTargetDetection() {
    const target = this.runtime?.target;
    if (!target || target.hit) return;

    const prev = this.runtime.lastBallPos;
    const current = tmpVecA.set(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);
    const center = target.mesh.position;

    const segment = tmpVecB.copy(current).sub(prev);
    const lengthSq = segment.lengthSq();
    let closest = prev;
    if (lengthSq > 0.0001) {
      const t = clamp01(tmpVecC.copy(center).sub(prev).dot(segment) / lengthSq);
      closest = tmpVecC.copy(prev).addScaledVector(segment, t);
    }

    const distance = closest.distanceTo(center);
    if (distance <= target.radius && Math.abs(current.x - center.x) < 1.3) {
      target.hit = true;
      if (this.runtime.currentShot) this.runtime.currentShot.targetHit = true;
      this.pushFeed(
        target.mode === "curve" ? "Ring touched. Curveni qapiya apar." : "Target touched. Finish et.",
        "accent"
      );
    }
  }

  updateGateRunner() {
    if (!this.runtime?.gates?.length) return;
    const activeGate = this.runtime.gates[this.runtime.gates.findIndex((gate) => !gate.cleared)];
    if (!activeGate) {
      this.runtime.laps += 1;
      const lapBonus = 260 + this.runtime.laps * 40;
      this.addScore(lapBonus);
      this.pushFeed(`Lap complete. +${lapBonus}`, "accent");
      this.spawnGateRoute();
      this.stageSpawn({ resetBall: true });
      return;
    }

    const prev = this.runtime.lastBallPos;
    const current = tmpVecA.set(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);
    const crossed = this.didBallCrossGate(prev, current, activeGate);
    if (!crossed) return;

    activeGate.cleared = true;
    const combo = this.bumpCombo();
    const points = 85 + combo * 14;
    this.runtime.gatesCleared += 1;
    this.runtime.hits += 1;
    this.addScore(points);
    this.runtime.bestMetric = Math.max(this.runtime.bestMetric, this.runtime.gatesCleared);
    this.pushFeed(`Gate ${activeGate.index + 1} clear. +${points}`, "accent");
  }

  didBallCrossGate(previous, current, gate) {
    if (current.y > gate.height + 0.4) return false;

    if (gate.axis === "x") {
      const from = previous.x - gate.center.x;
      const to = current.x - gate.center.x;
      const crossed = (from <= 0 && to >= 0) || (from >= 0 && to <= 0);
      return crossed && Math.abs(current.z - gate.center.z) <= gate.width * 0.5;
    }

    const from = previous.z - gate.center.z;
    const to = current.z - gate.center.z;
    const crossed = (from <= 0 && to >= 0) || (from >= 0 && to <= 0);
    return crossed && Math.abs(current.x - gate.center.x) <= gate.width * 0.5;
  }

  updateLongPassLab() {
    const shot = this.runtime.currentShot;
    const zone = this.runtime.zone;
    if (!shot || !zone || shot.resolved || !shot.landed) return;

    const ballPos = tmpVecA.set(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);
    const dist2d = tmpVecB.set(ballPos.x, 0, ballPos.z).distanceTo(tmpVecC.set(zone.mesh.position.x, 0, zone.mesh.position.z));

    if (shot.airTime >= 0.55 && shot.distance >= 10 && dist2d <= zone.outer) {
      const combo = this.bumpCombo();
      const perfect = dist2d <= zone.inner;
      const precisionBonus = Math.round((zone.outer - dist2d) * 42);
      const arcBonus = Math.round(Math.min(70, shot.maxHeight * 14));
      const typeBonus = shot.type === "KeyQ" ? 30 : 0;
      const points = 130 + combo * 18 + precisionBonus + arcBonus + typeBonus + (perfect ? 100 : 0);

      this.runtime.landings += 1;
      if (perfect) this.runtime.perfectLandings += 1;
      this.runtime.hits += 1;
      this.runtime.bestMetric = Math.max(this.runtime.bestMetric, this.runtime.landings);
      this.addScore(points);
      this.resolveShot("landing");
      this.pushFeed(
        perfect
          ? `Perfect landing. +${points}`
          : `Zone landing. Distance ${dist2d.toFixed(2)}m | +${points}`,
        perfect ? "accent" : "cool"
      );
      this.scheduleReset("NEXT", {
        delay: 0.95,
        preserveCombo: true,
        newTarget: true,
      });
      return;
    }

    this.registerMiss("Landing zone missed", { penalty: 25, hardReset: true, resolveShot: true });
  }

  trackShot(dt) {
    const ballPos = tmpVecA.set(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);
    const ballSpeed = Math.sqrt(
      this.ball.body.velocity.x * this.ball.body.velocity.x +
      this.ball.body.velocity.y * this.ball.body.velocity.y +
      this.ball.body.velocity.z * this.ball.body.velocity.z
    );

    const shot = this.runtime.currentShot;
    if (shot && !shot.resolved) {
      shot.distance = shot.origin.distanceTo(ballPos);
      shot.maxHeight = Math.max(shot.maxHeight, ballPos.y);

      if (ballPos.y > 0.4 || Math.abs(this.ball.body.velocity.y) > 0.28) {
        shot.airborne = true;
      }
      if (shot.airborne) shot.airTime += dt;

      if (!shot.landed && shot.airborne && ballPos.y <= 0.29 && Math.abs(this.ball.body.velocity.y) < 1.4) {
        shot.landed = true;
      }

      const waitingForGoal = this.runtime.drill.id === "finishing_frenzy" || this.runtime.drill.id === "curve_master";
      if (waitingForGoal) {
        if (ballSpeed < 1.2 && ballPos.y <= 0.35) {
          shot.settled += dt;
        } else {
          shot.settled = 0;
        }
        if (shot.settled > 0.7 && shot.distance > 5) {
          this.registerMiss("Shot settled before goal", { penalty: 35, hardReset: true, resolveShot: true });
        }
      }
    }

    this.runtime.lastBallPos.copy(ballPos);
  }

  trackDrift(dt) {
    const drillId = this.runtime.drill.id;
    if (drillId !== "gate_runner") return;

    const playerPos = this.player.mesh.position;
    const ballPos = tmpVecA.set(this.ball.body.position.x, this.ball.body.position.y, this.ball.body.position.z);
    const dist = playerPos.distanceTo(ballPos);
    if (dist > 8.2) {
      this.runtime.gateDirectionLostTimer += dt;
      if (this.runtime.gateDirectionLostTimer > 1.3) {
        this.registerMiss("Top ayagindan cox uzaqlasdi", { penalty: 30, hardReset: true });
        this.runtime.gateDirectionLostTimer = 0;
      }
    } else {
      this.runtime.gateDirectionLostTimer = 0;
    }
  }

  registerMiss(reason, { penalty = 0, hardReset = false, resolveShot = false } = {}) {
    if (!this.runtime?.active) return;
    this.runtime.misses += 1;
    if (penalty > 0) this.runtime.score = Math.max(0, this.runtime.score - penalty);
    if (resolveShot) this.resolveShot("miss");
    this.breakCombo();
    this.pushFeed(`${reason}${penalty > 0 ? ` | -${penalty}` : ""}`, "warn");
    if (hardReset) {
      this.scheduleReset("RESET", {
        delay: 0.8,
        preserveCombo: false,
        newTarget: this.runtime.drill.id !== "gate_runner",
        keepRoute: this.runtime.drill.id === "gate_runner",
      });
    }
  }

  scheduleReset(label, { delay = 0.9, preserveCombo = false, newTarget = false, keepRoute = false } = {}) {
    if (!this.runtime) return;
    this.runtime.pendingReset = {
      label,
      time: delay,
      preserveCombo,
      newTarget,
      keepRoute,
    };
  }

  executeReset(reset) {
    if (!this.runtime) return;
    this.runtime.pendingReset = null;
    this.stageSpawn({ resetBall: true });
    this.runtime.currentShot = null;
    if (!reset.preserveCombo) this.breakCombo();

    if (reset.newTarget) {
      if (this.runtime.drill.id === "finishing_frenzy" || this.runtime.drill.id === "curve_master") {
        this.spawnGoalTarget(this.runtime.drill.id === "curve_master" ? "curve" : "frenzy");
      }
      if (this.runtime.drill.id === "long_pass_lab") this.spawnLandingZone();
    }
    if (!reset.keepRoute && this.runtime.drill.id === "gate_runner") {
      this.spawnGateRoute();
    }
  }

  finishSession(reason) {
    if (!this.runtime?.active || this.runtime.reportOpen) return;
    this.runtime.reportOpen = true;
    this.resolveShot("end");

    const accuracy = this.runtime.shots > 0
      ? Math.round((this.runtime.hits / this.runtime.shots) * 100)
      : 0;
    const drill = this.runtime.drill;
    const medal = getDrillMedal(drill, this.runtime.score);
    const baseXp = 120;
    const performanceXp = Math.round(this.runtime.score * 0.18);
    const medalXp = medal === "gold" ? 220 : medal === "silver" ? 140 : medal === "bronze" ? 80 : 30;
    const accuracyXp = Math.round(accuracy * 1.2);
    const comboXp = this.runtime.bestCombo * 8;
    const xp = baseXp + performanceXp + medalXp + accuracyXp + comboXp;
    const result = {
      drillId: drill.id,
      score: this.runtime.score,
      bestCombo: this.runtime.bestCombo,
      bestMetric: this.getPrimaryMetricValue(),
      accuracy,
      xp,
    };

    this.progress = mergeAcademySessionResult(this.progress, result);
    const levelInfo = calculateAcademyLevel(this.progress.xp);
    this.renderReport({
      reason,
      medal,
      result,
      levelInfo,
    });
    this.updateUi();
  }

  getPrimaryMetricValue() {
    if (!this.runtime) return 0;
    switch (this.runtime.drill.id) {
      case "finishing_frenzy":
        return this.runtime.bullseyes;
      case "curve_master":
        return this.runtime.perfectShots;
      case "gate_runner":
        return this.runtime.gatesCleared;
      case "long_pass_lab":
        return this.runtime.perfectLandings;
      default:
        if (this.runtime.drill.mode === "skill_duel") return this.runtime.successfulDuels;
        return 0;
    }
  }

  renderReport({ medal, result, levelInfo }) {
    const drill = this.runtime.drill;
    const accuracy = result.accuracy;
    const summary = getAcademySummary(this.progress);
    const metricLabel = drill.metrics[0]?.label || "Metric";

    this.ui.reportTitle.textContent = `${drill.label} Complete`;
    this.ui.reportMedal.textContent = formatMedalLabel(medal);
    this.ui.reportMedal.style.color = getMedalColor(medal);
    this.ui.reportScore.textContent = formatNumber(result.score);
    this.ui.reportMeta.textContent = `${metricLabel}: ${formatNumber(this.getPrimaryMetricValue())} | Accuracy ${accuracy}%`;

    stripChildren(this.ui.reportGrid);
    const stats = [
      { label: "Best Combo", value: `x${formatNumber(this.runtime.bestCombo)}` },
      { label: "Shot Speed Max", value: `${formatNumber(this.runtime.maxShotSpeed)} km/h` },
      { label: "Total Shots", value: formatNumber(this.runtime.shots) },
      { label: "Successful Plays", value: formatNumber(this.runtime.hits) },
    ];

    if (this.runtime.drill.mode === "skill_duel") {
      stats[1] = { label: "Attempts", value: formatNumber(this.runtime.shots) };
      stats[2] = { label: "Successful Duels", value: formatNumber(this.runtime.successfulDuels) };
      stats[3] = { label: "Failed Tackles", value: formatNumber(this.runtime.failedTackles) };
    }

    if (this.runtime.drill.id === "finishing_frenzy") {
      stats.push({ label: "Qollar", value: formatNumber(this.runtime.goals) });
      stats.push({ label: "Bullseye", value: formatNumber(this.runtime.bullseyes) });
    } else if (this.runtime.drill.id === "curve_master") {
      stats.push({ label: "Curve Qol", value: formatNumber(this.runtime.curveGoals) });
      stats.push({ label: "Perfect Curl", value: formatNumber(this.runtime.perfectShots) });
    } else if (this.runtime.drill.id === "gate_runner") {
      stats.push({ label: "Gate", value: formatNumber(this.runtime.gatesCleared) });
      stats.push({ label: "Lap", value: formatNumber(this.runtime.laps) });
    } else if (this.runtime.drill.id === "long_pass_lab") {
      stats.push({ label: "Landing", value: formatNumber(this.runtime.landings) });
      stats.push({ label: "Perfect", value: formatNumber(this.runtime.perfectLandings) });
    } else if (this.runtime.drill.mode === "skill_duel") {
      stats.push({ label: "Duels Won", value: formatNumber(this.runtime.successfulDuels) });
      stats.push({ label: "Clean Exits", value: formatNumber(this.runtime.cleanExits) });
      stats.push({ label: "Perfect Timing", value: formatNumber(this.runtime.perfectTiming) });
      stats.push({ label: "Failed Tackles", value: formatNumber(this.runtime.failedTackles) });
    }

    for (const stat of stats) {
      const item = document.createElement("div");
      item.className = "academy-report-stat";
      item.innerHTML = `<span>${stat.label}</span><strong>${stat.value}</strong>`;
      this.ui.reportGrid.appendChild(item);
    }

    stripChildren(this.ui.reportRewards);
    const rewardLines = [
      `XP qazanci: +${formatNumber(result.xp)}`,
      `Academy level: ${levelInfo.level} | Progress ${Math.round(levelInfo.progress * 100)}%`,
      `Toplam medal: ${summary.medals.gold}G / ${summary.medals.silver}S / ${summary.medals.bronze}B`,
      `Best overall combo: x${formatNumber(this.progress.bestCombo)}`,
    ];
    rewardLines.forEach((line) => {
      const item = document.createElement("div");
      item.className = "academy-reward-line";
      item.textContent = line;
      this.ui.reportRewards.appendChild(item);
    });

    this.ui.report.style.display = "flex";
  }

  updateUi(force = false) {
    if (!this.runtime?.drill) return;
    const { drill } = this.runtime;
    const accuracy = this.runtime.shots > 0
      ? Math.round((this.runtime.hits / this.runtime.shots) * 100)
      : 0;
    const medal = getDrillMedal(drill, this.runtime.score);
    const fill = clamp01(this.runtime.score / Math.max(1, drill.medals.gold));

    this.ui.title.textContent = drill.label;
    this.ui.subtitle.textContent = `${drill.category} Lab | ${formatSeconds(this.runtime.remaining)} left`;
    this.ui.timer.textContent = formatSeconds(this.runtime.remaining);
    this.ui.score.textContent = formatNumber(this.runtime.score);
    this.ui.combo.textContent = `x${Math.max(1, this.runtime.combo)}`;
    this.ui.medal.textContent = formatMedalLabel(medal);
    this.ui.medal.style.color = getMedalColor(medal);
    this.ui.trackFill.style.width = `${Math.round(fill * 100)}%`;
    this.ui.trackBronze.textContent = `Bronze ${drill.medals.bronze}`;
    this.ui.trackSilver.textContent = `Silver ${drill.medals.silver}`;
    this.ui.trackGold.textContent = `Gold ${drill.medals.gold}`;

    this.ui.objectiveTitle.textContent = drill.summary;
    this.ui.objectiveCopy.textContent = drill.coaching;
    this.ui.feedMini.textContent = this.runtime.lastEvent;
    this.ui.pace.textContent = `${accuracy}% accuracy | ${this.runtime.shots} shots`;

    stripChildren(this.ui.objectives);
    this.buildObjectiveLines().forEach((row) => {
      const item = document.createElement("div");
      item.className = "academy-objective-item";
      item.innerHTML = `<span>${row.label}</span><span>${row.value}</span>`;
      this.ui.objectives.appendChild(item);
    });

    stripChildren(this.ui.telemetry);
    this.buildTelemetryLines(accuracy).forEach((row) => {
      const item = document.createElement("div");
      item.className = "academy-telemetry-item";
      item.innerHTML = `<span>${row.label}</span><span>${row.value}</span>`;
      this.ui.telemetry.appendChild(item);
    });

    if (force) this.renderFeed();
  }

  buildObjectiveLines() {
    const medal = getDrillMedal(this.runtime.drill, this.runtime.score);
    const lines = [
      { label: "Current medal pace", value: formatMedalLabel(medal) },
      { label: "Time left", value: formatSeconds(this.runtime.remaining) },
      { label: "Combo pressure", value: this.runtime.combo > 0 ? `x${this.runtime.combo}` : "Reset" },
    ];

    switch (this.runtime.drill.id) {
      case "finishing_frenzy":
        lines.push({ label: "Goals / Bullseye", value: `${this.runtime.goals} / ${this.runtime.bullseyes}` });
        break;
      case "curve_master":
        lines.push({ label: "Curve / Perfect", value: `${this.runtime.curveGoals} / ${this.runtime.perfectShots}` });
        break;
      case "gate_runner": {
        const nextGate = this.runtime.gates.find((gate) => !gate.cleared);
        lines.push({
          label: "Next gate",
          value: nextGate ? `#${nextGate.index + 1}` : "Lap bonus incoming",
        });
        break;
      }
      case "long_pass_lab":
        lines.push({ label: "Landings / Perfect", value: `${this.runtime.landings} / ${this.runtime.perfectLandings}` });
        break;
      default:
        if (this.runtime.drill.mode === "skill_duel") {
          lines.push({ label: "Current skill", value: this.runtime.drill.shortLabel || this.runtime.drill.label });
          lines.push({
            label: "Duels / Clean",
            value: `${this.runtime.successfulDuels} / ${this.runtime.cleanExits}`,
          });
        }
        break;
    }
    return lines;
  }

  buildTelemetryLines(accuracy) {
    const shot = this.runtime.currentShot;
    const rows = [
      { label: "Accuracy", value: `${accuracy}%` },
      { label: "Last shot", value: `${this.runtime.lastShotType} | ${formatNumber(this.runtime.lastShotSpeed)} km/h` },
      { label: "Spin", value: `${this.runtime.lastSpin}` },
      { label: "Best combo", value: `x${formatNumber(this.runtime.bestCombo)}` },
      { label: "Max speed", value: `${formatNumber(this.runtime.maxShotSpeed)} km/h` },
    ];

    if (shot) {
      rows.push({ label: "Air time", value: `${shot.airTime.toFixed(2)}s` });
      rows.push({ label: "Travel", value: `${shot.distance.toFixed(1)}m` });
    }

    if (this.runtime.drill.mode === "skill_duel") {
      rows[1] = { label: "Last skill", value: `${this.runtime.lastShotType} | ${this.runtime.cleanExits} clean` };
      rows[2] = { label: "Perfect timing", value: formatNumber(this.runtime.perfectTiming) };
      rows[4] = { label: "Failed tackles", value: formatNumber(this.runtime.failedTackles) };
    }

    return rows.slice(0, 6);
  }

  bumpCombo() {
    this.runtime.combo += 1;
    this.runtime.bestCombo = Math.max(this.runtime.bestCombo, this.runtime.combo);
    return this.runtime.combo;
  }

  breakCombo() {
    this.runtime.combo = 0;
  }

  addScore(points) {
    if (!this.runtime) return;
    this.runtime.score += Math.max(0, Math.round(points));
    this.runtime.bestMetric = Math.max(this.runtime.bestMetric, this.getPrimaryMetricValue());
    this.checkMilestones();
  }

  checkMilestones() {
    const { drill, score, milestoneState } = this.runtime;
    if (!milestoneState.bronze && score >= drill.medals.bronze) {
      milestoneState.bronze = true;
      this.pushFeed("Bronze pace acildi.", "accent");
    }
    if (!milestoneState.silver && score >= drill.medals.silver) {
      milestoneState.silver = true;
      this.pushFeed("Silver pace acildi.", "accent");
    }
    if (!milestoneState.gold && score >= drill.medals.gold) {
      milestoneState.gold = true;
      this.pushFeed("Gold pace. Tempini saxla.", "accent");
    }
  }

  resolveShot(reason) {
    if (!this.runtime?.currentShot) return;
    this.runtime.currentShot.resolved = true;
    this.runtime.lastEvent = reason || this.runtime.lastEvent;
  }

  pushFeed(message, tone = "cool") {
    if (!this.runtime) return;
    this.runtime.lastEvent = message;
    this.runtime.feed.unshift({
      message,
      tone,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
    this.runtime.feed = this.runtime.feed.slice(0, 5);
    this.renderFeed();
  }

  renderFeed() {
    if (!this.runtime) return;
    stripChildren(this.ui.feed);
    this.runtime.feed.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "academy-feed-item";
      item.dataset.tone = entry.tone;
      item.textContent = entry.message;
      this.ui.feed.appendChild(item);
    });
  }

  showCountdown(text) {
    this.ui.countdown.textContent = text;
    this.ui.countdown.style.display = text ? "block" : "none";
  }

  showUi() {
    this.ui.root.style.display = "block";
  }

  hideUi() {
    this.ui.root.style.display = "none";
    this.showCountdown("");
  }

  hideReport() {
    this.ui.report.style.display = "none";
  }

  syncBallMesh() {
    this.ball.mesh.position.copy(this.ball.body.position);
    this.ball.mesh.quaternion.copy(this.ball.body.quaternion);
  }

  removeWorldObject(object) {
    if (!object) return;
    this.scene.remove(object);
    this.worldObjects = this.worldObjects.filter((item) => item !== object);
    object.traverse?.((child) => {
      if (child.geometry) child.geometry.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((mat) => mat.dispose?.());
      else child.material?.dispose?.();
    });
  }

  animateWorld(elapsed, dt) {
    if (!this.runtime) return;

    if (this.runtime.target?.mesh) {
      const pulse = 1 + Math.sin(elapsed * 4.4 + this.runtime.target.pulse) * 0.06;
      this.runtime.target.mesh.scale.setScalar(pulse);
      this.runtime.target.mesh.rotation.x = Math.sin(elapsed * 1.8 + this.runtime.target.pulse) * 0.08;
      this.runtime.target.mesh.rotation.z = Math.cos(elapsed * 1.4 + this.runtime.target.pulse) * 0.04;
    }

    if (this.runtime.zone?.mesh) {
      const pulse = 1 + Math.sin(elapsed * 3.2 + this.runtime.zone.pulse) * 0.05;
      this.runtime.zone.mesh.scale.setScalar(pulse);
      this.runtime.zone.mesh.children.forEach((child, index) => {
        if (child.material?.opacity !== undefined) {
          child.material.opacity = 0.12 + (Math.sin(elapsed * 2.4 + index) * 0.5 + 0.5) * 0.16;
        }
      });
    }

    if (this.runtime.gates?.length) {
      const activeIndex = this.runtime.gates.findIndex((gate) => !gate.cleared);
      this.runtime.gates.forEach((gate, index) => {
        gate.mesh.children.forEach((child) => {
          if (!child.material) return;
          if (child.material.emissiveIntensity !== undefined) {
            const activePulse = index === activeIndex ? 0.5 + (Math.sin(elapsed * 5 + index) * 0.5 + 0.5) * 0.8 : 0.22;
            child.material.emissiveIntensity = gate.cleared ? 0.08 : activePulse;
          }
          if (child.material.opacity !== undefined) {
            child.material.opacity = gate.cleared ? 0.03 : index === activeIndex ? 0.18 : 0.08;
          }
        });
        gate.mesh.position.y = gate.center.y + (gate.cleared ? -0.2 : Math.sin(elapsed * 3 + index) * 0.03);
      });
    }

    if (!this.runtime.currentShot?.resolved && this.runtime.currentShot?.targetHit && this.runtime.target?.mesh) {
      this.runtime.target.mesh.rotation.y += dt * 4.5;
    }
  }
}
