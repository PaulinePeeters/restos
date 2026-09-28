// server.ts
import "dotenv/config";
import app from "./app.js";
import http from "http";
import { initSocket } from "./socket.js";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

// Initialisation de Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(
    `Serveur backend lancé sur http://0.0.0.0:${PORT} (avec Socket.io)`,
  );
});
