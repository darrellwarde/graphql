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

import { generate } from "randomstring";
import type { UniqueType } from "../../utils/graphql-types";
import { TestHelper } from "../../utils/tests-helper";

describe("Advanced Filtering", () => {
    const testHelper = new TestHelper();

    afterEach(async () => {
        await testHelper.close();
    });

    describe.each(["ID", "String"] as const)("%s Filtering", (type) => {
        test("should find Movies IN strings", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = generate({
                readable: true,
                charset: "alphabetic",
            });

            const randomValue1 = generate({
                readable: true,
                charset: "alphabetic",
            });

            const randomValue2 = generate({
                readable: true,
                charset: "alphabetic",
            });

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                        `,
                { value }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_IN: ["${value}", "${randomValue1}", "${randomValue2}"] }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(value);
        });

        test("should find Movies REGEX", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({
                typeDefs,
                features: {
                    filters: {
                        [type]: {
                            MATCHES: true,
                        },
                    },
                },
            });

            const value = generate({
                readable: true,
                charset: "alphabetic",
            });

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                        `,
                { value: `${value}${value}` }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_MATCHES: "(?i)${value}.*" }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();
            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toBe(`${value}${value}`);
        });

        test("should find Movies NOT string", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = generate({
                readable: true,
                charset: "alphabetic",
            });

            const randomValue1 = generate({
                readable: true,
                charset: "alphabetic",
            });

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                            CREATE (:${randomType.name} {property: $randomValue1})
                        `,
                { value, randomValue1 }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { NOT: { property_EQ: "${randomValue1}" } }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);

            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(value);
        });

        test("should find Movies CONTAINS string", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = generate({
                readable: true,
                charset: "alphabetic",
            });

            const superValue = `${value}${value}`;

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $superValue})
                            CREATE (:${randomType.name} {property: $superValue})
                            CREATE (:${randomType.name} {property: $superValue})
                        `,
                { superValue }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_CONTAINS: "${value}" }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(3);

            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(superValue);
        });

        test("should find Movies STARTS_WITH string", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = generate({
                readable: true,
                charset: "alphabetic",
            });

            const superValue = `${value}${value}`;

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $superValue})
                            CREATE (:${randomType.name} {property: $superValue})
                            CREATE (:${randomType.name} {property: $superValue})
                        `,
                { superValue }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_STARTS_WITH: "${value}" }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(3);

            ((gqlResult.data as any)[randomType.plural] as any[]).forEach((x) => {
                expect(x.property).toEqual(superValue);
            });
        });

        test("should find Movies ENDS_WITH string", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = generate({
                readable: true,
                charset: "alphabetic",
            });

            const notValue = generate({
                readable: true,
                charset: "alphabetic",
            });

            const superValue = `${value}${value}`;

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                            CREATE (:${randomType.name} {property: $notValue})
                            CREATE (:${randomType.name} {property: $superValue})
                        `,
                { value, notValue, superValue }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_ENDS_WITH: "${value}" }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(2);
        });
    });

    describe("String Filtering", () => {
        test("should find Movies implicit EQ string", async () => {
            const movieType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${movieType.name} @node {
                            title: String
                        }
                    `;

            await testHelper.initNeo4jGraphQL({
                typeDefs,
            });

            const animatrix = "The Animatrix";
            const matrix = "The Matrix";
            const matrixReloaded = "The Matrix Reloaded";
            const matrixRevolutions = "The Matrix Revolutions";

            await testHelper.executeCypher(
                `
                            CREATE (:${movieType.name} {title: $animatrix})
                            CREATE (:${movieType.name} {title: $matrix})
                            CREATE (:${movieType.name} {title: $matrixReloaded})
                            CREATE (:${movieType.name} {title: $matrixRevolutions})
                        `,
                { animatrix, matrix, matrixReloaded, matrixRevolutions }
            );

            const query = `
                            {
                                ${movieType.plural}(where: { title_EQ: "${matrix}" }) {
                                    title
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[movieType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[movieType.plural]).toEqual(expect.arrayContaining([{ title: matrix }]));
        });

        test("should find Movies EQ string", async () => {
            const movieType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${movieType.name} @node {
                            title: String
                        }
                    `;

            await testHelper.initNeo4jGraphQL({
                typeDefs,
            });

            const animatrix = "The Animatrix";
            const matrix = "The Matrix";
            const matrixReloaded = "The Matrix Reloaded";
            const matrixRevolutions = "The Matrix Revolutions";

            await testHelper.executeCypher(
                `
                            CREATE (:${movieType.name} {title: $animatrix})
                            CREATE (:${movieType.name} {title: $matrix})
                            CREATE (:${movieType.name} {title: $matrixReloaded})
                            CREATE (:${movieType.name} {title: $matrixRevolutions})
                        `,
                { animatrix, matrix, matrixReloaded, matrixRevolutions }
            );

            const query = `
                            {
                                ${movieType.plural}(where: { title_EQ: "${matrix}" }) {
                                    title
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[movieType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[movieType.plural]).toEqual(expect.arrayContaining([{ title: matrix }]));
        });

        test("should find Movies GT string", async () => {
            const movieType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${movieType.name} @node {
                            title: String
                        }
                    `;

            await testHelper.initNeo4jGraphQL({
                features: {
                    filters: {
                        String: {
                            LT: true,
                            GT: true,
                            LTE: true,
                            GTE: true,
                        },
                    },
                },
                typeDefs,
            });

            const animatrix = "The Animatrix";
            const matrix = "The Matrix";
            const matrixReloaded = "The Matrix Reloaded";
            const matrixRevolutions = "The Matrix Revolutions";

            await testHelper.executeCypher(
                `
                            CREATE (:${movieType.name} {title: $animatrix})
                            CREATE (:${movieType.name} {title: $matrix})
                            CREATE (:${movieType.name} {title: $matrixReloaded})
                            CREATE (:${movieType.name} {title: $matrixRevolutions})
                        `,
                { animatrix, matrix, matrixReloaded, matrixRevolutions }
            );

            const query = `
                            {
                                ${movieType.plural}(where: { title_GT: "${matrix}" }) {
                                    title
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[movieType.plural]).toHaveLength(2);
            expect((gqlResult.data as any)[movieType.plural]).toEqual(
                expect.arrayContaining([{ title: matrixReloaded }, { title: matrixRevolutions }])
            );
        });

        test("should find Movies LT string", async () => {
            const movieType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${movieType.name} @node {
                            title: String
                        }
                    `;

            await testHelper.initNeo4jGraphQL({
                features: {
                    filters: {
                        String: {
                            LT: true,
                            GT: true,
                            LTE: true,
                            GTE: true,
                        },
                    },
                },
                typeDefs,
            });

            const matrix = "The Matrix";
            const matrixReloaded = "The Matrix Reloaded";
            const matrixRevolutions = "The Matrix Revolutions";
            const matrixResurrections = "The Matrix Resurrections";

            await testHelper.executeCypher(
                `
                            CREATE (:${movieType.name} {title: $matrix})
                            CREATE (:${movieType.name} {title: $matrixReloaded})
                            CREATE (:${movieType.name} {title: $matrixRevolutions})
                            CREATE (:${movieType.name} {title: $matrixResurrections})
                        `,
                { matrix, matrixReloaded, matrixRevolutions, matrixResurrections }
            );

            const query = `
                            {
                                ${movieType.plural}(where: { title_LT: "${matrixRevolutions}" }) {
                                    title
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[movieType.plural]).toHaveLength(3);
            expect((gqlResult.data as any)[movieType.plural]).toEqual(
                expect.arrayContaining([{ title: matrix }, { title: matrixReloaded }, { title: matrixResurrections }])
            );
        });

        test("should find Movies GTE string", async () => {
            const movieType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${movieType.name} @node {
                            title: String
                        }
                    `;

            await testHelper.initNeo4jGraphQL({
                features: {
                    filters: {
                        String: {
                            LT: true,
                            GT: true,
                            LTE: true,
                            GTE: true,
                        },
                    },
                },
                typeDefs,
            });

            const animatrix = "The Animatrix";
            const matrix = "The Matrix";
            const matrixReloaded = "The Matrix Reloaded";
            const matrixRevolutions = "The Matrix Revolutions";

            await testHelper.executeCypher(
                `
                            CREATE (:${movieType.name} {title: $animatrix})
                            CREATE (:${movieType.name} {title: $matrix})
                            CREATE (:${movieType.name} {title: $matrixReloaded})
                            CREATE (:${movieType.name} {title: $matrixRevolutions})
                        `,
                { animatrix, matrix, matrixReloaded, matrixRevolutions }
            );

            const query = `
                            {
                                ${movieType.plural}(where: { title_GTE: "${matrix}" }) {
                                    title
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[movieType.plural]).toHaveLength(3);
            expect((gqlResult.data as any)[movieType.plural]).toEqual(
                expect.arrayContaining([{ title: matrix }, { title: matrixReloaded }, { title: matrixRevolutions }])
            );
        });

        test("should find Movies LTE string", async () => {
            const movieType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${movieType.name} @node {
                            title: String
                        }
                    `;

            await testHelper.initNeo4jGraphQL({
                features: {
                    filters: {
                        String: {
                            LT: true,
                            GT: true,
                            LTE: true,
                            GTE: true,
                        },
                    },
                },
                typeDefs,
            });

            const matrix = "The Matrix";
            const matrixReloaded = "The Matrix Reloaded";
            const matrixRevolutions = "The Matrix Revolutions";
            const matrixResurrections = "The Matrix Resurrections";

            await testHelper.executeCypher(
                `
                            CREATE (:${movieType.name} {title: $matrix})
                            CREATE (:${movieType.name} {title: $matrixReloaded})
                            CREATE (:${movieType.name} {title: $matrixRevolutions})
                            CREATE (:${movieType.name} {title: $matrixResurrections})

                        `,
                { matrix, matrixReloaded, matrixRevolutions, matrixResurrections }
            );

            const query = `
                            {
                                ${movieType.plural}(where: { title_LTE: "${matrixRevolutions}" }) {
                                    title
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            if (gqlResult.errors) {
                console.log(JSON.stringify(gqlResult.errors, null, 2));
            }

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[movieType.plural]).toHaveLength(4);
            expect((gqlResult.data as any)[movieType.plural]).toEqual(
                expect.arrayContaining([
                    { title: matrix },
                    { title: matrixReloaded },
                    { title: matrixRevolutions },
                    { title: matrixResurrections },
                ])
            );
        });
    });

    describe.each(["Int", "Float"] as const)("%s Filtering", (type) => {
        test("should find Movies NOT number", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            let property: number;

            if (type === "Int") {
                property = Math.floor(Math.random() * 9999);
            } else {
                property = Math.floor(Math.random() * 9999) + 0.5;
            }

            let notProperty: number;

            if (type === "Int") {
                notProperty = Math.floor(Math.random() * 9999);
            } else {
                notProperty = Math.floor(Math.random() * 9999) + 0.5;
            }

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $property})
                            CREATE (:${randomType.name} {property: $notProperty})
                        `,
                { property, notProperty }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { NOT: { property_EQ: ${notProperty} } }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(property);
        });

        test("should find Movies IN numbers", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            let value: number;

            if (type === "Int") {
                value = Math.floor(Math.random() * 9999);
            } else {
                value = Math.floor(Math.random() * 9999) + 0.5;
            }

            let randomValue1: number;

            if (type === "Int") {
                randomValue1 = Math.floor(Math.random() * 9999);
            } else {
                randomValue1 = Math.floor(Math.random() * 9999) + 0.5;
            }

            let randomValue2: number;

            if (type === "Int") {
                randomValue2 = Math.floor(Math.random() * 9999);
            } else {
                randomValue2 = Math.floor(Math.random() * 9999) + 0.5;
            }

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                        `,
                { value }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_IN: [${value}, ${randomValue1}, ${randomValue2}] }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(value);
        });

        test("should find Movies LT number", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            let value: number;

            if (type === "Int") {
                value = Math.floor(Math.random() * 9999);
            } else {
                value = Math.floor(Math.random() * 9999) + 0.5;
            }

            const lessThanValue = value - (value + 1);

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                            CREATE (:${randomType.name} {property: $lessThanValue})
                        `,
                { value, lessThanValue }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_LT: ${lessThanValue + 1} }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(lessThanValue);
        });

        test("should find Movies LTE number", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            let value: number;

            if (type === "Int") {
                value = Math.floor(Math.random() * 9999);
            } else {
                value = Math.floor(Math.random() * 9999) + 0.5;
            }

            const lessThanValue = value - (value + 1);

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                            CREATE (:${randomType.name} {property: $lessThanValue})
                        `,
                { value, lessThanValue }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_LTE: ${value} }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(2);
        });

        test("should find Movies GT number", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            let value: number;

            if (type === "Int") {
                value = Math.floor(Math.random() * 9999);
            } else {
                value = Math.floor(Math.random() * 9999) + 0.5;
            }

            const graterThanValue = value + 1;

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                            CREATE (:${randomType.name} {property: $graterThanValue})
                        `,
                { value, graterThanValue }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_GT: ${graterThanValue - 1} }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
            expect((gqlResult.data as any)[randomType.plural][0].property).toEqual(graterThanValue);
        });

        test("should find Movies GTE number", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: ${type}
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            let value: number;

            if (type === "Int") {
                value = Math.floor(Math.random() * 9999);
            } else {
                value = Math.floor(Math.random() * 9999) + 0.5;
            }

            const greaterThan = value + 1;

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                            CREATE (:${randomType.name} {property: $greaterThan})
                        `,
                { value, greaterThan }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_GTE: ${value} }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(2);
        });
    });

    describe("Boolean Filtering", () => {
        test("should find Movies equality equality", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: Boolean
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = false;

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                        `,
                { value }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { property_EQ: false }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(1);
        });

        test("should find Movies NOT boolean", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                        type ${randomType.name} @node {
                            property: Boolean
                        }
                    `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const value = false;

            await testHelper.executeCypher(
                `
                            CREATE (:${randomType.name} {property: $value})
                        `,
                { value }
            );

            const query = `
                            {
                                ${randomType.plural}(where: { NOT: { property_EQ: false } }) {
                                    property
                                }
                            }
                        `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            expect((gqlResult.data as any)[randomType.plural]).toHaveLength(0);
        });
    });

    describe("Relationship/Connection Filtering", () => {
        describe("equality", () => {
            test("should find using relationship equality on node", async () => {
                const randomType1 = testHelper.createUniqueType("Movie");
                const randomType2 = testHelper.createUniqueType("Genre");

                const typeDefs = `
                        type ${randomType1.name} @node {
                            id: ID
                            ${randomType2.plural}: [${randomType2.name}!]! @relationship(type: "IN_GENRE", direction: OUT)
                        }

                        type ${randomType2.name} @node {
                            id: ID
                        }
                `;

                await testHelper.initNeo4jGraphQL({ typeDefs });

                const rootId = generate({
                    charset: "alphabetic",
                });

                const relationId = generate({
                    charset: "alphabetic",
                });

                const randomId = generate({
                    charset: "alphabetic",
                });

                await testHelper.executeCypher(
                    `
                                CREATE (root:${randomType1.name} {id: $rootId})
                                CREATE (:${randomType1.name} {id: $randomId})
                                CREATE (relation:${randomType2.name} {id: $relationId})
                                CREATE (:${randomType2.name} {id: $randomId})
                                MERGE (root)-[:IN_GENRE]->(relation)
                            `,
                    { rootId, relationId, randomId }
                );

                const query = `
                        {
                            ${randomType1.plural}(where: { ${randomType2.plural}_SOME: { id_EQ: "${relationId}" } }) {
                                id
                                ${randomType2.plural} {
                                    id
                                }
                            }
                        }
                    `;

                const gqlResult = await testHelper.executeGraphQL(query);

                expect(gqlResult.errors).toBeUndefined();

                expect((gqlResult.data as any)[randomType1.plural]).toHaveLength(1);
                expect((gqlResult.data as any)[randomType1.plural][0]).toMatchObject({
                    id: rootId,
                    [randomType2.plural]: [{ id: relationId }],
                });
            });

            test("should find using equality on node using connection", async () => {
                const Movie = testHelper.createUniqueType("Movie");
                const Genre = testHelper.createUniqueType("Genre");

                const typeDefs = `
                        type ${Movie} @node {
                            id: ID
                            genres: [${Genre}!]! @relationship(type: "IN_GENRE", direction: OUT)
                        }

                        type ${Genre} @node {
                            id: ID
                        }
                `;

                await testHelper.initNeo4jGraphQL({ typeDefs });

                const movieId = generate({
                    charset: "alphabetic",
                });

                const genreId = generate({
                    charset: "alphabetic",
                });

                await testHelper.executeCypher(
                    `
                            CREATE (:${Movie} {id: $movieId})-[:IN_GENRE]->(:${Genre} {id:$genreId})
                        `,
                    { movieId, genreId }
                );

                const query = `
                        {
                            ${Movie.plural}(where: { genresConnection_SOME: { node: { id_EQ: "${genreId}" } } }) {
                                id
                                genres {
                                    id
                                }
                            }
                        }
                    `;

                const gqlResult = await testHelper.executeGraphQL(query);

                expect(gqlResult.errors).toBeUndefined();

                expect(gqlResult.data as any).toEqual({
                    [Movie.plural]: [
                        {
                            id: movieId,
                            genres: [{ id: genreId }],
                        },
                    ],
                });
            });

            test("should find using equality on relationship using connection", async () => {
                const Movie = testHelper.createUniqueType("Movie");
                const Genre = testHelper.createUniqueType("Genre");

                const typeDefs = `
                        type ${Movie} @node {
                            id: ID
                            genres: [${Genre}!]! @relationship(type: "IN_GENRE", direction: OUT, properties: "ActedIn")
                        }

                        type ${Genre} @node {
                            id: ID
                        }

                        type ActedIn @relationshipProperties {
                            id: String
                        }
                `;

                await testHelper.initNeo4jGraphQL({ typeDefs });

                const movieId = generate({
                    charset: "alphabetic",
                });

                const genreId = generate({
                    charset: "alphabetic",
                });

                const actedInId = generate({
                    charset: "alphabetic",
                });

                await testHelper.executeCypher(
                    `
                            CREATE (movie:${Movie} {id: $movieId})-[:IN_GENRE {id:$actedInId}]->(:${Genre} {id:$genreId})
                        `,
                    { movieId, genreId, actedInId }
                );

                const query = `
                        {
                            ${Movie.plural}(where: { genresConnection_SOME: { edge: { id_EQ: "${actedInId}" } } }) {
                                id
                                genres {
                                    id
                                }
                            }
                        }
                    `;

                const gqlResult = await testHelper.executeGraphQL(query);

                expect(gqlResult.errors).toBeUndefined();
                expect(gqlResult.data as any).toEqual({
                    [Movie.plural]: [
                        {
                            id: movieId,
                            genres: [{ id: genreId }],
                        },
                    ],
                });
            });

            test("should find relationship and node property equality using connection", async () => {
                const Movie = testHelper.createUniqueType("Movie");
                const Genre = testHelper.createUniqueType("Genre");

                const typeDefs = `
                        type ${Movie} @node {
                            id: ID
                            genres: [${Genre}!]! @relationship(type: "IN_GENRE", direction: OUT, properties: "ActedIn")
                        }

                        type ${Genre} @node {
                            id: ID
                        }

                        type ActedIn @relationshipProperties {
                            id: String
                        }
                `;

                await testHelper.initNeo4jGraphQL({ typeDefs });

                const movieId = generate({
                    charset: "alphabetic",
                });

                const genreId = generate({
                    charset: "alphabetic",
                });

                const actedInId = generate({
                    charset: "alphabetic",
                });

                await testHelper.executeCypher(
                    `
                            CREATE (:${Movie} {id: $movieId})-[:IN_GENRE {id:$actedInId}]->(:${Genre} {id:$genreId})
                        `,
                    { movieId, genreId, actedInId }
                );

                const query = `
                        {
                            ${Movie.plural}(where: { genresConnection_SOME: { node: { id_EQ: "${genreId}" } edge: { id_EQ: "${actedInId}" } } }) {
                                id
                                genres {
                                    id
                                }
                            }
                        }
                    `;

                const gqlResult = await testHelper.executeGraphQL(query);

                expect(gqlResult.errors).toBeUndefined();

                expect(gqlResult.data as any).toEqual({
                    [Movie.plural]: [
                        {
                            id: movieId,
                            genres: [{ id: genreId }],
                        },
                    ],
                });
            });
        });

        describe("NOT", () => {
            test("should find using NOT on relationship", async () => {
                const randomType1 = testHelper.createUniqueType("Movie");
                const randomType2 = testHelper.createUniqueType("Genre");

                const typeDefs = `
                        type ${randomType1.name} @node {
                            id: ID
                            ${randomType2.plural}: [${randomType2.name}!]! @relationship(type: "IN_GENRE", direction: OUT)
                        }

                        type ${randomType2.name} @node {
                            id: ID
                        }
                `;

                await testHelper.initNeo4jGraphQL({ typeDefs });

                const rootId1 = generate({
                    charset: "alphabetic",
                });
                const rootId2 = generate({
                    charset: "alphabetic",
                });

                const relationId1 = generate({
                    charset: "alphabetic",
                });
                const relationId2 = generate({
                    charset: "alphabetic",
                });

                await testHelper.executeCypher(
                    `
                                CREATE (root1:${randomType1.name} {id: $rootId1})
                                CREATE (root2:${randomType1.name} {id: $rootId2})
                                CREATE (relation1:${randomType2.name} {id: $relationId1})
                                CREATE (relation2:${randomType2.name} {id: $relationId2})
                                MERGE (root1)-[:IN_GENRE]->(relation1)
                                MERGE (root2)-[:IN_GENRE]->(relation2)
                            `,
                    { rootId1, rootId2, relationId1, relationId2 }
                );

                const query = /* GraphQL */ `
                        {
                            ${randomType1.plural}(where: { NOT: { ${randomType2.plural}_SOME: { id_EQ: "${relationId2}" } } }) {
                                id
                                ${randomType2.plural} {
                                    id
                                }
                            }
                        }
                    `;

                const gqlResult = await testHelper.executeGraphQL(query);

                expect(gqlResult.errors).toBeUndefined();

                expect((gqlResult.data as any)[randomType1.plural]).toHaveLength(1);
                expect((gqlResult.data as any)[randomType1.plural][0]).toMatchObject({
                    id: rootId1,
                    [randomType2.plural]: [{ id: relationId1 }],
                });
            });

            test("should find using relationship properties and connections", async () => {
                const randomType1 = testHelper.createUniqueType("Movie");
                const randomType2 = testHelper.createUniqueType("Genre");

                const typeDefs = `
                        type ${randomType1.name} @node {
                            id: ID
                            ${randomType2.plural}: [${randomType2.name}!]! @relationship(type: "IN_GENRE", direction: OUT, properties: "ActedIn")
                        }

                        type ${randomType2.name} @node {
                            id: ID
                        }

                        type ActedIn @relationshipProperties {
                            id: ID
                        }
                `;

                await testHelper.initNeo4jGraphQL({ typeDefs });

                const rootId1 = generate({
                    charset: "alphabetic",
                });
                const rootId2 = generate({
                    charset: "alphabetic",
                });

                const relationId1 = generate({
                    charset: "alphabetic",
                });
                const relationId2 = generate({
                    charset: "alphabetic",
                });
                const actedInId = generate({
                    charset: "alphabetic",
                });

                await testHelper.executeCypher(
                    `
                            CREATE (:${randomType1.name} {id: $rootId1})-[:IN_GENRE {id: $actedInId}]->(:${randomType2.name} {id: $relationId1})
                            CREATE (:${randomType1.name} {id: $rootId2})-[:IN_GENRE {id: randomUUID()}]->(:${randomType2.name} {id: $relationId2})
                        `,
                    { rootId1, rootId2, relationId1, relationId2, actedInId }
                );

                const query = `
                        {
                            ${randomType1.plural}(where: { ${randomType2.plural}Connection_NONE: { edge: { id_EQ: "${actedInId}" } } }) {
                                id
                                ${randomType2.plural} {
                                    id
                                }
                            }
                        }
                    `;

                const gqlResult = await testHelper.executeGraphQL(query);

                expect(gqlResult.errors).toBeUndefined();

                expect((gqlResult.data as any)[randomType1.plural]).toHaveLength(1);
                expect((gqlResult.data as any)[randomType1.plural][0]).toMatchObject({
                    id: rootId2,
                    [randomType2.plural]: [{ id: relationId2 }],
                });
            });
        });

        describe("List Predicates", () => {
            let Movie: UniqueType;
            let Actor: UniqueType;

            const movies = [
                ...Array(4)
                    .fill(null)
                    .map((_, i) => ({ id: generate(), budget: (i + 1) ** 2 })),
            ];
            const actors = [
                ...Array(4)
                    .fill(null)
                    .map((_, i) => ({ id: generate(), flag: i % 2 === 0 })),
            ];

            beforeEach(async () => {
                Movie = testHelper.createUniqueType("Movie");
                Actor = testHelper.createUniqueType("Actor");

                const typeDefs = `
                type ${Movie} @node {
                    id: ID! @id @unique
                    budget: Int!
                    actors: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN)
                }

                type ${Actor} @node {
                    id: ID! @id @unique
                    flag: Boolean!
                    actedIn: [${Movie}!]! @relationship(type: "ACTED_IN", direction: OUT)
                }
            `;

                await testHelper.initNeo4jGraphQL({ typeDefs });
                await testHelper.executeCypher(
                    `
                    CREATE (m1:${Movie}) SET m1 = $movies[0]
                    CREATE (m2:${Movie}) SET m2 = $movies[1]
                    CREATE (m3:${Movie}) SET m3 = $movies[2]
                    CREATE (m4:${Movie}) SET m4 = $movies[3]
                    CREATE (a1:${Actor}) SET a1 = $actors[0]
                    CREATE (a2:${Actor}) SET a2 = $actors[1]
                    CREATE (a3:${Actor}) SET a3 = $actors[2]
                    CREATE (a4:${Actor}) SET a4 = $actors[3]
                    MERGE (a1)-[:ACTED_IN]->(m1)<-[:ACTED_IN]-(a3)
                    MERGE (a2)-[:ACTED_IN]->(m2)<-[:ACTED_IN]-(a3)
                    MERGE (a2)-[:ACTED_IN]->(m3)<-[:ACTED_IN]-(a4)
                    MERGE (a1)-[:ACTED_IN]->(m4)<-[:ACTED_IN]-(a2)
                    MERGE (a3)-[:ACTED_IN]->(m4)
                `,
                    { movies, actors }
                );
            });

            describe("on relationship", () => {
                function generateQuery(predicate: "ALL" | "NONE" | "SINGLE" | "SOME") {
                    return /* GraphQL */ `
                    query($movieIds: [ID!]!) {
                        ${Movie.plural}(where: { AND: [{ id_IN: $movieIds }, { actors_${predicate}: { NOT: { flag_EQ: false } } }] }) {
                            id
                            actors(where: { NOT: { flag_EQ: false } }) {
                                id
                                flag
                            }
                        }
                    }
                `;
                }

                test("ALL", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("ALL"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[0]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                });

                test("NONE", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("NONE"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[2]?.id,
                        actors: [],
                    });
                });

                test("SINGLE", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("SINGLE"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[1]?.id,
                        actors: expect.toIncludeSameMembers([actors[2]]),
                    });
                });

                test("SOME", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("SOME"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(3);
                    expect(gqlMovies).toContainEqual({
                        id: movies[0]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                    expect(gqlMovies).toContainEqual({
                        id: movies[1]?.id,
                        actors: expect.toIncludeSameMembers([actors[2]]),
                    });
                    expect(gqlMovies).toContainEqual({
                        id: movies[3]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                });
            });

            describe("on relationship using NOT operator", () => {
                const generateQuery = (predicate: "ALL" | "NONE" | "SINGLE" | "SOME") => `
                    query($movieIds: [ID!]!) {
                        ${Movie.plural}(where: { AND: [{ id_IN: $movieIds }, { actors_${predicate}: { NOT: { flag_EQ: false } } }] }) {
                            id
                            actors(where: { NOT: { flag_EQ: false } }) {
                                id
                                flag
                            }
                        }
                    }
                `;

                test("ALL", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("ALL"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[0]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                });

                test("NONE", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("NONE"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[2]?.id,
                        actors: [],
                    });
                });

                test("SINGLE", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("SINGLE"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[1]?.id,
                        actors: expect.toIncludeSameMembers([actors[2]]),
                    });
                });

                test("SOME", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("SOME"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(3);
                    expect(gqlMovies).toContainEqual({
                        id: movies[0]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                    expect(gqlMovies).toContainEqual({
                        id: movies[1]?.id,
                        actors: expect.toIncludeSameMembers([actors[2]]),
                    });
                    expect(gqlMovies).toContainEqual({
                        id: movies[3]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                });
            });

            describe("on connection", () => {
                const generateQuery = (predicate: "ALL" | "NONE" | "SINGLE" | "SOME") => /* GraphQL */ `
                    query($movieIds: [ID!]!) {
                        ${Movie.plural}(where: { AND: [{ id_IN: $movieIds }, { actorsConnection_${predicate}: { node: { NOT: { flag_EQ: false } } }}] }) {
                            id
                            actors(where: { NOT: { flag_EQ: false } }) {
                                id
                                flag
                            }
                        }
                    }
                `;

                test("ALL", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("ALL"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[0]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                });

                test("NONE", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("NONE"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[2]?.id,
                        actors: [],
                    });
                });

                test("SINGLE", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("SINGLE"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[1]?.id,
                        actors: expect.toIncludeSameMembers([actors[2]]),
                    });
                });

                test("SOME", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("SOME"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(3);
                    expect(gqlMovies).toContainEqual({
                        id: movies[0]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                    expect(gqlMovies).toContainEqual({
                        id: movies[1]?.id,
                        actors: expect.toIncludeSameMembers([actors[2]]),
                    });
                    expect(gqlMovies).toContainEqual({
                        id: movies[3]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                });
            });

            describe("on connection using NOT operator", () => {
                const generateQuery = (predicate: "ALL" | "NONE" | "SINGLE" | "SOME") => `
                    query($movieIds: [ID!]!) {
                        ${Movie.plural}(where: { AND: [{ id_IN: $movieIds }, { actorsConnection_${predicate}: { node: { NOT: { flag_EQ: false } } } }] }) {
                            id
                            actors(where: { NOT: { flag_EQ: false }}) {
                                id
                                flag
                            }
                        }
                    }
                `;

                test("ALL", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("ALL"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[0]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                });

                test("NONE", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("NONE"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[2]?.id,
                        actors: [],
                    });
                });

                test("SINGLE", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("SINGLE"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(1);
                    expect(gqlMovies).toContainEqual({
                        id: movies[1]?.id,
                        actors: expect.toIncludeSameMembers([actors[2]]),
                    });
                });

                test("SOME", async () => {
                    const gqlResult = await testHelper.executeGraphQL(generateQuery("SOME"), {
                        variableValues: { movieIds: movies.map(({ id }) => id) },
                    });

                    expect(gqlResult.errors).toBeUndefined();

                    const gqlMovies = gqlResult.data?.[Movie.plural];

                    expect(gqlMovies).toHaveLength(3);
                    expect(gqlMovies).toContainEqual({
                        id: movies[0]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                    expect(gqlMovies).toContainEqual({
                        id: movies[1]?.id,
                        actors: expect.toIncludeSameMembers([actors[2]]),
                    });
                    expect(gqlMovies).toContainEqual({
                        id: movies[3]?.id,
                        actors: expect.toIncludeSameMembers([actors[0], actors[2]]),
                    });
                });
            });
        });

        test("should test for not null", async () => {
            const randomType1 = testHelper.createUniqueType("Movie");
            const randomType2 = testHelper.createUniqueType("Genre");

            const typeDefs = `
                    type ${randomType1.name} @node {
                        id: ID
                        ${randomType2.plural}: [${randomType2.name}!]! @relationship(type: "IN_GENRE", direction: OUT)
                    }

                    type ${randomType2.name} @node {
                        id: ID
                    }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const rootId = generate({
                charset: "alphabetic",
            });

            const relationId = generate({
                charset: "alphabetic",
            });

            const randomId = generate({
                charset: "alphabetic",
            });

            await testHelper.executeCypher(
                `
                            CREATE (root:${randomType1.name} {id: $rootId})
                            CREATE (:${randomType1.name} {id: $randomId})
                            CREATE (relation:${randomType2.name} {id: $relationId})
                            CREATE (:${randomType2.name} {id: $randomId})
                            MERGE (root)-[:IN_GENRE]->(relation)
                        `,
                { rootId, relationId, randomId }
            );

            const nullQuery = `
                    {
                        ${randomType1.plural}(where: { ${randomType2.plural}_SOME: null }) {
                            id
                        }
                    }
                `;

            // Test null checking (nodes without any related nodes on the specified field)

            const nullResult = await testHelper.executeGraphQL(nullQuery);

            expect(nullResult.errors).toBeUndefined();

            expect((nullResult.data as any)[randomType1.plural]).toHaveLength(1);
            expect((nullResult.data as any)[randomType1.plural][0]).toMatchObject({
                id: randomId,
            });
        });
    });

    describe("NULL Filtering", () => {
        // TODO: split in 2 tests
        test("should work for existence and non-existence", async () => {
            const randomType = testHelper.createUniqueType("Movie");

            const typeDefs = `
                type ${randomType.name} @node {
                    id: String!
                    optional: String
                }
            `;

            await testHelper.initNeo4jGraphQL({ typeDefs });

            const id1 = generate({
                readable: true,
                charset: "alphabetic",
            });

            const id2 = generate({
                readable: true,
                charset: "alphabetic",
            });

            const optionalValue = generate({
                readable: true,
                charset: "alphabetic",
            });

            await testHelper.executeCypher(
                `
                        CREATE (:${randomType.name} {id: $id1})
                        CREATE (:${randomType.name} {id: $id2, optional: $optionalValue})
                    `,
                { id1, id2, optionalValue }
            );

            // Test NULL checking

            const nullQuery = `
                    {
                        ${randomType.plural}(where: { optional_EQ: null }) {
                            id
                        }
                    }
                `;

            const nullResult = await testHelper.executeGraphQL(nullQuery);

            expect(nullResult.errors).toBeUndefined();

            expect((nullResult.data as any)[randomType.plural]).toHaveLength(1);

            expect((nullResult.data as any)[randomType.plural][0].id).toEqual(id1);

            // Test NOT NULL checking

            const notNullQuery = `
                    {
                        ${randomType.plural}(where: { NOT: { optional_EQ: null } }) {
                            id
                        }
                    }
                `;

            const notNullResult = await testHelper.executeGraphQL(notNullQuery);

            expect(notNullResult.errors).toBeUndefined();

            expect((notNullResult.data as any)[randomType.plural]).toHaveLength(1);

            expect((notNullResult.data as any)[randomType.plural][0].id).toEqual(id2);
        });
    });
});
