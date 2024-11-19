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

import { GraphQLError } from "graphql";
import { TestHelper } from "../../utils/tests-helper";

describe("https://github.com/neo4j/graphql/issues/1575", () => {
    const testHelper = new TestHelper();

    beforeEach(async () => {
        const typeDefs = /* GraphQL */ `
            type Foo @node {
                point: Point
                geo_point: Point @alias(property: "point")
            }
        `;
        await testHelper.initNeo4jGraphQL({
            typeDefs,
        });
    });

    afterEach(async () => {
        await testHelper.close();
    });

    test("fails mutateing fields with same name in alias", async () => {
        const query = /* GraphQL */ `
            mutation MyMutation {
                updateFoos(
                    update: { geo_point: { longitude: 1, latitude: 1.5 }, point: { longitude: 2, latitude: 1.5 } }
                ) {
                    foos {
                        point {
                            longitude
                            latitude
                        }
                    }
                }
            }
        `;

        const result = await testHelper.executeGraphQL(query);
        expect(result.errors).toEqual([
            new GraphQLError("Conflicting modification of [[point]], [[geo_point]] on type Foo"),
        ]);
    });
});
