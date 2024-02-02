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

import type { DocumentNode } from "graphql";
import { Neo4jGraphQL } from "../../../src";
import { formatCypher, formatParams, translateQuery } from "../utils/tck-test-utils";

describe("https://github.com/neo4j/graphql/issues/1933", () => {
    let typeDefs: DocumentNode;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = /* GraphQL */ `
            type Employee {
                employeeId: ID! @unique
                firstName: String! @settable(onCreate: false, onUpdate: false)
                lastName: String @settable(onCreate: false, onUpdate: false)
                projects: [Project!]!
                    @relationship(type: "PARTICIPATES", direction: OUT, properties: "EmployeeParticipationProperties")
            }

            interface EmployeeParticipationProperties @relationshipProperties {
                allocation: Float
            }

            type Project {
                projectId: ID! @unique
                name: String! @settable(onCreate: false, onUpdate: false)
                description: String
                employees: [Employee!]!
                    @relationship(type: "PARTICIPATES", direction: IN, properties: "EmployeeParticipationProperties")
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
        });
    });

    test("should compare for SUM_LTE allocation in return statement rather than the WITH clause", async () => {
        const query = /* GraphQL */ `
            {
                employees(where: { projectsAggregate: { edge: { allocation_SUM_LTE: 25 } } }) {
                    employeeId
                    firstName
                    lastName
                    projectsAggregate {
                        count
                        edge {
                            allocation {
                                max
                                min
                                average
                                sum
                            }
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Employee)
            CALL {
                WITH this
                MATCH (this)-[this0:PARTICIPATES]->(this1:Project)
                RETURN sum(this0.allocation) <= $param0 AS var2
            }
            WITH *
            WHERE var2 = true
            CALL {
                WITH this
                MATCH (this)-[this3:PARTICIPATES]->(this4:Project)
                RETURN count(this4) AS var5
            }
            CALL {
                WITH this
                MATCH (this)-[this6:PARTICIPATES]->(this7:Project)
                RETURN { min: min(this6.allocation), max: max(this6.allocation), average: avg(this6.allocation), sum: sum(this6.allocation) } AS var8
            }
            RETURN this { .employeeId, .firstName, .lastName, projectsAggregate: { count: var5, edge: { allocation: var8 } } } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": 25
            }"
        `);
    });

    test("should compare for LTE allocation in return statement", async () => {
        const query = /* GraphQL */ `
            {
                employees(where: { projectsAggregate: { edge: { allocation_LTE: 25 } } }) {
                    employeeId
                    firstName
                    lastName
                    projectsAggregate {
                        count
                        edge {
                            allocation {
                                max
                                min
                                average
                                sum
                            }
                        }
                    }
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:Employee)
            CALL {
                WITH this
                MATCH (this)-[this0:PARTICIPATES]->(this1:Project)
                RETURN any(var2 IN collect(this0.allocation) WHERE var2 <= $param0) AS var3
            }
            WITH *
            WHERE var3 = true
            CALL {
                WITH this
                MATCH (this)-[this4:PARTICIPATES]->(this5:Project)
                RETURN count(this5) AS var6
            }
            CALL {
                WITH this
                MATCH (this)-[this7:PARTICIPATES]->(this8:Project)
                RETURN { min: min(this7.allocation), max: max(this7.allocation), average: avg(this7.allocation), sum: sum(this7.allocation) } AS var9
            }
            RETURN this { .employeeId, .firstName, .lastName, projectsAggregate: { count: var6, edge: { allocation: var9 } } } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": 25
            }"
        `);
    });
});
