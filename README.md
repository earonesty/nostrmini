# nostrmini

Very small in-memory nostr relay server that uses a dequeue store for events

Written for tests but could also be used as a base for more complex memory routing, for example.

```
# run from the cli

yarn install
yarn start:dev

```


Or use as a lib

```
yarn add nostrmini

```

```
import NostrMini from 'nostrmini'
const srv = new NostrMini()
srv.listen(3333)
```
