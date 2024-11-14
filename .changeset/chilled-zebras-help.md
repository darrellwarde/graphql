---
"@neo4j/graphql": patch
---

Deprecate single element relationships:

```graphql
type Movie {
    director: Person @relationship(type: "DIRECTED", direction: "IN")
}
```

In favor of list relationships:

```graphql
type Movie {
    director: [Person!]! @relationship(type: "DIRECTED", direction: "IN")
}
```

1-1 relationships cannot be reliably enforced, leading to a data inconsistent between the schema and the database. For this reason, these have been removed in favor of the more accurate list relationships.
