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
import type { UniqueType } from "../../../../utils/graphql-types";
import { TestHelper } from "../../../../utils/tests-helper";

describe("aggregations-where-node-int - connections", () => {
    let testHelper: TestHelper;
    let User: UniqueType;
    let Post: UniqueType;

    beforeEach(async () => {
        testHelper = new TestHelper();
        User = testHelper.createUniqueType("User");
        Post = testHelper.createUniqueType("Post");
        const typeDefs = `
            type ${User} @node {
                testString: String!
                someInt: Int!
            }
    
            type ${Post} @node {
              testString: String!
              likes: [${User}!]! @relationship(type: "LIKES", direction: IN)
            }
        `;
        await testHelper.initNeo4jGraphQL({ typeDefs });
    });

    afterEach(async () => {
        await testHelper.close();
    });

    describe("AVERAGE", () => {
        const someInt1 = 1;
        const someInt2 = 2;
        const someInt3 = 3;

        test("should return posts where the average of like Int's is EQUAL to", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_EQUAL: ${avg} } } }) {
                           edges {
                            node {
                                 testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });

        test("should return posts where the average of like Int's is GT than", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;
            const avgGT = avg - 1;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_GT: ${avgGT} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });

        test("should return posts where the average of like Int's is GTE than", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_GTE: ${avg} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });

        test("should return posts where the average of like Int's is LT than", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;
            const avgLT = avg + 1;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_LT: ${avgLT} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });

        test("should return posts where the average of like Int's is LTE than", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_LTE: ${avg} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });
    });

    describe("sum", () => {
        test("should return posts where the sum of like Int's is EQUAL to", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const someInt1 = 1;
            const someInt2 = 2;
            const someInt3 = 3;

            const sum = someInt1 + someInt2 + someInt3;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_SUM_EQUAL: ${sum} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });
    });
});

describe("aggregations-where-node-int - connections - interface relationships of concrete types", () => {
    let testHelper: TestHelper;
    let User: UniqueType;
    let Post: UniqueType;
    let Person: UniqueType;

    beforeEach(async () => {
        testHelper = new TestHelper();
        User = testHelper.createUniqueType("User");
        Post = testHelper.createUniqueType("Post");
        Person = testHelper.createUniqueType("Person");

        const typeDefs = `
        interface Human {
            testString: String!
            someInt: Int!
        }

        type ${Person} implements Human @node {
            testString: String!
            someInt: Int!
        }
            type ${User} implements Human @node {
                testString: String!
                someInt: Int!
            }
    
            type ${Post} @node {
              testString: String!
              likes: [Human!]! @relationship(type: "LIKES", direction: IN)
            }
        `;
        await testHelper.initNeo4jGraphQL({ typeDefs });
    });

    afterEach(async () => {
        await testHelper.close();
    });

    describe("AVERAGE", () => {
        const someInt1 = 1;
        const someInt2 = 2;
        const someInt3 = 3;

        test("should return posts where the average of like Int's is EQUAL to", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_EQUAL: ${avg} } } }) {
                           edges {
                            node {
                                 testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });

        test("should return posts where the average of like Int's is GT than", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;
            const avgGT = avg - 1;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_GT: ${avgGT} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });

        test("should return posts where the average of like Int's is GTE than", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_GTE: ${avg} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });

        test("should return posts where the average of like Int's is LT than", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;
            const avgLT = avg + 1;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_LT: ${avgLT} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });

        test("should return posts where the average of like Int's is LTE than", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const avg = (someInt1 + someInt2 + someInt3) / 3;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_AVERAGE_LTE: ${avg} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });
    });

    describe("sum", () => {
        test("should return posts where the sum of like Int's is EQUAL to", async () => {
            const testString = generate({
                charset: "alphabetic",
                readable: true,
            });

            const someInt1 = 1;
            const someInt2 = 2;
            const someInt3 = 3;

            const sum = someInt1 + someInt2 + someInt3;

            await testHelper.executeCypher(
                `
                        CREATE (p:${Post} {testString: "${testString}"})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt1}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt2}})
                        CREATE (p)<-[:LIKES]-(:${User} {testString: "${testString}", someInt: ${someInt3}})
                        CREATE (:${Post} {testString: "${testString}"})
                    `
            );

            const query = `
                    {
                        ${Post.operations.connection}(where: { testString_EQ: "${testString}", likesAggregate: { node: { someInt_SUM_EQUAL: ${sum} } } }) {
                            edges {
                                node {
                                    testString
                                    likes {
                                        testString
                                        someInt
                                    }
                                }
                            }
                        }
                    }
                `;

            const gqlResult = await testHelper.executeGraphQL(query);

            expect(gqlResult.errors).toBeUndefined();

            const [post] = ((gqlResult.data as any)[Post.operations.connection] as any[])["edges"];
            expect(post.node.testString).toEqual(testString);
            expect(post.node.likes).toHaveLength(3);
        });
    });
});
