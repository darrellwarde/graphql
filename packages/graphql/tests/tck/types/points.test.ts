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

describe("Cypher Points", () => {
    let typeDefs: string;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = /* GraphQL */ `
            type PointContainer @node {
                id: String
                points: [Point]
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
        });
    });

    test("Simple Points query", async () => {
        const query = /* GraphQL */ `
            {
                pointContainers(where: { points_EQ: [{ longitude: 1.0, latitude: 2.0 }] }) {
                    points {
                        longitude
                        latitude
                        crs
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:PointContainer)
            WHERE this.points = [var0 IN $param0 | point(var0)]
            RETURN this { .points } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": [
                    {
                        \\"longitude\\": 1,
                        \\"latitude\\": 2
                    }
                ]
            }"
        `);
    });

    test("Simple Points NOT query", async () => {
        const query = /* GraphQL */ `
            {
                pointContainers(where: { NOT: { points_EQ: [{ longitude: 1.0, latitude: 2.0 }] } }) {
                    points {
                        longitude
                        latitude
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:PointContainer)
            WHERE NOT (this.points = [var0 IN $param0 | point(var0)])
            RETURN this { .points } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": [
                    {
                        \\"longitude\\": 1,
                        \\"latitude\\": 2
                    }
                ]
            }"
        `);
    });

    test("Simple Points INCLUDES query", async () => {
        const query = /* GraphQL */ `
            {
                pointContainers(where: { points_INCLUDES: { longitude: 1.0, latitude: 2.0 } }) {
                    points {
                        longitude
                        latitude
                        crs
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:PointContainer)
            WHERE point($param0) IN this.points
            RETURN this { .points } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": {
                    \\"longitude\\": 1,
                    \\"latitude\\": 2
                }
            }"
        `);
    });

    test("Simple Points create mutation", async () => {
        const query = /* GraphQL */ `
            mutation {
                createPointContainers(input: { points: [{ longitude: 1.0, latitude: 2.0 }] }) {
                    pointContainers {
                        points {
                            longitude
                            latitude
                            crs
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "UNWIND $create_param0 AS create_var0
            CALL {
                WITH create_var0
                CREATE (create_this1:PointContainer)
                SET
                    create_this1.points = [create_var2 IN create_var0.points | point(create_var2)]
                RETURN create_this1
            }
            RETURN collect(create_this1 { .points }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"create_param0\\": [
                    {
                        \\"points\\": [
                            {
                                \\"longitude\\": 1,
                                \\"latitude\\": 2
                            }
                        ]
                    }
                ]
            }"
        `);
    });

    test("Simple Points update mutation", async () => {
        const query = /* GraphQL */ `
            mutation {
                updatePointContainers(
                    where: { id_EQ: "id" }
                    update: { points_SET: [{ longitude: 1.0, latitude: 2.0 }] }
                ) {
                    pointContainers {
                        points {
                            longitude
                            latitude
                            crs
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:PointContainer)
            WHERE this.id = $param0
            SET this.points = [p in $this_update_points_SET | point(p)]
            RETURN collect(DISTINCT this { .points }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"id\\",
                \\"this_update_points_SET\\": [
                    {
                        \\"longitude\\": 1,
                        \\"latitude\\": 2
                    }
                ],
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });
});
