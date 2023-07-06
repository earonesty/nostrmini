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
let port!: number

beforeAll(async () => {
  nm = new NostrMini();
  nm.listen(0);
  port = nm.address().port;
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
  return [pk, sk];
}

function makeEvent(sk: string, opts = { kind: 1, tags: [] as string[][] }) {
  return finishEvent(
    {
      kind: opts.kind,
      created_at: Math.floor(Date.now() / 1000),
      tags: opts.tags,
      content: "nostr-tools test suite",
    },
    sk
  );
}

test("can post", () => {
  const [pk, sk] = getPubPriv();
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

test("can fetch", async () => {
  const url = `http://127.0.0.1:${port}`;
  const got = await fetch(url, {
      headers: { Accept: 'application/nostr+json' },
    })
  expect(got).toEqual({
        name: "nostrmini",
        description: "miniature nostr server",
        supported_nips: [1, 2, 11],
        software: "nostrmini",
        version: "0.1",
    }
  )
});

test("can sub twice", async () => {
  const [pk, sk] = getPubPriv();
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

test("can use 2 filters", () => {
  const [pk, sk] = getPubPriv();
  const [pk2, sk2] = getPubPriv();
  var resolve1: (value: boolean) => void;
  var resolve2: (value: boolean) => void;

  let sub = relay.sub([
    {
      kinds: [4],
      authors: [pk],
    },
    {
      kinds: [4],
      "#p": [pk],
    },
  ]);

  sub.on("event", (event) => {
    if (event.pubkey == pk) resolve1(true);
    else resolve2(true);
  });

  let event = makeEvent(sk, { kind: 4, tags: [] });
  relay.publish(event);

  event = makeEvent(sk2, { kind: 4, tags: [["p", pk]] });
  relay.publish(event);

  return expect(
    Promise.all([
      new Promise((resolve) => {
        resolve1 = resolve;
      }),
      new Promise((resolve) => {
        resolve2 = resolve;
      }),
    ])
  ).resolves.toEqual([true, true]);
});


test("can limit", async () => {
  const [pk, sk] = getPubPriv();

  await relay.publish(makeEvent(sk));
  await relay.publish(makeEvent(sk));
  await relay.publish(makeEvent(sk));
  await relay.publish(makeEvent(sk));
  await relay.publish(makeEvent(sk));

  const res = await relay.list([{kinds: [1], limit:2}])

  console.log(res)

  expect(res.length).toEqual(2)
});

