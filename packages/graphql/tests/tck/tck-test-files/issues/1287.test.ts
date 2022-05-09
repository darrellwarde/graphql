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

import { gql } from "apollo-server";
import { DocumentNode } from "graphql";
import { Neo4jGraphQL } from "../../../../src";
import { formatCypher, translateQuery, formatParams } from "../../utils/tck-test-utils";

describe("https://github.com/neo4j/graphql/issues/1287", () => {
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = gql`
            type Screening {
                id: ID! @id
                interface: MyInterface! @relationship(type: "INTERFACE_CONNECTION", direction: OUT)
            }

            interface MyInterface {
                id: ID! @id
            }

            type MyImplementation1 implements MyInterface {
                id: ID! @id
                field1: String!
            }

            type MyImplementation2 implements MyInterface {
                id: ID! @id
                field2: String!
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
        });
    });

    test("Does not error and produces expected filter", async () => {
        const query = gql`
            query queryScreening {
                screenings(where: { interfaceConnection: { node: { id: "some-id" } } }) {
                    id
                    interface {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Screening)
            WHERE EXISTS((this)-[:INTERFACE_CONNECTION]->(:MyImplementation1)) AND ANY(this_interfaceConnection_MyImplementation1_map IN [(this)-[this_interfaceConnection_MyImplementation1_ScreeningInterfaceRelationship:INTERFACE_CONNECTION]->(this_interfaceConnection_MyImplementation1:MyImplementation1)  | { node: this_interfaceConnection_MyImplementation1, relationship: this_interfaceConnection_MyImplementation1_ScreeningInterfaceRelationship } ] WHERE this_interfaceConnection_MyImplementation1_map.node.id = $this_screenings.where.interfaceConnection.node.id) AND EXISTS((this)-[:INTERFACE_CONNECTION]->(:MyImplementation2)) AND ANY(this_interfaceConnection_MyImplementation2_map IN [(this)-[this_interfaceConnection_MyImplementation2_ScreeningInterfaceRelationship:INTERFACE_CONNECTION]->(this_interfaceConnection_MyImplementation2:MyImplementation2)  | { node: this_interfaceConnection_MyImplementation2, relationship: this_interfaceConnection_MyImplementation2_ScreeningInterfaceRelationship } ] WHERE this_interfaceConnection_MyImplementation2_map.node.id = $this_screenings.where.interfaceConnection.node.id)
            WITH this
            CALL {
            WITH this
            MATCH (this)-[:INTERFACE_CONNECTION]->(this_MyImplementation1:MyImplementation1)
            RETURN { __resolveType: \\"MyImplementation1\\", id: this_MyImplementation1.id } AS interface
            UNION
            WITH this
            MATCH (this)-[:INTERFACE_CONNECTION]->(this_MyImplementation2:MyImplementation2)
            RETURN { __resolveType: \\"MyImplementation2\\", id: this_MyImplementation2.id } AS interface
            }
            RETURN this { .id, interface: interface } as this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_screenings\\": {
                    \\"where\\": {
                        \\"interfaceConnection\\": {
                            \\"node\\": {
                                \\"id\\": \\"some-id\\"
                            }
                        }
                    }
                }
            }"
        `);
    });

    test("Works for filtering using _on", async () => {
        const query = gql`
            query queryScreening {
                screenings(
                    where: {
                        interfaceConnection: {
                            node: {
                                id: "some-id"
                                _on: {
                                    MyImplementation1: { field1: "value1" }
                                    MyImplementation2: { field2: "value2" }
                                }
                            }
                        }
                    }
                ) {
                    id
                    interface {
                        id
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Screening)
            WHERE EXISTS((this)-[:INTERFACE_CONNECTION]->(:MyImplementation1)) AND ANY(this_interfaceConnection_MyImplementation1_map IN [(this)-[this_interfaceConnection_MyImplementation1_ScreeningInterfaceRelationship:INTERFACE_CONNECTION]->(this_interfaceConnection_MyImplementation1:MyImplementation1)  | { node: this_interfaceConnection_MyImplementation1, relationship: this_interfaceConnection_MyImplementation1_ScreeningInterfaceRelationship } ] WHERE this_interfaceConnection_MyImplementation1_map.node.id = $this_screenings.where.interfaceConnection.node.id AND this_interfaceConnection_MyImplementation1_map.node.id = $this_screenings.where.interfaceConnection.node._on.MyImplementation1.id AND this_interfaceConnection_MyImplementation1_map.node.field1 = $this_screenings.where.interfaceConnection.node._on.MyImplementation1.field1) AND EXISTS((this)-[:INTERFACE_CONNECTION]->(:MyImplementation2)) AND ANY(this_interfaceConnection_MyImplementation2_map IN [(this)-[this_interfaceConnection_MyImplementation2_ScreeningInterfaceRelationship:INTERFACE_CONNECTION]->(this_interfaceConnection_MyImplementation2:MyImplementation2)  | { node: this_interfaceConnection_MyImplementation2, relationship: this_interfaceConnection_MyImplementation2_ScreeningInterfaceRelationship } ] WHERE this_interfaceConnection_MyImplementation2_map.node.id = $this_screenings.where.interfaceConnection.node.id AND this_interfaceConnection_MyImplementation2_map.node.id = $this_screenings.where.interfaceConnection.node._on.MyImplementation2.id AND this_interfaceConnection_MyImplementation2_map.node.field2 = $this_screenings.where.interfaceConnection.node._on.MyImplementation2.field2)
            WITH this
            CALL {
            WITH this
            MATCH (this)-[:INTERFACE_CONNECTION]->(this_MyImplementation1:MyImplementation1)
            RETURN { __resolveType: \\"MyImplementation1\\", id: this_MyImplementation1.id } AS interface
            UNION
            WITH this
            MATCH (this)-[:INTERFACE_CONNECTION]->(this_MyImplementation2:MyImplementation2)
            RETURN { __resolveType: \\"MyImplementation2\\", id: this_MyImplementation2.id } AS interface
            }
            RETURN this { .id, interface: interface } as this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"this_screenings\\": {
                    \\"where\\": {
                        \\"interfaceConnection\\": {
                            \\"node\\": {
                                \\"id\\": \\"some-id\\",
                                \\"field2\\": \\"value2\\"
                            }
                        }
                    }
                }
            }"
        `);
    });
});
