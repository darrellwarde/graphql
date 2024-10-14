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

describe("Cypher Update", () => {
    let typeDefs: string;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = /* GraphQL */ `
            type Actor @node {
                name: String
                movies: [Movie!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: OUT)
            }

            type Movie @node {
                id: ID
                title: String
                actors: [Actor!]! @relationship(type: "ACTED_IN", properties: "ActedIn", direction: IN)
            }

            type ActedIn @relationshipProperties {
                screenTime: Int
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
        });
    });

    test("Simple Update", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(where: { id_EQ: "1" }, update: { id: "2" }) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            SET this.id = $this_update_id
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"this_update_id\\": \\"2\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Single Nested Update", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: {
                        actors: [{ where: { node: { name_EQ: "old name" } }, update: { node: { name: "new name" } } }]
                    }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH this
            CALL {
            	WITH this
            	MATCH (this)<-[this_acted_in0_relationship:ACTED_IN]-(this_actors0:Actor)
            	WHERE this_actors0.name = $updateMovies_args_update_actors0_where_this_actors0param0
            	SET this_actors0.name = $this_update_actors0_name
            	RETURN count(*) AS update_this_actors0
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"updateMovies_args_update_actors0_where_this_actors0param0\\": \\"old name\\",
                \\"this_update_actors0_name\\": \\"new name\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"where\\": {
                                        \\"node\\": {
                                            \\"name_EQ\\": \\"old name\\"
                                        }
                                    },
                                    \\"update\\": {
                                        \\"node\\": {
                                            \\"name\\": \\"new name\\"
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

    test("Double Nested Update", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: {
                        actors: [
                            {
                                where: { node: { name_EQ: "old actor name" } }
                                update: {
                                    node: {
                                        name: "new actor name"
                                        movies: [
                                            {
                                                where: { node: { id_EQ: "old movie title" } }
                                                update: { node: { title: "new movie title" } }
                                            }
                                        ]
                                    }
                                }
                            }
                        ]
                    }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH this
            CALL {
            	WITH this
            	MATCH (this)<-[this_acted_in0_relationship:ACTED_IN]-(this_actors0:Actor)
            	WHERE this_actors0.name = $updateMovies_args_update_actors0_where_this_actors0param0
            	SET this_actors0.name = $this_update_actors0_name
            	WITH this, this_actors0
            	CALL {
            		WITH this, this_actors0
            		MATCH (this_actors0)-[this_actors0_acted_in0_relationship:ACTED_IN]->(this_actors0_movies0:Movie)
            		WHERE this_actors0_movies0.id = $updateMovies_args_update_actors0_update_node_movies0_where_this_actors0_movies0param0
            		SET this_actors0_movies0.title = $this_update_actors0_movies0_title
            		RETURN count(*) AS update_this_actors0_movies0
            	}
            	RETURN count(*) AS update_this_actors0
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"updateMovies_args_update_actors0_where_this_actors0param0\\": \\"old actor name\\",
                \\"this_update_actors0_name\\": \\"new actor name\\",
                \\"updateMovies_args_update_actors0_update_node_movies0_where_this_actors0_movies0param0\\": \\"old movie title\\",
                \\"this_update_actors0_movies0_title\\": \\"new movie title\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"where\\": {
                                        \\"node\\": {
                                            \\"name_EQ\\": \\"old actor name\\"
                                        }
                                    },
                                    \\"update\\": {
                                        \\"node\\": {
                                            \\"name\\": \\"new actor name\\",
                                            \\"movies\\": [
                                                {
                                                    \\"where\\": {
                                                        \\"node\\": {
                                                            \\"id_EQ\\": \\"old movie title\\"
                                                        }
                                                    },
                                                    \\"update\\": {
                                                        \\"node\\": {
                                                            \\"title\\": \\"new movie title\\"
                                                        }
                                                    }
                                                }
                                            ]
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

    test("Simple Update as Connect", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: { actors: { connect: [{ where: { node: { name_EQ: "Daniel" } } }] } }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH *
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_actors0_connect0_node:Actor)
            	WHERE this_actors0_connect0_node.name = $this_actors0_connect0_node_param0
            	CALL {
            		WITH *
            		WITH collect(this_actors0_connect0_node) as connectedNodes, collect(this) as parentNodes
            		CALL {
            			WITH connectedNodes, parentNodes
            			UNWIND parentNodes as this
            			UNWIND connectedNodes as this_actors0_connect0_node
            			MERGE (this)<-[this_actors0_connect0_relationship:ACTED_IN]-(this_actors0_connect0_node)
            		}
            	}
            WITH this, this_actors0_connect0_node
            	RETURN count(*) AS connect_this_actors0_connect_Actor0
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"this_actors0_connect0_node_param0\\": \\"Daniel\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Update as multiple Connect", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: {
                        actors: {
                            connect: [
                                { where: { node: { name_EQ: "Daniel" } } }
                                { where: { node: { name_EQ: "Darrell" } } }
                            ]
                        }
                    }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH *
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_actors0_connect0_node:Actor)
            	WHERE this_actors0_connect0_node.name = $this_actors0_connect0_node_param0
            	CALL {
            		WITH *
            		WITH collect(this_actors0_connect0_node) as connectedNodes, collect(this) as parentNodes
            		CALL {
            			WITH connectedNodes, parentNodes
            			UNWIND parentNodes as this
            			UNWIND connectedNodes as this_actors0_connect0_node
            			MERGE (this)<-[this_actors0_connect0_relationship:ACTED_IN]-(this_actors0_connect0_node)
            		}
            	}
            WITH this, this_actors0_connect0_node
            	RETURN count(*) AS connect_this_actors0_connect_Actor0
            }
            WITH *
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_actors0_connect1_node:Actor)
            	WHERE this_actors0_connect1_node.name = $this_actors0_connect1_node_param0
            	CALL {
            		WITH *
            		WITH collect(this_actors0_connect1_node) as connectedNodes, collect(this) as parentNodes
            		CALL {
            			WITH connectedNodes, parentNodes
            			UNWIND parentNodes as this
            			UNWIND connectedNodes as this_actors0_connect1_node
            			MERGE (this)<-[this_actors0_connect1_relationship:ACTED_IN]-(this_actors0_connect1_node)
            		}
            	}
            WITH this, this_actors0_connect1_node
            	RETURN count(*) AS connect_this_actors0_connect_Actor1
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"this_actors0_connect0_node_param0\\": \\"Daniel\\",
                \\"this_actors0_connect1_node_param0\\": \\"Darrell\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Simple Update as Disconnect", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: { actors: { disconnect: [{ where: { node: { name_EQ: "Daniel" } } }] } }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)<-[this_actors0_disconnect0_rel:ACTED_IN]-(this_actors0_disconnect0:Actor)
            WHERE this_actors0_disconnect0.name = $updateMovies_args_update_actors0_disconnect0_where_Actor_this_actors0_disconnect0param0
            CALL {
            	WITH this_actors0_disconnect0, this_actors0_disconnect0_rel, this
            	WITH collect(this_actors0_disconnect0) as this_actors0_disconnect0, this_actors0_disconnect0_rel, this
            	UNWIND this_actors0_disconnect0 as x
            	DELETE this_actors0_disconnect0_rel
            }
            RETURN count(*) AS disconnect_this_actors0_disconnect_Actor
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"updateMovies_args_update_actors0_disconnect0_where_Actor_this_actors0_disconnect0param0\\": \\"Daniel\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"disconnect\\": [
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"name_EQ\\": \\"Daniel\\"
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Update as multiple Disconnect", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: {
                        actors: {
                            disconnect: [
                                { where: { node: { name_EQ: "Daniel" } } }
                                { where: { node: { name_EQ: "Darrell" } } }
                            ]
                        }
                    }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)<-[this_actors0_disconnect0_rel:ACTED_IN]-(this_actors0_disconnect0:Actor)
            WHERE this_actors0_disconnect0.name = $updateMovies_args_update_actors0_disconnect0_where_Actor_this_actors0_disconnect0param0
            CALL {
            	WITH this_actors0_disconnect0, this_actors0_disconnect0_rel, this
            	WITH collect(this_actors0_disconnect0) as this_actors0_disconnect0, this_actors0_disconnect0_rel, this
            	UNWIND this_actors0_disconnect0 as x
            	DELETE this_actors0_disconnect0_rel
            }
            RETURN count(*) AS disconnect_this_actors0_disconnect_Actor
            }
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)<-[this_actors0_disconnect1_rel:ACTED_IN]-(this_actors0_disconnect1:Actor)
            WHERE this_actors0_disconnect1.name = $updateMovies_args_update_actors0_disconnect1_where_Actor_this_actors0_disconnect1param0
            CALL {
            	WITH this_actors0_disconnect1, this_actors0_disconnect1_rel, this
            	WITH collect(this_actors0_disconnect1) as this_actors0_disconnect1, this_actors0_disconnect1_rel, this
            	UNWIND this_actors0_disconnect1 as x
            	DELETE this_actors0_disconnect1_rel
            }
            RETURN count(*) AS disconnect_this_actors0_disconnect_Actor
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"updateMovies_args_update_actors0_disconnect0_where_Actor_this_actors0_disconnect0param0\\": \\"Daniel\\",
                \\"updateMovies_args_update_actors0_disconnect1_where_Actor_this_actors0_disconnect1param0\\": \\"Darrell\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"disconnect\\": [
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"name_EQ\\": \\"Daniel\\"
                                                }
                                            }
                                        },
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"name_EQ\\": \\"Darrell\\"
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Update an Actor while creating and connecting to a new Movie (via field level)", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateActors(
                    where: { name_EQ: "Dan" }
                    update: { movies: { create: [{ node: { id: "dan_movie_id", title: "The Story of Beer" } }] } }
                ) {
                    actors {
                        name
                        movies {
                            id
                            title
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Actor)
            WHERE this.name = $param0
            WITH this
            CREATE (this_movies0_create0_node:Movie)
            SET this_movies0_create0_node.id = $this_movies0_create0_node_id
            SET this_movies0_create0_node.title = $this_movies0_create0_node_title
            MERGE (this)-[:ACTED_IN]->(this_movies0_create0_node)
            WITH *
            CALL {
                WITH this
                MATCH (this)-[update_this0:ACTED_IN]->(update_this1:Movie)
                WITH update_this1 { .id, .title } AS update_this1
                RETURN collect(update_this1) AS update_var2
            }
            RETURN collect(DISTINCT this { .name, movies: update_var2 }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Dan\\",
                \\"this_movies0_create0_node_id\\": \\"dan_movie_id\\",
                \\"this_movies0_create0_node_title\\": \\"The Story of Beer\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Update an Actor while creating and connecting to a new Movie (via top level)", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateActors(
                    where: { name_EQ: "Dan" }
                    update: { movies: { create: [{ node: { id: "dan_movie_id", title: "The Story of Beer" } }] } }
                ) {
                    actors {
                        name
                        movies {
                            id
                            title
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Actor)
            WHERE this.name = $param0
            WITH this
            CREATE (this_movies0_create0_node:Movie)
            SET this_movies0_create0_node.id = $this_movies0_create0_node_id
            SET this_movies0_create0_node.title = $this_movies0_create0_node_title
            MERGE (this)-[:ACTED_IN]->(this_movies0_create0_node)
            WITH *
            CALL {
                WITH this
                MATCH (this)-[update_this0:ACTED_IN]->(update_this1:Movie)
                WITH update_this1 { .id, .title } AS update_this1
                RETURN collect(update_this1) AS update_var2
            }
            RETURN collect(DISTINCT this { .name, movies: update_var2 }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Dan\\",
                \\"this_movies0_create0_node_id\\": \\"dan_movie_id\\",
                \\"this_movies0_create0_node_title\\": \\"The Story of Beer\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Update an Actor while creating and connecting to multiple new Movies (via top level)", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateActors(
                    where: { name_EQ: "Dan" }
                    update: {
                        movies: {
                            create: [
                                { node: { id: "dan_movie_id", title: "The Story of Beer" } }
                                { node: { id: "dan_movie2_id", title: "Forrest Gump" } }
                            ]
                        }
                    }
                ) {
                    actors {
                        name
                        movies {
                            id
                            title
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Actor)
            WHERE this.name = $param0
            WITH this
            CREATE (this_movies0_create0_node:Movie)
            SET this_movies0_create0_node.id = $this_movies0_create0_node_id
            SET this_movies0_create0_node.title = $this_movies0_create0_node_title
            MERGE (this)-[:ACTED_IN]->(this_movies0_create0_node)
            CREATE (this_movies0_create1_node:Movie)
            SET this_movies0_create1_node.id = $this_movies0_create1_node_id
            SET this_movies0_create1_node.title = $this_movies0_create1_node_title
            MERGE (this)-[:ACTED_IN]->(this_movies0_create1_node)
            WITH *
            CALL {
                WITH this
                MATCH (this)-[update_this0:ACTED_IN]->(update_this1:Movie)
                WITH update_this1 { .id, .title } AS update_this1
                RETURN collect(update_this1) AS update_var2
            }
            RETURN collect(DISTINCT this { .name, movies: update_var2 }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Dan\\",
                \\"this_movies0_create0_node_id\\": \\"dan_movie_id\\",
                \\"this_movies0_create0_node_title\\": \\"The Story of Beer\\",
                \\"this_movies0_create1_node_id\\": \\"dan_movie2_id\\",
                \\"this_movies0_create1_node_title\\": \\"Forrest Gump\\",
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Delete related node as update", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: {
                        actors: {
                            delete: { where: { node: { name_EQ: "Actor to delete" }, edge: { screenTime_EQ: 60 } } }
                        }
                    }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH *
            CALL {
            WITH *
            OPTIONAL MATCH (this)<-[this_actors0_delete0_relationship:ACTED_IN]-(this_actors0_delete0:Actor)
            WHERE (this_actors0_delete0.name = $updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param0 AND this_actors0_delete0_relationship.screenTime = $updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param1)
            WITH this_actors0_delete0_relationship, collect(DISTINCT this_actors0_delete0) AS this_actors0_delete0_to_delete
            CALL {
            	WITH this_actors0_delete0_to_delete
            	UNWIND this_actors0_delete0_to_delete AS x
            	DETACH DELETE x
            }
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param0\\": \\"Actor to delete\\",
                \\"updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param1\\": {
                    \\"low\\": 60,
                    \\"high\\": 0
                },
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"delete\\": [
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"name_EQ\\": \\"Actor to delete\\"
                                                },
                                                \\"edge\\": {
                                                    \\"screenTime_EQ\\": {
                                                        \\"low\\": 60,
                                                        \\"high\\": 0
                                                    }
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Delete and update nested operations under same mutation", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: {
                        actors: {
                            where: { node: { name_EQ: "Actor to update" } }
                            update: { node: { name: "Updated name" } }
                            delete: { where: { node: { name_EQ: "Actor to delete" } } }
                        }
                    }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH *
            CALL {
            WITH *
            OPTIONAL MATCH (this)<-[this_actors0_delete0_relationship:ACTED_IN]-(this_actors0_delete0:Actor)
            WHERE this_actors0_delete0.name = $updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param0
            WITH this_actors0_delete0_relationship, collect(DISTINCT this_actors0_delete0) AS this_actors0_delete0_to_delete
            CALL {
            	WITH this_actors0_delete0_to_delete
            	UNWIND this_actors0_delete0_to_delete AS x
            	DETACH DELETE x
            }
            }
            WITH this
            CALL {
            	WITH this
            	MATCH (this)<-[this_acted_in0_relationship:ACTED_IN]-(this_actors0:Actor)
            	WHERE this_actors0.name = $updateMovies_args_update_actors0_where_this_actors0param0
            	SET this_actors0.name = $this_update_actors0_name
            	RETURN count(*) AS update_this_actors0
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param0\\": \\"Actor to delete\\",
                \\"updateMovies_args_update_actors0_where_this_actors0param0\\": \\"Actor to update\\",
                \\"this_update_actors0_name\\": \\"Updated name\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"where\\": {
                                        \\"node\\": {
                                            \\"name_EQ\\": \\"Actor to update\\"
                                        }
                                    },
                                    \\"update\\": {
                                        \\"node\\": {
                                            \\"name\\": \\"Updated name\\"
                                        }
                                    },
                                    \\"delete\\": [
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"name_EQ\\": \\"Actor to delete\\"
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Nested delete under a nested update", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: { actors: { delete: { where: { node: { name_EQ: "Actor to delete" } } } } }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH *
            CALL {
            WITH *
            OPTIONAL MATCH (this)<-[this_actors0_delete0_relationship:ACTED_IN]-(this_actors0_delete0:Actor)
            WHERE this_actors0_delete0.name = $updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param0
            WITH this_actors0_delete0_relationship, collect(DISTINCT this_actors0_delete0) AS this_actors0_delete0_to_delete
            CALL {
            	WITH this_actors0_delete0_to_delete
            	UNWIND this_actors0_delete0_to_delete AS x
            	DETACH DELETE x
            }
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param0\\": \\"Actor to delete\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"delete\\": [
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"name_EQ\\": \\"Actor to delete\\"
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Double nested delete under a nested update", async () => {
        const query = /* GraphQL */ `
            mutation {
                updateMovies(
                    where: { id_EQ: "1" }
                    update: {
                        actors: {
                            delete: {
                                where: { node: { name_EQ: "Actor to delete" } }
                                delete: { movies: { where: { node: { id_EQ: "2" } } } }
                            }
                        }
                    }
                ) {
                    movies {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Movie)
            WHERE this.id = $param0
            WITH *
            CALL {
            WITH *
            OPTIONAL MATCH (this)<-[this_actors0_delete0_relationship:ACTED_IN]-(this_actors0_delete0:Actor)
            WHERE this_actors0_delete0.name = $updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param0
            WITH *
            CALL {
            WITH *
            OPTIONAL MATCH (this_actors0_delete0)-[this_actors0_delete0_movies0_relationship:ACTED_IN]->(this_actors0_delete0_movies0:Movie)
            WHERE this_actors0_delete0_movies0.id = $updateMovies_args_update_actors0_delete0_delete_movies0_where_this_actors0_delete0_movies0param0
            WITH this_actors0_delete0_movies0_relationship, collect(DISTINCT this_actors0_delete0_movies0) AS this_actors0_delete0_movies0_to_delete
            CALL {
            	WITH this_actors0_delete0_movies0_to_delete
            	UNWIND this_actors0_delete0_movies0_to_delete AS x
            	DETACH DELETE x
            }
            }
            WITH this_actors0_delete0_relationship, collect(DISTINCT this_actors0_delete0) AS this_actors0_delete0_to_delete
            CALL {
            	WITH this_actors0_delete0_to_delete
            	UNWIND this_actors0_delete0_to_delete AS x
            	DETACH DELETE x
            }
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"1\\",
                \\"updateMovies_args_update_actors0_delete0_where_this_actors0_delete0param0\\": \\"Actor to delete\\",
                \\"updateMovies_args_update_actors0_delete0_delete_movies0_where_this_actors0_delete0_movies0param0\\": \\"2\\",
                \\"updateMovies\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"actors\\": [
                                {
                                    \\"delete\\": [
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"name_EQ\\": \\"Actor to delete\\"
                                                }
                                            },
                                            \\"delete\\": {
                                                \\"movies\\": [
                                                    {
                                                        \\"where\\": {
                                                            \\"node\\": {
                                                                \\"id_EQ\\": \\"2\\"
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    ]
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
