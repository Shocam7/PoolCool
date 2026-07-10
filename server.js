const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: "/api/socketio",
    addTrailingSlash: false,
  });

  io.on("connection", (socket) => {
    socket.on("join-city", (cityId) => {
      Array.from(socket.rooms).forEach(r => {
        if (r !== socket.id) socket.leave(r);
      });
      socket.join(cityId);
    });

    socket.on("message", (data) => {
      if (data.cityId) {
        socket.broadcast.to(data.cityId).emit("message", data);
      } else {
        socket.broadcast.emit("message", data);
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
