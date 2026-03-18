const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

const PORT = process.env.PORT || 5000;
const TEAM_KEYS = ["blue", "red"];
const MATCH_TIME_OPTIONS = [3, 5, 10, 15];
const rooms = {};
const BALL_OWNER_TIMEOUT_MS = 350;

express.static.mime.define({
    "application/javascript": ["js"],
    "model/fbx": ["fbx"],
    "model/gltf-binary": ["glb"],
    "model/gltf+json": ["gltf"],
});

app.use(express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
}));

app.use((req, res, next) => {
    if (
        req.path === "/" ||
        req.path.endsWith(".html") ||
        req.path.endsWith(".js") ||
        req.path.endsWith(".css")
    ) {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
    }
    next();
});

function parseTeamSize(teamSize) {
    const size = Number(String(teamSize || "3v3").split("v")[0]);
    return Number.isFinite(size) && size > 0 ? size : 3;
}

function normalizeKeeperSettings(input = {}) {
    const holdSeconds = Number(input.keeperHoldSeconds);
    return {
        goalkeepersEnabled: input.goalkeepersEnabled !== false,
        goalSweeper: input.goalSweeper !== false,
        keeperCatchMode: input.keeperCatchMode === "hold" ? "hold" : "toggle",
        keeperDiveAssist: ["high", "balanced", "manual"].includes(input.keeperDiveAssist)
            ? input.keeperDiveAssist
            : "balanced",
        keeperHoldSeconds: Number.isFinite(holdSeconds)
            ? Math.min(8, Math.max(3, Math.round(holdSeconds)))
            : 5,
        keeperDistribution: ["hybrid", "throw", "punt"].includes(input.keeperDistribution)
            ? input.keeperDistribution
            : "hybrid",
    };
}

function getTeamPlayers(room, team) {
    return Object.values(room.players).filter((player) => player.team === team);
}

function isTeamFull(room, team) {
    return getTeamPlayers(room, team).length >= parseTeamSize(room.settings.teamSize);
}

function teamHasGoalkeeper(room, team) {
    return getTeamPlayers(room, team).some((player) => player.role === "goalkeeper");
}

function buildSpawnPosition(room, team, role) {
    const teamPlayers = getTeamPlayers(room, team);
    const fieldIndex = teamPlayers.filter((player) => player.role !== "goalkeeper").length;
    const isBlue = team === "blue";
    const defenderX = isBlue ? -40.6 : 40.6;
    const midfieldX = isBlue ? -10.5 : 10.5;
    const laneZ = [0, -8, 8, -16, 16, -23, 23];

    if (role === "goalkeeper") {
        return { x: defenderX, y: 0, z: 0 };
    }

    const row = Math.floor(fieldIndex / 2);
    return {
        x: midfieldX + (isBlue ? -1 : 1) * row * 3.1,
        y: 0,
        z: laneZ[fieldIndex % laneZ.length] ?? 0,
    };
}

function createRoomSettings(data = {}) {
    const matchTime = Number(data.matchTime);
    const allowedSizes = ["3v3", "4v4", "5v5"];
    return {
        teamSize: allowedSizes.includes(data.teamSize) ? data.teamSize : "3v3",
        matchTime: MATCH_TIME_OPTIONS.includes(matchTime) ? matchTime : 10,
        ...normalizeKeeperSettings(data),
    };
}

function buildMatchPayload(room) {
    const match = room.match || {};
    return {
        state: match.state || "lobby",
        startedAt: match.startedAt || null,
        matchTime: match.matchTime || room.settings.matchTime || 10,
    };
}

function getReadyStats(room) {
    const players = Object.values(room.players || {});
    const ready = players.filter((p) => p.ready).length;
    return { ready, total: players.length };
}

function broadcastReadyStats(code, room) {
    io.to(code).emit("readyStats", getReadyStats(room));
}

function canAcceptBallUpdate(room, socketId, now) {
    if (!room.ballOwner) return true;
    if (room.ballOwner === socketId) return true;
    const lastAt = room.ballOwnerAt || 0;
    return now - lastAt > BALL_OWNER_TIMEOUT_MS;
}

