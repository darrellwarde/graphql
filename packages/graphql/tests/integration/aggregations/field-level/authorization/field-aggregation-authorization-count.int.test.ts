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

import type { Driver } from "neo4j-driver";
import { graphql } from "graphql";
import { generate } from "randomstring";
import { gql } from "graphql-tag";
import Neo4j from "../../../neo4j";
import { Neo4jGraphQL } from "../../../../../src/classes";
import { UniqueType } from "../../../../utils/graphql-types";
import { createJwtRequest } from "../../../../utils/create-jwt-request";

describe("Aggregate -> count", () => {
    let driver: Driver;
    let neo4j: Neo4j;

    beforeAll(async () => {
        neo4j = new Neo4j();
        driver = await neo4j.getDriver();
    });

    afterAll(async () => {
        await driver.close();
    });

    test("should return count aggregation with allow @authorization", async () => {
        const session = await neo4j.getSession();
        const jobPlanType = new UniqueType("JobPlan");

        const typeDefs = gql`
            type ${jobPlanType.name} {
                id: ID! @id
                tenantID: ID!
                name: String!
            }

            extend type ${jobPlanType.name}
                @authorization(
                    validate: [
                        { 
                            operations: [CREATE, UPDATE],
                            when: [AFTER],
                            where: { node: { tenantID: "$context.jwt.tenant_id" } }
                        },
                        { 
                            operations: [READ, UPDATE, CREATE_RELATIONSHIP, DELETE_RELATIONSHIP, DELETE],
                            when:[BEFORE], 
                            where: {node: { tenantID: "$context.jwt.tenant_id" } }
                        }
                    ]
                )
        `;

        const tenantID = generate({
            charset: "alphabetic",
        });

        const secret = "secret";

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: "secret",
                },
            },
        });

        const query = `
            query {
                ${jobPlanType.operations.aggregate}(where: {tenantID: "${tenantID}"}) {
                  count
                }
            }
        `;

        try {
            await session.run(
                `
                    CREATE (:${jobPlanType.name} {tenantID: $tenantID})
                    CREATE (:${jobPlanType.name} {tenantID: $tenantID})
                    CREATE (:${jobPlanType.name} {tenantID: $tenantID})
                `,
                { tenantID }
            );

            const req = createJwtRequest(secret, {
                tenant_id: tenantID,
            });

            const result = await graphql({
                schema: await neoSchema.getSchema(),
                source: query,
                contextValue: neo4j.getContextValuesWithBookmarks(session.lastBookmark(), { req }),
            });

            expect(result.errors).toBeFalsy();

            expect((result.data as any)[jobPlanType.operations.aggregate]).toEqual({
                count: 3,
            });
        } finally {
            await session.close();
        }
    });
});