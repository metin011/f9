const ROOM_KEY = "futbol_rooms_v1";
const ACCOUNT_KEY = "futbol_account_v1";

export class Menu {
  constructor(root) {
    this.root = root;
    this.onStartTraining = null;
    this.onStartRoomMatch = null;

    this.state = {
      masterVolume: 70,
      musicVolume: 65,
      sfxVolume: 80,
      teamSize: "3v3",
      matchTime: 10,
      roomCode: "",
      avatar: {
        hair: "Qisa",
        beard: "Yox",
        skin: "Orta",
        jerseyNumber: 10,
      },
    };

    this.account = this.loadAccount();
    this.currentPage = "main"; // main, play, settings, account, nickname
  }

  mount() {
    this.root.innerHTML = this.renderMain();
    this.bindMain();
  }

  hide() { this.root.style.display = "none"; }
  show() {
    this.root.style.display = "grid";
    this.goToPage("main");
  }

  goToPage(page) {
    this.currentPage = page;
    switch (page) {
      case "main":
        this.root.innerHTML = this.renderMain();
        this.bindMain();
        break;
      case "play":
        this.root.innerHTML = this.renderPlay();
        this.bindPlay();
        break;
      case "settings":
        this.root.innerHTML = this.renderSettings();
        this.bindSettings();
        break;
      case "account":
        this.root.innerHTML = this.renderAccount();
        this.bindAccount();
        break;
      case "nickname":
        this.root.innerHTML = this.renderNickname();
        this.bindNickname();
        break;
    }
  }

