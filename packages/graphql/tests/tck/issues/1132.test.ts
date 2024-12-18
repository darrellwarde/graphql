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
import { createBearerToken } from "../../utils/create-bearer-token";
import { formatCypher, formatParams, translateQuery } from "../utils/tck-test-utils";

describe("https://github.com/neo4j/graphql/issues/1132", () => {
    test("Auth CONNECT rules checked against correct property", async () => {
        const typeDefs = /* GraphQL */ `
            type Source
                @node
                @authorization(
                    validate: [
                        { when: [BEFORE], operations: [CREATE_RELATIONSHIP], where: { node: { id_EQ: "$jwt.sub" } } }
                    ]
                ) {
                id: ID!
                targets: [Target!]! @relationship(type: "HAS_TARGET", direction: OUT)
            }

            type Target @node {
                id: ID!
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: { authorization: { key: "secret" } },
        });

        const query = /* GraphQL */ `
            mutation {
                updateSources(update: { targets: { connect: { where: { node: { id_EQ: 1 } } } } }) {
                    sources {
                        id
                    }
                }
            }
        `;

        const token = createBearerToken("secret", { sub: "1" });
        const result = await translateQuery(neoSchema, query, {
            token,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Source)
            WITH *
            CALL {
            	WITH this
            	OPTIONAL MATCH (this_targets0_connect0_node:Target)
            	WHERE this_targets0_connect0_node.id = $this_targets0_connect0_node_param0 AND apoc.util.validatePredicate(NOT ($isAuthenticated = true AND ($jwt.sub IS NOT NULL AND this.id = $jwt.sub)), \\"@neo4j/graphql/FORBIDDEN\\", [0])
            	CALL {
            		WITH *
            		WITH collect(this_targets0_connect0_node) as connectedNodes, collect(this) as parentNodes
            		CALL {
            			WITH connectedNodes, parentNodes
            			UNWIND parentNodes as this
            			UNWIND connectedNodes as this_targets0_connect0_node
            			CREATE (this)-[:HAS_TARGET]->(this_targets0_connect0_node)
            		}
            	}
            WITH this, this_targets0_connect0_node
            	RETURN count(*) AS connect_this_targets0_connect_Target0
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_targets0_connect0_node_param0\\": \\"1\\",
                \\"isAuthenticated\\": true,
                \\"jwt\\": {
                    \\"roles\\": [],
                    \\"sub\\": \\"1\\"
                },
                \\"resolvedCallbacks\\": {}
            }"
        `);
    });

    test("Auth DISCONNECT rules checked against correct property", async () => {
        const typeDefs = /* GraphQL */ `
            type Source
                @node
                @authorization(
                    validate: [
                        { when: [BEFORE], operations: [DELETE_RELATIONSHIP], where: { node: { id_EQ: "$jwt.sub" } } }
                    ]
                ) {
                id: ID!
                targets: [Target!]! @relationship(type: "HAS_TARGET", direction: OUT)
            }

            type Target @node {
                id: ID!
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: { authorization: { key: "secret" } },
        });

        const query = /* GraphQL */ `
            mutation {
                updateSources(update: { targets: { disconnect: { where: { node: { id_EQ: 1 } } } } }) {
                    sources {
                        id
                    }
                }
            }
        `;

        const token = createBearerToken("secret", { sub: "1" });
        const result = await translateQuery(neoSchema, query, {
            token,
        });

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Source)
            WITH this
            CALL {
            WITH this
            OPTIONAL MATCH (this)-[this_targets0_disconnect0_rel:HAS_TARGET]->(this_targets0_disconnect0:Target)
            WHERE this_targets0_disconnect0.id = $updateSources_args_update_targets0_disconnect0_where_Target_this_targets0_disconnect0param0 AND apoc.util.validatePredicate(NOT ($isAuthenticated = true AND ($jwt.sub IS NOT NULL AND this.id = $jwt.sub)), \\"@neo4j/graphql/FORBIDDEN\\", [0])
            CALL {
            	WITH this_targets0_disconnect0, this_targets0_disconnect0_rel, this
            	WITH collect(this_targets0_disconnect0) as this_targets0_disconnect0, this_targets0_disconnect0_rel, this
            	UNWIND this_targets0_disconnect0 as x
            	DELETE this_targets0_disconnect0_rel
            }
            RETURN count(*) AS disconnect_this_targets0_disconnect_Target
            }
            RETURN collect(DISTINCT this { .id }) AS data"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"updateSources_args_update_targets0_disconnect0_where_Target_this_targets0_disconnect0param0\\": \\"1\\",
                \\"isAuthenticated\\": true,
                \\"jwt\\": {
                    \\"roles\\": [],
                    \\"sub\\": \\"1\\"
                },
                \\"updateSources\\": {
                    \\"args\\": {
                        \\"update\\": {
                            \\"targets\\": [
                                {
                                    \\"disconnect\\": [
                                        {
                                            \\"where\\": {
                                                \\"node\\": {
                                                    \\"id_EQ\\": \\"1\\"
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
});
