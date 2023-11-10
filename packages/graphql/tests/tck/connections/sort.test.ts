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

import { gql } from "graphql-tag";
import type { DocumentNode } from "graphql";
import { Neo4jGraphQL } from "../../../src";
import { formatCypher, translateQuery, formatParams } from "../utils/tck-test-utils";

describe("Relationship Properties Cypher", () => {
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = gql`
            type Movie {
                title: String!
                actors: [Actor!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
                numberOfActors: Int!
                    @cypher(
                        statement: "MATCH (actor:Actor)-[:ACTED_IN]->(this) RETURN count(actor) as count"
                        columnName: "count"
                    )
            }

            type Actor {
                name: String!
                movies: [Movie!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
            }

            interface ActedIn @relationshipProperties {
                screenTime: Int!
                year: Int!
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
        });
    });

    test("Projecting node and relationship properties with no arguments", async () => {
        const query = gql`
            query {
                moviesConnection(first: 5, sort: { title: ASC }) {
                    edges {
                        node {
                            title
                            actorsConnection {
                                edges {
                                    node {
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WITH collect(this) AS edges
            WITH edges, size(edges) AS totalCount
            UNWIND edges AS this
            WITH this, totalCount
            WITH *
            ORDER BY this.title ASC
            LIMIT $param0
            CALL {
                WITH this
                MATCH (this)<-[this0:ACTED_IN]-(this1:Actor)
                WITH { node: { name: this1.name } } AS edge
                WITH collect(edge) AS edges
                WITH edges, size(edges) AS totalCount
                RETURN { edges: edges, totalCount: totalCount } AS var2
            }
            WITH { node: this { .title, actorsConnection: var2 } } AS edge, totalCount, this
            WITH collect(edge) AS edges, totalCount
            RETURN { edges: edges, totalCount: totalCount } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": {
                    \\"low\\": 5,
                    \\"high\\": 0
                }
            }"
        `);
    });

    test("Sort by cypher fields", async () => {
        const query = gql`
            query {
                moviesConnection(first: 2, sort: { title: DESC, numberOfActors: ASC }) {
                    edges {
                        node {
                            title
                            actorsConnection {
                                edges {
                                    node {
                                        name
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WITH collect(this) AS edges
            WITH edges, size(edges) AS totalCount
            UNWIND edges AS this
            WITH this, totalCount
            CALL {
                WITH this
                CALL {
                    WITH this
                    WITH this AS this
                    MATCH (actor:Actor)-[:ACTED_IN]->(this) RETURN count(actor) as count
                }
                UNWIND count AS this0
                RETURN head(collect(this0)) AS this0
            }
            WITH *
            ORDER BY this.title DESC, this0 ASC
            LIMIT $param0
            CALL {
                WITH this
                MATCH (this)<-[this1:ACTED_IN]-(this2:Actor)
                WITH { node: { name: this2.name } } AS edge
                WITH collect(edge) AS edges
                WITH edges, size(edges) AS totalCount
                RETURN { edges: edges, totalCount: totalCount } AS var3
            }
            WITH { node: this { .title, actorsConnection: var3, numberOfActors: this0 } } AS edge, totalCount, this
            WITH collect(edge) AS edges, totalCount
            RETURN { edges: edges, totalCount: totalCount } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": {
                    \\"low\\": 2,
                    \\"high\\": 0
                }
            }"
        `);
    });
});
