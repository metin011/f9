import {
  ACADEMY_DRILLS,
  getAcademySummary,
  loadAcademyProgress,
} from "./AcademyData.js?v=20260308-1";

const ACCOUNT_KEY = "futbol_account_v1";
const AVATAR_KEY = "futbol_avatar_v2";

const DEFAULT_AVATAR = {
  kit: "Solar Pulse",
  boots: "Inferno Red",
  hair: "Fade",
  hairColor: "Jet Black",
  beard: "Yox",
  skin: "Orta",
  jerseyNumber: 7,
};

const KIT_OPTIONS = [
  { id: "Solar Pulse", label: "Solar Pulse", note: "Qizili enerji ve keskin kontrast.", colors: ["#ffcf54", "#ff8f2c", "#121826"] },
  { id: "Night Shift", label: "Night Shift", note: "Qara, neon ve soguq detallarla.", colors: ["#0f1524", "#1d3c68", "#78d6ff"] },
  { id: "Crimson Edge", label: "Crimson Edge", note: "Sert qirmizi matc gunu formasi.", colors: ["#9f1630", "#ce294a", "#f5ecf1"] },
  { id: "Bosphorus", label: "Bosphorus", note: "Mavi tonlu deniz ilhamli set.", colors: ["#103d73", "#2d76c9", "#cbeaff"] },
  { id: "Emerald Grid", label: "Emerald Grid", note: "Yasil tonlu premium arena kolleksiyasi.", colors: ["#0d4d3e", "#11a87f", "#defcf3"] },
  { id: "Royal Signal", label: "Royal Signal", note: "Kralliq mavisi ve ag xettler.", colors: ["#2940b8", "#5c79ff", "#f4f7ff"] },
  { id: "Lava Strike", label: "Lava Strike", note: "Narinc ve qara ile partlayici goruntu.", colors: ["#ff6d19", "#ffb000", "#1b160f"] },
  { id: "Frost Line", label: "Frost Line", note: "Ag, buz mavisi ve metal hissi.", colors: ["#f6fbff", "#bfdcff", "#5a84d8"] },
  { id: "Violet Riot", label: "Violet Riot", note: "Neon bənovseyi aksentli gecə formasi.", colors: ["#331a6d", "#7142ff", "#efe5ff"] },
  { id: "Carbon Volt", label: "Carbon Volt", note: "Koyu karbon, lime ve qrafit tarazi.", colors: ["#171a21", "#9dff30", "#e2f8bf"] },
  { id: "Sunset Coral", label: "Sunset Coral", note: "Isti coral ve krem balansli set.", colors: ["#ff765f", "#ffb48f", "#fff6e8"] },
  { id: "Atlas White", label: "Atlas White", note: "Temiz ag baza, qizili ve gumus bitis.", colors: ["#f7f8fc", "#d6dbe6", "#c7a252"] },
];

const BOOT_OPTIONS = [
  { id: "Inferno Red", label: "Inferno Red", note: "Qizili mercurial ton.", colors: ["#ff3347", "#7a0014"] },
  { id: "Phantom Black", label: "Phantom Black", note: "Minimal mat qara.", colors: ["#151515", "#4f4f4f"] },
  { id: "Predator Blue", label: "Predator Blue", note: "Doygun elektrik mavisi.", colors: ["#2f8eff", "#0f2f76"] },
  { id: "Tiempo Gold", label: "Tiempo Gold", note: "Qizili premium finish.", colors: ["#ffbf1f", "#5f4300"] },
  { id: "Future Green", label: "Future Green", note: "Canli yasil oyun gunu tonu.", colors: ["#28c77a", "#0d5030"] },
  { id: "Ice Silver", label: "Ice Silver", note: "Soguk gumus ve buz efekti.", colors: ["#e3edf8", "#9ba8b8"] },
  { id: "Volt Lime", label: "Volt Lime", note: "Yuksek gorunen neon lime.", colors: ["#b0ff1e", "#3d6b00"] },
  { id: "Berry Flash", label: "Berry Flash", note: "Mor-coral arasi agresiv reng.", colors: ["#ce2fff", "#5d0b72"] },
  { id: "Storm Orange", label: "Storm Orange", note: "Qisa partlayisli narinci.", colors: ["#ff7a18", "#623000"] },
  { id: "Ocean Mint", label: "Ocean Mint", note: "Mavi-yasil qarisiq futuristik set.", colors: ["#56efd0", "#126264"] },
  { id: "Rose Chrome", label: "Rose Chrome", note: "Metal cəhrayi vurgulu bot.", colors: ["#ff8fb0", "#7f3651"] },
  { id: "Pure White", label: "Pure White", note: "Tam ag, temiz ve sade.", colors: ["#ffffff", "#bfc7d1"] },
];

const HAIR_OPTIONS = [
  { id: "Fade", label: "Fade", note: "Yanlari qisa, ustu temiz profil." },
  { id: "Qisa", label: "Qisa", note: "Standart qisa futbolcu saci." },
  { id: "Dalgali", label: "Dalgali", note: "Ust hissede daha genis ve yumsaq forma." },
  { id: "Mohawk", label: "Mohawk", note: "Merkezde sivri, yanlar dar." },
  { id: "Uzun", label: "Uzun", note: "Arxaya dusen uzun profil." },
  { id: "Topuz", label: "Topuz", note: "Topuzlu bagli sac stili." },
];

const HAIR_COLOR_OPTIONS = [
  { id: "Jet Black", label: "Jet Black", note: "Qara ve parlaq ton.", colors: ["#12100e", "#2a2320"] },
  { id: "Dark Brown", label: "Dark Brown", note: "Koyu qehveyi klasik.", colors: ["#2c1e18", "#4d352c"] },
  { id: "Chestnut", label: "Chestnut", note: "Qizili qehveyi ton.", colors: ["#5d2f20", "#8a4c30"] },
  { id: "Golden", label: "Golden", note: "Sari-qizili stil.", colors: ["#a67636", "#d8b060"] },
  { id: "Platinum", label: "Platinum", note: "Acig metalik.", colors: ["#d8d0c8", "#f0eee8"] },
  { id: "Silver", label: "Silver", note: "Soyuq gumus.", colors: ["#7b7f87", "#c6cbd3"] },
];

const BEARD_OPTIONS = [
  { id: "Yox", label: "Temiz Uz", note: "Saqqalsiz profil." },
  { id: "Kirli", label: "Kirli Saqqal", note: "Hafif stubble hissi." },
  { id: "Qisa", label: "Qisa Saqqal", note: "Kompakt saqqal formasi." },
  { id: "Keskin", label: "Keskin Xett", note: "Duzgun cizgili jawline stili." },
  { id: "Full", label: "Full Saqqal", note: "Daha dolu ve qabarliq goruntu." },
  { id: "Bige", label: "Bige + Saqqal", note: "Bige ve qisa alt xett birlikde." },
];

const SKIN_OPTIONS = [
  { id: "Aciq", label: "Aciq", note: "Aciq ton." },
  { id: "Bugday", label: "Bugday", note: "Yumsaq bugday ton." },
  { id: "Orta", label: "Orta", note: "Standart orta ton." },
  { id: "Bronz", label: "Bronz", note: "Isti bronz effekt." },
  { id: "Tund", label: "Tund", note: "Koyu ton." },
  { id: "Gece", label: "Gece", note: "En qaranliq ton." },
];

const TEAM_OPTIONS = [
  { id: "blue", label: "Mavi Takim", note: "Sol terefi qoruyan mavi heyet." },
  { id: "red", label: "Qirmizi Takim", note: "Sag terefi qoruyan qirmizi heyet." },
];

const ROLE_OPTIONS = [
  { id: "field", label: "Normal Oyuncu", note: "Sahada hereket, pas ve hucum rolu." },
  { id: "goalkeeper", label: "Qapici", note: "Qapi mudafiesi, catch mode ve dive rolu." },
];

const KEEPER_DIVE_OPTIONS = [
  { id: "high", label: "Rematch High", note: "Topa dogru daha guclu dive assist." },
  { id: "balanced", label: "Balanced", note: "Dive istiqameti ile top arasi balans." },
  { id: "manual", label: "Manual", note: "Demek olar ki tam el ile dive yonu." },
];

const KEEPER_DISTRIBUTION_OPTIONS = [
  { id: "hybrid", label: "Hybrid", note: "Qisa atis ve uzun punt birlikde." },
  { id: "throw", label: "Quick Throw", note: "Yaxin komanda yoldasina tez paylama." },
  { id: "punt", label: "Long Punt", note: "Birbasa uzun mesafeli qapi cixisi." },
];

