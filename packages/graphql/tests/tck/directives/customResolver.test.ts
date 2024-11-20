/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Neo4jGraphQL } from "../../../src";
import { formatCypher, formatParams, translateQuery } from "../utils/tck-test-utils";

describe("@customResolver directive", () => {
    let typeDefs: string;
    let neoSchema: Neo4jGraphQL;

    describe("Require fields on same type", () => {
        beforeAll(() => {
            typeDefs = /* GraphQL */ `
                type User @node {
                    firstName: String!
                    lastName: String!
                    fullName: String! @customResolver(requires: "firstName lastName")
                }
            `;

            const resolvers = {
                User: {
                    fullName: () => "The user's full name",
                },
            };

            neoSchema = new Neo4jGraphQL({
                typeDefs,
                resolvers,
            });
        });

        test("should not fetch required fields if @customResolver field is not selected", async () => {
            const query = /* GraphQL */ `
                {
                    users {
                        firstName
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:User)
                RETURN this { .firstName } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not over fetch when all required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    users {
                        firstName
                        lastName
                        fullName
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:User)
                RETURN this { .firstName, .lastName, .fullName } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not over fetch when some required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    users {
                        firstName
                        fullName
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:User)
                RETURN this { .firstName, .fullName, .lastName } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not over fetch when no required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    users {
                        fullName
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:User)
                RETURN this { .fullName, .firstName, .lastName } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });
    });

    describe("No required fields", () => {
        beforeAll(() => {
            typeDefs = /* GraphQL */ `
                type User @node {
                    firstName: String!
                    lastName: String!
                    fullName: String! @customResolver
                }
            `;

            const resolvers = {
                User: {
                    fullName: () => "The user's full name",
                },
            };

            neoSchema = new Neo4jGraphQL({
                typeDefs,
                resolvers,
            });
        });

        test("should not over fetch when other fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    users {
                        firstName
                        fullName
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:User)
                RETURN this { .firstName, .fullName } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not over fetch when no other fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    users {
                        fullName
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:User)
                RETURN this { .fullName } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });
    });

    describe("Require fields on nested unions", () => {
        beforeAll(() => {
            typeDefs = /* GraphQL */ `
                union Publication = Book | Journal

                type Author @node {
                    name: String!
                    publications: [Publication!]! @relationship(type: "WROTE", direction: OUT)
                    publicationsWithAuthor: [String!]!
                        @customResolver(
                            requires: "name publications { ...on Book { title } ... on Journal { subject } }"
                        )
                }

                type Book @node {
                    title: String!
                    author: [Author!]! @relationship(type: "WROTE", direction: IN)
                }

                type Journal @node {
                    subject: String!
                    author: [Author!]! @relationship(type: "WROTE", direction: IN)
                }
            `;

            const resolvers = {
                Author: {
                    publicationsWithAuthor: () => "Some custom resolver",
                },
            };

            neoSchema = new Neo4jGraphQL({
                typeDefs,
                resolvers,
            });
        });

        test("should not over fetch when all required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    authors {
                        name
                        publicationsWithAuthor
                        publications {
                            ... on Book {
                                title
                            }
                            ... on Journal {
                                subject
                            }
                        }
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Author)
                CALL {
                    WITH this
                    CALL {
                        WITH *
                        MATCH (this)-[this0:WROTE]->(this1:Book)
                        WITH this1 { .title, __resolveType: \\"Book\\", __id: id(this1) } AS this1
                        RETURN this1 AS var2
                        UNION
                        WITH *
                        MATCH (this)-[this3:WROTE]->(this4:Journal)
                        WITH this4 { .subject, __resolveType: \\"Journal\\", __id: id(this4) } AS this4
                        RETURN this4 AS var2
                    }
                    WITH var2
                    RETURN collect(var2) AS var2
                }
                RETURN this { .name, .publicationsWithAuthor, publications: var2 } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not fetch required fields if @customResolver field is not selected", async () => {
            const query = /* GraphQL */ `
                {
                    authors {
                        name
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Author)
                RETURN this { .name } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not over fetch when some required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    authors {
                        publicationsWithAuthor
                        publications {
                            ... on Book {
                                title
                            }
                        }
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Author)
                CALL {
                    WITH this
                    CALL {
                        WITH *
                        MATCH (this)-[this0:WROTE]->(this1:Book)
                        WITH this1 { .title, __resolveType: \\"Book\\", __id: id(this1) } AS this1
                        RETURN this1 AS var2
                        UNION
                        WITH *
                        MATCH (this)-[this3:WROTE]->(this4:Journal)
                        WITH this4 { .subject, __resolveType: \\"Journal\\", __id: id(this4) } AS this4
                        RETURN this4 AS var2
                    }
                    WITH var2
                    RETURN collect(var2) AS var2
                }
                RETURN this { .publicationsWithAuthor, .name, publications: var2 } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not over fetch when no required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    authors {
                        publicationsWithAuthor
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Author)
                CALL {
                    WITH this
                    CALL {
                        WITH *
                        MATCH (this)-[this0:WROTE]->(this1:Book)
                        WITH this1 { .title, __resolveType: \\"Book\\", __id: id(this1) } AS this1
                        RETURN this1 AS var2
                        UNION
                        WITH *
                        MATCH (this)-[this3:WROTE]->(this4:Journal)
                        WITH this4 { .subject, __resolveType: \\"Journal\\", __id: id(this4) } AS this4
                        RETURN this4 AS var2
                    }
                    WITH var2
                    RETURN collect(var2) AS var2
                }
                RETURN this { .publicationsWithAuthor, .name, publications: var2 } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });
    });

    describe("Require fields on nested interfaces", () => {
        beforeAll(() => {
            typeDefs = /* GraphQL */ `
                interface Publication {
                    publicationYear: Int!
                }

                type Author @node {
                    name: String!
                    publications: [Publication!]! @relationship(type: "WROTE", direction: OUT)
                    publicationsWithAuthor: [String!]!
                        @customResolver(
                            requires: "name publications { publicationYear ...on Book { title } ... on Journal { subject } }"
                        )
                }

                type Book implements Publication @node {
                    title: String!
                    publicationYear: Int!
                    author: [Author!]! @relationship(type: "WROTE", direction: IN)
                }

                type Journal implements Publication @node {
                    subject: String!
                    publicationYear: Int!
                    author: [Author!]! @relationship(type: "WROTE", direction: IN)
                }
            `;

            const resolvers = {
                Author: {
                    publicationsWithAuthor: () => "Some custom resolver",
                },
            };

            neoSchema = new Neo4jGraphQL({
                typeDefs,
                resolvers,
            });
        });

        test("should not over fetch when all required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    authors {
                        name
                        publicationsWithAuthor
                        publications {
                            publicationYear
                            ... on Book {
                                title
                            }
                            ... on Journal {
                                subject
                            }
                        }
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Author)
                CALL {
                    WITH this
                    CALL {
                        WITH *
                        MATCH (this)-[this0:WROTE]->(this1:Book)
                        WITH this1 { .publicationYear, .title, __resolveType: \\"Book\\", __id: id(this1) } AS this1
                        RETURN this1 AS var2
                        UNION
                        WITH *
                        MATCH (this)-[this3:WROTE]->(this4:Journal)
                        WITH this4 { .publicationYear, .subject, __resolveType: \\"Journal\\", __id: id(this4) } AS this4
                        RETURN this4 AS var2
                    }
                    WITH var2
                    RETURN collect(var2) AS var2
                }
                RETURN this { .name, .publicationsWithAuthor, publications: var2 } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not fetch required fields if @customResolver field is not selected", async () => {
            const query = /* GraphQL */ `
                {
                    authors {
                        name
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Author)
                RETURN this { .name } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not over fetch when some required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    authors {
                        publicationsWithAuthor
                        publications {
                            ... on Book {
                                title
                            }
                        }
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Author)
                CALL {
                    WITH this
                    CALL {
                        WITH *
                        MATCH (this)-[this0:WROTE]->(this1:Book)
                        WITH this1 { .publicationYear, .title, __resolveType: \\"Book\\", __id: id(this1) } AS this1
                        RETURN this1 AS var2
                        UNION
                        WITH *
                        MATCH (this)-[this3:WROTE]->(this4:Journal)
                        WITH this4 { .publicationYear, .subject, __resolveType: \\"Journal\\", __id: id(this4) } AS this4
                        RETURN this4 AS var2
                    }
                    WITH var2
                    RETURN collect(var2) AS var2
                }
                RETURN this { .publicationsWithAuthor, .name, publications: var2 } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });

        test("should not over fetch when no required fields are manually selected", async () => {
            const query = /* GraphQL */ `
                {
                    authors {
                        publicationsWithAuthor
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Author)
                CALL {
                    WITH this
                    CALL {
                        WITH *
                        MATCH (this)-[this0:WROTE]->(this1:Book)
                        WITH this1 { .publicationYear, .title, __resolveType: \\"Book\\", __id: id(this1) } AS this1
                        RETURN this1 AS var2
                        UNION
                        WITH *
                        MATCH (this)-[this3:WROTE]->(this4:Journal)
                        WITH this4 { .publicationYear, .subject, __resolveType: \\"Journal\\", __id: id(this4) } AS this4
                        RETURN this4 AS var2
                    }
                    WITH var2
                    RETURN collect(var2) AS var2
                }
                RETURN this { .publicationsWithAuthor, .name, publications: var2 } AS this"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`"{}"`);
        });
    });
});
