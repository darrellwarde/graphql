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

            type MyImplementation implements MyInterface {
                id: ID! @id
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
            WHERE EXISTS((this)-[:INTERFACE_CONNECTION]->(:MyImplementation)) AND ANY(this_interfaceConnection_MyImplementation_map IN [(this)-[this_interfaceConnection_MyImplementation_ScreeningInterfaceRelationship:INTERFACE_CONNECTION]->(this_interfaceConnection_MyImplementation:MyImplementation)  | { node: this_interfaceConnection_MyImplementation, relationship: this_interfaceConnection_MyImplementation_ScreeningInterfaceRelationship } ] WHERE this_interfaceConnection_MyImplementation_map.node.id = $this_screenings.where.interfaceConnection.node.id)
            WITH this
            CALL {
            WITH this
            MATCH (this)-[:INTERFACE_CONNECTION]->(this_MyImplementation:MyImplementation)
            RETURN { __resolveType: \\"MyImplementation\\", id: this_MyImplementation.id } AS interface
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
});
