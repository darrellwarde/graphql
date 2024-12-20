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
import { gql } from "graphql-tag";
import type { UniqueType } from "../../../utils/graphql-types";
import { TestHelper } from "../../../utils/tests-helper";

describe("@alias directive", () => {
    const testHelper = new TestHelper();

    let typeMovie: UniqueType;
    let typeSeries: UniqueType;
    let typeActor: UniqueType;

    beforeEach(async () => {
        typeMovie = testHelper.createUniqueType("Movie");
        typeSeries = testHelper.createUniqueType("Series");
        typeActor = testHelper.createUniqueType("Actor");

        const typeDefs = gql`
            type ${typeMovie.name} @node {
                title: String!
                titleAgain: String @alias(property: "title")
                isan: String! @unique
            }

            type ${typeSeries.name} @node {
                title: String!
                titleAgain: String @alias(property: "title")
                isan: String! @unique
            }

            union Production = ${typeMovie.name} | ${typeSeries.name}

            type ActedIn @relationshipProperties {
                screentime: Int!
            }

            type ${typeActor.name} @node {
                name: String!
                nameAgain: String @alias(property: "name")
                actedIn: [Production!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
            }
        `;
        await testHelper.initNeo4jGraphQL({
            typeDefs,
        });
    });

    afterEach(async () => {
        await testHelper.close();
    });

    test("Create mutation with alias referring to existing field, include both fields as inputs - first rel type", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const userMutation = `
            mutation {
                ${typeActor.operations.create}(
                    input: {
                        name: "Tom Hanks"
                        actedIn: {
                            ${typeMovie.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${movieIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 105 }
                                        node: { title: "Forrest Gump", titleAgain: "oops", isan: "${movieIsan}" }
                                    }
                                }
                            }
                            ${typeSeries.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${seriesIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 126 }
                                        node: {
                                            title: "Band of Brothers"
                                            isan: "${seriesIsan}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                ) {
                    ${typeActor.plural} {
                        name
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

        expect((gqlResult?.data as any)?.createDirectors?.directors).toBeUndefined();
    });
    test("Create mutation with alias referring to existing field, include both fields as inputs - second rel type", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const userMutation = /* GraphQL */ `
            mutation {
                ${typeActor.operations.create}(
                    input: {
                        name: "Tom Hanks"
                        actedIn: {
                            ${typeMovie.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${movieIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 105 }
                                        node: { title: "Forrest Gump", isan: "${movieIsan}" }
                                    }
                                }
                            }
                            ${typeSeries.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${seriesIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 126 }
                                        node: {
                                            title: "Band of Brothers",
                                            titleAgain: "oops",
                                            isan: "${seriesIsan}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                ) {
                    ${typeActor.plural} {
                        name
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeDefined();
        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors).toEqual([
            new GraphQLError(`Conflicting modification of [[title]], [[titleAgain]] on type ${typeSeries.name}`),
        ]);
        expect((gqlResult?.data as any)?.createDirectors?.directors).toBeUndefined();
    });
    test("Create mutation alias referring to existing field, include only one field as inputs", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const userMutation = `
            mutation {
                ${typeActor.operations.create}(
                    input: {
                        name: "Tom Hanks"
                        actedIn: {
                            ${typeMovie.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${movieIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 105 }
                                        node: { title: "Forrest Gump", isan: "${movieIsan}" }
                                    }
                                }
                            }
                            ${typeSeries.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${seriesIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 126 }
                                        node: {
                                            title: "Band of Brothers",
                                            isan: "${seriesIsan}"
                                        }
                                    }
                                }
                            }
                        }
                    }
                ) {
                    ${typeActor.plural} {
                        name
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeUndefined();
    });

    test("Create mutation with top-level connectOrCreate, alias referring to existing field, include only one field as inputs", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const query = /* GraphQL */ `
            mutation {
                ${typeActor.operations.update}(
                    update: {
                        name_SET: "Tom Hanks"
                        actedIn: {
                            ${typeMovie.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${movieIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 105 }
                                        node: { title: "Forrest Gump", isan: "${movieIsan}" }
                                    }
                                }
                            }
                            ${typeSeries.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${seriesIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 126 }
                                        node: {
                                            title: "Band of Brothers"
                                            isan: "${seriesIsan}"
                                        }
                                    }
                                }
                            }
                        }
                }){
                    ${typeActor.plural} {
                        name
                    }
                }
            }
        `;

        const gqlResult = await testHelper.executeGraphQL(query);
        expect(gqlResult.errors).toBeUndefined();
    });

    test("Create mutation with top-level connectOrCreate, alias referring to existing field, include both fields as inputs - first rel type", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const query = /* GraphQL */ `
            mutation {
                ${typeActor.operations.update}(
                    update: {
                        name_SET: "Tom Hanks"
                        actedIn: {
                            ${typeMovie.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${movieIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 105 }
                                        node: { title: "Forrest Gump", titleAgain: "oops", isan: "${movieIsan}" }
                                    }
                                }
                            }
                            ${typeSeries.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${seriesIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 126 }
                                        node: {
                                            title: "Band of Brothers"
                                            isan: "${seriesIsan}"
                                        }
                                    }
                                }
                            }
                        }
                }){
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

        expect(gqlResult?.data?.[typeActor.operations.update]?.[typeActor.plural]).toBeUndefined();
    });

    test("Create mutation with top-level connectOrCreate, alias referring to existing field, include both fields as inputs - second rel type", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const query = /* GraphQL */ `
            mutation {
                ${typeActor.operations.update}(
                    update: {
                        name_SET: "Tom Hanks"
                        actedIn: {
                            ${typeMovie.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${movieIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 105 }
                                        node: { title: "Forrest Gump", isan: "${movieIsan}" }
                                    }
                                }
                            }
                            ${typeSeries.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${seriesIsan}" } }
                                    onCreate: {
                                    edge: { screentime: 126 }
                                    node: {
                                        title: "Band of Brothers",
                                        titleAgain: "oops", 
                                        isan: "${seriesIsan}"
                                    }
                                }
                            }   
                        }
                    }
                }){
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
            new GraphQLError(`Conflicting modification of [[title]], [[titleAgain]] on type ${typeSeries.name}`),
        ]);

        expect(gqlResult?.data?.[typeActor.operations.update]?.[typeActor.plural]).toBeUndefined();
    });
    test("Create mutation with top-level connectOrCreate, alias referring to existing field, include both fields as inputs - update type", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const query = /* GraphQL */ `
            mutation {
                ${typeActor.operations.update}(
                    update: {
                        nameAgain_SET: "oops"
                        name_SET: "Tom Hanks",
                        actedIn: {
                            ${typeMovie.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${movieIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 105 }
                                        node: { title: "Forrest Gump", isan: "${movieIsan}" }
                                    }
                                }
                            }
                            ${typeSeries.name}: {
                                connectOrCreate: {
                                    where: { node: { isan_EQ: "${seriesIsan}" } }
                                    onCreate: {
                                        edge: { screentime: 126 }
                                        node: {
                                            title: "Band of Brothers",
                                            isan: "${seriesIsan}"
                                        }
                                    }
                                }
                            }
                        }
                }){
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
            new GraphQLError(`Conflicting modification of [[name_SET]], [[nameAgain_SET]] on type ${typeActor.name}`),
        ]);
        expect(gqlResult?.data?.[typeActor.operations.update]?.[typeActor.plural]).toBeUndefined();
    });

    test("Update mutation alias referring to existing field, include only one field as inputs", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const userMutation = /* GraphQL */ `
        mutation {
            ${typeActor.operations.update}(
                update: {
                    name_SET: "Tom Hanks"
                    actedIn: {
                        ${typeMovie.name}: {
                            connectOrCreate: {
                                where: { node: { isan_EQ: "${movieIsan}" } }
                                onCreate: {
                                    edge: { screentime: 105 }
                                    node: { title: "Forrest Gump", isan: "${movieIsan}" }
                                }
                            }
                        }
                        ${typeSeries.name}: {
                            connectOrCreate: {
                                where: { node: { isan_EQ: "${seriesIsan}" } }
                                onCreate: {
                                    edge: { screentime: 126 }
                                    node: {
                                        title: "Band of Brothers"
                                        isan: "${seriesIsan}"
                                    }
                                }
                            }
                        }
                    }
                }
            ) {
                ${typeActor.plural} {
                    name
                }
            }
        }
    `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeUndefined();
    });
    test("Update mutation alias referring to existing field, include both fields as inputs - first rel type", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const userMutation = /* GraphQL */ `
        mutation {
            ${typeActor.operations.update}(
                update: {
                    name_SET: "Tom Hanks"
                    actedIn: {
                        ${typeMovie.name}: {
                            connectOrCreate: {
                                where: { node: { isan_EQ: "${movieIsan}" } }
                                onCreate: {
                                    edge: { screentime: 105 }
                                    node: { title: "Forrest Gump", titleAgain: "oops", isan: "${movieIsan}" }
                                }
                            }
                        }
                        ${typeSeries.name}: {
                            connectOrCreate: {
                                where: { node: { isan_EQ: "${seriesIsan}" } }
                                onCreate: {
                                    edge: { screentime: 126 }
                                    node: {
                                        title: "Band of Brothers"
                                        isan: "${seriesIsan}"
                                    }
                                }
                            }
                        }
                    }
                }
            ) {
                ${typeActor.plural} {
                    name
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

        expect(gqlResult?.data?.[typeActor.operations.update]?.[typeActor.plural]).toBeUndefined();
    });
    test("Update mutation alias referring to existing field, include both fields as inputs - second rel type", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const userMutation = /* GraphQL */ `
        mutation {
            ${typeActor.operations.update}(
                update: {
                    name_SET: "Tom Hanks"
                    actedIn: {
                        ${typeMovie.name}: {
                            connectOrCreate: {
                                where: { node: { isan_EQ: "${movieIsan}" } }
                                onCreate: {
                                    edge: { screentime: 105 }
                                    node: { title: "Forrest Gump", isan: "${movieIsan}" }
                                }
                            }
                        }
                        ${typeSeries.name}: {
                            connectOrCreate: {
                                where: { node: { isan_EQ: "${seriesIsan}" } }
                                onCreate: {
                                    edge: { screentime: 126 }
                                    node: {
                                        title: "Band of Brothers",
                                        titleAgain: "oops", 
                                        isan: "${seriesIsan}"
                                    }
                                }
                            }
                        }
                    }
                }
            ) {
                ${typeActor.plural} {
                    name
                }
            }
        }
    `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeDefined();
        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors).toEqual([
            new GraphQLError(`Conflicting modification of [[title]], [[titleAgain]] on type ${typeSeries.name}`),
        ]);

        expect(gqlResult?.data?.[typeActor.operations.update]?.[typeActor.plural]).toBeUndefined();
    });
    test("Update mutation alias referring to existing field, include both fields as inputs - update type", async () => {
        const movieIsan = "0000-0000-03B6-0000-O-0000-0006-P";
        const seriesIsan = "0000-0001-ECC5-0000-8-0000-0001-B";

        const userMutation = /* GraphQL */ `
        mutation {
            ${typeActor.operations.update}(
                update: {
                    name_SET: "Tom Hanks",
                    nameAgain_SET: "oops", 
                    actedIn: {
                        ${typeMovie.name}: {
                            connectOrCreate: {
                                where: { node: { isan_EQ: "${movieIsan}" } }
                                onCreate: {
                                    edge: { screentime: 105 }
                                    node: { title: "Forrest Gump", isan: "${movieIsan}" }
                                }
                            }
                        }
                        ${typeSeries.name}: {
                            connectOrCreate: {
                                where: { node: { isan_EQ: "${seriesIsan}" } }
                                onCreate: {
                                    edge: { screentime: 126 }
                                    node: {
                                        title: "Band of Brothers"
                                        isan: "${seriesIsan}"
                                    }
                                }
                            }
                        }
                    }
                }
            ) {
                ${typeActor.plural} {
                    name
                }
            }
        }
    `;

        const gqlResult = await testHelper.executeGraphQL(userMutation);

        expect(gqlResult.errors).toBeDefined();
        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors).toEqual([
            new GraphQLError(`Conflicting modification of [[name_SET]], [[nameAgain_SET]] on type ${typeActor.name}`),
        ]);

        expect(gqlResult?.data?.[typeActor.operations.update]?.[typeActor.plural]).toBeUndefined();
    });
});
