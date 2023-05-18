import "websocket-polyfill";

import NostrMini from "../src";

import {
  Relay,
  relayInit,
  generatePrivateKey,
  getPublicKey,
  finishEvent,
} from "nostr-tools";

let nm!: NostrMini;
let relay!: Relay;

beforeAll(async () => {
  nm = new NostrMini();
  nm.listen(0);
  const port = nm.address().port;
  const url = `ws://127.0.0.1:${port}`;
  relay = relayInit(url);
  relay.connect();
});

afterAll(async () => {
  relay.close();
  nm.close();
});

function getPubPriv() {
  const sk = generatePrivateKey();
  const pk = getPublicKey(sk);
  return { pk, sk };
}

function makeEvent(sk: string) {
  return finishEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: "nostr-tools test suite",
    },
    sk
  );
}

test("can post", () => {
  const { pk, sk } = getPubPriv();
  var resolve1: (value: boolean) => void;

  let sub = relay.sub([
    {
      kinds: [1],
      authors: [pk],
    },
  ]);

  sub.on("event", (event) => {
    resolve1(true);
  });

  let event = makeEvent(sk);

  relay.publish(event);
  return expect(
    Promise.all([
      new Promise((resolve) => {
        resolve1 = resolve;
      }),
    ])
  ).resolves.toEqual([true]);
});

test("can sub twice", async () => {
  const { pk, sk } = getPubPriv();
  var resolve1: (value: boolean) => void;
  var resolve2: (value: boolean) => void;

  let event = makeEvent(sk);

  relay.publish(event);

  let sub1 = relay.sub([
    {
      kinds: [1],
      authors: [pk],
    },
  ]);

  let sub2 = relay.sub([
    {
      kinds: [1],
      authors: [pk],
    },
  ]);

  sub1.on("event", (event) => {
    resolve1(true);
  });

  sub2.on("event", (event) => {
    resolve2(true);
  });

  const ok1 = await new Promise((resolve) => {
    resolve1 = resolve;
  });

  const ok2 = await new Promise((resolve) => {
    resolve2 = resolve;
  });

  expect(ok1 && ok2).toBeTruthy();
});
