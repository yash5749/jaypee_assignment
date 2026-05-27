import http from "http";
import app from "./app";
import { env } from "./config/env";
import { initSockets } from "./sockets";

const server = http.createServer(app);
initSockets(server);

server.listen(env.port, () => {
  console.log(`Server listening on port ${env.port}`);
});
