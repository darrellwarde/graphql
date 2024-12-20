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

describe("https://github.com/neo4j/graphql/issues/3251", () => {
    describe("1:1 schema validation", () => {
        let neoSchema: Neo4jGraphQL;

        const typeDefs = `#graphql
            type Movie @node {
                name: String!
                genre: Genre! @relationship(type: "HAS_GENRE", direction: OUT)
            }

            type Genre @node {
                name: String! @unique
                movies: [Movie!]! @relationship(type: "HAS_GENRE", direction: IN)
            }
        `;

        beforeAll(() => {
            neoSchema = new Neo4jGraphQL({
                typeDefs,
            });
        });

        test("should have check in correct place following update and connect", async () => {
            const query = /* GraphQL */ `
                mutation UpdateMovieWithConnectAndUpdate {
                    updateMovies(
                        where: { name_EQ: "TestMovie1" }
                        update: {
                            name_SET: "TestMovie1"
                            genre: { connect: { where: { node: { name_EQ: "Thriller" } } } }
                        }
                    ) {
                        movies {
                            name
                            genre {
                                name
                            }
                        }
                    }
                }
            `;

            const result = await translateQuery(neoSchema, query);

            expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
                "MATCH (this:Movie)
                WHERE this.name = $param0
                SET this.name = $this_update_name_SET
                WITH *
                CALL {
                	WITH this
                	OPTIONAL MATCH (this_genre0_connect0_node:Genre)
                	WHERE this_genre0_connect0_node.name = $this_genre0_connect0_node_param0
                	CALL {
                		WITH *
                		WITH collect(this_genre0_connect0_node) as connectedNodes, collect(this) as parentNodes
                		CALL {
                			WITH connectedNodes, parentNodes
                			UNWIND parentNodes as this
                			UNWIND connectedNodes as this_genre0_connect0_node
                			MERGE (this)-[:HAS_GENRE]->(this_genre0_connect0_node)
                		}
                	}
                WITH this, this_genre0_connect0_node
                	RETURN count(*) AS connect_this_genre0_connect_Genre0
                }
                WITH *
                WITH *
                CALL {
                	WITH this
                	MATCH (this)-[this_genre_Genre_unique:HAS_GENRE]->(:Genre)
                	WITH count(this_genre_Genre_unique) as c
                	WHERE apoc.util.validatePredicate(NOT (c = 1), '@neo4j/graphql/RELATIONSHIP-REQUIREDMovie.genre required exactly once', [0])
                	RETURN c AS this_genre_Genre_unique_ignored
                }
                CALL {
                    WITH this
                    MATCH (this)-[update_this0:HAS_GENRE]->(update_this1:Genre)
                    WITH update_this1 { .name } AS update_this1
                    RETURN head(collect(update_this1)) AS update_var2
                }
                RETURN collect(DISTINCT this { .name, genre: update_var2 }) AS data"
            `);

            expect(formatParams(result.params)).toMatchInlineSnapshot(`
                "{
                    \\"param0\\": \\"TestMovie1\\",
                    \\"this_update_name_SET\\": \\"TestMovie1\\",
                    \\"this_genre0_connect0_node_param0\\": \\"Thriller\\",
                    \\"resolvedCallbacks\\": {}
                }"
            `);
        });
    });
});
