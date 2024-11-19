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

import { TestHelper } from "../utils/tests-helper";

describe("Custom Scalar Filtering", () => {
    const testHelper = new TestHelper();

    afterEach(async () => {
        await testHelper.close();
    });

    describe("Single Value Custom Scalar", () => {
        test("Filter NOT CustomScalar - expect return value", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomScalar

                type ${randomType.name} @node {
                    property: CustomScalar
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = 1;
            const unwantedValue = 2;

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value})
                    CREATE (:${randomType.name} {property: $unwantedValue})
                `,
                { value, unwantedValue }
            );

            const query = `
                    {
                        ${randomType.plural}(where: { NOT: { property_EQ: ${unwantedValue} } }) { 
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(value);
        });
        test("Filter NOT CustomScalar - expect array of return values", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomScalar

                type ${randomType.name} @node {
                    property: CustomScalar
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value1 = 1;
            const value2 = 202;
            const unwantedValue = 2;

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value1})
                    CREATE (:${randomType.name} {property: $value2})
                    CREATE (:${randomType.name} {property: $unwantedValue})
                `,
                { value1, value2, unwantedValue }
            );

            const query = `
                    {
                        ${randomType.plural}(where: { NOT: { property_EQ: ${unwantedValue} } }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(2);
            expect((gqlResult.data as any)[randomType.plural]).toIncludeSameMembers([
                {
                    property: value1,
                },
                {
                    property: value2,
                },
            ]);
        });
        test("Filter NOT CustomScalar - expect no return values", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomScalar

                type ${randomType.name} @node {
                    property: CustomScalar
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = 11;

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value})
                `,
                { value }
            );

            const query = `
                    {
                        ${randomType.plural}(where: { NOT: { property_EQ: ${value} }}) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(0);
        });
        test("Filter IN CustomScalar - expect return value", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomScalar

                type ${randomType.name} @node {
                    property: CustomScalar
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = "someValue";
            const unknownValue1 = "foo";
            const unknownValue2 = "bar";

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value})
                `,
                { value }
            );

            const query = `
                    {
                        ${randomType.plural}(where: {
                                property_IN: ["${value}", "${unknownValue1}", "${unknownValue2}"]
                        }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(value);
        });
        test("Filter IN CustomScalar - expect array of return values", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomScalar

                type ${randomType.name} @node {
                    property: CustomScalar
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value1 = "someValue";
            const value2 = "someOtherValue";
            const unwantedValue = "foo";

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value1})
                    CREATE (:${randomType.name} {property: $value2})
                    CREATE (:${randomType.name} {property: $unwantedValue})
                `,
                { value1, value2, unwantedValue }
            );

            const query = `
                    {
                        ${randomType.plural}(where: {
                                property_IN: ["${value1}", "${value2}"]
                        }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(2);
            expect((gqlResult.data as any)[randomType.plural]).toIncludeSameMembers([
                {
                    property: value1,
                },
                {
                    property: value2,
                },
            ]);
        });
        test("Filter IN CustomScalar - expect no return values", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomScalar

                type ${randomType.name} @node {
                    property: CustomScalar
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = "someValue";
            const unknownValue = "someUnknownValue";

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value})
                `,
                { value }
            );

            const query = `
                    {
                        ${randomType.plural}(where: { property_IN: ["${unknownValue}"] }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(0);
        });
    });
    describe("List Custom Scalar Filtering", () => {
        test("Filter NOT CustomListScalar - expect return value", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomListScalar

                type ${randomType.name} @node {
                    property: [CustomListScalar!]
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = [1, 2, 3];
            const unwantedValue = [2, 3];

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value})
                    CREATE (:${randomType.name} {property: $unwantedValue})
                `,
                { value, unwantedValue }
            );

            const query = `
                    query($unwantedValue: [CustomListScalar!]!){
                        ${randomType.plural}(where: { NOT: { property_EQ: $unwantedValue } }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query, {
                variableValues: { unwantedValue },
            });

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(value);
        });
        test("Filter NOT CustomListScalar - expect array of return values", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomListScalar

                type ${randomType.name} @node {
                    property: [CustomListScalar!]
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value1 = [1, 2, 3];
            const value2 = ["someValue"];
            const unwantedValue = [2, 3];

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value1})
                    CREATE (:${randomType.name} {property: $value2})
                    CREATE (:${randomType.name} {property: $unwantedValue})
                `,
                { value1, value2, unwantedValue }
            );

            const query = `
                    query($unwantedValue: [CustomListScalar!]!){
                        ${randomType.plural}(where: { NOT: { property_EQ: $unwantedValue }}) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query, {
                variableValues: { unwantedValue },
            });

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(2);
            expect((gqlResult.data as any)[randomType.plural]).toIncludeSameMembers([
                {
                    property: value1,
                },
                {
                    property: value2,
                },
            ]);
        });
        test("Filter NOT CustomListScalar - expect no return values", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomListScalar

                type ${randomType.name} @node {
                    property: [CustomListScalar!]
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = [1, 2, 3];

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value})
                `,
                { value }
            );

            const query = `
                    query($value: [CustomListScalar!]!){
                        ${randomType.plural}(where: { NOT: { property_EQ: $value } }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query, {
                variableValues: { value },
            });

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(0);
        });
        test("Filter INCLUDES CustomListScalar - expect return value", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomListScalar

                type ${randomType.name} @node {
                    property: [CustomListScalar!]
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = ["val1", "val2", "val3"];
            const unwantedValue = ["foo", "bar"];

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value})
                    CREATE (:${randomType.name} {property: $unwantedValue})
                `,
                { value, unwantedValue }
            );

            const query = `
                    {
                        ${randomType.plural}(where: { property_INCLUDES: ${value[0]} }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(value);
        });
        test("Filter INCLUDES CustomListScalar - expect array of return values", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomListScalar

                type ${randomType.name} @node {
                    property: [CustomListScalar!]
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value1 = ["val1", "val2", "val3"];
            const value2 = [value1[0]];
            const unwantedValue = ["foo", "bar"];

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value1})
                    CREATE (:${randomType.name} {property: $value2})
                    CREATE (:${randomType.name} {property: $unwantedValue})
                `,
                { value1, value2, unwantedValue }
            );

            const query = `
                    {
                        ${randomType.plural}(where: { property_INCLUDES: ${value1[0]} }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(2);
            expect((gqlResult.data as any)[randomType.plural]).toIncludeSameMembers([
                {
                    property: value1,
                },
                {
                    property: value2,
                },
            ]);
        });
        test("Filter INCLUDES CustomListScalar - expect no return values", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                scalar CustomListScalar

                type ${randomType.name} @node {
                    property: [CustomListScalar!]
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = ["val1", "val2", "val3"];
            const unknownValue = "foo";

            await testHelper.executeCypher(
                `
                    CREATE (:${randomType.name} {property: $value})
                `,
                { value }
            );

            const query = `
                    {
                        ${randomType.plural}(where: { property_INCLUDES: ${unknownValue[0]} }) {
                            property
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(0);
        });
    });
});
