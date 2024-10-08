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

import type { UniqueType } from "../../../../utils/graphql-types";
import { TestHelper } from "../../../../utils/tests-helper";

describe("cypher directive filtering - Spatial", () => {
    let CustomType: UniqueType;

    const testHelper = new TestHelper();

    afterEach(async () => {
        await testHelper.close();
    });

    beforeEach(() => {
        CustomType = testHelper.createUniqueType("CustomType");
    });

    test("Point cypher field", async () => {
        const typeDefs = /* GraphQL */ `
            type ${CustomType} @node {
                title: String
                special_location: Point
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS l
                        """
                        columnName: "l"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
                CREATE (:${CustomType} { title: "test", custom_data: point({ longitude: 1.0, latitude: 1.0 }) })
                CREATE (:${CustomType} { title: "test2", custom_data: point({ longitude: 2.0, latitude: 2.0 }) })
                CREATE (:${CustomType} { title: "test3", custom_data: point({ longitude: 1.0, latitude: 1.0 }) })
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${CustomType.plural}(
                    where: {
                        special_location_DISTANCE: {
                            point: { latitude: 1.0, longitude: 1.0 }
                            distance: 0.0
                        }
                    }
                ) {
                    title
                    special_location {
                        latitude
                        longitude
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [CustomType.plural]: expect.toIncludeSameMembers([
                {
                    special_location: {
                        latitude: 1,
                        longitude: 1,
                    },
                    title: "test",
                },
                {
                    special_location: {
                        latitude: 1,
                        longitude: 1,
                    },
                    title: "test3",
                },
            ]),
        });
    });

    test("CartesianPoint cypher field", async () => {
        const typeDefs = /* GraphQL */ `
            type ${CustomType} @node {
                title: String
                special_location: CartesianPoint
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS l
                        """
                        columnName: "l"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
                CREATE (:${CustomType} { title: "test", custom_data: point({ x: 1.0, y: 1.0, z: 1.0 }) })
                CREATE (:${CustomType} { title: "test2", custom_data: point({ x: 2.0, y: 2.0, z: 2.0 }) })
                CREATE (:${CustomType} { title: "test3", custom_data: point({ x: 0.0, y: 1.0, z: 2.0 }) })
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${CustomType.plural}(
                    where: {
                        special_location_DISTANCE: {
                            point: { x: 1, y: 1, z: 2 }
                            distance: 1
                        }
                    }
                ) {
                    title
                    special_location {
                        x
                        y
                        z
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [CustomType.plural]: expect.toIncludeSameMembers([
                {
                    special_location: {
                        x: 1,
                        y: 1,
                        z: 1,
                    },
                    title: "test",
                },
                {
                    special_location: {
                        x: 0,
                        y: 1,
                        z: 2,
                    },
                    title: "test3",
                },
            ]),
        });
    });
});
