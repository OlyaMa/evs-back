const Koa = require("koa");
const WS = require("ws");
const http = require("http");
const cors = require("@koa/cors");

const UserResponse = require("./modules/UserResponse");
const Message = require("./modules/Message");

const app = new Koa();
app.use(cors());

app.use(async (ctx, next) => {
  if (ctx.request.method !== "OPTIONS") {
    await next();

    return;
  }

  ctx.response.set("Access-Control-Allow-Origin", "*");

  ctx.response.set(
    "Access-Control-Allow-Methods",
    "DELETE, PUT, PATCH, GET, POST",
  );

  ctx.response.status = 204;
});

const server = http.createServer(app.callback());

const wsServer = new WS.Server({
  server,
});

let users = [];
const chat = [];

wsServer.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  ws.on("message", (event) => {
    const data = JSON.parse(event);
    switch (data.type) {
      case "new-user":
        if (!users.includes(data.username)) {
          users.push(data.username);
          ws.username = data.username;

          ws.send(
            JSON.stringify(new UserResponse("allowed", data.username, users)),
          );
          Array.from(wsServer.clients)
            .filter((client) => client.readyState === WS.OPEN)
            .forEach((client) => {
              client.send(
                JSON.stringify(
                  new UserResponse("incoming-user", data.username),
                ),
              );
            });

          ws.send(JSON.stringify({ type: "message", chat: chat }));
        } else {
          ws.send(JSON.stringify(new UserResponse("denied", data.username)));
        }
        break;
      case "outgoing-user":
        if (users.includes(data.username)) {
          users = users.filter((user) => {
            return user !== data.username;
          });
        }
        Array.from(wsServer.clients)
          .filter((client) => client.readyState === WS.OPEN)
          .forEach((client) => {
            client.send(
              JSON.stringify(new UserResponse("outgoing-user", data.username)),
            );
          });
        break;
      case "message":
        if (data) {
          const message = new Message(data.username, data.message);
          chat.push(message);
          const eventData = JSON.stringify({
            type: "message",
            chat: [message],
          });
          Array.from(wsServer.clients)
            .filter((client) => client.readyState === WS.OPEN)
            .forEach((client) => {
              client.send(eventData);
            });
        }
        break;
      default:
        console.log("404");
        break;
    }
  });
  ws.on("close", () => {
    users = users.filter((user) => user !== ws.username);

    Array.from(wsServer.clients)
      .filter((client) => client.readyState === WS.OPEN)
      .forEach((client) => {
        client.send(
          JSON.stringify(new UserResponse("outgoing-user", ws.username)),
        );
      });
  });
});

setInterval(function ping() {
  wsServer.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      Array.from(wsServer.clients)
        .filter((client) => client.readyState === WS.OPEN)
        .forEach((client) => {
          client.send(
            JSON.stringify(new UserResponse("outgoing-user", ws.username)),
          );
        });

      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(function noop() {});
  });
}, 30000);

server.listen(80);

app.listen(443);
