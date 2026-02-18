import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

interface PlayerData {
  id: string;
  name: string;
  avatar: string;
  x: number;
  y: number;
}

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow any localhost port (Vite auto-increments)
      if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  },
});

const players = new Map<string, PlayerData>();

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on(
    "player:join",
    (data: { avatar: string; name: string; x: number; y: number }) => {
      const player: PlayerData = {
        id: socket.id,
        name: data.name,
        avatar: data.avatar,
        x: data.x,
        y: data.y,
      };
      players.set(socket.id, player);

      // Send existing players to the joiner
      socket.emit("players:existing", Array.from(players.values()));

      // Broadcast new player to everyone else
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
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
