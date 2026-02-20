import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

interface PlayerData {
  id: string;
  name: string;
  avatar: { body: string; outfit: string; hair: string; accessory: string };
  x: number;
  y: number;
}

const isProd = process.env.NODE_ENV === "production";

const app = express();
app.use(express.json());

if (isProd) {
  // Same origin in production — no CORS needed
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
} else {
  app.use(cors());
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: isProd
    ? undefined
    : {
      origin: "*",
      methods: ["GET", "POST"],
    },
});

const players = new Map<string, PlayerData>();
const score = { left: 0, right: 0 };

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on(
    "player:join",
    (data: { avatar: { body: string; outfit: string; hair: string; accessory: string }; name: string; x: number; y: number }) => {
      console.log(`[SERVER] Received player:join from ${socket.id} with name ${data.name}`);
      const player: PlayerData = {
        id: socket.id,
        name: data.name,
        avatar: data.avatar,
        x: data.x,
        y: data.y,
      };
      players.set(socket.id, player);

      // Send existing players to the joiner
      console.log(`[SERVER] Sending players:existing to ${socket.id}, count: ${players.size}`);
      socket.emit("players:existing", Array.from(players.values()));

      // Send current score to the joiner
      socket.emit("score:sync", score);

      // Broadcast new player to everyone else
      console.log(`[SERVER] Broadcasting player:joined to others for ${socket.id}`);
      socket.broadcast.emit("player:joined", player);
    }
  );

  socket.on("player:move", (data: { x: number; y: number }) => {
    const player = players.get(socket.id);
    if (player) {
      player.x = data.x;
      player.y = data.y;
    }
    socket.broadcast.emit("player:moved", {
      id: socket.id,
      x: data.x,
      y: data.y,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);
    players.delete(socket.id);
    io.emit("player:left", { id: socket.id });
  });

  socket.on("chat:message", (data: { text: string; sender: string }) => {
    console.log(`[SERVER] Chat message from ${socket.id} (${data.sender}): ${data.text}`);
    io.emit("chat:message", { id: socket.id, text: data.text, sender: data.sender });
  });

  socket.on("goal:scored", (data: { side: "left" | "right" }) => {
    score[data.side] += 1;
    console.log(`[SERVER] Goal scored: ${data.side}. Score: L${score.left} - R${score.right}`);
    io.emit("goal:scored", data);
    io.emit("score:sync", score);
  });
});

// SPA catch-all: serve index.html for client-side routing (production only)
if (isProd) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const indexHtml = path.join(__dirname, "../../client/dist/index.html");
  app.get("/*splat", (_req, res) => {
    res.sendFile(indexHtml);
  });
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
