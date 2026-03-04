const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// MIME types for special files
express.static.mime.define({
    "application/javascript": ["js"],
    "model/gltf-binary": ["glb"],
    "model/gltf+json": ["gltf"],
});

// Serve all static files from root directory
app.use(express.static(path.join(__dirname), {
    // Cache for 1 hour in production
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
}));

// Fallback to index.html for SPA-like behavior
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server işə düşdü: http://localhost:${PORT}`);
});