  // ===========================
  //  ANA MENYU
  // ===========================
  renderMain() {
    const nickname = this.account?.nickname || null;
    const email = this.account?.email || null;
    const greeting = nickname
      ? `<div class="greeting">Xoş gəldin, <strong>${nickname}</strong></div>`
      : "";

    return `
      <div class="menu main-menu">
        <div class="panel main-panel">
          <div class="logo-area">
            <h1 class="game-title">⚽ 3D FUTBOL</h1>
            ${greeting}
          </div>
          <div class="main-buttons">
            <button id="btnPlay" class="menu-btn play-btn">
              <span class="btn-icon">🎮</span>
              <span class="btn-text">Oyna</span>
            </button>
            <button id="btnTraining" class="menu-btn training-btn">
              <span class="btn-icon">🏋️</span>
              <span class="btn-text">Antrenman</span>
            </button>
            <button id="btnSettings" class="menu-btn settings-btn">
              <span class="btn-icon">⚙️</span>
              <span class="btn-text">Ayarlar</span>
            </button>
            <button id="btnAccount" class="menu-btn account-btn">
              <span class="btn-icon">${email ? "👤" : "🔐"}</span>
              <span class="btn-text">${email ? "Hesab" : "Hesab Aç / Gir"}</span>
            </button>
            <button id="btnNickname" class="menu-btn nickname-btn">
              <span class="btn-icon">✏️</span>
              <span class="btn-text">Nickname: ${nickname || "Seçilməyib"}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindMain() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnPlay").addEventListener("click", () => this.goToPage("play"));
    get("btnTraining").addEventListener("click", () => {
      this.syncAvatarDefaults();
      this.onStartTraining?.({ ...this.state });
    });
    get("btnSettings").addEventListener("click", () => this.goToPage("settings"));
    get("btnAccount").addEventListener("click", () => this.goToPage("account"));
    get("btnNickname").addEventListener("click", () => this.goToPage("nickname"));
  }

  // ===========================
  //  OYNA (Play) Alt Menyusu
  // ===========================
  renderPlay() {
    return `
      <div class="menu sub-menu">
        <div class="panel sub-panel">
          <button id="btnBack" class="back-btn">← Geri</button>
          <h1>🎮 Oyna</h1>

          <div class="play-options">
            <div class="play-card">
              <h2>Oda Qur</h2>
              <p>Öz otağını yarat və dostlarını dəvət et</p>
              <div class="row"><label>Format</label>
                <select id="teamSize">
                  <option value="1v1">1v1</option>
                  <option value="2v2">2v2</option>
                  <option value="3v3" selected>3v3</option>
                </select>
              </div>
              <div class="row"><label>Taymer (dəq)</label>
                <input id="matchTime" type="number" min="5" max="15" value="${this.state.matchTime}" />
              </div>
              <button id="createRoom" class="menu-btn play-btn" style="width:100%; margin-top:8px;">
                <span class="btn-text">🏟️ Oda Qur</span>
              </button>
            </div>

            <div class="play-card">
              <h2>Odaya Qatıl</h2>
              <p>Mövcud otağa kod ilə qoşul</p>
              <div class="row"><label>Otaq Kodu</label>
                <input id="roomCode" placeholder="Məs: BAKU11" value="${this.state.roomCode}" />
              </div>
              <div id="roomInfo" class="room-info"></div>
              <button id="joinRoom" class="menu-btn training-btn" style="width:100%; margin-top:8px;">
                <span class="btn-text">🚪 Odaya Qatıl</span>
              </button>
            </div>
          </div>

          <h2 style="margin-top:16px;">Avatar</h2>
          <div class="avatar-grid">
            <div class="row"><label>Saç</label>
              <select id="hair"><option>Qisa</option><option>Uzun</option><option>Topuz</option></select>
            </div>
            <div class="row"><label>Saqqal</label>
              <select id="beard"><option>Yox</option><option>Qisa</option><option>Dolgun</option></select>
            </div>
            <div class="row"><label>Dəri</label>
              <select id="skin"><option>Aciq</option><option selected>Orta</option><option>Tund</option></select>
            </div>
            <div class="row"><label>Forma #</label>
              <input id="jerseyNumber" type="number" min="1" max="99" value="${this.state.avatar.jerseyNumber}" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindPlay() {
    const get = (id) => this.root.querySelector(`#${id}`);
    const roomInfo = get("roomInfo");

    get("btnBack").addEventListener("click", () => this.goToPage("main"));

    get("createRoom").addEventListener("click", () => {
      this.syncFullState();
      const code = this.generateRoomCode();
      const room = {
        code,
        teamSize: this.state.teamSize,
        matchTime: this.state.matchTime,
        createdAt: Date.now(),
      };

      const rooms = this.loadRooms();
      rooms[code] = room;
      localStorage.setItem(ROOM_KEY, JSON.stringify(rooms));

      get("roomCode").value = code;
      this.state.roomCode = code;
      roomInfo.textContent = `Otaq quruldu! Kod: ${code}`;
      roomInfo.style.color = "#49d17d";
      this.onStartRoomMatch?.({ ...this.state, room });
    });

    get("joinRoom").addEventListener("click", () => {
      this.syncFullState();
      const code = this.state.roomCode;
      if (!code) {
        roomInfo.textContent = "Kod daxil et.";
        roomInfo.style.color = "#ff5a5a";
        return;
      }

      const rooms = this.loadRooms();
      const room = rooms[code];
      if (!room) {
        roomInfo.textContent = "Kod tapılmadı.";
        roomInfo.style.color = "#ff5a5a";
        return;
      }

      roomInfo.textContent = `Otağa qoşuldun: ${room.code} (${room.teamSize})`;
      roomInfo.style.color = "#49d17d";
      this.onStartRoomMatch?.({ ...this.state, room });
    });
  }

  // ===========================
  //  AYARLAR (Settings)
  // ===========================
  renderSettings() {
    return `
      <div class="menu sub-menu">
        <div class="panel sub-panel">
          <button id="btnBack" class="back-btn">← Geri</button>
          <h1>⚙️ Ayarlar</h1>

          <div class="settings-tabs">
            <button id="tabSound" class="tab-btn active">🔊 Səs</button>
            <button id="tabControls" class="tab-btn">🎮 Kontroller</button>
          </div>

          <div id="soundSection" class="settings-section">
            <div class="row"><label>Ümumi Səs</label><input id="masterVolume" type="range" min="0" max="100" value="${this.state.masterVolume}" /><span id="masterVal" class="range-val">${this.state.masterVolume}%</span></div>
            <div class="row"><label>Musiqi</label><input id="musicVolume" type="range" min="0" max="100" value="${this.state.musicVolume}" /><span id="musicVal" class="range-val">${this.state.musicVolume}%</span></div>
            <div class="row"><label>SFX</label><input id="sfxVolume" type="range" min="0" max="100" value="${this.state.sfxVolume}" /><span id="sfxVal" class="range-val">${this.state.sfxVolume}%</span></div>
          </div>

          <div id="controlsSection" class="settings-section" style="display:none;">
            <div class="controls-grid">
              <div class="ctrl-item"><kbd>W A S D</kbd><span>Hərəkət</span></div>
              <div class="ctrl-item"><kbd>Shift</kbd><span>Sprint (stamina ilə)</span></div>
              <div class="ctrl-item"><kbd>Space</kbd><span>Şut (basılı saxla = güclü)</span></div>
              <div class="ctrl-item"><kbd>E</kbd><span>Qısa pas</span></div>
              <div class="ctrl-item"><kbd>Q</kbd><span>Uzun pas</span></div>
              <div class="ctrl-item"><kbd>C + 1-0</kbd><span>Çalım (10 növ)</span></div>
              <div class="ctrl-item"><kbd>R</kbd><span>Topu çağır (məşq)</span></div>
              <div class="ctrl-item"><kbd>V</kbd><span>Kamera dəyişdir</span></div>
              <div class="ctrl-item"><kbd>L / K</kbd><span>Falso (əyri vuruş)</span></div>
              <div class="ctrl-item"><kbd>← →</kbd><span>Kameranı fırlat</span></div>
              <div class="ctrl-item"><kbd>Esc</kbd><span>Menyuya qayıt</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindSettings() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));

    const tabSound = get("tabSound");
    const tabControls = get("tabControls");
    const soundSection = get("soundSection");
    const controlsSection = get("controlsSection");

    tabSound.addEventListener("click", () => {
      tabSound.classList.add("active");
      tabControls.classList.remove("active");
      soundSection.style.display = "block";
      controlsSection.style.display = "none";
    });

    tabControls.addEventListener("click", () => {
      tabControls.classList.add("active");
      tabSound.classList.remove("active");
      controlsSection.style.display = "block";
      soundSection.style.display = "none";
    });

    // Volume sliders
    ["masterVolume", "musicVolume", "sfxVolume"].forEach((id) => {
      const slider = get(id);
      const valSpan = get(id.replace("Volume", "Val").replace("master", "master"));
      slider.addEventListener("input", () => {
        this.state[id] = Number(slider.value);
        // Update the display value
        if (id === "masterVolume") get("masterVal").textContent = slider.value + "%";
        if (id === "musicVolume") get("musicVal").textContent = slider.value + "%";
        if (id === "sfxVolume") get("sfxVal").textContent = slider.value + "%";
      });
    });
  }

  // ===========================
  //  HESAB (Account)
  // ===========================
  renderAccount() {
    const loggedIn = !!this.account?.email;
    return `
      <div class="menu sub-menu">
        <div class="panel sub-panel">
          <button id="btnBack" class="back-btn">← Geri</button>
          <h1>🔐 Hesab</h1>

          ${loggedIn ? `
            <div class="account-info">
              <div class="account-card">
                <div class="account-avatar">👤</div>
                <div class="account-details">
                  <div class="account-email">${this.account.email}</div>
                  <div class="account-nick">Nickname: <strong>${this.account.nickname || "Seçilməyib"}</strong></div>
                </div>
              </div>
              <button id="btnLogout" class="menu-btn" style="background: rgba(255,90,90,0.3); border-color: #ff5a5a; width:100%; margin-top:12px;">
                <span class="btn-text">🚪 Hesabdan Çıx</span>
              </button>
            </div>
          ` : `
            <div class="auth-section">
              <p class="auth-desc">Gmail hesabınla daxil ol və ya yeni hesab yarat</p>
              <div class="auth-form">
                <div class="row"><label>Gmail</label><input id="emailInput" type="email" placeholder="example@gmail.com" /></div>
                <div class="row"><label>Şifrə</label><input id="passwordInput" type="password" placeholder="Şifrəni yaz" /></div>
                <div id="authError" class="auth-error"></div>
                <div class="auth-buttons">
                  <button id="btnLogin" class="menu-btn play-btn" style="flex:1;">
                    <span class="btn-text">Hesaba Gir</span>
                  </button>
                  <button id="btnRegister" class="menu-btn training-btn" style="flex:1;">
                    <span class="btn-text">Hesab Aç</span>
                  </button>
                </div>
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

    const loggedIn = !!this.account?.email;

    if (loggedIn) {
      get("btnLogout").addEventListener("click", () => {
        this.account = null;
        localStorage.removeItem(ACCOUNT_KEY);
        this.goToPage("account");
      });
    } else {
      const authError = get("authError");

      get("btnLogin").addEventListener("click", () => {
        const email = get("emailInput").value.trim();
        const password = get("passwordInput").value;

        if (!email || !email.includes("@gmail.com")) {
          authError.textContent = "Düzgün Gmail ünvanı daxil et.";
          return;
        }
        if (!password || password.length < 4) {
          authError.textContent = "Şifrə minimum 4 simvol olmalıdır.";
          return;
        }

        // Check saved accounts
        const savedAccounts = this.loadAllAccounts();
        const found = savedAccounts.find(a => a.email === email);
        if (!found) {
          authError.textContent = "Bu hesab tapılmadı. Əvvəlcə hesab aç.";
          return;
        }
        if (found.password !== password) {
          authError.textContent = "Şifrə səhvdir.";
          return;
        }

        this.account = found;
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(found));
        this.goToPage("main");
      });

      get("btnRegister").addEventListener("click", () => {
        const email = get("emailInput").value.trim();
        const password = get("passwordInput").value;

        if (!email || !email.includes("@gmail.com")) {
          authError.textContent = "Düzgün Gmail ünvanı daxil et.";
          return;
        }
        if (!password || password.length < 4) {
          authError.textContent = "Şifrə minimum 4 simvol olmalıdır.";
          return;
        }

        const savedAccounts = this.loadAllAccounts();
        if (savedAccounts.find(a => a.email === email)) {
          authError.textContent = "Bu hesab artıq mövcuddur. Hesaba gir.";
          return;
        }

        const newAccount = { email, password, nickname: "" };
        savedAccounts.push(newAccount);
        localStorage.setItem("futbol_all_accounts", JSON.stringify(savedAccounts));

        this.account = newAccount;
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(newAccount));
        this.goToPage("nickname");
      });
    }
  }

  // ===========================
  //  NICKNAME
  // ===========================
  renderNickname() {
    return `
      <div class="menu sub-menu">
        <div class="panel sub-panel">
          <button id="btnBack" class="back-btn">← Geri</button>
          <h1>✏️ Nickname Seç</h1>

          <p class="nick-desc">Oyunda digər oyunçulara görünəcək adını seç</p>
          <div class="nick-form">
            <input id="nicknameInput" type="text" placeholder="Nickname yaz..." maxlength="16" value="${this.account?.nickname || ""}" />
            <div class="nick-rules">
              <span>• 3-16 simvol</span>
              <span>• Boşluq və xüsusi simvol olmaz</span>
            </div>
            <div id="nickError" class="auth-error"></div>
            <button id="btnSaveNick" class="menu-btn play-btn" style="width:100%; margin-top:12px;">
              <span class="btn-text">💾 Yadda Saxla</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindNickname() {
    const get = (id) => this.root.querySelector(`#${id}`);
    get("btnBack").addEventListener("click", () => this.goToPage("main"));

    get("btnSaveNick").addEventListener("click", () => {
      const nick = get("nicknameInput").value.trim();
      const nickError = get("nickError");

      if (nick.length < 3 || nick.length > 16) {
        nickError.textContent = "Nickname 3-16 simvol arasında olmalıdır.";
        return;
      }
      if (/[^a-zA-Z0-9_]/.test(nick)) {
        nickError.textContent = "Yalnız hərflər, rəqəmlər və _ istifadə edilə bilər.";
        return;
      }

      if (!this.account) {
        this.account = { email: null, password: null, nickname: nick };
      } else {
        this.account.nickname = nick;
      }

      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(this.account));

      // Update all accounts as well
      if (this.account.email) {
        const allAccounts = this.loadAllAccounts();
        const idx = allAccounts.findIndex(a => a.email === this.account.email);
        if (idx >= 0) {
          allAccounts[idx].nickname = nick;
          localStorage.setItem("futbol_all_accounts", JSON.stringify(allAccounts));
        }
      }

      this.goToPage("main");
    });
  }

  // ===========================
  //  HELPERS
  // ===========================
  syncFullState() {
    const get = (id) => this.root.querySelector(`#${id}`);
    if (get("teamSize")) this.state.teamSize = get("teamSize").value;
    if (get("matchTime")) this.state.matchTime = Math.min(15, Math.max(5, Number(get("matchTime").value) || 10));
    if (get("roomCode")) this.state.roomCode = get("roomCode").value.trim().toUpperCase();
    if (get("hair")) this.state.avatar.hair = get("hair").value;
    if (get("beard")) this.state.avatar.beard = get("beard").value;
    if (get("skin")) this.state.avatar.skin = get("skin").value;
    if (get("jerseyNumber")) this.state.avatar.jerseyNumber = Math.min(99, Math.max(1, Number(get("jerseyNumber").value) || 10));
  }

  syncAvatarDefaults() {
    // Use defaults if avatar not customized on play page
  }

  loadAccount() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    } catch {
      return null;
    }
  }

  loadAllAccounts() {
    try {
      return JSON.parse(localStorage.getItem("futbol_all_accounts") || "[]");
    } catch {
      return [];
    }
  }

  loadRooms() {
    try {
      return JSON.parse(localStorage.getItem(ROOM_KEY) || "{}");
    } catch {
      return {};
    }
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
