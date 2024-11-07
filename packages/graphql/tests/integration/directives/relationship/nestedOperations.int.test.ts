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

import type { UniqueType } from "../../../utils/graphql-types";
import { TestHelper } from "../../../utils/tests-helper";

describe("@relationhip - nestedOperations", () => {
    const testHelper = new TestHelper();

    let Movie: UniqueType;
    let Person: UniqueType;

    beforeEach(() => {
        Movie = testHelper.createUniqueType("Movie");
        Person = testHelper.createUniqueType("Person");
    });

    afterEach(async () => {
        await testHelper.close();
    });

    describe("Related to a concrete type", () => {
        let createMutationWithNestedCreate: string;
        let createMutationWithNestedConnect: string;
        let updateMutationWithNestedCreate: string;
        let updateMutationWithNestedConnect: string;
        let updateMutationWithNestedDisconnect: string;
        let updateMutationWithNestedUpdate: string;
        let updateMutationWithNestedDelete: string;
        let deleteMutationWithNestedDelete: string;

        beforeEach(() => {
            createMutationWithNestedCreate = `#graphql
                mutation {
                    ${Movie.operations.create}(input: { id: "1", actors: { create: { node: { name: "someName" } } } }) {
                        info {
                            nodesCreated
                        }
                    }
                }
            `;
            createMutationWithNestedConnect = `#graphql
                mutation {
                    ${Movie.operations.create}(input: { id: "1", actors: { connect: { where: { node: { name_EQ: "someName" } } } } }) {
                        info {
                            nodesCreated
                        }
                    }
                }
            `;

            updateMutationWithNestedCreate = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { create: { node: { name: "someName" } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedConnect = `#graphql
                mutation {
                    ${Movie.operations.update}(
                        update: { actors: { connect: { where: { node: { name_EQ: "someName" } } } } }
                    ) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;

            updateMutationWithNestedDisconnect = `#graphql
                mutation {
                    ${Movie.operations.update}(
                        update: {
                            actors: { disconnect: { where: { node: { name_EQ: "someName" } } } }
                        }
                    ) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedUpdate = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { update: { node: { name: "someName" } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedDelete = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { delete: { where: { node: { name_EQ: "someName" } } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            deleteMutationWithNestedDelete = `#graphql
                mutation {
                    ${Movie.operations.delete}(delete: { actors: { where: { node: { name_EQ: "someName" } } } }) {
                        nodesDeleted
                    }
                }
            `;
        });

        test("Should only be able to perform the create nested op when CREATE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${Person} @node {
                    name: String
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [CREATE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeFalsy();
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedCreateResult.errors).toBeFalsy();
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the connect nested op when CONNECT is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
            type ${Person} @node {
                name: String
            }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [CONNECT])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeFalsy();

            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeFalsy();

            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the update nested op when UPDATE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${Person} @node {
                    name: String
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [UPDATE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );

            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedUpdateResult.errors).toBeFalsy();
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the disconnect nested op when DISCONNECT is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${Person} @node {
                    name: String
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [DISCONNECT])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );

            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeFalsy();
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the delete nested op when DELETE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${Person} @node {
                    name: String
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [DELETE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );

            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeFalsy();
            expect(deleteWithNestedDeleteResult.errors).toBeFalsy();
        });
    });

    describe("Related to a union type", () => {
        let PersonOne: UniqueType;
        let PersonTwo: UniqueType;

        let createMutationWithNestedCreate: string;
        let createMutationWithNestedConnect: string;

        let updateMutationWithNestedCreate: string;
        let updateMutationWithNestedConnect: string;
        let updateMutationWithNestedDisconnect: string;
        let updateMutationWithNestedUpdate: string;
        let updateMutationWithNestedDelete: string;
        let deleteMutationWithNestedDelete: string;

        beforeEach(() => {
            PersonOne = testHelper.createUniqueType("PersonOne");
            PersonTwo = testHelper.createUniqueType("PersonTwo");

            createMutationWithNestedCreate = `#graphql
                mutation {
                    ${Movie.operations.create}(input: { id: "1", actors: { ${PersonOne}: { create: { node: { name: "someName" } } } } }) {
                        info {
                            nodesCreated
                        }
                    }
                }
            `;
            createMutationWithNestedConnect = `#graphql
                mutation {
                    ${Movie.operations.create}(input: { id: "1", actors: { ${PersonOne}: { connect: { where: { node: { name_EQ: "someName" } } } } } }) {
                        info {
                            nodesCreated
                        }
                    }
                }
            `;

            updateMutationWithNestedCreate = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { ${PersonOne}: { create: { node: { name: "someName" } } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedConnect = `#graphql
                mutation {
                    ${Movie.operations.update}(
                        update: { actors: { ${PersonOne}: { connect: { where: { node: { name_EQ: "someName" } } } } } }
                    ) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;

            updateMutationWithNestedDisconnect = `#graphql
                mutation {
                    ${Movie.operations.update}(
                        update: {
                            actors: { ${PersonOne}: { disconnect: { where: { node: { name_EQ: "someName" } } } } }
                        }
                    ) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedUpdate = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { ${PersonOne}: { update: { node: { name: "someName" } } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedDelete = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { ${PersonOne}: { delete: { where: { node: { name_EQ: "someName" } } } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            deleteMutationWithNestedDelete = `#graphql
                mutation {
                    ${Movie.operations.delete}(delete: { actors: { ${PersonOne}: { where: { node: { name_EQ: "someName" } } } } }) {
                        nodesDeleted
                    }
                }
            `;
        });
        test("Should only be able to perform the create nested op when CREATE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${PersonOne} @node {
                    name: String
                }

                type ${PersonTwo} @node {
                    nameTwo: String
                }

                union ${Person} = ${PersonOne} | ${PersonTwo}

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [CREATE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeFalsy();
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedCreateResult.errors).toBeFalsy();
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the connect nested op when CONNECT is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${PersonOne} @node {
                    name: String
                }

                type ${PersonTwo} @node {
                    nameTwo: String
                }

                union ${Person} = ${PersonOne} | ${PersonTwo}

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [CONNECT])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeFalsy();

            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeFalsy();

            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the update nested op when UPDATE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${PersonOne} @node {
                    name: String
                }

                type ${PersonTwo} @node {
                    nameTwo: String
                }

                union ${Person} = ${PersonOne} | ${PersonTwo}

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [UPDATE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );

            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedUpdateResult.errors).toBeFalsy();
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the disconnect nested op when DISCONNECT is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${PersonOne} @node {
                    name: String
                }

                type ${PersonTwo} @node {
                    nameTwo: String
                }

                union ${Person} = ${PersonOne} | ${PersonTwo}

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [DISCONNECT])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );

            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeFalsy();
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the delete nested op when DELETE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                type ${PersonOne} @node {
                    name: String
                }

                type ${PersonTwo} @node {
                    nameTwo: String
                }

                union ${Person} = ${PersonOne} | ${PersonTwo}

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [DELETE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);

            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);

            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );

            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );

            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeFalsy();
            expect(deleteWithNestedDeleteResult.errors).toBeFalsy();
        });
    });

    describe("Related to an interface type", () => {
        let PersonOne: UniqueType;
        let PersonTwo: UniqueType;

        let createMutationWithNestedCreate: string;
        let createMutationWithNestedConnect: string;
        let updateMutationWithNestedCreate: string;
        let updateMutationWithNestedConnect: string;
        let updateMutationWithNestedDisconnect: string;
        let updateMutationWithNestedUpdate: string;
        let updateMutationWithNestedDelete: string;
        let deleteMutationWithNestedDelete: string;

        beforeEach(() => {
            PersonOne = testHelper.createUniqueType("PersonOne");
            PersonTwo = testHelper.createUniqueType("PersonTwo");

            createMutationWithNestedCreate = `#graphql
                mutation {
                    ${Movie.operations.create}(input: { id: "1", actors: { create: { node: { ${PersonOne}: { name: "someName" } } } } }) {
                        info {
                            nodesCreated
                        }
                    }
                }
            `;
            createMutationWithNestedConnect = `#graphql
                mutation {
                    ${Movie.operations.create}(input: { id: "1", actors: { connect: { where: { node: { name_EQ: "someName" } } } } }) {
                        info {
                            nodesCreated
                        }
                    }
                }
            `;
            updateMutationWithNestedCreate = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { create: { node: { ${PersonOne}: { name: "someName" } } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedConnect = `#graphql
                mutation {
                    ${Movie.operations.update}(
                        update: { actors: { connect: { where: { node: { name_EQ: "someName" } } } } }
                    ) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedDisconnect = `#graphql
                mutation {
                    ${Movie.operations.update}(
                        update: {
                            actors: { disconnect: { where: { node: { name_EQ: "someName" } } } }
                        }
                    ) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedUpdate = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { update: { node: { name: "someName" } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            updateMutationWithNestedDelete = `#graphql
                mutation {
                    ${Movie.operations.update}(update: { actors: { delete: { where: { node: { name_EQ: "someName" } } } } }) {
                        info {
                            nodesCreated
                            nodesDeleted
                        }
                    }
                }
            `;
            deleteMutationWithNestedDelete = `#graphql
                mutation {
                    ${Movie.operations.delete}(delete: { actors: { where: { node: { name_EQ: "someName" } } } }) {
                        nodesDeleted
                    }
                }
            `;
        });
        test("Should only be able to perform the create nested op when CREATE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                interface ${Person} {
                    name: String
                }

                type ${PersonOne} implements ${Person} @node {
                    name: String
                }

                type ${PersonTwo} implements ${Person} @node {
                    name: String
                    someOtherProperty: Int!
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [CREATE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);
            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);
            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeFalsy();
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );
            expect(updateWithNestedCreateResult.errors).toBeFalsy();
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );
            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the connect nested op when CONNECT is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                interface ${Person} {
                    name: String
                }

                type ${PersonOne} implements ${Person} @node {
                    name: String
                }

                type ${PersonTwo} implements ${Person} @node {
                    name: String
                    someOtherProperty: Int!
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [CONNECT])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);
            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);
            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeFalsy();
            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeFalsy();
            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });
        test("Should only be able to perform the update nested op when UPDATE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                interface ${Person} {
                    name: String
                }

                type ${PersonOne} implements ${Person} @node {
                    name: String
                }

                type ${PersonTwo} implements ${Person} @node {
                    name: String
                    someOtherProperty: Int!
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [UPDATE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);
            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);
            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );
            expect(updateWithNestedUpdateResult.errors).toBeFalsy();
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the disconnect nested op when DISCONNECT is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                interface ${Person} {
                    name: String
                }

                type ${PersonOne} implements ${Person} @node {
                    name: String
                }

                type ${PersonTwo} implements ${Person} @node {
                    name: String
                    someOtherProperty: Int!
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [DISCONNECT])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);
            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);
            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );
            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeFalsy();
            expect(updateWithNestedDeleteResult.errors).toBeDefined();
            expect((updateWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Field "delete" is not defined by type'
            );
            expect(deleteWithNestedDeleteResult.errors).toBeDefined();
            expect((deleteWithNestedDeleteResult.errors as any)[0].message).toInclude(
                'Unknown argument "delete" on field'
            );
        });

        test("Should only be able to perform the delete nested op when DELETE is the only nestedOperation specified", async () => {
            const typeDefs = `#graphql
                interface ${Person} {
                    name: String
                }

                type ${PersonOne} implements ${Person} @node {
                    name: String
                }

                type ${PersonTwo} implements ${Person} @node {
                    name: String
                    someOtherProperty: Int!
                }

                type ${Movie} @node {
                    id: ID
                    actors: [${Person}!]! @relationship(type: "ACTED_IN", direction: IN, nestedOperations: [DELETE])
                }
            `;
            await testHelper.initNeo4jGraphQL({ typeDefs });

            const createWithNestedCreateResult = await testHelper.executeGraphQL(createMutationWithNestedCreate);
            const createWithNestedConnectResult = await testHelper.executeGraphQL(createMutationWithNestedConnect);
            const updateWithNestedCreateResult = await testHelper.executeGraphQL(updateMutationWithNestedCreate);
            const updateWithNestedConnectResult = await testHelper.executeGraphQL(updateMutationWithNestedConnect);
            const updateWithNestedUpdateResult = await testHelper.executeGraphQL(updateMutationWithNestedUpdate);
            const updateWithNestedDisconnectResult = await testHelper.executeGraphQL(
                updateMutationWithNestedDisconnect
            );
            const updateWithNestedDeleteResult = await testHelper.executeGraphQL(updateMutationWithNestedDelete);
            const deleteWithNestedDeleteResult = await testHelper.executeGraphQL(deleteMutationWithNestedDelete);

            expect(createWithNestedCreateResult.errors).toBeDefined();
            expect((createWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(createWithNestedConnectResult.errors).toBeDefined();
            expect((createWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "actors" is not defined by type'
            );
            expect(updateWithNestedCreateResult.errors).toBeDefined();
            expect((updateWithNestedCreateResult.errors as any)[0].message).toInclude(
                'Field "create" is not defined by type'
            );
            expect(updateWithNestedConnectResult.errors).toBeDefined();
            expect((updateWithNestedConnectResult.errors as any)[0].message).toInclude(
                'Field "connect" is not defined by type'
            );
            expect(updateWithNestedUpdateResult.errors).toBeDefined();
            expect((updateWithNestedUpdateResult.errors as any)[0].message).toInclude(
                'Field "update" is not defined by type'
            );
            expect(updateWithNestedDisconnectResult.errors).toBeDefined();
            expect((updateWithNestedDisconnectResult.errors as any)[0].message).toInclude(
                'Field "disconnect" is not defined by type'
            );
            expect(updateWithNestedDeleteResult.errors).toBeFalsy();
            expect(deleteWithNestedDeleteResult.errors).toBeFalsy();
        });
    });
});
