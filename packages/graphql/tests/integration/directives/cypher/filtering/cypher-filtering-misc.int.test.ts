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

import { TestHelper } from "../../../../utils/tests-helper";

describe("cypher directive filtering - Misc", () => {
    const testHelper = new TestHelper();

    afterEach(async () => {
        await testHelper.close();
    });

    test("With relationship filter (non-Cypher field)", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                custom_field: String
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS s
                        """
                        columnName: "s"
                    )
                actors: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN)
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]! @relationship(type: "ACTED_IN", direction: OUT)
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix", custom_data: "hello world!" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded", custom_data: "goodbye world!" })
            CREATE (m3:${Movie} { title: "The Matrix Revolutions", custom_data: "world!" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a)-[:ACTED_IN]->(m3)
            CREATE (a2)-[:ACTED_IN]->(m3)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(
                    where: {
                        custom_field: "hello world!"
                        actors_SOME: {
                            name: "Keanu Reeves"
                        } 
                    }
                ) {
                    custom_field
                    title
                    actors {
                        name
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: [
                {
                    custom_field: "hello world!",
                    title: "The Matrix",
                    actors: expect.toIncludeSameMembers([
                        {
                            name: "Keanu Reeves",
                        },
                        {
                            name: "Carrie-Anne Moss",
                        },
                    ]),
                },
            ],
        });
    });

    test("In a nested filter", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                custom_field: String
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS s
                        """
                        columnName: "s"
                    )
                actors: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN)
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]! @relationship(type: "ACTED_IN", direction: OUT)
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix", custom_data: "hello world!" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded", custom_data: "goodbye world!" })
            CREATE (m3:${Movie} { title: "The Matrix Revolutions", custom_data: "world!" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a)-[:ACTED_IN]->(m3)
            CREATE (a2)-[:ACTED_IN]->(m3)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Actor.plural} {
                    name
                    movies(where: { custom_field: "hello world!"}) {
                        title
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Actor.plural]: expect.toIncludeSameMembers([
                {
                    name: "Keanu Reeves",
                    movies: [
                        {
                            title: "The Matrix",
                        },
                    ],
                },
                {
                    name: "Carrie-Anne Moss",
                    movies: [
                        {
                            title: "The Matrix",
                        },
                    ],
                },
            ]),
        });
    });

    test("With a nested filter", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                custom_field: String
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS s
                        """
                        columnName: "s"
                    )
                actors: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN)
            }

            type ${Actor} @node {
                name: String
                movies: [${Movie}!]! @relationship(type: "ACTED_IN", direction: OUT)
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix", custom_data: "hello world!" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded", custom_data: "goodbye world!" })
            CREATE (m3:${Movie} { title: "The Matrix Revolutions", custom_data: "world!" })
            CREATE (a:${Actor} { name: "Keanu Reeves" })
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a)-[:ACTED_IN]->(m3)
            CREATE (a2)-[:ACTED_IN]->(m3)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(where: { custom_field: "hello world!" }) {
                    title
                    actors(where: { name: "Keanu Reeves" }) {
                        name
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: expect.toIncludeSameMembers([
                {
                    title: "The Matrix",
                    actors: [
                        {
                            name: "Keanu Reeves",
                        },
                    ],
                },
            ]),
        });
    });

    test("With several cypher fields", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                custom_field: String
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_text AS s
                        """
                        columnName: "s"
                    )
                another_custom_field: Int
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_number as i
                        """
                        columnName: "i"
                    )
                actors: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN)
            }

            type ${Actor} @node {
                name: String
                another_custom_field: String
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS s
                        """
                        columnName: "s"
                    )
                movies: [${Movie}!]! @relationship(type: "ACTED_IN", direction: OUT)
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix", custom_text: "hello world!", custom_number: 100 })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded", custom_text: "goodbye world!", custom_number: 50 })
            CREATE (m3:${Movie} { title: "The Matrix Revolutions", custom_text: "world!", custom_number: 0 })
            CREATE (a:${Actor} { name: "Keanu Reeves", custom_data: "goodbye!" })
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss", custom_data: "hello!" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a)-[:ACTED_IN]->(m3)
            CREATE (a2)-[:ACTED_IN]->(m3)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(where: { custom_field: "hello world!", another_custom_field_GT: 50 }) {
                    title
                    actors {
                        name
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: [
                {
                    title: "The Matrix",
                    actors: expect.toIncludeSameMembers([
                        {
                            name: "Keanu Reeves",
                        },
                        {
                            name: "Carrie-Anne Moss",
                        },
                    ]),
                },
            ],
        });
    });

    test("With two cypher fields, one nested", async () => {
        const Movie = testHelper.createUniqueType("Movie");
        const Actor = testHelper.createUniqueType("Actor");

        const typeDefs = /* GraphQL */ `
            type ${Movie} @node {
                title: String
                custom_field: String
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_text AS s
                        """
                        columnName: "s"
                    )
                actors: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN)
            }

            type ${Actor} @node {
                name: String
                another_custom_field: String
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS s
                        """
                        columnName: "s"
                    )
                movies: [${Movie}!]! @relationship(type: "ACTED_IN", direction: OUT)
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
            CREATE (m:${Movie} { title: "The Matrix", custom_text: "hello world!" })
            CREATE (m2:${Movie} { title: "The Matrix Reloaded", custom_text: "goodbye world!" })
            CREATE (m3:${Movie} { title: "The Matrix Revolutions", custom_text: "world!" })
            CREATE (a:${Actor} { name: "Keanu Reeves", custom_data: "goodbye!" })
            CREATE (a2:${Actor} { name: "Carrie-Anne Moss", custom_data: "hello!" })
            CREATE (a)-[:ACTED_IN]->(m)
            CREATE (a2)-[:ACTED_IN]->(m)
            CREATE (a)-[:ACTED_IN]->(m2)
            CREATE (a2)-[:ACTED_IN]->(m2)
            CREATE (a)-[:ACTED_IN]->(m3)
            CREATE (a2)-[:ACTED_IN]->(m3)
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${Movie.plural}(where: { custom_field: "hello world!" }) {
                    title
                    actors(where: { another_custom_field: "goodbye!" name: "Keanu Reeves" }) {
                        name
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [Movie.plural]: [
                {
                    title: "The Matrix",
                    actors: [
                        {
                            name: "Keanu Reeves",
                        },
                    ],
                },
            ],
        });
    });
});
