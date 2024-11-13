---
"@neo4j/graphql": patch
---

Deprecate implicit `SET`:

```graphql
mutation {
    updateMovies( update: { id: "2" }) {
        movies {
            id
        }
    }
}
```
in favour of the explicit `_SET` version:

```graphql
mutation {
    updateMovies(update: { id_SET: "2" }) {
        movies {
            id
        }
    }
}
```
