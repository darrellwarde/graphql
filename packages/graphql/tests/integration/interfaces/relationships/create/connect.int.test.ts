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

import { generate } from "randomstring";
import type { UniqueType } from "../../../../utils/graphql-types";
import { TestHelper } from "../../../../utils/tests-helper";

describe("interface relationships", () => {
    const testHelper = new TestHelper();
    let Episode: UniqueType;
    let Actor: UniqueType;
    let Movie: UniqueType;
    let Series: UniqueType;

    beforeAll(async () => {
        Episode = testHelper.createUniqueType("Episode");
        Actor = testHelper.createUniqueType("Actor");
        Movie = testHelper.createUniqueType("Movie");
        Series = testHelper.createUniqueType("Series");

        const typeDefs = /* GraphQL */ `
            type ${Episode} @node {
                runtime: Int!
                series: [${Series}!]! @relationship(type: "HAS_EPISODE", direction: IN)
            }

            interface Production {
                title: String!
                actors: [${Actor}!]! @declareRelationship
            }

            type ${Movie} implements Production @node {
                title: String!
                runtime: Int!
                actors: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN, properties: "ActedIn")
            }

            type ${Series} implements Production @node {
                title: String!
                episodes: [${Episode}!]! @relationship(type: "HAS_EPISODE", direction: OUT)
                actors: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN, properties: "ActedIn")
            }

            type ActedIn @relationshipProperties {
                screenTime: Int!
            }

            type ${Actor} @node {
                name: String!
                actedIn: [Production!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
            }
        `;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
        });
    });

    afterAll(async () => {
        await testHelper.close();
    });

    test("should nested create connect using interface relationship fields", async () => {
        const actorName1 = generate({
            readable: true,
            charset: "alphabetic",
        });
        const actorName2 = generate({
            readable: true,
            charset: "alphabetic",
        });

        const movieTitle = generate({
            readable: true,
            charset: "alphabetic",
        });
        const movieRuntime = 20340;
        const movieScreenTime = 87163;

        const query = `
            mutation CreateActorConnectMovie($name1: String!, $title: String, $screenTime: Int!, $name2: String) {
                ${Actor.operations.create}(
                    input: [
                        {
                            name: $name1
                            actedIn: {
                                connect: {
                                    edge: { screenTime: $screenTime }
                                    where: { node: { title_EQ: $title } }
                                    connect: {
                                        actors: { edge: { ActedIn: { screenTime: $screenTime } }, where: { node: { name_EQ: $name2 } } }
                                    }
                                }
                            }
                        }
                    ]
                ) {
                    ${Actor.plural} {
                        name
                        actedIn {
                            title
                            actors {
                                name
                            }
                            ... on ${Movie} {
                                runtime
                            }
                        }
                    }
                }
            }
        `;

        await testHelper.executeCypher(
            `
                CREATE (:${Movie} { title: $movieTitle, runtime:$movieRuntime })
                CREATE (:${Actor} { name: $name })
            `,
            { movieTitle, movieRuntime, name: actorName2 }
        );

        const gqlResult = await testHelper.executeGraphQL(query, {
            variableValues: {
                name1: actorName1,
                title: movieTitle,
                screenTime: movieScreenTime,
                name2: actorName2,
            },
        });

        expect(gqlResult.errors).toBeFalsy();

        expect(gqlResult.data).toEqual({
            [Actor.operations.create]: {
                [Actor.plural]: [
                    {
                        actedIn: [
                            {
                                runtime: movieRuntime,
                                title: movieTitle,
                                actors: expect.toIncludeSameMembers([{ name: actorName2 }, { name: actorName1 }]),
                            },
                        ],
                        name: actorName1,
                    },
                ],
            },
        });
    });

    test("should nested create connect a new relationship using interface relationship fields", async () => {
        const actorName1 = generate({
            readable: true,
            charset: "alphabetic",
        });
        const actorName2 = generate({
            readable: true,
            charset: "alphabetic",
        });

        const movieTitle = generate({
            readable: true,
            charset: "alphabetic",
        });
        const movieRuntime = 20340;
        const movieScreenTime = 87163;

        const query = `
            mutation CreateActorConnectMovie($name1: String!, $title: String, $screenTime: Int!, $name2: String) {
                ${Actor.operations.create}(
                    input: [
                        {
                            name: $name1
                            actedIn: {
                                connect: {
                                    edge: { screenTime: $screenTime }
                                    where: { node: { title_EQ: $title } }
                                    connect: {
                                        actors: { edge: { ActedIn: { screenTime: $screenTime } }, where: { node: { name_EQ: $name2 } } }
                                    }
                                }
                            }
                        }
                    ]
                ) {
                    ${Actor.plural} {
                        name
                        actedIn {
                            title
                            actors {
                                name
                            }
                            ... on ${Movie} {
                                runtime
                            }
                        }
                    }
                }
            }
        `;

        await testHelper.executeCypher(
            `
                CREATE (m:${Movie} { title: $movieTitle, runtime:$movieRuntime })
                CREATE (:${Actor} { name: $name })-[:ACTED_IN { screenTime: $movieScreenTime }]->(m)

            `,
            { movieTitle, movieRuntime, name: actorName2, movieScreenTime }
        );

        const gqlResult = await testHelper.executeGraphQL(query, {
            variableValues: {
                name1: actorName1,
                title: movieTitle,
                screenTime: movieScreenTime,
                name2: actorName2,
            },
        });

        expect(gqlResult.errors).toBeFalsy();

        expect(gqlResult.data).toEqual({
            [Actor.operations.create]: {
                [Actor.plural]: [
                    {
                        actedIn: [
                            {
                                runtime: movieRuntime,
                                title: movieTitle,
                                actors: expect.toIncludeSameMembers([
                                    { name: actorName2 },
                                    { name: actorName1 },
                                    { name: actorName2 },
                                ]),
                            },
                        ],
                        name: actorName1,
                    },
                ],
            },
        });
    });
});
