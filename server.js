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

// MIME types
express.static.mime.define({
    "application/javascript": ["js"],
    "model/gltf-binary": ["glb"],
    "model/gltf+json": ["gltf"],
});

// Serve static files
app.use(express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
}));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// ========== MULTIPLAYER ==========

// Room storage: { roomCode: { players: { socketId: playerData }, host: socketId, settings: {} } }
const rooms = {};

io.on("connection", (socket) => {
    console.log(`Oyunçu qoşuldu: ${socket.id}`);

    let currentRoom = null;

    // Create room
    socket.on("createRoom", (data) => {
        const code = data.code;
        if (rooms[code]) {
            socket.emit("roomError", "Bu kod artıq mövcuddur.");
            return;
        }

        rooms[code] = {
            players: {},
            host: socket.id,
            settings: {
                teamSize: data.teamSize || "3v3",
                matchTime: data.matchTime || 10,
            },
            ball: { x: 0, y: 0.225, z: 0, vx: 0, vy: 0, vz: 0 },
        };

        socket.join(code);
        currentRoom = code;

        rooms[code].players[socket.id] = {
            id: socket.id,
            nickname: data.nickname || "Oyunçu",
            avatar: data.avatar || {},
            position: { x: -5, y: 0, z: 0 },
            rotation: 0,
            velocity: { x: 0, y: 0, z: 0 },
            isHost: true,
        };

        socket.emit("roomJoined", {
            code,
            playerId: socket.id,
            isHost: true,
            players: rooms[code].players,
            settings: rooms[code].settings,
        });

        console.log(`Otaq yaradıldı: ${code} (host: ${socket.id})`);
    });

    // Join room
    socket.on("joinRoom", (data) => {
        const code = data.code;
        const room = rooms[code];

        if (!room) {
            socket.emit("roomError", "Otaq tapılmadı.");
            return;
        }

        const playerCount = Object.keys(room.players).length;
        const maxPlayers = parseInt(room.settings.teamSize) * 2 || 6;

        if (playerCount >= maxPlayers) {
            socket.emit("roomError", "Otaq doludur.");
            return;
        }

        socket.join(code);
        currentRoom = code;

        // Assign spawn position based on player index
        const spawnX = playerCount % 2 === 0 ? -5 - playerCount : 5 + playerCount;

        room.players[socket.id] = {
            id: socket.id,
            nickname: data.nickname || "Oyunçu",
            avatar: data.avatar || {},
            position: { x: spawnX, y: 0, z: 0 },
            rotation: 0,
            velocity: { x: 0, y: 0, z: 0 },
            isHost: false,
        };

        // Notify the joining player
        socket.emit("roomJoined", {
            code,
            playerId: socket.id,
            isHost: false,
            players: room.players,
            settings: room.settings,
        });

        // Notify all others in the room
        socket.to(code).emit("playerJoined", {
            id: socket.id,
            player: room.players[socket.id],
        });

        console.log(`Oyunçu qoşuldu otağa: ${code} (${socket.id}), cəmi: ${Object.keys(room.players).length}`);
    });

    // Player movement update (sent frequently)
    socket.on("playerUpdate", (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (!room.players[socket.id]) return;

        room.players[socket.id].position = data.position;
        room.players[socket.id].rotation = data.rotation;
        room.players[socket.id].velocity = data.velocity;
        room.players[socket.id].animState = data.animState;

        // Broadcast to all OTHER players in the room
        socket.to(currentRoom).emit("playerMoved", {
            id: socket.id,
            position: data.position,
            rotation: data.rotation,
            velocity: data.velocity,
            animState: data.animState,
        });
    });

    // Ball sync (only host sends this)
    socket.on("ballUpdate", (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        const room = rooms[currentRoom];
        if (room.host !== socket.id) return; // Only host can update ball

        room.ball = data;
        socket.to(currentRoom).emit("ballSync", data);
    });

    // Kick event (anyone can kick)
    socket.on("ballKick", (data) => {
        if (!currentRoom || !rooms[currentRoom]) return;
        // Broadcast kick to all including host
        io.to(currentRoom).emit("ballKicked", {
            playerId: socket.id,
            velocity: data.velocity,
            angularVelocity: data.angularVelocity,
        });
    });

    // Chat / emoji
    socket.on("chat", (msg) => {
        if (!currentRoom) return;
        io.to(currentRoom).emit("chatMsg", {
            id: socket.id,
            nickname: rooms[currentRoom]?.players[socket.id]?.nickname || "?",
            msg,
        });
    });

    // Disconnect
    socket.on("disconnect", () => {
        console.log(`Oyunçu ayrıldı: ${socket.id}`);

        if (currentRoom && rooms[currentRoom]) {
            const room = rooms[currentRoom];
            delete room.players[socket.id];

            // Notify remaining players
            socket.to(currentRoom).emit("playerLeft", { id: socket.id });

            // If room is empty, delete it
            if (Object.keys(room.players).length === 0) {
                delete rooms[currentRoom];
                console.log(`Otaq silindi: ${currentRoom}`);
            } else if (room.host === socket.id) {
                // Transfer host to next player
                const nextHost = Object.keys(room.players)[0];
                room.host = nextHost;
                room.players[nextHost].isHost = true;
                io.to(currentRoom).emit("hostChanged", { newHostId: nextHost });
                console.log(`Yeni host: ${nextHost} (otaq: ${currentRoom})`);
            }
        }
    });
});

// API endpoint to list active rooms (optional)
app.get("/api/rooms", (req, res) => {
    const roomList = Object.entries(rooms).map(([code, room]) => ({
        code,
        playerCount: Object.keys(room.players).length,
        teamSize: room.settings.teamSize,
        matchTime: room.settings.matchTime,
    }));
    res.json(roomList);
});

server.listen(PORT, () => {
    console.log(`Server işə düşdü: http://localhost:${PORT}`);
});
