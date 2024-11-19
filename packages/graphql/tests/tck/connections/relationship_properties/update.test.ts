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

import { Neo4jGraphQL } from "../../../../src";
import { formatCypher, formatParams, translateQuery } from "../../utils/tck-test-utils";

describe("Cypher -> Connections -> Relationship Properties -> Update", () => {
    let typeDefs: string;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = /* GraphQL */ `
            type Movie @node {
                title: String!
                actors: [Actor!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
            }

            type Actor @node {
                name: String!
                movies: [Movie!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
            }

            type ActedIn @relationshipProperties {
                screenTime: Int!
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
        });
    });

    test("Update a relationship property on a relationship between two specified nodes (update -> update)", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { title_EQ: "Forrest Gump" }
                    update: {
                        actors: [{ where: { node: { name_EQ: "Tom Hanks" } }, update: { edge: { screenTime: 60 } } }]
                    }
                ) {
                    movies {
                        title
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.title = $param0
            WITH this
            CALL {
            	WITH this
            	MATCH (this)<-[this_acted_in0_relationship:ACTED_IN]-(this_actors0:Actor)
            	WHERE this_actors0.name = $updateMovies_args_update_actors0_where_this_actors0param0
            	SET this_acted_in0_relationship.screenTime = $updateMovies.args.update.actors[0].update.edge.screenTime
            	RETURN count(*) AS update_this_actors0
            }
            RETURN collect(DISTINCT this { .title }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Forrest Gump\\",
                \\"updateMovies_args_update_actors0_where_this_actors0param0\\": \\"Tom Hanks\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"where\\": {
                                        \\"node\\": {
                                            \\"name_EQ\\": \\"Tom Hanks\\"
                                        }
                                    },
                                    \\"update\\": {
                                        \\"edge\\": {
                                            \\"screenTime\\": {
                                                \\"low\\": 60,
                                                \\"high\\": 0
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Update properties on both the relationship and end node in a nested update (update -> update)", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { title_EQ: "Forrest Gump" }
                    update: {
                        actors: [
                            {
                                where: { node: { name_EQ: "Tom Hanks" } }
                                update: { edge: { screenTime_SET: 60 }, node: { name_SET: "Tom Hanks" } }
                            }
                        ]
                    }
                ) {
                    movies {
                        title
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.title = $param0
            WITH this
            CALL {
            	WITH this
            	MATCH (this)<-[this_acted_in0_relationship:ACTED_IN]-(this_actors0:Actor)
            	WHERE this_actors0.name = $updateMovies_args_update_actors0_where_this_actors0param0
            	SET this_acted_in0_relationship.screenTime = $updateMovies.args.update.actors[0].update.edge.screenTime_SET
            	SET this_actors0.name = $this_update_actors0_name_SET
            	RETURN count(*) AS update_this_actors0
            }
            RETURN collect(DISTINCT this { .title }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Forrest Gump\\",
                \\"updateMovies_args_update_actors0_where_this_actors0param0\\": \\"Tom Hanks\\",
                \\"this_update_actors0_name_SET\\": \\"Tom Hanks\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"where\\": {
                                        \\"node\\": {
                                            \\"name_EQ\\": \\"Tom Hanks\\"
                                        }
                                    },
                                    \\"update\\": {
                                        \\"node\\": {
                                            \\"name_SET\\": \\"Tom Hanks\\"
                                        },
                                        \\"edge\\": {
                                            \\"screenTime_SET\\": {
                                                \\"low\\": 60,
                                                \\"high\\": 0
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });
});