function scheduleMatchEnd(code, room) {
    if (room.match?.timer) clearTimeout(room.match.timer);
    const durationMs = (room.match?.matchTime || room.settings.matchTime || 10) * 60 * 1000;
    room.match.timer = setTimeout(() => {
        if (!rooms[code]) return;
        rooms[code].match.state = "lobby";
        rooms[code].match.startedAt = null;
        rooms[code].match.timer = null;
        Object.values(rooms[code].players || {}).forEach((player) => {
            player.ready = false;
        });
        io.to(code).emit("roomState", buildMatchPayload(rooms[code]));
        broadcastReadyStats(code, rooms[code]);
    }, durationMs);
}

function createPlayerPayload(socketId, data, room, team, role, isHost) {
    return {
        id: socketId,
        nickname: data.nickname || "Oyuncu",
        avatar: data.avatar || {},
        team,
        role,
        preferredTeam: team,
        preferredRole: data.preferredRole === "goalkeeper" ? "goalkeeper" : "field",
        position: buildSpawnPosition(room, team, role),
        rotation: 0,
        velocity: { x: 0, y: 0, z: 0 },
        animState: {},
        isHost: !!isHost,
        ready: false,
    };
}

io.on("connection", (socket) => {
    console.log(`Oyuncu qosuldu: ${socket.id}`);
    let currentRoom = null;

    socket.on("createRoom", (data = {}) => {
        const code = String(data.code || "").trim().toUpperCase();
        if (!code) {
            socket.emit("roomError", "Otaq kodu bos ola bilmez.");
            return;
        }
        if (rooms[code]) {
            socket.emit("roomError", "Bu kod artiq movcuddur.");
            return;
        }

        const team = TEAM_KEYS.includes(data.preferredTeam) ? data.preferredTeam : "blue";
        const requestedRole = data.preferredRole === "goalkeeper" ? "goalkeeper" : "field";
        const settings = createRoomSettings(data);
        const role = settings.goalkeepersEnabled && requestedRole === "goalkeeper"
            ? "goalkeeper"
            : "field";

        rooms[code] = {
            players: {},
            host: socket.id,
            settings,
            password: String(data.password || "").trim(),
            ball: { x: 0, y: 0.225, z: 0, vx: 0, vy: 0, vz: 0 },
            ballOwner: null,
            ballOwnerAt: 0,
            match: { state: "lobby", startedAt: null, matchTime: settings.matchTime, timer: null },
        };

        socket.join(code);
        currentRoom = code;

        rooms[code].players[socket.id] = createPlayerPayload(socket.id, data, rooms[code], team, role, true);

        socket.emit("roomJoined", {
            code,
            playerId: socket.id,
            isHost: true,
            players: rooms[code].players,
            settings: rooms[code].settings,
            match: buildMatchPayload(rooms[code]),
            ball: rooms[code].ball,
            ballOwner: rooms[code].ballOwner,
            readyStats: getReadyStats(rooms[code]),
        });

        broadcastReadyStats(code, rooms[code]);

        console.log(`Otaq yaradildi: ${code} (host: ${socket.id})`);
    });

    socket.on("joinRoom", (data = {}) => {
        const code = String(data.code || "").trim().toUpperCase();
        const room = rooms[code];
        if (!room) {
            socket.emit("roomError", "Otaq tapilmadi.");
            return;
        }

        const requiredPassword = room.password || "";
        if (requiredPassword && String(data.password || "").trim() !== requiredPassword) {
            socket.emit("roomError", "Otaq sifresi sehvdir.");
            return;
        }

        const playerCount = Object.keys(room.players).length;
        const maxPlayers = parseTeamSize(room.settings.teamSize) * 2;
        if (playerCount >= maxPlayers) {
            socket.emit("roomError", "Otaq doludur.");
            return;
        }

        const team = TEAM_KEYS.includes(data.preferredTeam) ? data.preferredTeam : "blue";
        const requestedRole = data.preferredRole === "goalkeeper" ? "goalkeeper" : "field";

        if (isTeamFull(room, team)) {
            socket.emit("roomError", "Secdiyin komanda doludur.");
            return;
        }

        if (
            requestedRole === "goalkeeper" &&
            room.settings.goalkeepersEnabled !== false &&
            teamHasGoalkeeper(room, team)
        ) {
            socket.emit("roomError", "Bu komandada qapici slotu artiq doludur.");
            return;
        }

        const role = room.settings.goalkeepersEnabled !== false && requestedRole === "goalkeeper"
            ? "goalkeeper"
            : "field";

        socket.join(code);
        currentRoom = code;
        room.players[socket.id] = createPlayerPayload(socket.id, data, room, team, role, false);

        socket.emit("roomJoined", {
            code,
            playerId: socket.id,
            isHost: false,
            players: room.players,
            settings: room.settings,
            match: buildMatchPayload(room),
            ball: room.ball,
            ballOwner: room.ballOwner,
            readyStats: getReadyStats(room),
        });

        socket.to(code).emit("playerJoined", {
            id: socket.id,
            player: room.players[socket.id],
        });

        broadcastReadyStats(code, room);

        console.log(`Oyuncu otaqa qosuldu: ${code} (${socket.id})`);
    });

    socket.on("playerUpdate", (data = {}) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players[socket.id];
        if (!player) return;

        player.position = data.position || player.position;
        player.rotation = data.rotation ?? player.rotation;
        player.velocity = data.velocity || player.velocity;
        player.animState = data.animState || player.animState;

        socket.to(currentRoom).emit("playerMoved", {
            id: socket.id,
            position: player.position,
            rotation: player.rotation,
            velocity: player.velocity,
            animState: player.animState,
            team: player.team,
            role: player.role,
        });
    });

    socket.on("ballUpdate", (data = {}) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const now = Date.now();
        if (!canAcceptBallUpdate(room, socket.id, now)) return;
        room.ball = {
            x: data.x ?? room.ball.x,
            y: data.y ?? room.ball.y,
            z: data.z ?? room.ball.z,
            vx: data.vx ?? room.ball.vx,
            vy: data.vy ?? room.ball.vy,
            vz: data.vz ?? room.ball.vz,
        };
        const player = room.players[socket.id];
        let ownerId = socket.id;
        if (player?.position) {
            const dx = (player.position.x || 0) - room.ball.x;
            const dz = (player.position.z || 0) - room.ball.z;
            const distSq = dx * dx + dz * dz;
            const closeControl = distSq <= 3.2 * 3.2 && room.ball.y <= 1.4;
            ownerId = closeControl ? socket.id : null;
        }
        room.ballOwner = ownerId;
        room.ballOwnerAt = now;
        socket.to(currentRoom).emit("ballSync", {
            ...room.ball,
            ownerId: room.ballOwner,
            ts: now,
        });
    });

    socket.on("ballKick", (data = {}) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const now = Date.now();
        const pos = data.position || {};
        room.ball = {
            x: Number.isFinite(pos.x) ? pos.x : room.ball.x,
            y: Number.isFinite(pos.y) ? pos.y : room.ball.y,
            z: Number.isFinite(pos.z) ? pos.z : room.ball.z,
            vx: data.velocity?.x ?? room.ball.vx,
            vy: data.velocity?.y ?? room.ball.vy,
            vz: data.velocity?.z ?? room.ball.vz,
        };
        room.ballOwner = null;
        room.ballOwnerAt = now;
        io.to(currentRoom).emit("ballKicked", {
            playerId: socket.id,
            position: { x: room.ball.x, y: room.ball.y, z: room.ball.z },
            velocity: data.velocity,
            angularVelocity: data.angularVelocity,
        });
    });

    socket.on("toggleReady", () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players[socket.id];
        if (!player) return;
        player.ready = !player.ready;
        io.to(currentRoom).emit("playerReady", {
            id: socket.id,
            ready: player.ready,
            readyStats: getReadyStats(room),
        });
    });

    socket.on("changeSlot", (data = {}) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        const player = room.players[socket.id];
        if (!player) return;
        if (room.match?.state === "live") return;

        const team = TEAM_KEYS.includes(data.team) ? data.team : player.team;
        const requestedRole = data.role === "goalkeeper" ? "goalkeeper" : "field";
        if (team !== player.team && isTeamFull(room, team)) {
            socket.emit("roomError", "Secdiyin komanda doludur.");
            return;
        }
        if (
            requestedRole === "goalkeeper" &&
            room.settings.goalkeepersEnabled !== false &&
            teamHasGoalkeeper(room, team) &&
            !(player.role === "goalkeeper" && player.team === team)
        ) {
            socket.emit("roomError", "Bu komandada qapici slotu artiq doludur.");
            return;
        }

        player.team = team;
        player.role = room.settings.goalkeepersEnabled !== false && requestedRole === "goalkeeper" ? "goalkeeper" : "field";
        player.preferredTeam = team;
        player.preferredRole = player.role;
        player.position = buildSpawnPosition(room, player.team, player.role);
        player.ready = false;

        io.to(currentRoom).emit("playerSlotChanged", {
            id: socket.id,
            player,
            readyStats: getReadyStats(room),
        });
    });

    socket.on("callBall", (data = {}) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (room.match?.state === "live") return;
        const x = Number(data.x) || 0;
        const y = Number(data.y) || 0.22;
        const z = Number(data.z) || 0;
        room.ball = { x, y, z, vx: 0, vy: 0, vz: 0 };
        room.ballOwner = null;
        room.ballOwnerAt = Date.now();
        io.to(currentRoom).emit("ballCalled", { x, y, z });
    });

    socket.on("startMatch", () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (room.host !== socket.id) return;
        if (room.match?.state === "live") return;
        const stats = getReadyStats(room);
        if (stats.total > 1 && stats.ready < stats.total) {
            socket.emit("roomError", "Herkes hazir deyil.");
            return;
        }
        room.match.state = "live";
        room.match.startedAt = Date.now();
        room.match.matchTime = room.settings.matchTime || 10;
        scheduleMatchEnd(currentRoom, room);
        io.to(currentRoom).emit("roomState", buildMatchPayload(room));
    });

    socket.on("endMatch", () => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (room.host !== socket.id) return;
        if (room.match?.timer) {
            clearTimeout(room.match.timer);
            room.match.timer = null;
        }
        room.match.state = "lobby";
        room.match.startedAt = null;
        Object.values(room.players || {}).forEach((p) => {
            p.ready = false;
        });
        io.to(currentRoom).emit("roomState", buildMatchPayload(room));
        broadcastReadyStats(currentRoom, room);
    });

    socket.on("chat", (msg) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        io.to(currentRoom).emit("chatMsg", {
            id: socket.id,
            nickname: rooms[currentRoom].players[socket.id]?.nickname || "?",
            msg,
        });
    });

    socket.on("disconnect", () => {
        console.log(`Oyuncu ayrildi: ${socket.id}`);
        if (!currentRoom || !rooms[currentRoom]) return;

        const room = rooms[currentRoom];
        if (room.ballOwner === socket.id) {
            room.ballOwner = null;
            room.ballOwnerAt = Date.now();
        }
        delete room.players[socket.id];
        socket.to(currentRoom).emit("playerLeft", { id: socket.id });
        broadcastReadyStats(currentRoom, room);

        if (Object.keys(room.players).length === 0) {
            if (room.match?.timer) clearTimeout(room.match.timer);
            delete rooms[currentRoom];
            console.log(`Otaq silindi: ${currentRoom}`);
            return;
        }

        if (room.host === socket.id) {
            const nextHost = Object.keys(room.players)[0];
            room.host = nextHost;
            room.players[nextHost].isHost = true;
            io.to(currentRoom).emit("hostChanged", { newHostId: nextHost });
        }
    });
});

app.get("/api/rooms", (req, res) => {
    const roomList = Object.entries(rooms).map(([code, room]) => ({
        code,
        playerCount: Object.keys(room.players).length,
        teamSize: room.settings.teamSize,
        matchTime: room.settings.matchTime,
        goalkeepersEnabled: room.settings.goalkeepersEnabled,
        hasPassword: !!room.password,
        state: room.match?.state || "lobby",
    }));
    res.json(roomList);
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(PORT, () => {
    console.log(`Server isleyir: http://localhost:${PORT}`);
});
