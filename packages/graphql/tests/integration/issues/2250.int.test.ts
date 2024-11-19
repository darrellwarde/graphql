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

import type { UniqueType } from "../../utils/graphql-types";
import { TestHelper } from "../../utils/tests-helper";

describe("https://github.com/neo4j/graphql/issues/2250", () => {
    const testHelper = new TestHelper({ cdc: true });
    let cdcEnabled: boolean;

    let Movie: UniqueType;
    let Person: UniqueType;
    let Actor: UniqueType;

    beforeAll(async () => {
        cdcEnabled = await testHelper.assertCDCEnabled();
    });

    beforeEach(async () => {
        Movie = testHelper.createUniqueType("Movie");
        Person = testHelper.createUniqueType("Person");
        Actor = testHelper.createUniqueType("Actor");

        const typeDefs = `
            type ${Movie} @node {
                title: String!
                actors: [${Actor}!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
                directors: [Director!]! @relationship(type: "DIRECTED", properties: "Directed", direction: IN)
            }

            type ${Actor} @node {
                name: String!
                movies: [${Movie}!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
            }

            type ActedIn @relationshipProperties {
                screenTime: Int!
            }

            type Directed @relationshipProperties {
                year: Int!
            }

            type ${Person} @node {
                name: String!
                reputation: Int!
            }

            union Director = ${Person} | ${Actor}
        `;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
            features: {
                subscriptions: await testHelper.getSubscriptionEngine(),
            },
        });
    });

    afterEach(async () => {
        await testHelper.close();
    });

    test("nested update with create while using subscriptions should generate valid Cypher", async () => {
        const mutation = /* GraphQL */ `
            mutation {
                ${Movie.operations.update}(
                    update: {
                        directors: {
                            ${Actor}: [
                                {
                                    where: { node: { name_EQ: "Keanu Reeves" } }
                                    update: {
                                        edge: { year_SET: 2020 }
                                        node: {
                                            name_SET: "KEANU Reeves"
                                            movies: [
                                                {
                                                    create: [
                                                        { edge: { screenTime: 2345 }, node: { title: "Constantine" } }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ) {
                    ${Movie.plural} {
                        title
                    }
                }
            }
        `;

        const mutationResult = await testHelper.executeGraphQL(mutation);

        expect(mutationResult.errors).toBeFalsy();
    });
});