const TEAM_SIZE_OPTIONS = ["3v3", "4v4", "5v5"];
const MATCH_TIME_OPTIONS = [3, 5, 10, 15];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class Menu {
  constructor(root) {
    this.root = root;
    this.onStartTraining = null;
    this.onStartRoomMatch = null;
    this.onStartAcademy = null;
    this.onQualityChange = null;

    this.state = {
      masterVolume: 70,
      musicVolume: 65,
      sfxVolume: 80,
      qualityProfile: "auto",
      teamSize: "3v3",
      matchTime: 10,
      roomCode: "",
      roomPassword: "",
      roomAction: "create",
      preferredTeam: "blue",
      preferredRole: "field",
      goalkeepersEnabled: true,
      goalSweeper: true,
      keeperCatchMode: "toggle",
      keeperDiveAssist: "balanced",
      keeperHoldSeconds: 5,
      keeperDistribution: "hybrid",
      nickname: "",
      academyDrillId: ACADEMY_DRILLS[0].id,
      avatar: this.normalizeAvatar(this.loadAvatarConfig()),
    };
    this.state = { ...this.state, ...this.normalizeRoomState(this.state) };

    this.account = this.loadAccount();
    if (this.account?.nickname) this.state.nickname = this.account.nickname;
    this.currentPage = "main";
  }

  mount() {
    this.root.classList.remove("menu-play-open");
    this.root.innerHTML = this.renderMain();
    this.bindMain();
  }

  hide() {
    this.root.style.display = "none";
  }

  show() {
    this.root.style.display = "grid";
    this.goToPage("main");
  }

  goToPage(page, skipHashUpdate = false) {
    this.currentPage = page;
    
    // Hash Sync (Router)
    if (!skipHashUpdate) {
      const pageToHash = {
        "main": "#/menu",
        "play": "#/play",
        "academy": "#/antrenman",
        "customize": "#/fərdiləşdirmə",
        "settings": "#/ayarlar",
        "account": "#/hesap",
        "social": "#/social",
        "play-create": "#/play",
        "play-join": "#/play",
        "nickname": "#/hesap"
      };
      const targetHash = pageToHash[page] || "#/menu";
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    }

    this.root.classList.toggle("menu-play-open", String(page || "").startsWith("play"));
    switch (page) {
      case "main":
        this.root.innerHTML = this.renderMain();
        this.bindMain();
        break;
      case "play":
        this.root.innerHTML = this.renderPlayEntry();
        this.bindPlayEntry();
        break;
      case "play-create":
        this.root.innerHTML = this.renderPlayCreate();
        this.bindPlayCreate();
        break;
      case "play-join":
        this.root.innerHTML = this.renderPlayJoin();
        this.bindPlayJoin();
        break;
      case "settings":
        this.root.innerHTML = this.renderSettings();
        this.bindSettings();
        break;
      case "academy":
        this.root.innerHTML = this.renderAcademy();
        this.bindAcademy();
        break;
      case "customize":
        this.root.innerHTML = this.renderCustomize();
        this.bindCustomize();
        break;
      case "account":
        this.root.innerHTML = this.renderAccount();
        this.bindAccount();
        break;
      case "nickname":
        this.root.innerHTML = this.renderNickname();
        this.bindNickname();
        break;
      case "social":
        this.root.innerHTML = this.renderSocial();
        this.bindSocial();
        break;
      default:
        this.root.innerHTML = this.renderMain();
        this.bindMain();
        break;
    }
  }

  normalizeAvatar(avatar = {}) {
    const next = { ...DEFAULT_AVATAR, ...(avatar || {}) };
    if (!KIT_OPTIONS.some((item) => item.id === next.kit)) next.kit = DEFAULT_AVATAR.kit;
    if (!BOOT_OPTIONS.some((item) => item.id === next.boots)) next.boots = DEFAULT_AVATAR.boots;
    if (!HAIR_OPTIONS.some((item) => item.id === next.hair)) next.hair = DEFAULT_AVATAR.hair;
    if (!HAIR_COLOR_OPTIONS.some((item) => item.id === next.hairColor)) next.hairColor = DEFAULT_AVATAR.hairColor;
    if (!BEARD_OPTIONS.some((item) => item.id === next.beard)) next.beard = DEFAULT_AVATAR.beard;
    if (!SKIN_OPTIONS.some((item) => item.id === next.skin)) next.skin = DEFAULT_AVATAR.skin;
    const jerseyNumber = Number(next.jerseyNumber);
    next.jerseyNumber = Number.isFinite(jerseyNumber)
      ? Math.min(99, Math.max(1, Math.round(jerseyNumber)))
      : DEFAULT_AVATAR.jerseyNumber;
    return next;
  }

  getAvatarOption(list, id) {
    return list.find((item) => item.id === id) || list[0];
  }

  normalizeRoomState(partial = {}) {
    const next = { ...(partial || {}) };
    if (!TEAM_OPTIONS.some((item) => item.id === next.preferredTeam)) next.preferredTeam = "blue";
    if (!ROLE_OPTIONS.some((item) => item.id === next.preferredRole)) next.preferredRole = "field";
    next.goalkeepersEnabled = next.goalkeepersEnabled !== false;
    next.goalSweeper = next.goalSweeper !== false;
    next.keeperCatchMode = next.keeperCatchMode === "hold" ? "hold" : "toggle";
    if (!KEEPER_DIVE_OPTIONS.some((item) => item.id === next.keeperDiveAssist)) next.keeperDiveAssist = "balanced";
    if (!KEEPER_DISTRIBUTION_OPTIONS.some((item) => item.id === next.keeperDistribution)) next.keeperDistribution = "hybrid";
    if (!TEAM_SIZE_OPTIONS.includes(next.teamSize)) next.teamSize = "3v3";
    if (!MATCH_TIME_OPTIONS.includes(Number(next.matchTime))) next.matchTime = 10;
    const holdSeconds = Number(next.keeperHoldSeconds);
    next.keeperHoldSeconds = Number.isFinite(holdSeconds)
      ? Math.min(8, Math.max(3, Math.round(holdSeconds)))
      : 5;
    return next;
  }

  renderMain() {
    const nickname = this.account?.nickname || "Oyuncu";
    return `
      <div class="menu" style="width:100%;height:100%;max-width:none;">
        <div style="position:fixed;inset:0;background:#050505;display:flex;flex-direction:column;overflow:hidden;font-family:'Space Grotesk',sans-serif;color:white;">
          <!-- Background Effects -->
          <div style="position:absolute;inset:0;overflow:hidden;z-index:0;">
            <div class="stitch-light-streak" style="top:25%;transform:rotate(-12deg) scale(1.5);opacity:0.3;"></div>
            <div class="stitch-light-streak" style="top:50%;transform:rotate(12deg) scale(1.5);opacity:0.2;"></div>
            <div class="stitch-light-streak" style="top:75%;transform:rotate(-6deg) scale(1.5);opacity:0.4;"></div>
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,#050505,transparent,#050505);z-index:1;"></div>
            <div style="position:absolute;inset:0;background:rgba(5,5,5,0.9);z-index:1;"></div>
          </div>
          <div style="position:absolute;bottom:-192px;left:-192px;width:600px;height:600px;background:rgba(255,0,0,0.1);border-radius:50%;filter:blur(160px);pointer-events:none;"></div>
          <div style="position:absolute;top:-192px;right:-192px;width:600px;height:600px;background:rgba(255,0,0,0.05);border-radius:50%;filter:blur(160px);pointer-events:none;"></div>

          <!-- Content -->
          <div style="position:relative;z-index:20;display:flex;flex-direction:column;height:100%;padding:32px 64px;">
            <!-- Header -->
            <header style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:64px;">
              <div style="display:flex;align-items:center;gap:16px;">
                <div style="padding:12px;background:#FF0000;" class="stitch-neon-glow-strong">
                  <span class="material-symbols-outlined" style="color:#050505;font-size:36px;font-weight:bold;">sports_soccer</span>
                </div>
                <div>
                  <h1 style="font-size:36px;font-weight:900;letter-spacing:-0.05em;line-height:1;font-style:italic;">F9 <span style="color:#FF0000;" class="stitch-neon-text">FOOTBALL</span></h1>
                  <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.4em;color:#FF0000;font-weight:700;margin-top:4px;">Next Gen Multiplayer</p>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:24px;">
                <button id="btnSocial" class="stitch-glass-panel" style="display:flex;align-items:center;gap:12px;padding:12px;cursor:pointer;color:white;font-family:inherit;border:1px solid rgba(255,0,0,0.3);transition:all 0.3s;" title="Sosial">
                  <span class="material-symbols-outlined" style="color:#FF0000;">group</span>
                </button>
                <button id="btnAccount" class="stitch-glass-panel" style="display:flex;align-items:center;gap:12px;padding:12px 24px;cursor:pointer;color:white;font-family:inherit;border:1px solid rgba(255,0,0,0.3);transition:all 0.3s;">
                  <span class="material-symbols-outlined" style="color:#FF0000;">login</span>
                  <span style="font-size:13px;font-weight:900;letter-spacing:0.15em;">GOOGLE LOGIN</span>
                </button>
                <div id="btnNickname" style="width:56px;height:56px;border:1px solid rgba(255,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;background:black;" class="stitch-neon-glow">
                  <span class="material-symbols-outlined" style="color:#FF0000;font-size:30px;">account_circle</span>
                </div>
              </div>
            </header>

            <!-- Main Menu Buttons -->
            <main style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:24px;max-width:600px;">
              <div style="display:flex;flex-direction:column;gap:24px;width:100%;">
                <button id="btnPlay" class="stitch-glass-panel" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:32px;border-left:6px solid #FF0000;cursor:pointer;transition:all 0.5s;font-family:inherit;color:white;">
                  <div style="display:flex;align-items:center;gap:32px;">
                    <span class="material-symbols-outlined stitch-neon-text" style="font-size:48px;color:#FF0000;">play_circle</span>
                    <div style="text-align:left;">
                      <h2 style="font-size:36px;font-weight:900;text-transform:uppercase;letter-spacing:-0.05em;">Oyna</h2>
                      <p style="color:rgba(255,0,0,0.7);font-size:11px;font-weight:700;letter-spacing:0.2em;margin-top:4px;">QUICK MATCH • ONLINE LOBBY</p>
                    </div>
                  </div>
                  <span class="material-symbols-outlined" style="color:#FF0000;font-size:36px;opacity:0.5;">arrow_forward_ios</span>
                </button>
                <button id="btnTraining" class="stitch-glass-panel" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:32px;border-left:6px solid rgba(255,0,0,0.3);cursor:pointer;transition:all 0.5s;font-family:inherit;color:white;">
                  <div style="display:flex;align-items:center;gap:32px;">
                    <span class="material-symbols-outlined" style="font-size:48px;color:rgba(255,0,0,0.4);">fitness_center</span>
                    <div style="text-align:left;">
                      <h2 style="font-size:36px;font-weight:900;text-transform:uppercase;letter-spacing:-0.05em;color:rgba(255,255,255,0.9);">Antrenman</h2>
                      <p style="color:rgba(255,255,255,0.3);font-size:11px;font-weight:700;letter-spacing:0.2em;margin-top:4px;">SKILL DRILLS • FREE PRACTICE</p>
                    </div>
                  </div>
                  <span class="material-symbols-outlined" style="color:#FF0000;font-size:36px;opacity:0;">arrow_forward_ios</span>
                </button>
                <button id="btnCustomize" class="stitch-glass-panel" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:32px;border-left:6px solid rgba(255,0,0,0.3);cursor:pointer;transition:all 0.5s;font-family:inherit;color:white;">
                  <div style="display:flex;align-items:center;gap:32px;">
                    <span class="material-symbols-outlined" style="font-size:48px;color:rgba(255,0,0,0.4);">app_registration</span>
                    <div style="text-align:left;">
                      <h2 style="font-size:36px;font-weight:900;text-transform:uppercase;letter-spacing:-0.05em;color:rgba(255,255,255,0.9);">Fərdiləşdirmə</h2>
                      <p style="color:rgba(255,255,255,0.3);font-size:11px;font-weight:700;letter-spacing:0.2em;margin-top:4px;">KITS • CHARACTERS • SKILLS</p>
                    </div>
                  </div>
                  <span class="material-symbols-outlined" style="color:#FF0000;font-size:36px;opacity:0;">arrow_forward_ios</span>
                </button>
              </div>
            </main>

            <!-- Footer -->
            <footer style="margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between;width:100%;">
              <div style="display:flex;flex-direction:column;gap:12px;">
                <label style="font-size:10px;font-weight:900;color:#FF0000;text-transform:uppercase;letter-spacing:0.4em;padding-left:4px;">Player Identity</label>
                <div style="display:flex;align-items:center;gap:16px;">
                  <div class="stitch-glass-panel" style="display:flex;align-items:center;padding:16px 24px;width:320px;border-color:rgba(255,0,0,0.5);">
                    <span class="material-symbols-outlined" style="color:#FF0000;margin-right:16px;">badge</span>
                    <span style="font-weight:700;letter-spacing:0.15em;text-transform:uppercase;font-size:14px;color:white;">${escapeHtml(nickname)}</span>
                  </div>
                  <button id="btnSettings" class="stitch-glass-panel" style="padding:16px;cursor:pointer;color:white;font-family:inherit;border:1px solid rgba(255,0,0,0.3);transition:all 0.3s;">
                    <span class="material-symbols-outlined" style="color:#FF0000;font-size:30px;">settings</span>
                  </button>
                </div>
              </div>
              <div style="text-align:right;padding-bottom:8px;">
                <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:4px;">
                  <div style="width:8px;height:8px;border-radius:50%;background:#FF0000;" class="stitch-neon-glow"></div>
                  <p style="font-size:11px;color:#FF0000;font-weight:900;letter-spacing:0.15em;">SERVER: EUROPE WEST</p>
                </div>
                <p style="font-size:10px;color:rgba(255,255,255,0.3);font-weight:700;text-transform:uppercase;letter-spacing:0.3em;">VERSION 1.0.4-NEON_RED</p>
              </div>
            </footer>
          </div>
        </div>
      </div>
    `;
  }

  bindMain() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnPlay").addEventListener("click", () => this.goToPage("play"));
    get("btnTraining").addEventListener("click", () => this.onStartTraining?.({ ...this.state, avatar: { ...this.state.avatar } }));
    get("btnCustomize").addEventListener("click", () => this.goToPage("customize"));
    get("btnAccount").addEventListener("click", () => this.goToPage("account"));
    get("btnNickname").addEventListener("click", () => this.goToPage("nickname"));
    get("btnSettings").addEventListener("click", () => this.goToPage("settings"));
    get("btnSocial").addEventListener("click", () => this.goToPage("social"));
  }

  renderSocial() {
    return `
      <div class="menu" style="width:100%;height:100%;max-width:none;">
        <div style="position:fixed;inset:0;background:#050505;display:flex;flex-direction:column;overflow:hidden;font-family:'Space Grotesk',sans-serif;color:white;">
          <!-- Header -->
          <header style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,0,60,0.2);padding:16px 32px;background:rgba(5,5,5,0.8);backdrop-filter:blur(12px);z-index:50;">
            <div style="display:flex;align-items:center;gap:40px;">
              <div style="display:flex;align-items:center;gap:12px;color:#ff003c;">
                <span class="material-symbols-outlined" style="font-size:30px;">sports_soccer</span>
                <h1 style="font-size:20px;font-weight:700;text-transform:uppercase;">F9 Football</h1>
              </div>
              <nav style="display:flex;align-items:center;gap:32px;">
                <a class="socialNavHome" style="color:rgba(148,163,184,1);text-decoration:none;font-size:14px;font-weight:500;transition:color 0.2s;cursor:pointer;">ANA SƏHİFƏ</a>
                <a class="socialNavPlay" style="color:rgba(148,163,184,1);text-decoration:none;font-size:14px;font-weight:500;transition:color 0.2s;cursor:pointer;">OYUN</a>
                <a class="socialNavMarket" style="color:rgba(148,163,184,1);text-decoration:none;font-size:14px;font-weight:500;transition:color 0.2s;cursor:pointer;">MARKET</a>
                <a class="socialNav active" style="color:#ff003c;text-decoration:none;font-size:14px;font-weight:700;border-bottom:2px solid #ff003c;padding-bottom:4px;cursor:pointer;">SOSİAL PANEL</a>
              </nav>
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
              <button id="btnBack" style="padding:8px 24px;background:rgba(255,0,60,0.1);border:1px solid rgba(255,0,60,0.3);color:#ff003c;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;text-transform:uppercase;">Geri</button>
            </div>
          </header>

          <main style="display:flex;flex:1;overflow:hidden;padding:24px;gap:24px;">
            <!-- Friends Sidebar -->
            <aside style="width:320px;display:flex;flex-direction:column;gap:16px;">
              <div style="background:rgba(35,15,17,0.4);backdrop-filter:blur(12px);border:1px solid rgba(255,0,60,0.2);border-radius:12px;flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:16px;border-bottom:1px solid rgba(255,0,60,0.1);display:flex;justify-content:space-between;align-items:center;">
                  <h2 style="font-size:18px;font-weight:700;color:#ff003c;display:flex;align-items:center;gap:8px;">
                    <span class="material-symbols-outlined">group</span> Dostlar
                  </h2>
                  <span style="background:rgba(255,0,60,0.2);color:#ff003c;font-size:10px;padding:4px 8px;border-radius:4px;font-weight:700;">24 ONLAYN</span>
                </div>
                <div style="flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:4px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:8px;background:rgba(255,0,60,0.05);border:1px solid rgba(255,0,60,0.1);">
                    <div style="display:flex;align-items:center;gap:12px;">
                      <div style="position:relative;">
                        <div style="width:40px;height:40px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;">R</div>
                        <div style="position:absolute;bottom:-4px;right:-4px;width:12px;height:12px;background:#ff003c;border-radius:50%;border:2px solid #050505;box-shadow:0 0 8px rgba(255,0,60,0.6);"></div>
                      </div>
                      <div>
                        <p style="font-size:14px;font-weight:700;">Rauf_777</p>
                        <p style="font-size:10px;color:#ff003c;font-weight:500;text-transform:uppercase;">Səviyyə 42</p>
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:8px;transition:all 0.2s;cursor:pointer;">
                    <div style="display:flex;align-items:center;gap:12px;">
                      <div style="position:relative;">
                        <div style="width:40px;height:40px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;">E</div>
                        <div style="position:absolute;bottom:-4px;right:-4px;width:12px;height:12px;background:#ff003c;border-radius:50%;border:2px solid #050505;"></div>
                      </div>
                      <div>
                        <p style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.8);">Elvin_Pro</p>
                        <p style="font-size:10px;color:rgba(255,0,60,0.5);font-weight:500;text-transform:uppercase;">Səviyyə 15</p>
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:8px;opacity:0.6;">
                    <div style="display:flex;align-items:center;gap:12px;">
                      <div style="position:relative;">
                        <div style="width:40px;height:40px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;">S</div>
                        <div style="position:absolute;bottom:-4px;right:-4px;width:12px;height:12px;background:gray;border-radius:50%;border:2px solid #050505;"></div>
                      </div>
                      <div>
                        <p style="font-size:14px;font-weight:700;">ShadowStrike</p>
                        <p style="font-size:10px;color:gray;font-weight:500;text-transform:uppercase;">Səviyyə 88</p>
                      </div>
                    </div>
                    <span style="font-size:10px;color:gray;font-style:italic;">2s əvvəl</span>
                  </div>
                </div>
              </div>
            </aside>

            <!-- Chat Area -->
            <section style="flex:1;background:rgba(35,15,17,0.4);backdrop-filter:blur(12px);border:1px solid rgba(255,0,60,0.2);border-radius:12px;display:flex;flex-direction:column;box-shadow:0 0 20px rgba(255,0,60,0.15);overflow:hidden;">
              <div style="padding:16px;border-bottom:1px solid rgba(255,0,60,0.2);display:flex;align-items:center;justify-content:space-between;background:rgba(255,0,60,0.05);">
                <div style="display:flex;align-items:center;gap:16px;">
                  <div style="width:40px;height:40px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;border:1px solid rgba(255,0,60,0.3);">R</div>
                  <div>
                    <h3 style="font-weight:700;color:white;">Rauf_777</h3>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <div style="width:6px;height:6px;background:#ff003c;border-radius:50%;box-shadow:0 0 5px #ff003c;"></div>
                      <span style="font-size:10px;color:rgba(255,0,60,0.8);text-transform:uppercase;letter-spacing:0.1em;">Yazır...</span>
                    </div>
                  </div>
                </div>
                <div style="display:flex;gap:8px;">
                  <button style="padding:8px;background:none;border:none;color:rgba(148,163,184,1);cursor:pointer;"><span class="material-symbols-outlined">call</span></button>
                  <button style="padding:8px;background:none;border:none;color:rgba(148,163,184,1);cursor:pointer;"><span class="material-symbols-outlined">more_vert</span></button>
                </div>
              </div>

              <div style="flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:24px;">
                <div style="display:flex;justify-content:center;">
                  <span style="font-size:10px;background:rgba(35,15,17,0.8);color:#ff003c;padding:4px 12px;border-radius:99px;text-transform:uppercase;letter-spacing:0.1em;border:1px solid rgba(255,0,60,0.2);">Sistem: Oyun otağı yaradıldı</span>
                </div>
                <div style="display:flex;gap:12px;align-items:flex-start;">
                  <div style="width:32px;height:32px;background:#1a1a1a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">R</div>
                  <div style="max-width:70%;">
                    <div style="padding:12px;background:rgba(35,15,17,0.4);border-radius:12px;border-top-left-radius:0;border:1px solid rgba(255,0,60,0.1);color:rgba(226,232,240,1);font-size:14px;">
                      Salam dostum, bugünkü turnirə hazırsan?
                    </div>
                    <span style="font-size:9px;color:rgba(100,116,139,1);margin-top:4px;display:block;">14:20</span>
                  </div>
                </div>
                <div style="display:flex;gap:12px;align-items:flex-start;flex-direction:row-reverse;">
                  <div style="width:32px;height:32px;background:#ff003c;color:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">M</div>
                  <div style="max-width:70%;display:flex;flex-direction:column;align-items:flex-end;">
                    <div style="padding:12px;background:rgba(255,0,60,0.2);border-radius:12px;border-top-right-radius:0;border:1px solid rgba(255,0,60,0.3);color:white;font-size:14px;">
                      Əlbəttə! Heyəti yığmışam, səni gözləyirik.
                    </div>
                    <span style="font-size:9px;color:rgba(255,0,60,0.6);margin-top:4px;display:block;">14:22</span>
                  </div>
                </div>
              </div>

              <div style="padding:16px;background:rgba(5,5,5,0.6);border-top:1px solid rgba(255,0,60,0.2);">
                <div style="display:flex;align-items:center;gap:12px;background:rgba(35,15,17,0.4);border:1px solid rgba(255,0,60,0.2);border-radius:12px;padding:4px 16px;">
                  <button style="color:rgba(100,116,139,1);background:none;border:none;cursor:pointer;"><span class="material-symbols-outlined">add_circle</span></button>
                  <input type="text" placeholder="Mesajınızı yazın..." style="flex:1;background:transparent;border:none;padding:12px;color:white;font-family:inherit;font-size:14px;outline:none;">
                  <button style="color:rgba(100,116,139,1);background:none;border:none;cursor:pointer;"><span class="material-symbols-outlined">sentiment_satisfied</span></button>
                  <button style="background:#ff003c;color:white;width:32px;height:32px;border-radius:8px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;margin-left:8px;"><span class="material-symbols-outlined" style="font-size:18px;font-weight:700;">send</span></button>
                </div>
              </div>
            </section>

            <!-- Right Sidebar: Invitations -->
            <aside style="width:280px;display:flex;flex-direction:column;gap:24px;">
              <div style="background:rgba(35,15,17,0.4);backdrop-filter:blur(12px);border:1px solid rgba(255,0,60,0.2);border-radius:12px;overflow:hidden;">
                <div style="padding:16px;border-bottom:1px solid rgba(255,0,60,0.1);background:rgba(255,0,60,0.05);">
                  <h2 style="font-size:14px;font-weight:700;color:#ff003c;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:-0.02em;">
                    <span class="material-symbols-outlined" style="font-size:18px;">mail</span> Dəvətlər
                  </h2>
                </div>
                <div style="padding:12px;display:flex;flex-direction:column;gap:12px;">
                  <div style="display:flex;align-items:center;gap:12px;padding:8px;background:rgba(35,15,17,0.4);border-radius:8px;border:1px solid rgba(255,0,60,0.1);">
                    <div style="width:32px;height:32px;background:#333;border-radius:4px;flex-shrink:0;"></div>
                    <div style="flex:1;min-width:0;">
                      <p style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">King_Striker</p>
                      <p style="font-size:10px;color:rgba(148,163,184,1);">Klan Dəvəti</p>
                    </div>
                    <div style="display:flex;gap:4px;">
                      <button style="width:24px;height:24px;background:rgba(255,0,60,0.2);color:#ff003c;border:none;border-radius:4px;cursor:pointer;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:14px;font-weight:700;">check</span></button>
                    </div>
                  </div>
                </div>
              </div>

              <div style="background:rgba(35,15,17,0.4);backdrop-filter:blur(12px);border:1px solid rgba(255,0,60,0.2);border-radius:12px;flex:1;display:flex;flex-direction:column;overflow:hidden;">
                <div style="padding:16px;border-bottom:1px solid rgba(255,0,60,0.1);">
                  <h2 style="font-size:14px;font-weight:700;color:#ff003c;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:-0.02em;">
                    <span class="material-symbols-outlined" style="font-size:18px;">history</span> Son Oyunçular
                  </h2>
                </div>
                <div style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:12px;">
                  ${["X-Terminator", "GoalMachine_00", "Silent_Wolf"].map(name => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px;border-radius:8px;cursor:pointer;transition:all 0.2s;">
                      <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:32px;height:32px;background:#333;border-radius:4px;flex-shrink:0;"></div>
                        <div>
                          <p style="font-size:12px;font-weight:700;">${name}</p>
                          <p style="font-size:9px;color:rgba(100,116,139,1);text-transform:uppercase;">10 dəq əvvəl</p>
                        </div>
                      </div>
                      <button style="color:#ff003c;background:none;border:none;cursor:pointer;padding:4px;"><span class="material-symbols-outlined" style="font-size:18px;">person_add</span></button>
                    </div>
                  `).join("")}
                </div>
                <div style="padding:16px;border-top:1px solid rgba(255,0,60,0.1);">
                  <button style="width:100%;padding:8px;background:rgba(35,15,17,0.4);border:1px solid rgba(255,0,60,0.3);border-radius:8px;color:#ff003c;font-size:10px;font-weight:700;text-transform:uppercase;cursor:pointer;letter-spacing:0.1em;font-family:inherit;">Hamsını Gör</button>
                </div>
              </div>
            </aside>
          </main>

          <footer style="height:32px;background:rgba(255,0,60,0.1);border-top:1px solid rgba(255,0,60,0.2);display:flex;align-items:center;justify-content:space-between;padding:0 24px;font-size:10px;color:rgba(255,0,60,0.6);font-weight:500;">
            <div style="display:flex;gap:16px;">
              <span>SERVERS: GLOBAL (EU) - 24ms</span>
              <span>OYUNÇU SAYI: 1,420,852</span>
            </div>
            <div style="text-transform:uppercase;letter-spacing:0.1em;">F9 Football Social Engine v2.4.0</div>
          </footer>
        </div>
      </div>
    `;
  }

  bindSocial() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));
    
    this.root.querySelector(".socialNavHome")?.addEventListener("click", () => this.goToPage("main"));
    this.root.querySelector(".socialNavPlay")?.addEventListener("click", () => this.goToPage("play"));
  }


  renderPlayEntry() {
    return `
      <div class="menu" style="width:100%;height:100%;max-width:none;">
        <div style="position:fixed;inset:0;background:#050505;display:flex;flex-direction:column;overflow:hidden;font-family:'Space Grotesk',sans-serif;color:white;">
          <!-- Header -->
          <header style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,0,60,0.3);padding:16px 40px;background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);z-index:50;">
            <div style="display:flex;align-items:center;gap:16px;">
              <div style="width:32px;height:32px;background:rgba(255,0,60,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,0,60,0.3);">
                <span class="material-symbols-outlined" style="color:#ff003c;">sports_soccer</span>
              </div>
              <h2 style="font-size:20px;font-weight:700;text-shadow:0 0 10px rgba(255,0,60,0.5);text-transform:uppercase;">F9 Football</h2>
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
              <button id="btnBack" style="display:flex;align-items:center;gap:8px;padding:8px 24px;background:rgba(255,0,60,0.1);border:1px solid rgba(255,0,60,0.3);color:#ff003c;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;transition:all 0.3s;">
                <span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span>
                GERİ
              </button>
            </div>
          </header>

          <!-- Content -->
          <main style="flex:1;overflow-y:auto;position:relative;">
            <div style="max-width:1200px;margin:0 auto;padding:48px 24px;">
              <div style="margin-bottom:48px;">
                <h1 style="font-size:48px;font-weight:900;letter-spacing:-0.02em;margin-bottom:8px;text-shadow:0 0 10px rgba(255,0,60,0.5);">MODE SELECTION</h1>
                <p style="font-size:18px;color:rgba(255,0,60,0.8);font-weight:500;">Choose your path to the pitch.</p>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;">
                <!-- Oda Qur -->
                <div style="background:rgba(0,0,0,0.8);backdrop-filter:blur(20px);border:1px solid rgba(255,0,60,0.5);box-shadow:0 0 15px rgba(255,0,60,0.3),inset 0 0 10px rgba(255,0,60,0.1);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.3s;">
                  <div style="padding:32px;border-bottom:1px solid rgba(255,0,60,0.2);background:rgba(255,0,60,0.05);">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                      <span class="material-symbols-outlined" style="color:#ff003c;font-size:36px;">add_box</span>
                      <h2 style="font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em;">Oda Qur</h2>
                    </div>
                    <p style="color:rgba(148,163,184,1);font-size:14px;">Establish a private lobby with custom rules.</p>
                  </div>
                  <div style="padding:32px;display:flex;flex-direction:column;gap:24px;flex:1;">
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:rgba(255,0,60,0.7);">Room Password (Optional)</label>
                      <div style="position:relative;">
                        <span class="material-symbols-outlined" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);color:rgba(255,0,60,0.5);">lock</span>
                        <input id="roomPassword" type="password" placeholder="••••••••" value="${escapeHtml(this.state.roomPassword)}" style="width:100%;padding:16px 16px 16px 48px;background:rgba(15,23,42,0.5);border:1px solid rgba(255,0,60,0.2);border-radius:12px;color:white;font-family:inherit;font-size:14px;outline:none;">
                      </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:12px;">
                      <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:rgba(255,0,60,0.7);">Match Duration</label>
                      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                        <button class="matchTimeBtn" data-time="3" style="padding:12px 8px;border-radius:8px;border:1px solid ${this.state.matchTime === 3 ? '#ff003c' : 'rgba(30,41,59,1)'};background:${this.state.matchTime === 3 ? 'rgba(255,0,60,0.2)' : 'rgba(15,23,42,0.5)'};color:${this.state.matchTime === 3 ? '#ff003c' : 'rgba(100,116,139,1)'};font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;">3m</button>
                        <button class="matchTimeBtn" data-time="5" style="padding:12px 8px;border-radius:8px;border:1px solid ${this.state.matchTime === 5 ? '#ff003c' : 'rgba(30,41,59,1)'};background:${this.state.matchTime === 5 ? 'rgba(255,0,60,0.2)' : 'rgba(15,23,42,0.5)'};color:${this.state.matchTime === 5 ? '#ff003c' : 'rgba(100,116,139,1)'};font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;">5m</button>
                        <button class="matchTimeBtn" data-time="10" style="padding:12px 8px;border-radius:8px;border:1px solid ${this.state.matchTime === 10 ? '#ff003c' : 'rgba(30,41,59,1)'};background:${this.state.matchTime === 10 ? 'rgba(255,0,60,0.2)' : 'rgba(15,23,42,0.5)'};color:${this.state.matchTime === 10 ? '#ff003c' : 'rgba(100,116,139,1)'};font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;">10m</button>
                        <button class="matchTimeBtn" data-time="15" style="padding:12px 8px;border-radius:8px;border:1px solid ${this.state.matchTime === 15 ? '#ff003c' : 'rgba(30,41,59,1)'};background:${this.state.matchTime === 15 ? 'rgba(255,0,60,0.2)' : 'rgba(15,23,42,0.5)'};color:${this.state.matchTime === 15 ? '#ff003c' : 'rgba(100,116,139,1)'};font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;">15m</button>
                      </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:12px;">
                      <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:rgba(255,0,60,0.7);">Match Format</label>
                      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
                        <button class="teamSizeBtn" data-size="3v3" style="display:flex;flex-direction:column;align-items:center;padding:16px;border-radius:8px;border:1px solid ${this.state.teamSize === '3v3' ? '#ff003c' : 'rgba(30,41,59,1)'};background:${this.state.teamSize === '3v3' ? 'rgba(255,0,60,0.2)' : 'rgba(15,23,42,0.5)'};color:${this.state.teamSize === '3v3' ? '#ff003c' : 'rgba(100,116,139,1)'};font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;">
                          <span class="material-symbols-outlined" style="margin-bottom:4px;">groups</span>
                          <span style="font-size:14px;font-weight:700;">3v3</span>
                        </button>
                        <button class="teamSizeBtn" data-size="4v4" style="display:flex;flex-direction:column;align-items:center;padding:16px;border-radius:8px;border:1px solid ${this.state.teamSize === '4v4' ? '#ff003c' : 'rgba(30,41,59,1)'};background:${this.state.teamSize === '4v4' ? 'rgba(255,0,60,0.2)' : 'rgba(15,23,42,0.5)'};color:${this.state.teamSize === '4v4' ? '#ff003c' : 'rgba(100,116,139,1)'};font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;">
                          <span class="material-symbols-outlined" style="margin-bottom:4px;">groups</span>
                          <span style="font-size:14px;font-weight:700;">4v4</span>
                        </button>
                        <button class="teamSizeBtn" data-size="5v5" style="display:flex;flex-direction:column;align-items:center;padding:16px;border-radius:8px;border:1px solid ${this.state.teamSize === '5v5' ? '#ff003c' : 'rgba(30,41,59,1)'};background:${this.state.teamSize === '5v5' ? 'rgba(255,0,60,0.2)' : 'rgba(15,23,42,0.5)'};color:${this.state.teamSize === '5v5' ? '#ff003c' : 'rgba(100,116,139,1)'};font-weight:700;cursor:pointer;font-family:inherit;transition:all 0.2s;">
                          <span class="material-symbols-outlined" style="margin-bottom:4px;">groups</span>
                          <span style="font-size:14px;font-weight:700;">5v5</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div style="padding:32px;background:black;">
                    <button id="createRoom" style="width:100%;padding:20px;background:#ff003c;color:black;font-size:20px;font-weight:900;border-radius:12px;border:none;cursor:pointer;text-transform:uppercase;letter-spacing:0.2em;display:flex;align-items:center;justify-content:center;gap:12px;font-family:inherit;transition:all 0.3s;">
                      Create Room
                      <span class="material-symbols-outlined" style="font-weight:900;">arrow_forward</span>
                    </button>
                    <div id="roomInfo" style="margin-top:12px;font-size:13px;min-height:20px;color:#ff003c;font-weight:500;text-align:center;"></div>
                  </div>
                </div>

                <!-- Odaya Qoşul -->
                <div style="background:rgba(0,0,0,0.8);backdrop-filter:blur(20px);border:1px solid rgba(255,0,60,0.5);box-shadow:0 0 15px rgba(255,0,60,0.3),inset 0 0 10px rgba(255,0,60,0.1);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.3s;">
                  <div style="padding:32px;border-bottom:1px solid rgba(255,0,60,0.2);background:rgba(255,0,60,0.05);">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                      <span class="material-symbols-outlined" style="color:#ff003c;font-size:36px;">stadium</span>
                      <h2 style="font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em;">Odaya Qoşul</h2>
                    </div>
                    <p style="color:rgba(148,163,184,1);font-size:14px;">Join a specific match via room code.</p>
                  </div>
                  <div style="padding:32px;display:flex;flex-direction:column;gap:32px;flex:1;">
                    <div style="display:flex;flex-direction:column;gap:16px;">
                      <label style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:rgba(255,0,60,0.7);text-align:center;">Enter Room Code</label>
                      <input id="roomCode" type="text" placeholder="CODE" value="${escapeHtml(this.state.roomCode)}" style="width:100%;text-align:center;font-size:36px;font-weight:900;padding:32px;background:rgba(15,23,42,0.8);border:2px solid rgba(255,0,60,0.3);border-radius:16px;color:#ff003c;font-family:inherit;letter-spacing:0.5em;text-transform:uppercase;outline:none;">
                      <p style="font-size:13px;color:rgba(100,116,139,1);text-align:center;font-weight:500;">Format: 6 alphanumeric characters</p>
                    </div>
                    <div style="border-top:1px solid rgba(255,0,60,0.1);padding-top:24px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                        <h3 style="font-size:10px;font-weight:700;color:rgba(148,163,184,1);text-transform:uppercase;letter-spacing:0.2em;">Available Sessions</h3>
                        <button id="refreshRooms" style="color:#ff003c;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;background:none;border:none;cursor:pointer;font-family:inherit;">
                          <span class="material-symbols-outlined" style="font-size:14px;">refresh</span> Refresh
                        </button>
                      </div>
                      <div id="roomList" style="display:flex;flex-direction:column;gap:8px;max-height:180px;overflow-y:auto;"></div>
                    </div>
                  </div>
                  <div style="padding:32px;background:black;">
                    <button id="joinRoom" style="width:100%;padding:20px;background:rgba(15,23,42,1);border:1px solid rgba(255,0,60,0.3);color:#ff003c;font-size:20px;font-weight:900;border-radius:12px;cursor:pointer;text-transform:uppercase;letter-spacing:0.2em;display:flex;align-items:center;justify-content:center;gap:12px;font-family:inherit;transition:all 0.3s;">
                      Join Match
                      <span class="material-symbols-outlined">login</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Stats Footer -->
              <div style="margin-top:64px;display:flex;flex-wrap:wrap;gap:48px;align-items:center;justify-content:center;border-top:1px solid rgba(255,0,60,0.1);padding-top:40px;">
                <div style="display:flex;align-items:center;gap:16px;">
                  <span class="material-symbols-outlined" style="color:#ff003c;font-size:28px;">monitoring</span>
                  <div>
                    <p style="color:rgba(100,116,139,1);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:4px;">Live Players</p>
                    <p style="font-weight:900;font-size:24px;text-shadow:0 0 10px rgba(255,0,60,0.5);">12,482</p>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:16px;">
                  <span class="material-symbols-outlined" style="color:#ff003c;font-size:28px;">sports</span>
                  <div>
                    <p style="color:rgba(100,116,139,1);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:4px;">Active Arenas</p>
                    <p style="font-weight:900;font-size:24px;text-shadow:0 0 10px rgba(255,0,60,0.5);">843</p>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:16px;">
                  <span class="material-symbols-outlined" style="color:#ff003c;font-size:28px;">wifi_tethering</span>
                  <div>
                    <p style="color:rgba(100,116,139,1);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:4px;">Local Latency</p>
                    <p style="font-weight:900;font-size:24px;text-shadow:0 0 10px rgba(255,0,60,0.5);">24 <span style="font-size:12px;color:#ff003c;">MS</span></p>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    `;
  }

  bindPlayEntry() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));

    // Match time buttons
    this.root.querySelectorAll(".matchTimeBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.state.matchTime = Number(btn.dataset.time);
        this.goToPage("play");
      });
    });

    // Team size buttons
    this.root.querySelectorAll(".teamSizeBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.state.teamSize = btn.dataset.size;
        this.goToPage("play");
      });
    });

    // Create Room
    const roomInfo = get("roomInfo");
    get("createRoom").addEventListener("click", () => {
      this.syncFullState();
      const code = this.generateRoomCode();
      const room = {
        code,
        teamSize: this.state.teamSize,
        matchTime: this.state.matchTime,
        password: this.state.roomPassword || "",
        goalkeepersEnabled: this.state.goalkeepersEnabled,
        goalSweeper: this.state.goalSweeper,
        keeperCatchMode: this.state.keeperCatchMode,
        keeperDiveAssist: this.state.keeperDiveAssist,
        keeperHoldSeconds: this.state.keeperHoldSeconds,
        keeperDistribution: this.state.keeperDistribution,
        createdAt: Date.now(),
      };
      this.state.roomCode = code;
      this.state.roomAction = "create";
      roomInfo.textContent = `Otaq yaradilir: ${code}`;
      roomInfo.style.color = "#49d17d";
      this.onStartRoomMatch?.({ ...this.state, room, avatar: { ...this.state.avatar } });
    });

    // Join Room
    get("joinRoom").addEventListener("click", () => {
      this.syncFullState();
      const code = get("roomCode")?.value?.trim()?.toUpperCase() || "";
      if (!code) {
        if (roomInfo) { roomInfo.textContent = "Evvelce otaq kodu yaz."; roomInfo.style.color = "#ff5a5a"; }
        return;
      }
      this.state.roomCode = code;
      this.state.roomAction = "join";
      if (roomInfo) { roomInfo.textContent = `Sorugu gonderildi: ${code}`; roomInfo.style.color = "#49d17d"; }
      this.onStartRoomMatch?.({ ...this.state, room: { code }, avatar: { ...this.state.avatar } });
    });

    // Refresh rooms
    const refreshBtn = get("refreshRooms");
    const roomList = get("roomList");
    const roomCodeInput = get("roomCode");
    const loadRooms = async () => {
      if (!roomList) return;
      roomList.innerHTML = `<div style="color:rgba(255,0,60,0.6);font-size:13px;padding:8px;">Yuklenir...</div>`;
      try {
        const res = await fetch("/api/rooms");
        const rooms = await res.json();
        if (!Array.isArray(rooms) || !rooms.length) {
          roomList.innerHTML = `<div style="color:rgba(100,116,139,1);font-size:13px;padding:8px;">Aktiv oda tapilmadi.</div>`;
          return;
        }
        roomList.innerHTML = rooms.map((room) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;background:rgba(15,23,42,0.4);border-radius:12px;border:1px solid rgba(255,0,60,0.1);cursor:pointer;transition:all 0.2s;" data-room-code="${escapeHtml(room.code)}">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:8px;height:8px;background:#ff003c;border-radius:50%;box-shadow:0 0 8px #ff003c;"></div>
              <span style="font-size:14px;font-weight:700;">${escapeHtml(room.code)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;border:1px solid rgba(51,65,85,1);color:rgba(100,116,139,1);">${room.teamSize} • ${room.matchTime}m</span>
              <span style="font-size:14px;font-weight:900;color:#ff003c;">${room.playerCount || 0}/${room.maxPlayers || 10}</span>
            </div>
          </div>
        `).join("");
        roomList.querySelectorAll("[data-room-code]").forEach((el) => {
          el.addEventListener("click", () => {
            if (roomCodeInput) roomCodeInput.value = el.dataset.roomCode;
            this.state.roomCode = el.dataset.roomCode;
          });
        });
      } catch {
        roomList.innerHTML = `<div style="color:rgba(100,116,139,1);font-size:13px;padding:8px;">Aktiv oda tapilmadi.</div>`;
      }
    };
    if (refreshBtn) refreshBtn.addEventListener("click", loadRooms);
    loadRooms();
  }

  renderPlayCreate() {
    const team = this.getAvatarOption(TEAM_OPTIONS, this.state.preferredTeam);
    const role = this.getAvatarOption(ROLE_OPTIONS, this.state.preferredRole);
    const dive = this.getAvatarOption(KEEPER_DIVE_OPTIONS, this.state.keeperDiveAssist);
    const distribution = this.getAvatarOption(KEEPER_DISTRIBUTION_OPTIONS, this.state.keeperDistribution);

    return `
      <div class="menu sub-menu play-shell">
        <div class="panel sub-panel">
          <button id="btnBack" class="back-btn">Geri</button>
          <div class="play-stage">
            <div class="play-hero">
              <div>
                <div class="play-badge">Match Control</div>
                <h1>Arena Room Builder</h1>
                <p class="page-lead">
                  Otaq yaratdigin anda avtomatik olaraq lobbiye daxil olursan. Kodu paylas, dostlarin join ile
                  daxil olsun. Hamisi secimlerden sonra lobbide serbest hereket eder, host maci basladar.
                </p>
              </div>
              <div class="play-hero-pills">
                <span class="play-summary-pill">${escapeHtml(team.label)}</span>
                <span class="play-summary-pill">${escapeHtml(role.label)}</span>
                <span class="play-summary-pill">${this.state.goalSweeper ? "Sweeper ON" : "Sweeper OFF"}</span>
              </div>
            </div>

            <div class="play-options play-options-rich">
              <div class="play-card play-card-setup">
                <div class="play-card-head">
                  <span class="play-badge">Setup</span>
                  <h2>Matc Qurulusu</h2>
                </div>
                <p>Format, oyun vaxti ve otaq kodunu bir merkezden idare et.</p>
                <div class="row"><label>Format</label>
                  <select id="teamSize">
                    ${TEAM_SIZE_OPTIONS.map((size) => `<option value="${size}" ${this.state.teamSize === size ? "selected" : ""}>${size}</option>`).join("")}
                  </select>
                </div>
                <div class="row"><label>Matc deqiqe</label>
                  <select id="matchTime">
                    ${MATCH_TIME_OPTIONS.map((val) => `<option value="${val}" ${Number(this.state.matchTime) === val ? "selected" : ""}>${val} deq</option>`).join("")}
                  </select>
                </div>
                <div class="row"><label>Otaq sifresi</label>
                  <input id="roomPassword" type="password" placeholder="Istege gore" value="${escapeHtml(this.state.roomPassword)}" />
                </div>
                <div class="row"><label>Otaq kodu</label>
                  <input id="roomCode" placeholder="Auto yaranacaq" value="${escapeHtml(this.state.roomCode)}" readonly />
                </div>
                <button id="copyRoomCode" class="menu-btn ghost-btn play-submit">
                  <span class="btn-text">Otaq Kodunu Kopyala</span>
                </button>
                <div class="play-note-grid">
                  <div class="play-note-card">
                    <strong>${escapeHtml(dive.label)}</strong>
                    <span>${escapeHtml(dive.note)}</span>
                  </div>
                  <div class="play-note-card">
                    <strong>${escapeHtml(distribution.label)}</strong>
                    <span>${escapeHtml(distribution.note)}</span>
                  </div>
                </div>
                <button id="createRoom" class="menu-btn play-btn play-submit">
                  <span class="btn-text">Otaq Yarat ve Lobbiye Gir</span>
                </button>
              </div>

              <div class="play-card play-card-keeper">
                <div class="play-card-head">
                  <span class="play-badge">Keeper Lab</span>
                  <h2>Qapici Ayarlari</h2>
                </div>
                <p>Qapicilar ucun catch, dive ve sweeper hereketini otaq seviyyesinde sec.</p>
                <label class="toggle-row">
                  <input id="goalkeepersEnabled" type="checkbox" ${this.state.goalkeepersEnabled ? "checked" : ""} />
                  <span>Dedicated qapicilar aktiv olsun</span>
                </label>
                <label class="toggle-row">
                  <input id="goalSweeper" type="checkbox" ${this.state.goalSweeper ? "checked" : ""} />
                  <span>Rematch usulu sweeper hereketine icaze ver</span>
                </label>
                <div class="row"><label>Catch mode</label>
                  <select id="keeperCatchMode">
                    <option value="toggle" ${this.state.keeperCatchMode === "toggle" ? "selected" : ""}>PSO Toggle (Alt)</option>
                    <option value="hold" ${this.state.keeperCatchMode === "hold" ? "selected" : ""}>Hold to Catch</option>
                  </select>
                </div>
                <div class="row"><label>Dive assist</label>
                  <select id="keeperDiveAssist">
                    ${KEEPER_DIVE_OPTIONS.map((option) => `<option value="${option.id}" ${this.state.keeperDiveAssist === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
                <div class="row"><label>Topu elde saxlama</label>
                  <input id="keeperHoldSeconds" type="number" min="3" max="8" value="${this.state.keeperHoldSeconds}" />
                </div>
                <div class="row"><label>Paylama stili</label>
                  <select id="keeperDistribution">
                    ${KEEPER_DISTRIBUTION_OPTIONS.map((option) => `<option value="${option.id}" ${this.state.keeperDistribution === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
                <div class="keeper-lab-copy">
                  <strong>Qisa qayda:</strong>
                  <span>Alt catch mode, F dive/save, top tutulandan sonra E/Q/Space ile paylama.</span>
                </div>
              </div>

              <div class="play-card play-card-slot">
                <div class="play-card-head">
                  <span class="play-badge">Slot</span>
                  <h2>Heyet ve Rol Secimi</h2>
                </div>
                <p>Odaya girmeden evvel mavi/qirmizi heyeti ve qapici/saha rolu secilir.</p>
                <div class="row"><label>Takim</label>
                  <select id="preferredTeam">
                    ${TEAM_OPTIONS.map((option) => `<option value="${option.id}" ${this.state.preferredTeam === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
                <div class="row"><label>Rol</label>
                  <select id="preferredRole">
                    ${ROLE_OPTIONS.map((option) => `<option value="${option.id}" ${this.state.preferredRole === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
                <div class="play-slot-card">
                  <strong>${escapeHtml(team.label)} | ${escapeHtml(role.label)}</strong>
                  <span>${escapeHtml(role.note)}</span>
                </div>
                <div id="roomInfo" class="room-info"></div>
                <div class="keeper-lab-copy">
                  Lobbiye girdikden sonra host maci basladanadek serbest hereket edirsiniz.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindPlayCreate() {
    const get = (id) => this.root.querySelector(`#${id}`);
    const roomInfo = get("roomInfo");

    get("btnBack").addEventListener("click", () => this.goToPage("play"));

    get("createRoom").addEventListener("click", () => {
      this.syncFullState();
      if (!this.state.goalkeepersEnabled && this.state.preferredRole === "goalkeeper") {
        roomInfo.textContent = "Dedicated qapici baglidir. Ya qapicini aktiv et, ya da normal oyuncu sec.";
        roomInfo.style.color = "#ff8c5a";
        return;
      }
      const code = this.generateRoomCode();
      const room = {
        code,
        teamSize: this.state.teamSize,
        matchTime: this.state.matchTime,
        password: this.state.roomPassword || "",
        goalkeepersEnabled: this.state.goalkeepersEnabled,
        goalSweeper: this.state.goalSweeper,
        keeperCatchMode: this.state.keeperCatchMode,
        keeperDiveAssist: this.state.keeperDiveAssist,
        keeperHoldSeconds: this.state.keeperHoldSeconds,
        keeperDistribution: this.state.keeperDistribution,
        createdAt: Date.now(),
      };

      get("roomCode").value = code;
      this.state.roomCode = code;
      this.state.roomAction = "create";
      roomInfo.textContent = `Otaq yaradilir: ${code}. Sen avtomatik daxil olursan.`;
      roomInfo.style.color = "#49d17d";
      this.onStartRoomMatch?.({ ...this.state, room, avatar: { ...this.state.avatar } });
    });

    const copyBtn = get("copyRoomCode");
    if (copyBtn) {
      copyBtn.addEventListener("click", async () => {
        const code = get("roomCode")?.value?.trim();
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
          copyBtn.querySelector(".btn-text").textContent = "Kopyalandi";
          setTimeout(() => {
            copyBtn.querySelector(".btn-text").textContent = "Otaq Kodunu Kopyala";
          }, 1200);
        } catch {
          copyBtn.querySelector(".btn-text").textContent = "Kopyalandi";
        }
      });
    }
  }

  renderPlayJoin() {
    const team = this.getAvatarOption(TEAM_OPTIONS, this.state.preferredTeam);
    const role = this.getAvatarOption(ROLE_OPTIONS, this.state.preferredRole);

    return `
      <div class="menu sub-menu play-shell">
        <div class="panel sub-panel">
          <button id="btnBack" class="back-btn">Geri</button>
          <div class="play-stage">
            <div class="play-hero">
              <div>
                <div class="play-badge">Join Room</div>
                <h1>Odaya Qosul</h1>
                <p class="page-lead">
                  Otaq kodunu daxil et, sifre varsa yaz, komanda ve rolu sec. Ardindan lobbiye daxil olacaqsan.
                </p>
              </div>
              <div class="play-hero-pills">
                <span class="play-summary-pill">${escapeHtml(team.label)}</span>
                <span class="play-summary-pill">${escapeHtml(role.label)}</span>
              </div>
            </div>

            <div class="play-options play-options-rich">
              <div class="play-card play-card-setup">
                <div class="play-card-head">
                  <span class="play-badge">Access</span>
                  <h2>Otaq Kodu</h2>
                </div>
                <p>Otaq kodu ve varsa sifre yaz, join isteyi gonder.</p>
                <div class="row"><label>Otaq kodu</label>
                  <input id="roomCode" placeholder="Mes: BAKU11" value="${escapeHtml(this.state.roomCode)}" />
                </div>
                <div class="row"><label>Otaq sifresi</label>
                  <input id="roomPassword" type="password" placeholder="Istege gore" value="${escapeHtml(this.state.roomPassword)}" />
                </div>
                <div class="room-info" id="roomInfo"></div>
                <button id="joinRoom" class="menu-btn training-btn play-submit">
                  <span class="btn-text">Odaya Daxil Ol</span>
                </button>
              </div>

              <div class="play-card play-card-slot">
                <div class="play-card-head">
                  <span class="play-badge">Slot</span>
                  <h2>Heyet ve Rol Secimi</h2>
                </div>
                <p>Odaya girmeden evvel mavi/qirmizi heyeti ve qapici/saha rolu secilir.</p>
                <div class="row"><label>Takim</label>
                  <select id="preferredTeam">
                    ${TEAM_OPTIONS.map((option) => `<option value="${option.id}" ${this.state.preferredTeam === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
                <div class="row"><label>Rol</label>
                  <select id="preferredRole">
                    ${ROLE_OPTIONS.map((option) => `<option value="${option.id}" ${this.state.preferredRole === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
                  </select>
                </div>
                <div class="play-slot-card">
                  <strong>${escapeHtml(team.label)} | ${escapeHtml(role.label)}</strong>
                  <span>${escapeHtml(role.note)}</span>
                </div>
                <div class="keeper-lab-copy">
                  Match ayarlari host terefinden secilir. Lobbiye girenden sonra host maci basladar.
                </div>
              </div>

              <div class="play-card play-card-keeper">
                <div class="play-card-head">
                  <span class="play-badge">Keeper</span>
                  <h2>Qapici Qaydasi</h2>
                </div>
                <p>Qapici qaydalari room host terefinden secilir. Bu bolme informasiya ucundur.</p>
                <div class="play-note-grid">
                  <div class="play-note-card">
                    <strong>Catch Mode</strong>
                    <span>Alt toggle ve ya hold catch</span>
                  </div>
                  <div class="play-note-card">
                    <strong>Dive Assist</strong>
                    <span>Rematch tarzinda assist seviyyesi</span>
                  </div>
                </div>
                <div class="keeper-lab-copy">
                  Alt catch | F dive | E/Q/Space paylama
                </div>
              </div>

              <div class="play-card play-card-setup">
                <div class="play-card-head">
                  <span class="play-badge">Rooms</span>
                  <h2>Oda Listesi</h2>
                </div>
                <p>Aktiv otaglari gor, kodu sec ve join et.</p>
                <div id="roomList" class="room-list"></div>
                <button id="refreshRooms" class="menu-btn ghost-btn play-submit">
                  <span class="btn-text">Odalari Yenile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindPlayJoin() {
    const get = (id) => this.root.querySelector(`#${id}`);
    const roomInfo = get("roomInfo");
    const roomList = get("roomList");
    const refreshBtn = get("refreshRooms");
    const roomCodeInput = get("roomCode");
    const roomPasswordInput = get("roomPassword");

    get("btnBack").addEventListener("click", () => this.goToPage("play"));

    get("joinRoom").addEventListener("click", () => {
      this.syncFullState();
      const code = this.state.roomCode;
      if (!code) {
        roomInfo.textContent = "Evvelce otaq kodu yaz.";
        roomInfo.style.color = "#ff5a5a";
        return;
      }

      this.state.roomAction = "join";
      roomInfo.textContent = `Sorugu gonderildi: ${code} | ${this.state.preferredTeam} | ${this.state.preferredRole}`;
      roomInfo.style.color = "#49d17d";
      this.onStartRoomMatch?.({ ...this.state, room: { code }, avatar: { ...this.state.avatar } });
    });

    const renderRooms = (rooms = []) => {
      if (!roomList) return;
      if (!rooms.length) {
        roomList.innerHTML = `<div class="room-info">Aktiv oda tapilmadi.</div>`;
        return;
      }
      roomList.innerHTML = rooms.map((room) => {
        const lock = room.hasPassword ? "Kilidli" : "Acik";
        const state = room.state === "live" ? "LIVE" : "LOBBY";
        return `
          <div class="room-item">
            <div class="room-meta">
              <strong>${escapeHtml(room.code)}</strong>
              <div class="room-tags">
                <span class="room-tag">${room.teamSize}</span>
                <span class="room-tag">${room.matchTime} deq</span>
                <span class="room-tag">${room.playerCount} oyuncu</span>
                <span class="room-tag">${lock}</span>
                <span class="room-tag">${state}</span>
              </div>
            </div>
            <button class="room-join-mini" data-room-code="${escapeHtml(room.code)}">Sec</button>
          </div>
        `;
      }).join("");

      roomList.querySelectorAll("[data-room-code]").forEach((button) => {
        button.addEventListener("click", () => {
          const code = button.dataset.roomCode || "";
          if (roomCodeInput) roomCodeInput.value = code;
          this.state.roomCode = code;
          if (roomPasswordInput) roomPasswordInput.focus();
        });
      });
    };

    const loadRooms = async () => {
      if (!roomList) return;
      roomList.innerHTML = `<div class="room-info">Yuklenir...</div>`;
      try {
        const res = await fetch("/api/rooms");
        const rooms = await res.json();
        renderRooms(Array.isArray(rooms) ? rooms : []);
      } catch {
        roomList.innerHTML = `<div class="room-info">Oda listesi alinmadi.</div>`;
      }
    };

    if (refreshBtn) refreshBtn.addEventListener("click", () => loadRooms());
    loadRooms();
  }

  renderAcademy() {
    const progress = loadAcademyProgress();
    const summary = getAcademySummary(progress);
    const selectedDrillId = this.state.academyDrillId || progress.lastPlayedDrillId || ACADEMY_DRILLS[0].id;

    const medalLabel = (medal) => {
      if (medal === "gold") return "GOLD";
      if (medal === "silver") return "SILVER";
      if (medal === "bronze") return "BRONZE";
      return "UNRANKED";
    };

    const drillCards = ACADEMY_DRILLS.map((drill) => {
      const entry = progress.drills?.[drill.id] || {};
      const selected = drill.id === selectedDrillId;
      const medal = entry.medal || "none";
      const primaryMetric = drill.metrics?.[0]?.label || "Metric";
      return `
        <article class="academy-drill-card ${selected ? "selected" : ""}">
          <div class="academy-drill-top">
            <div>
              <span class="academy-drill-category">${escapeHtml(drill.category)}</span>
              <h2>${escapeHtml(drill.label)}</h2>
            </div>
            <span class="academy-medal-pill academy-medal-${escapeHtml(medal)}">${escapeHtml(medalLabel(medal))}</span>
          </div>
          <p>${escapeHtml(drill.summary)}</p>
          <div class="academy-drill-meta">
            <div><span>Time</span><strong>${drill.duration}s</strong></div>
            <div><span>Best Score</span><strong>${entry.bestScore || 0}</strong></div>
            <div><span>${escapeHtml(primaryMetric)}</span><strong>${entry.bestMetric || 0}</strong></div>
          </div>
          <div class="academy-target-row">
            <span>Bronze ${drill.medals.bronze}</span>
            <span>Silver ${drill.medals.silver}</span>
            <span>Gold ${drill.medals.gold}</span>
          </div>
          <div class="academy-drill-actions">
            <button type="button" class="menu-btn training-btn academy-start-btn" data-drill-id="${escapeHtml(drill.id)}">
              <span class="btn-text">Drilli Baslat</span>
            </button>
          </div>
        </article>
      `;
    }).join("");

    return `
      <div class="menu academy-menu">
        <div class="panel academy-panel">
          <button id="btnBack" class="back-btn">Geri</button>
          <div class="academy-layout">
            <aside class="academy-sidebar">
              <div class="catalog-badge">Offline Progression</div>
              <h1>Arena Academy</h1>
              <p class="page-lead">
                Bu bolmede oyuna derinlik qatan drill sistemi var: medal pace, xp, report karti, feed ve telemetry.
                Buradan finishing, passing ve 10 skill duel micro drill daxil olmaqla birbasa gameplaye kece bilersen.
              </p>

              <div class="academy-summary-card">
                <div class="academy-summary-line"><span>Level</span><strong>${summary.levelInfo.level}</strong></div>
                <div class="academy-summary-line"><span>Total XP</span><strong>${summary.levelInfo.totalXp}</strong></div>
                <div class="academy-summary-line"><span>Played</span><strong>${progress.sessions}</strong></div>
                <div class="academy-summary-line"><span>Best Score</span><strong>${summary.bestScore}</strong></div>
                <div class="academy-summary-line"><span>Medals</span><strong>${summary.medals.gold}G / ${summary.medals.silver}S / ${summary.medals.bronze}B</strong></div>
                <div class="academy-summary-line"><span>Best Combo</span><strong>x${progress.bestCombo}</strong></div>
              </div>

              <div class="academy-level-track">
                <div class="academy-level-bar">
                  <div class="academy-level-fill" style="width:${Math.round(summary.levelInfo.progress * 100)}%"></div>
                </div>
                <div class="academy-level-copy">${summary.levelInfo.currentXp} / ${summary.levelInfo.nextXp} XP</div>
              </div>

              <div class="academy-mini-note">
                Son oynanan drill: <strong>${escapeHtml(progress.lastPlayedDrillId || ACADEMY_DRILLS[0].id)}</strong>
              </div>
            </aside>

            <div class="academy-content">
              <div class="academy-hero-card">
                <div>
                  <div class="play-badge">Challenge Stack</div>
                  <h2>Scoring + Combo + Report + XP</h2>
                </div>
                <p>
                  Her drillin oz qaydasi, hedefleri ve medal threshold-u var. Session bitende detal report cixir,
                  xal/xp yazilir ve recordlar local progresde saxlanir. Skill duel kartlari eyni runtime ile ayri-ayri
                  timing ve defender read test edir.
                </p>
              </div>

              <div class="academy-drill-grid">
                ${drillCards}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindAcademy() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));

    this.root.querySelectorAll("[data-drill-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const drillId = button.dataset.drillId;
        this.state.academyDrillId = drillId;
        this.onStartAcademy?.({ ...this.state, academyDrillId: drillId, avatar: { ...this.state.avatar } });
      });
    });
  }

  renderSettings() {
    return `
      <div class="menu" style="width:100%;height:100%;max-width:none;">
        <div style="position:fixed;inset:0;background:#000;display:flex;flex-direction:column;overflow:hidden;font-family:'Space Grotesk',sans-serif;color:white;">
          <!-- Header -->
          <header style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,0,60,0.2);padding:16px 40px;background:rgba(0,0,0,0.8);z-index:50;">
            <div style="display:flex;align-items:center;gap:16px;">
              <div style="width:32px;height:32px;color:#ff003c;display:flex;align-items:center;justify-content:center;">
                <span class="material-symbols-outlined" style="font-size:28px;">sports_soccer</span>
              </div>
              <h2 style="font-size:20px;font-weight:700;">F9 Football</h2>
            </div>
            <button id="btnBack" style="display:flex;align-items:center;gap:8px;padding:8px 24px;background:rgba(255,0,60,0.1);border:1px solid rgba(255,0,60,0.3);color:#ff003c;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
              <span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span> GERİ
            </button>
          </header>

          <main style="display:flex;flex:1;overflow:hidden;max-width:1440px;margin:0 auto;width:100%;padding:24px 40px;gap:32px;">
            <!-- Sidebar -->
            <aside style="width:280px;display:flex;flex-direction:column;gap:24px;flex-shrink:0;">
              <div>
                <h1 style="font-size:28px;font-weight:900;margin-bottom:4px;">Settings & Controls</h1>
                <p style="color:rgba(255,0,60,0.7);font-size:14px;text-transform:uppercase;letter-spacing:0.2em;">Neon Red Edition</p>
              </div>
              <nav style="display:flex;flex-direction:column;gap:8px;">
                <button id="tabSound" style="display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:12px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;transition:all 0.2s;background:transparent;color:#ff003c;">
                  <span class="material-symbols-outlined">volume_up</span> Audio
                </button>
                <button id="tabVideo" style="display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:12px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;transition:all 0.2s;background:transparent;color:#ff003c;">
                  <span class="material-symbols-outlined">monitor</span> Video
                </button>
                <button id="tabControls" style="display:flex;align-items:center;gap:16px;padding:12px 16px;border-radius:12px;border:none;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.1em;transition:all 0.2s;background:#ff003c;color:black;box-shadow:0 0 20px rgba(255,0,60,0.4);">
                  <span class="material-symbols-outlined">sports_esports</span> Controls
                </button>
              </nav>
              <div style="margin-top:auto;padding:24px;border-radius:16px;background:black;border:1px solid rgba(255,0,60,0.2);">
                <p style="font-size:10px;color:rgba(100,116,139,1);text-transform:uppercase;letter-spacing:0.2em;font-weight:700;margin-bottom:8px;">Current Version</p>
                <p style="color:#ff003c;font-family:monospace;font-size:14px;">v5.0.24-NEON-R</p>
              </div>
            </aside>

            <!-- Content -->
            <section style="flex:1;background:#0a0a0a;border:1px solid rgba(255,0,60,0.2);border-radius:24px;padding:32px 48px;box-shadow:0 0 50px rgba(0,0,0,1);overflow-y:auto;">

              <!-- Sound Section -->
              <div id="soundSection" style="display:none;">
                <h2 style="font-size:24px;font-weight:700;text-transform:uppercase;margin-bottom:24px;">Audio Settings</h2>
                <div style="display:flex;flex-direction:column;gap:16px;max-width:500px;">
                  <div style="display:flex;align-items:center;gap:16px;">
                    <label style="min-width:100px;font-size:14px;color:rgba(255,255,255,0.6);">Master</label>
                    <input id="masterVolume" type="range" min="0" max="100" value="${this.state.masterVolume}" style="flex:1;accent-color:#ff003c;">
                    <span id="masterVal" style="min-width:50px;text-align:right;color:#ff003c;font-weight:600;">${this.state.masterVolume}%</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:16px;">
                    <label style="min-width:100px;font-size:14px;color:rgba(255,255,255,0.6);">Musiqi</label>
                    <input id="musicVolume" type="range" min="0" max="100" value="${this.state.musicVolume}" style="flex:1;accent-color:#ff003c;">
                    <span id="musicVal" style="min-width:50px;text-align:right;color:#ff003c;font-weight:600;">${this.state.musicVolume}%</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:16px;">
                    <label style="min-width:100px;font-size:14px;color:rgba(255,255,255,0.6);">SFX</label>
                    <input id="sfxVolume" type="range" min="0" max="100" value="${this.state.sfxVolume}" style="flex:1;accent-color:#ff003c;">
                    <span id="sfxVal" style="min-width:50px;text-align:right;color:#ff003c;font-weight:600;">${this.state.sfxVolume}%</span>
                  </div>
                </div>
              </div>

              <!-- Video Section -->
              <div id="videoSection" style="display:none;">
                <h2 style="font-size:24px;font-weight:700;text-transform:uppercase;margin-bottom:24px;">Video Settings</h2>
                <div style="display:flex;align-items:center;gap:16px;max-width:400px;">
                  <label style="min-width:100px;font-size:14px;color:rgba(255,255,255,0.6);">Goruntu</label>
                  <select id="qualityProfile" style="flex:1;padding:12px;background:rgba(15,23,42,0.5);border:1px solid rgba(255,0,60,0.2);border-radius:8px;color:white;font-family:inherit;">
                    <option value="auto" ${this.state.qualityProfile === "auto" ? "selected" : ""}>Auto</option>
                    <option value="medium" ${this.state.qualityProfile === "medium" ? "selected" : ""}>Medium</option>
                    <option value="high" ${this.state.qualityProfile === "high" ? "selected" : ""}>High</option>
                    <option value="ultra" ${this.state.qualityProfile === "ultra" ? "selected" : ""}>Ultra</option>
                  </select>
                </div>
              </div>

              <!-- Controls Section -->
              <div id="controlsSection">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;border-bottom:1px solid rgba(255,0,60,0.1);padding-bottom:24px;">
                  <div>
                    <h2 style="font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em;">Keyboard Controls</h2>
                    <p style="color:rgba(100,116,139,1);">Redefine your play style</p>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;">
                  <!-- Left: Movement + Skills -->
                  <div style="display:flex;flex-direction:column;gap:32px;">
                    <div>
                      <h3 style="color:#ff003c;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:24px;">Movement & Camera</h3>
                      <div style="display:flex;align-items:flex-start;gap:48px;">
                        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;">
                          <div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;border:2px solid #ff003c;background:black;color:#ff003c;font-weight:900;font-size:20px;border-radius:12px;box-shadow:0 0 15px rgba(255,0,60,0.25);">W</div>
                          <div style="display:flex;gap:8px;">
                            <div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;border:2px solid #ff003c;background:black;color:#ff003c;font-weight:900;font-size:20px;border-radius:12px;box-shadow:0 0 15px rgba(255,0,60,0.25);">A</div>
                            <div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;border:2px solid #ff003c;background:black;color:#ff003c;font-weight:900;font-size:20px;border-radius:12px;box-shadow:0 0 15px rgba(255,0,60,0.25);">S</div>
                            <div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;border:2px solid #ff003c;background:black;color:#ff003c;font-weight:900;font-size:20px;border-radius:12px;box-shadow:0 0 15px rgba(255,0,60,0.25);">D</div>
                          </div>
                          <p style="font-size:10px;color:rgba(100,116,139,1);font-weight:700;text-transform:uppercase;letter-spacing:0.2em;margin-top:16px;">Move Player</p>
                        </div>
                        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
                          <div style="width:96px;height:128px;border:2px solid rgba(255,0,60,0.3);border-radius:32px;display:flex;flex-direction:column;align-items:center;padding-top:16px;background:black;position:relative;">
                            <div style="width:4px;height:32px;background:#ff003c;border-radius:4px;box-shadow:0 0 12px rgba(255,0,60,0.8);"></div>
                          </div>
                          <p style="font-size:10px;color:rgba(100,116,139,1);font-weight:700;text-transform:uppercase;letter-spacing:0.2em;text-align:center;">Rotate Camera<br><span style="color:rgba(255,0,60,0.6);">Mouse</span></p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 style="color:#ff003c;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:24px;">Skills & Celebrations</h3>
                      <div style="display:flex;flex-wrap:wrap;gap:12px;">
                        ${[1,2,3,4,5].map(n => `<div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #ff003c;background:black;color:#ff003c;font-weight:700;border-radius:8px;font-size:14px;box-shadow:0 0 8px rgba(255,0,60,0.2);">${n}</div>`).join("")}
                        <div style="width:8px;"></div>
                        <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,0,60,0.3);background:black;color:rgba(255,0,60,0.4);font-weight:700;border-radius:8px;font-size:14px;font-style:italic;">...</div>
                        <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #ff003c;background:black;color:#ff003c;font-weight:700;border-radius:8px;font-size:14px;box-shadow:0 0 8px rgba(255,0,60,0.2);">0</div>
                      </div>
                    </div>
                  </div>

                  <!-- Right: Actions -->
                  <div style="display:flex;flex-direction:column;gap:16px;">
                    <h3 style="color:#ff003c;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:8px;">Gameplay Actions</h3>
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:20px;background:black;border:1px solid rgba(255,0,60,0.2);border-radius:16px;">
                      <span style="color:rgba(203,213,225,1);font-weight:500;">Shoot / Powerful Hit</span>
                      <div style="width:144px;height:48px;display:flex;align-items:center;justify-content:center;border:2px solid #ff003c;background:black;color:#ff003c;font-weight:900;border-radius:8px;font-size:14px;text-transform:uppercase;letter-spacing:0.2em;box-shadow:0 0 12px rgba(255,0,60,0.2);">Space</div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px;background:black;border:1px solid rgba(255,0,60,0.2);border-radius:16px;">
                        <span style="color:rgba(203,213,225,1);font-weight:500;">Long Pass</span>
                        <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #ff003c;background:black;color:#ff003c;font-weight:700;border-radius:8px;box-shadow:0 0 8px rgba(255,0,60,0.2);">Q</div>
                      </div>
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px;background:black;border:1px solid rgba(255,0,60,0.2);border-radius:16px;">
                        <span style="color:rgba(203,213,225,1);font-weight:500;">Short Pass</span>
                        <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #ff003c;background:black;color:#ff003c;font-weight:700;border-radius:8px;box-shadow:0 0 8px rgba(255,0,60,0.2);">E</div>
                      </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px;background:black;border:1px solid rgba(255,0,60,0.2);border-radius:16px;">
                        <span style="color:rgba(203,213,225,1);font-weight:500;">Tackle / Slide</span>
                        <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #ff003c;background:black;color:#ff003c;font-weight:700;border-radius:8px;box-shadow:0 0 8px rgba(255,0,60,0.2);">F</div>
                      </div>
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px;background:black;border:1px solid rgba(255,0,60,0.2);border-radius:16px;">
                        <span style="color:rgba(203,213,225,1);font-weight:500;">Reset Ball</span>
                        <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #ff003c;background:black;color:#ff003c;font-weight:700;border-radius:8px;box-shadow:0 0 8px rgba(255,0,60,0.2);">R</div>
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:20px;background:black;border:1px solid rgba(255,0,60,0.2);border-radius:16px;">
                      <span style="color:rgba(203,213,225,1);font-weight:500;">Apply Curve (L / R)</span>
                      <div style="display:flex;gap:8px;">
                        <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #ff003c;background:black;color:#ff003c;font-weight:700;border-radius:8px;box-shadow:0 0 8px rgba(255,0,60,0.2);">K</div>
                        <div style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid #ff003c;background:black;color:#ff003c;font-weight:700;border-radius:8px;box-shadow:0 0 8px rgba(255,0,60,0.2);">L</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <!-- BG effects -->
          <div style="position:fixed;top:0;right:0;z-index:-1;opacity:0.2;pointer-events:none;">
            <svg fill="none" height="800" viewBox="0 0 600 600" width="800"><circle cx="500" cy="100" fill="#ff003c" filter="blur(150px)" r="200"></circle></svg>
          </div>
          <div style="position:fixed;bottom:0;left:0;z-index:-1;opacity:0.1;pointer-events:none;">
            <div style="width:500px;height:500px;background:#ff003c;border-radius:50%;filter:blur(180px);"></div>
          </div>
        </div>
      </div>
    `;
  }

  bindSettings() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));

    const tabSound = get("tabSound");
    const tabVideo = get("tabVideo");
    const tabControls = get("tabControls");
    const soundSection = get("soundSection");
    const videoSection = get("videoSection");
    const controlsSection = get("controlsSection");

    tabSound.addEventListener("click", () => {
      tabSound.classList.add("active");
      tabVideo.classList.remove("active");
      tabControls.classList.remove("active");
      soundSection.style.display = "block";
      videoSection.style.display = "none";
      controlsSection.style.display = "none";
    });

    tabVideo.addEventListener("click", () => {
      tabVideo.classList.add("active");
      tabSound.classList.remove("active");
      tabControls.classList.remove("active");
      soundSection.style.display = "none";
      videoSection.style.display = "block";
      controlsSection.style.display = "none";
    });

    tabControls.addEventListener("click", () => {
      tabControls.classList.add("active");
      tabSound.classList.remove("active");
      tabVideo.classList.remove("active");
      controlsSection.style.display = "block";
      soundSection.style.display = "none";
      videoSection.style.display = "none";
    });

    ["masterVolume", "musicVolume", "sfxVolume"].forEach((id) => {
      const slider = get(id);
      slider.addEventListener("input", () => {
        this.state[id] = Number(slider.value);
        if (id === "masterVolume") get("masterVal").textContent = `${slider.value}%`;
        if (id === "musicVolume") get("musicVal").textContent = `${slider.value}%`;
        if (id === "sfxVolume") get("sfxVal").textContent = `${slider.value}%`;
      });
    });

    const qualitySelect = get("qualityProfile");
    if (qualitySelect) {
      qualitySelect.addEventListener("change", () => {
        this.state.qualityProfile = qualitySelect.value;
        this.onQualityChange?.(this.state.qualityProfile);
      });
    }
  }

  renderAccount() {
    const account = this.account;
    const nickname = account?.nickname || "Oyuncu";
    const providerLabel = account?.provider === "guest" ? "Misafir" : "Google Hesabi";
    const emailLabel = account?.email ? escapeHtml(account.email) : providerLabel;
    const avatarLetter = escapeHtml((nickname || "O").trim().slice(0, 1).toUpperCase());

    return `
      <div class="menu sub-menu account-menu">
        <div class="panel sub-panel">
          <button id="btnBack" class="back-btn">Geri</button>
          <h1>Hesab</h1>
          <p class="auth-desc">Google ile giris ve profilini buradan idare et.</p>

          ${account ? `
            <div class="account-card">
              <div class="account-avatar">${avatarLetter}</div>
              <div>
                <div class="account-email">${emailLabel}</div>
                <div class="account-nick">Nickname: <strong>${escapeHtml(nickname)}</strong></div>
              </div>
            </div>
            <div class="auth-buttons">
              <button id="btnEditNick" class="menu-btn nickname-btn">
                <span class="btn-text">Nickname Deyis</span>
              </button>
              <button id="btnLogout" class="menu-btn ghost-btn">
                <span class="btn-text">Cikis</span>
              </button>
            </div>
          ` : `
            <div class="auth-form">
              <div class="row"><label>E-posta</label>
                <input id="accountEmail" placeholder="email@gmail.com" />
              </div>
              <div id="accountError" class="auth-error"></div>
              <div class="auth-buttons">
                <button id="btnGoogleLogin" class="menu-btn account-btn">
                  <span class="btn-text">Google ile Gir (demo)</span>
                </button>
                <button id="btnGuestLogin" class="menu-btn nickname-btn">
                  <span class="btn-text">Misafir Gir</span>
                </button>
              </div>
            </div>
          `}
        </div>
      </div>
    `;
  }

  bindAccount() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));

    const btnEditNick = get("btnEditNick");
    if (btnEditNick) {
      btnEditNick.addEventListener("click", () => this.goToPage("nickname"));
    }

    const btnLogout = get("btnLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        this.clearAccount();
        this.goToPage("account");
      });
    }

    const btnGoogleLogin = get("btnGoogleLogin");
    if (btnGoogleLogin) {
      btnGoogleLogin.addEventListener("click", () => {
        const emailInput = get("accountEmail");
        const error = get("accountError");
        const email = emailInput?.value?.trim() || "";
        if (!email || !/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
          if (error) error.textContent = "Duzgun e-posta daxil et.";
          return;
        }
        const account = {
          provider: "google",
          email,
          nickname: this.account?.nickname || this.state.nickname || "Oyuncu",
        };
        this.saveAccount(account);
        if (error) error.textContent = "";
        this.goToPage("account");
      });
    }

    const btnGuestLogin = get("btnGuestLogin");
    if (btnGuestLogin) {
      btnGuestLogin.addEventListener("click", () => {
        const account = {
          provider: "guest",
          nickname: this.account?.nickname || this.state.nickname || "Oyuncu",
        };
        this.saveAccount(account);
        this.goToPage("account");
      });
    }
  }

  renderNickname() {
    const nickname = this.account?.nickname || this.state.nickname || "Oyuncu";
    return `
      <div class="menu sub-menu nickname-menu">
        <div class="panel sub-panel">
          <button id="btnBack" class="back-btn">Geri</button>
          <h1>Nickname</h1>
          <p class="nick-desc">Oyun adini sec. 3-12 simvol, yalniz herf, reqem ve _.</p>

          <div class="nick-form">
            <input id="nicknameInput" value="${escapeHtml(nickname)}" maxlength="12" />
            <div id="nickError" class="auth-error"></div>
            <div class="auth-buttons">
              <button id="saveNickname" class="menu-btn play-btn">
                <span class="btn-text">Yadda Saxla</span>
              </button>
              <button id="cancelNickname" class="menu-btn ghost-btn">
                <span class="btn-text">Imtina</span>
              </button>
            </div>
            <div class="nick-rules">
              <span>Min 3 / Max 12</span>
              <span>herf ve reqem</span>
              <span>_ icaze verilir</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindNickname() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));
    get("cancelNickname").addEventListener("click", () => this.goToPage("main"));

    get("saveNickname").addEventListener("click", () => {
      const input = get("nicknameInput");
      const error = get("nickError");
      const value = input?.value?.trim() || "";
      if (!/^[A-Za-z0-9_]{3,12}$/.test(value)) {
        if (error) error.textContent = "Nickname 3-12 simvol olmalidir.";
        return;
      }
      const nextAccount = { ...(this.account || { provider: "guest" }), nickname: value };
      this.saveAccount(nextAccount);
      if (error) error.textContent = "";
      this.goToPage("main");
    });
  }

  renderOptionGroup(title, key, options, currentValue, mode = "swatch") {
    const cards = options.map((option) => {
      const selected = option.id === currentValue;
      const swatches = Array.isArray(option.colors)
        ? `<div class="catalog-swatches">${option.colors.map((color) => `<span class="catalog-swatch" style="background:${color}"></span>`).join("")}</div>`
        : "";
      const meta = mode === "text" ? `<div class="catalog-meta">${escapeHtml(option.note)}</div>` : `<div class="catalog-meta">${escapeHtml(option.note)}</div>`;

      return `
        <button
          type="button"
          class="catalog-card ${selected ? "selected" : ""}"
          data-avatar-key="${key}"
          data-avatar-value="${escapeHtml(option.id)}"
        >
          <div class="catalog-card-head">
            <strong>${escapeHtml(option.label)}</strong>
            ${selected ? '<span class="catalog-selected-pill">Secildi</span>' : ""}
          </div>
          ${meta}
          ${swatches}
        </button>
      `;
    }).join("");

    return `
      <section class="catalog-section">
        <div class="catalog-section-head">
          <h2>${escapeHtml(title)}</h2>
          <span>${options.length} secim</span>
        </div>
        <div class="catalog-grid">${cards}</div>
      </section>
    `;
  }

  renderCustomize() {
    const avatar = this.state.avatar;
    const selectedKit = this.getAvatarOption(KIT_OPTIONS, avatar.kit);
    const selectedBoot = this.getAvatarOption(BOOT_OPTIONS, avatar.boots);
    const selectedHair = this.getAvatarOption(HAIR_OPTIONS, avatar.hair);
    const selectedHairColor = this.getAvatarOption(HAIR_COLOR_OPTIONS, avatar.hairColor);
    const selectedBeard = this.getAvatarOption(BEARD_OPTIONS, avatar.beard);
    const selectedSkin = this.getAvatarOption(SKIN_OPTIONS, avatar.skin);

    const categories = [
      { key: "kit", label: "Forma", icon: "apparel", options: KIT_OPTIONS, current: avatar.kit },
      { key: "boots", label: "Butsu", icon: "ice_skating", options: BOOT_OPTIONS, current: avatar.boots },
      { key: "hair", label: "Saç Üslubu", icon: "face", options: HAIR_OPTIONS, current: avatar.hair },
      { key: "hairColor", label: "Saç Rəngi", icon: "palette", options: HAIR_COLOR_OPTIONS, current: avatar.hairColor },
      { key: "beard", label: "Saqqal", icon: "face_6", options: BEARD_OPTIONS, current: avatar.beard },
      { key: "skin", label: "Dəri Tonu", icon: "contrast", options: SKIN_OPTIONS, current: avatar.skin },
    ];

    const activeCategory = this.state._customizeTab || "kit";
    const activeCat = categories.find(c => c.key === activeCategory) || categories[0];

    const catButtons = categories.map(cat => {
      const isActive = cat.key === activeCategory;
      return `<button class="customizeCatBtn" data-cat="${cat.key}" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:8px;border:none;cursor:pointer;font-family:inherit;font-weight:700;transition:all 0.2s;${isActive ? 'background:#ff003c;color:white;' : 'background:transparent;color:#ff003c;'}">
        <div style="display:flex;align-items:center;gap:12px;">
          <span class="material-symbols-outlined">${cat.icon}</span>
          <span>${escapeHtml(cat.label)}</span>
        </div>
        <span class="material-symbols-outlined" style="font-size:14px;opacity:0.5;">chevron_right</span>
      </button>`;
    }).join("");

    const itemCards = activeCat.options.map(option => {
      const selected = option.id === activeCat.current;
      const swatches = Array.isArray(option.colors)
        ? option.colors.map(c => `<span style="width:12px;height:12px;border-radius:50%;background:${c};display:inline-block;"></span>`).join("")
        : "";
      return `<button data-avatar-key="${activeCat.key}" data-avatar-value="${escapeHtml(option.id)}" style="position:relative;border-radius:12px;overflow:hidden;border:${selected ? '2px solid #ff003c' : '1px solid rgba(255,0,60,0.1)'};background:rgba(10,10,10,0.85);backdrop-filter:blur(16px);cursor:pointer;padding:0;text-align:left;font-family:inherit;transition:all 0.2s;${selected ? 'box-shadow:0 0 15px rgba(255,0,60,0.2);' : ''}">
        <div style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);">
          <span class="material-symbols-outlined" style="font-size:40px;color:${selected ? '#ff003c' : 'rgba(255,0,60,0.2)'};">${activeCat.icon}</span>
        </div>
        <div style="padding:12px;">
          <p style="font-weight:700;font-size:14px;color:${selected ? '#ff003c' : 'rgba(255,0,60,0.8)'};">${escapeHtml(option.label)}</p>
          ${selected ? '<span style="font-size:9px;color:#ff003c;text-transform:uppercase;font-weight:900;letter-spacing:0.1em;">Seçilib</span>' : `<span style="font-size:9px;color:rgba(255,0,60,0.4);text-transform:uppercase;font-weight:700;">${escapeHtml(option.note || '')}</span>`}
          ${swatches ? `<div style="display:flex;gap:4px;margin-top:8px;">${swatches}</div>` : ""}
        </div>
      </button>`;
    }).join("");

    return `
      <div class="menu" style="width:100%;height:100%;max-width:none;">
        <div style="position:fixed;inset:0;background:#050505;display:flex;flex-direction:column;overflow:hidden;font-family:'Space Grotesk',sans-serif;color:white;">
          <!-- Header -->
          <header style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,0,60,0.2);padding:16px 32px;background:rgba(10,10,10,0.85);backdrop-filter:blur(16px);z-index:50;">
            <div style="display:flex;align-items:center;gap:32px;">
              <div style="display:flex;align-items:center;gap:12px;color:#ff003c;">
                <span class="material-symbols-outlined" style="font-size:28px;">sports_soccer</span>
                <h2 style="font-size:20px;font-weight:700;">F9 Football</h2>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <button id="btnBack" style="display:flex;align-items:center;gap:8px;padding:8px 24px;background:rgba(255,0,60,0.1);border:1px solid rgba(255,0,60,0.3);color:#ff003c;cursor:pointer;font-family:inherit;font-weight:700;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;">
                <span class="material-symbols-outlined" style="font-size:18px;">arrow_back</span> GERİ
              </button>
            </div>
          </header>

          <main style="display:flex;flex:1;overflow:hidden;">
            <!-- Left Sidebar -->
            <aside style="width:420px;background:rgba(10,10,10,0.85);backdrop-filter:blur(16px);border-right:1px solid rgba(255,0,60,0.2);display:flex;flex-direction:column;z-index:40;">
              <div style="padding:24px;display:flex;align-items:center;gap:16px;border-bottom:1px solid rgba(255,0,60,0.1);">
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,0,60,0.1);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,0,60,0.4);color:#ff003c;">
                  <span class="material-symbols-outlined" style="font-size:28px;">person</span>
                </div>
                <div>
                  <h1 style="font-size:18px;font-weight:700;color:#ff003c;text-shadow:0 0 10px rgba(255,0,60,0.5);">Fərdiləşdirmə</h1>
                  <p style="color:rgba(255,0,60,0.6);font-size:10px;text-transform:uppercase;letter-spacing:0.2em;font-weight:700;">Variant 4 • Pro Player</p>
                </div>
              </div>

              <!-- Category tabs -->
              <div style="display:flex;flex-direction:column;gap:4px;padding:16px;border-bottom:1px solid rgba(255,0,60,0.1);">
                ${catButtons}
              </div>

              <!-- Item Grid -->
              <div style="flex:1;overflow-y:auto;padding:16px;background:rgba(0,0,0,0.2);">
                <h2 style="color:rgba(255,0,60,0.4);font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;margin-bottom:16px;padding:0 8px;">Mövcud Seçimlər</h2>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  ${itemCards}
                </div>
              </div>

              <!-- Save/Reset -->
              <div style="padding:24px;border-top:1px solid rgba(255,0,60,0.2);background:rgba(0,0,0,0.6);display:flex;flex-direction:column;gap:8px;">
                <label style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;">
                  <span style="color:rgba(255,0,60,0.7);font-size:12px;font-weight:700;">Forma nömrəsi</span>
                  <input id="jerseyNumber" type="number" min="1" max="99" value="${avatar.jerseyNumber}" style="width:60px;padding:8px;background:rgba(15,23,42,0.5);border:1px solid rgba(255,0,60,0.2);border-radius:8px;color:#ff003c;font-family:inherit;font-weight:700;font-size:16px;text-align:center;outline:none;">
                </label>
                <button id="saveCustomize" style="width:100%;padding:16px;background:#ff003c;color:white;font-weight:900;border-radius:8px;border:none;cursor:pointer;text-transform:uppercase;letter-spacing:0.2em;font-family:inherit;box-shadow:0 0 25px rgba(255,0,60,0.3);transition:all 0.2s;">Yadda Saxla</button>
                <button id="resetCustomize" style="width:100%;padding:12px;background:transparent;color:rgba(255,0,60,0.6);font-weight:700;border-radius:8px;border:1px solid rgba(255,0,60,0.2);cursor:pointer;text-transform:uppercase;letter-spacing:0.1em;font-family:inherit;font-size:12px;">Defaulta Qaytar</button>
              </div>
            </aside>

            <!-- Right: Studio View -->
            <section style="flex:1;position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 20% 30%,rgba(255,0,60,0.15) 0%,transparent 50%),radial-gradient(circle at 80% 70%,rgba(255,0,60,0.1) 0%,transparent 50%),linear-gradient(to bottom,#0a0a0a 0%,#050505 100%);">
              <!-- Spotlight lines -->
              <div style="position:absolute;left:25%;width:1px;height:100%;background:linear-gradient(to bottom,transparent,#ff003c,transparent);filter:blur(40px);opacity:0.3;transform:rotate(-12deg);"></div>
              <div style="position:absolute;right:25%;width:1px;height:100%;background:linear-gradient(to bottom,transparent,#ff003c,transparent);filter:blur(40px);opacity:0.3;transform:rotate(12deg);"></div>

              <!-- Player silhouette placeholder -->
              <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
                <div style="width:192px;height:256px;background:rgba(30,41,59,0.2);border:1px solid rgba(255,0,60,0.2);border-radius:48px;position:relative;box-shadow:inset 0 0 20px rgba(255,0,60,0.05);">
                  <div style="position:absolute;left:32px;right:32px;top:48px;height:4px;background:rgba(255,0,60,0.3);filter:blur(2px);border-radius:4px;"></div>
                </div>
                <div style="width:160px;height:320px;margin-top:-40px;border-left:2px solid rgba(255,0,60,0.1);border-right:2px solid rgba(255,0,60,0.1);border-bottom:2px solid rgba(255,0,60,0.1);border-radius:0 0 64px 64px;background:linear-gradient(to bottom,transparent,rgba(255,0,60,0.05));"></div>
                <div style="position:absolute;bottom:80px;width:500px;height:60px;background:rgba(255,0,60,0.2);filter:blur(60px);border-radius:50%;"></div>

                <!-- Labels -->
                <div style="position:absolute;left:-200px;top:25%;display:flex;align-items:center;gap:16px;color:#ff003c;">
                  <div style="text-align:right;">
                    <span style="font-size:10px;display:block;opacity:0.5;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;">Saç Üslubu</span>
                    <span style="font-size:12px;font-weight:900;text-transform:uppercase;text-shadow:0 0 10px rgba(255,0,60,0.5);">${escapeHtml(selectedHair.label)}</span>
                  </div>
                  <div style="width:8px;height:8px;border-radius:50%;background:#ff003c;box-shadow:0 0 15px rgba(255,0,60,0.2);"></div>
                  <div style="width:64px;height:1px;background:rgba(255,0,60,0.3);"></div>
                </div>
                <div style="position:absolute;right:-200px;top:50%;display:flex;align-items:center;gap:16px;color:#ff003c;">
                  <div style="width:64px;height:1px;background:rgba(255,0,60,0.3);"></div>
                  <div style="width:8px;height:8px;border-radius:50%;background:#ff003c;box-shadow:0 0 15px rgba(255,0,60,0.2);"></div>
                  <div>
                    <span style="font-size:10px;display:block;opacity:0.5;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;">Jersey Seçimi</span>
                    <span style="font-size:12px;font-weight:900;text-transform:uppercase;text-shadow:0 0 10px rgba(255,0,60,0.5);">${escapeHtml(selectedKit.label)}</span>
                  </div>
                </div>
              </div>

              <!-- Stats Panel -->
              <div style="position:absolute;bottom:40px;right:40px;background:rgba(10,10,10,0.85);backdrop-filter:blur(16px);border:1px solid rgba(255,0,60,0.15);padding:24px;border-radius:16px;width:320px;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                  <h3 style="font-weight:900;font-size:18px;color:#ff003c;text-transform:uppercase;text-shadow:0 0 10px rgba(255,0,60,0.5);">Xüsusiyyətlər</h3>
                  <div style="padding:4px 12px;background:rgba(255,0,60,0.1);border:1px solid rgba(255,0,60,0.4);border-radius:24px;">
                    <span style="color:#ff003c;font-weight:900;font-size:12px;">LVL 24</span>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:20px;">
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;text-transform:uppercase;font-weight:900;letter-spacing:0.2em;color:rgba(255,0,60,0.7);margin-bottom:8px;">
                      <span>Sürət</span><span style="color:#ff003c;">88</span>
                    </div>
                    <div style="height:6px;background:rgba(255,0,60,0.05);border-radius:4px;overflow:hidden;border:1px solid rgba(255,0,60,0.1);">
                      <div style="height:100%;width:88%;background:#ff003c;box-shadow:0 0 10px #ff003c;border-radius:4px;"></div>
                    </div>
                  </div>
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;text-transform:uppercase;font-weight:900;letter-spacing:0.2em;color:rgba(255,0,60,0.7);margin-bottom:8px;">
                      <span>Zərbə</span><span style="color:#ff003c;">92</span>
                    </div>
                    <div style="height:6px;background:rgba(255,0,60,0.05);border-radius:4px;overflow:hidden;border:1px solid rgba(255,0,60,0.1);">
                      <div style="height:100%;width:92%;background:#ff003c;box-shadow:0 0 10px #ff003c;border-radius:4px;"></div>
                    </div>
                  </div>
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;text-transform:uppercase;font-weight:900;letter-spacing:0.2em;color:rgba(255,0,60,0.7);margin-bottom:8px;">
                      <span>Texnika</span><span style="color:#ff003c;">75</span>
                    </div>
                    <div style="height:6px;background:rgba(255,0,60,0.05);border-radius:4px;overflow:hidden;border:1px solid rgba(255,0,60,0.1);">
                      <div style="height:100%;width:75%;background:#ff003c;box-shadow:0 0 10px #ff003c;border-radius:4px;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    `;
  }

  bindCustomize() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));

    // Category tab switching
    this.root.querySelectorAll(".customizeCatBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.state._customizeTab = btn.dataset.cat;
        this.goToPage("customize");
      });
    });

    this.root.querySelectorAll("[data-avatar-key]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.avatarKey;
        const value = button.dataset.avatarValue;
        this.state.avatar = this.normalizeAvatar({ ...this.state.avatar, [key]: value });
        this.goToPage("customize");
      });
    });

    get("jerseyNumber").addEventListener("input", (event) => {
      const value = Number(event.target.value);
      this.state.avatar = this.normalizeAvatar({ ...this.state.avatar, jerseyNumber: value });
    });

    get("saveCustomize").addEventListener("click", () => {
      this.state.avatar = this.normalizeAvatar(this.state.avatar);
      this.saveAvatarConfig(this.state.avatar);
      this.goToPage("main");
    });

    get("resetCustomize").addEventListener("click", () => {
      this.state.avatar = this.normalizeAvatar(DEFAULT_AVATAR);
      this.goToPage("customize");
    });
  }

  syncFullState() {
    const get = (id) => this.root.querySelector(`#${id}`);
    if (get("teamSize")) this.state.teamSize = get("teamSize").value;
    if (get("matchTime")) this.state.matchTime = Number(get("matchTime").value) || this.state.matchTime;
    if (get("roomCode")) this.state.roomCode = get("roomCode").value.trim().toUpperCase();
    if (get("roomPassword")) this.state.roomPassword = get("roomPassword").value.trim();
    if (get("preferredTeam")) this.state.preferredTeam = get("preferredTeam").value;
    if (get("preferredRole")) this.state.preferredRole = get("preferredRole").value;
    if (get("goalkeepersEnabled")) this.state.goalkeepersEnabled = get("goalkeepersEnabled").checked;
    if (get("goalSweeper")) this.state.goalSweeper = get("goalSweeper").checked;
    if (get("keeperCatchMode")) this.state.keeperCatchMode = get("keeperCatchMode").value;
    if (get("keeperDiveAssist")) this.state.keeperDiveAssist = get("keeperDiveAssist").value;
    if (get("keeperHoldSeconds")) this.state.keeperHoldSeconds = Number(get("keeperHoldSeconds").value);
    if (get("keeperDistribution")) this.state.keeperDistribution = get("keeperDistribution").value;
    if (get("qualityProfile")) this.state.qualityProfile = get("qualityProfile").value;
    this.state.nickname = this.account?.nickname || "Oyuncu";
    this.state.avatar = this.normalizeAvatar(this.state.avatar);
    this.state = { ...this.state, ...this.normalizeRoomState(this.state) };
  }

  loadAccount() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    } catch {
      return null;
    }
  }

  saveAccount(account) {
    const next = account ? { ...account } : null;
    if (next) {
      if (!next.nickname) next.nickname = "Oyuncu";
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(ACCOUNT_KEY);
    }
    this.account = next;
    this.state.nickname = this.account?.nickname || "Oyuncu";
  }

  clearAccount() {
    localStorage.removeItem(ACCOUNT_KEY);
    this.account = null;
    this.state.nickname = "Oyuncu";
  }

  loadAvatarConfig() {
    try {
      return this.normalizeAvatar(JSON.parse(localStorage.getItem(AVATAR_KEY) || "{}"));
    } catch {
      return { ...DEFAULT_AVATAR };
    }
  }

  saveAvatarConfig(avatar) {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(this.normalizeAvatar(avatar || this.state.avatar)));
  }

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
