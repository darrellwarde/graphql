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
import type { UniqueType } from "../../utils/graphql-types";
import { TestHelper } from "../../utils/tests-helper";

describe("https://github.com/neo4j/graphql/issues/3355", () => {
    const testHelper = new TestHelper({ cdc: true });
    let cdcEnabled: boolean;
    let Movie: UniqueType;

    beforeAll(async () => {
        Movie = testHelper.createUniqueType("Movie");
        cdcEnabled = await testHelper.assertCDCEnabled();
    });

    afterAll(async () => {
        await testHelper.close();
    });

    test("should return info object when subscriptions enabled", async () => {
        if (!cdcEnabled) {
            console.log("CDC NOT AVAILABLE - SKIPPING");
            return;
        }
        const typeDefs = `
            type ${Movie} @node {
                id: ID!
                name: String
            }
        `;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
            features: {
                subscriptions: await testHelper.getSubscriptionEngine(),
            },
        });

        const id = generate({
            charset: "alphabetic",
        });

        const initialName = generate({
            charset: "alphabetic",
        });

        const updatedName = generate({
            charset: "alphabetic",
        });

        const query = /* GraphQL */ `
        mutation($id: ID, $name: String) {
            ${Movie.operations.update}(where: { id_EQ: $id }, update: { name_SET: $name }) {
                info {
                    nodesCreated
                    nodesDeleted
                }
            }
          }
        `;

        await testHelper.executeCypher(
            `
                CREATE (:${Movie} {id: $id, name: $initialName})
            `,
            {
                id,
                initialName,
            }
        );

        const gqlResult = await testHelper.executeGraphQL(query, {
            variableValues: { id, name: updatedName },
        });

        expect(gqlResult.errors).toBeFalsy();

        expect(gqlResult?.data?.[Movie.operations.update]).toEqual({ info: { nodesCreated: 0, nodesDeleted: 0 } });
    });
});
