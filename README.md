# nostrmini

Very small in-memory nostr relay server that uses a dequeue store for events

Written for tests but could also be used as a base for more complex memory routing, for example.

```
# run from the cli

yarn install
yarn start:dev

```


Or use as a lib

Add to project:

```bash
yarn add nostrmini

```

Use in tests
```ts
import NostrMini from 'nostrmini'
const srv = new NostrMini()
srv.listen(0)
const port = srv.address().port
const url = `ws://127.0.0.1:${port}`

afterAll(()=>{
  srv.close()
})

```

