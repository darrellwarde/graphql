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

import type { UniqueType } from "../../../../utils/graphql-types";
import { TestHelper } from "../../../../utils/tests-helper";

describe("cypher directive filtering - Temporal", () => {
    let CustomType: UniqueType;

    const testHelper = new TestHelper();

    afterEach(async () => {
        await testHelper.close();
    });

    beforeEach(() => {
        CustomType = testHelper.createUniqueType("CustomType");
    });

    test("DateTime cypher field", async () => {
        const typeDefs = /* GraphQL */ `
            type ${CustomType} @node {
                title: String
                special_time: DateTime
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS t
                        """
                        columnName: "t"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
                CREATE (:${CustomType} { title: "test", custom_data: datetime("2024-09-03T15:30:00Z") })
                CREATE (:${CustomType} { title: "test2", custom_data: datetime("2025-09-03T15:30:00Z") })
                CREATE (:${CustomType} { title: "test3", custom_data: datetime("2023-09-03T15:30:00Z") })
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${CustomType.plural}(
                    where: {
                        special_time_GT: "2024-09-02T00:00:00Z"
                    }
                ) {
                    special_time
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [CustomType.plural]: expect.toIncludeSameMembers([
                {
                    special_time: "2024-09-03T15:30:00.000Z",
                    title: "test",
                },
                {
                    special_time: "2025-09-03T15:30:00.000Z",
                    title: "test2",
                },
            ]),
        });
    });

    test("Duration cypher field", async () => {
        const typeDefs = /* GraphQL */ `
            type ${CustomType} @node {
                title: String
                special_duration: Duration
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS d
                        """
                        columnName: "d"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
                CREATE (:${CustomType} { title: "test",  custom_data: duration("P14DT16H12M") })
                CREATE (:${CustomType} { title: "test2", custom_data: duration("P14DT16H13M") })
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${CustomType.plural}(
                    where: {
                        special_duration_EQ: "P14DT16H12M"
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [CustomType.plural]: [
                {
                    title: "test",
                },
            ],
        });
    });

    test("Duration cypher field LT", async () => {
        const typeDefs = /* GraphQL */ `
            type ${CustomType} @node {
                title: String
                special_duration: Duration
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS d
                        """
                        columnName: "d"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
                CREATE (:${CustomType} { title: "test", custom_data: duration('P14DT16H12M') })
                CREATE (:${CustomType} { title: "test2", custom_data: duration('P14DT16H13M') })    
                CREATE (:${CustomType} { title: "test3", custom_data: duration('P13DT16H13M') })    
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${CustomType.plural}(
                    where: {
                        special_duration_LT: "P14DT16H13M"
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [CustomType.plural]: expect.toIncludeSameMembers([
                {
                    title: "test",
                },
                {
                    title: "test3",
                },
            ]),
        });
    });

    test("Duration cypher field LTE", async () => {
        const typeDefs = /* GraphQL */ `
            type ${CustomType} @node {
                title: String
                special_duration: Duration
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS d
                        """
                        columnName: "d"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
                CREATE (:${CustomType} { title: "test", custom_data: duration('P14DT16H12M') })
                CREATE (:${CustomType} { title: "test2", custom_data: duration('P14DT16H13M') })
                CREATE (:${CustomType} { title: "test3", custom_data: duration('P13DT16H13M') })
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${CustomType.plural}(
                    where: {
                        special_duration_LTE: "P14DT16H12M"
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [CustomType.plural]: expect.toIncludeSameMembers([
                {
                    title: "test",
                },
                {
                    title: "test3",
                },
            ]),
        });
    });

    test("Duration cypher field GT", async () => {
        const typeDefs = /* GraphQL */ `
            type ${CustomType} @node {
                title: String
                special_duration: Duration
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS d
                        """
                        columnName: "d"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
                CREATE (:${CustomType} { title: "test", custom_data: duration('P14DT16H12M') })
                CREATE (:${CustomType} { title: "test2", custom_data: duration('P14DT16H13M') })
                CREATE (:${CustomType} { title: "test3", custom_data: duration('P13DT16H13M') })
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${CustomType.plural}(
                    where: {
                        special_duration_GT: "P14DT16H11M"
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [CustomType.plural]: expect.toIncludeSameMembers([
                {
                    title: "test",
                },
                {
                    title: "test2",
                },
            ]),
        });
    });

    test("Duration cypher field GTE", async () => {
        const typeDefs = /* GraphQL */ `
            type ${CustomType} @node {
                title: String
                special_duration: Duration
                    @cypher(
                        statement: """
                        MATCH (this)
                        RETURN this.custom_data AS d
                        """
                        columnName: "d"
                    )
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
        await testHelper.executeCypher(
            `
                CREATE (:${CustomType} { title: "test", custom_data: duration('P14DT16H12M') })
                CREATE (:${CustomType} { title: "test2", custom_data: duration('P14DT16H13M') })
                CREATE (:${CustomType} { title: "test3", custom_data: duration('P13DT16H13M') })    
            `,
            {}
        );

        const query = /* GraphQL */ `
            query {
                ${CustomType.plural}(
                    where: {
                        special_duration_GTE: "P14DT16H12M"
                    }
                ) {
                    title
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeFalsy();
        expect(gqlResult?.data).toEqual({
            [CustomType.plural]: expect.toIncludeSameMembers([
                {
                    title: "test",
                },
                {
                    title: "test2",
                },
            ]),
        });
    });
});
