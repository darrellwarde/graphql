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

import { GraphQLError } from "graphql";
import type { UniqueType } from "../../../utils/graphql-types";
import { TestHelper } from "../../../utils/tests-helper";

describe("@alias directive", () => {
    const testHelper = new TestHelper();

    let typeActor: UniqueType;
    let typeMovie: UniqueType;

    beforeEach(async () => {
        typeMovie = testHelper.createUniqueType("Movie");
        typeActor = testHelper.createUniqueType("Actor");

        const typeDefs = `
            type ${typeActor} @node {
                name: String!
                nameAgain: String @alias(property: "name")
                movies: [${typeMovie}!]! @relationship(type: "ACTED_IN", direction: OUT)
            }
            
            type ${typeMovie} @node {
                title: String
                titleAgain: String @alias(property: "title")
                id: ID! @id @unique
                actors: [${typeActor}!]! @relationship(type: "ACTED_IN", direction: IN)
            }
        `;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
        });
    });

    afterEach(async () => {
        await testHelper.close();
    });

    test("Update mutation with top-level connectOrCreate alias referring to existing field, include both fields as inputs", async () => {
        const query = /* GraphQL */ `
            mutation {
              ${typeActor.operations.update}(
                update: {
                  name_SET: "Tom Hanks 2"
                    movies: {
                      connectOrCreate: {
                        where: { node: { id_EQ: 5 } }
                        onCreate: { node: { title: "The Terminal", titleAgain: "oops" } }
                      }
                    }
                }
                where: { name_EQ: "Tom Hanks"}
              ) {
                ${typeActor.plural} {
                  name
                }
              }
            }
            `;

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeDefined();
        expect(gqlResult.errors).toHaveLength(1);

        expect(gqlResult.errors).toEqual([
            new GraphQLError(`Conflicting modification of [[title]], [[titleAgain]] on type ${typeMovie.name}`),
        ]);
    });

    test("Create mutation with alias referring to existing field, include only field as inputs", async () => {
        const userMutation = `
            mutation {
                ${typeActor.operations.create}(input: {
                    name: "Tom Hanks",
                    movies: {
                        connectOrCreate: {
                            where: { node: { id_EQ: "1234" } }
                            onCreate: { node: { title: "Forrest Gump" } }
                        }
                    }
                }) {
                info {
                    nodesCreated
                }
            }
        }
        `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeUndefined();
        expect((gqlResult?.data as any)?.[typeActor.operations.create]?.info.nodesCreated).toBe(2);
    });
    test("Create mutation with alias referring to existing field, include only alias as inputs", async () => {
        const userMutation = `
            mutation {
                ${typeActor.operations.create}(input: {
                    name: "Hanks",
                    movies: {
                        connectOrCreate: {
                            where: { node: { id_EQ: "2341" } }
                            onCreate: { node: { titleAgain: "Forrest Run" } }
                        }
                    }
                }) {
                info {
                    nodesCreated
                }
            }
        }
        `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeUndefined();
        expect((gqlResult?.data as any)?.[typeActor.operations.create]?.info.nodesCreated).toBe(2);
    });
    test("Create mutation with alias referring to existing field, include both fields as inputs", async () => {
        const userMutation = `
            mutation {
                ${typeActor.operations.create}(input: {
                    name: "Tom Hanks",
                    movies: {
                        connectOrCreate: {
                            where: { node: { id_EQ: "3412" } }
                            onCreate: { node: { title: "Forrest Gump", titleAgain: "Forrest G" } }
                        }
                    }
                }) {
                info {
                    nodesCreated
                }
            }
        }
        `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeDefined();
        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors).toEqual([
            new GraphQLError(`Conflicting modification of [[title]], [[titleAgain]] on type ${typeMovie.name}`),
        ]);

        expect((gqlResult?.data as any)?.[typeActor.operations.create]?.actors).toBeUndefined();
    });

    test("Update mutation with alias referring to existing field, include only one field as inputs", async () => {
        const userMutation = /* GraphQL */ `
            mutation {
                ${typeActor.operations.update}(update: {
                    name_SET: "a",
                    movies: [
                      {
                        connectOrCreate: [
                          {
                            onCreate: {
                              node: {
                                title: "b"
                              }
                            },
                            where: {
                              node: {
                                id_EQ: "123"
                              }
                            }
                          }
                        ]
                      }
                    ]
                  }) {
                    info {
                        nodesCreated
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeUndefined();
    });
    test("Update mutation with alias referring to existing field, include both fields as inputs", async () => {
        const userMutation = /* GraphQL */ `
            mutation {
                ${typeActor.operations.update}(update: {
                    name_SET: "a",
                    movies: [
                      {
                        connectOrCreate: [
                          {
                            onCreate: {
                              node: {
                                title: "b",
                                titleAgain: "bad"
                              }
                            },
                            where: {
                              node: {
                                id_EQ: "123"
                              }
                            }
                          }
                        ]
                      }
                    ]
                }) {
                    info {
                        nodesCreated
                    }
                }
            }`;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeDefined();
        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors).toEqual([
            new GraphQLError(`Conflicting modification of [[title]], [[titleAgain]] on type ${typeMovie.name}`),
        ]);

        expect((gqlResult?.data as any)?.[typeActor.operations.update]?.info).toBeUndefined();
    });
    test("Update mutation nested with create, alias referring to existing field, include both fields as inputs", async () => {
        const userMutation = /* GraphQL */ `
            mutation {
                ${typeActor.operations.update}(update: {
                    name_SET: "a",
                    movies: [
                        {
                            update: {
                              node: {
                                title_SET: "b",
                                actors: [
                                  {
                                    create: [
                                      {
                                        node: {
                                          name: "c",
                                          movies: {
                                            connectOrCreate: [
                                              {
                                                onCreate: {
                                                  node: {
                                                    title: "d",
                                                    titleAgain: "bad"
                                                  }
                                                },
                                                where: {
                                                  node: {
                                                    id_EQ: "1"
                                                  }
                                                }
                                              }
                                            ]
                                          }
                                        }
                                      }
                                    ]
                                  }
                                ]
                              }
                            }
                          }
                    ]
                }) {
                    info {
                        nodesCreated
                    }
                }
            }`;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeDefined();
        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors).toEqual([
            new GraphQLError(`Conflicting modification of [[title]], [[titleAgain]] on type ${typeMovie.name}`),
        ]);
      
        expect((gqlResult?.data as any)?.[typeActor.operations.update]?.info).toBeUndefined();
    });
    test("Update mutation nested with create, alias referring to existing field, include only one field as inputs", async () => {
        const userMutation = /* GraphQL */ `
            mutation {
                ${typeActor.operations.update}(update: {
                    name_SET: "a",
                    movies: [
                        {
                            update: {
                              node: {
                                title_SET: "b",
                                actors: [
                                  {
                                    create: [
                                      {
                                        node: {
                                          name: "c",
                                          movies: {
                                            connectOrCreate: [
                                              {
                                                onCreate: {
                                                  node: {
                                                    title: "d",
                                                  }
                                                },
                                                where: {
                                                  node: {
                                                    id_EQ: "1"
                                                  }
                                                }
                                              }
                                            ]
                                          }
                                        }
                                      }
                                    ]
                                  }
                                ]
                              }
                            }
                          }
                    ]
                }) {
                    info {
                        nodesCreated
                    }
                }
            }`;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeUndefined();
    });
});
