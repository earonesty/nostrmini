import express from "express";
import { Router } from "express";
import WebSocket from "ws";
import { matchFilter, Event, Filter } from "nostr-tools";
import { EventEmitter } from "node:events";
const Dequeue = require("double-ended-queue");

type Listener = (event: Event) => void;
let emitter = new EventEmitter();
let store = new Dequeue();

export default class App {
  public server;
  public ws;
  public listener: any = null;
  public maxEvents: number;

  constructor(opts: any = {}) {
    this.server = express();
    this.ws = require("express-ws")(this.server);
    this.middlewares();
    const maxEvents = opts.max_events || 10000;
    const routes: any = Router();

    routes.get("/", (req: any, res: any) => {
      const js = opts.nip11 ?? {
        name: "nostrmini",
        description: "miniature nostr server",
        supported_nips: [1, 2, 11],
        software: "nostrmini",
        version: "0.1",
      };
      return res.json(js);
    });

    routes.ws("/", (ws: WebSocket, req: any) => {
      const subs = new Map<string, Listener>();

      ws.on("close", () => {
        subs.forEach((listener) => {
          emitter.off("event", listener);
        });
      });

      ws.on("message", function (msg: any) {
        let js;
        try {
          js = JSON.parse(msg);
        } catch (e) {
          ws.send(JSON.stringify(["NOTICE", "invalid message"]));
          ws.close();
        }
        switch (js[0]) {
          case "EVENT":
            handleEvent(ws, js[1], maxEvents);
            return;
          case "REQ":
            handleReq(ws, subs, js[1], js.slice(2));
            return;
          case "CLOSE":
            handleClose(ws, subs, js[1]);
            return;
        }
      });
    });

    this.server.use(routes);
  }

  middlewares() {
    this.server.use(express.json());
  }

  listen(port?: number) {
    this.listener = this.server.listen(port);
    return this.listener;
  }

  address() {
    return this.listener.address();
  }

  close() {
    return this.listener.close();
  }
}

function handleEvent(ws: WebSocket, event: Event, maxEvents: number) {
  ws.send(JSON.stringify(["OK", event.id, true, ""]));
  emitter.emit("event", event);
  store.push(event);
  if (store.length > maxEvents) {
    store.shift();
  }
}

function handleReq(
  ws: WebSocket,
  subs: Map<string, Listener>,
  sub: string,
  filters: Filter[]
) {
  const listener = (event: Event) => {
    if (filters.some((f) => matchFilter(f, event))) {
      ws.send(JSON.stringify(["EVENT", sub, event]));
    }
  };

  for (let i = 0; i < store.length; ++i) {
    const ev: Event = store.get(i);
    if (filters.some((f) => matchFilter(f, ev))) {
      ws.send(JSON.stringify(["EVENT", sub, ev]));
    }
  }

  ws.send(JSON.stringify(["EOSE", sub]));

  subs.set(sub, listener);
  emitter.on("event", listener);
}

function handleClose(ws: WebSocket, subs: Map<string, Listener>, sub: string) {
  const listener = subs.get(sub);
  if (listener) {
    emitter.off("event", listener);
  }
}
