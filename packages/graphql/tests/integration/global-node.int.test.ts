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

import { gql } from "graphql-tag";
import { toGlobalId } from "../../src/utils/global-ids";
import { createBearerToken } from "../utils/create-bearer-token";
import { TestHelper } from "../utils/tests-helper";

describe("Global node resolution", () => {
    const testHelper = new TestHelper();
    const secret = "secret";

    const typeFilm = testHelper.createUniqueType("Film");
    const typeUser = testHelper.createUniqueType("User");

    afterEach(async () => {
        await testHelper.close();
    });

    test("returns the correct id after create mutation when the id is autogenerated", async () => {
        const typeDefs = `type ${typeFilm.name} @node {
            dbId: ID! @id @unique @relayId @alias(property: "id")
            title: String!
        }`;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
        });

        const create = `
          mutation($input: [${typeFilm.name}CreateInput!]!) {
            ${typeFilm.operations.create}(input: $input) {
              ${typeFilm.plural} {
                  id
                  dbId
              }
            }
          }
        `;

        const mutationResult = (await testHelper.executeGraphQL(create, {
            variableValues: { input: [{ title: "2001: A Space Odyssey" }] },
        })) as {
            data: Record<string, { [key: string]: { id: string; dbId: string }[] }>;
            errors: any;
        };

        expect(mutationResult.errors).toBeUndefined();

        const createdMovie = mutationResult.data[typeFilm.operations.create]?.[typeFilm.plural]?.[0];

        const expectedId = toGlobalId({ typeName: typeFilm.name, field: "dbId", id: createdMovie?.dbId || "" });

        expect(createdMovie?.id).toEqual(expectedId);
    });

    test("returns the correct id after create mutation when the id is not autogenerated", async () => {
        const typeDefs = `type ${typeFilm.name} @node {
            title: ID! @relayId
        }`;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
        });

        const create = `
          mutation($input: [${typeFilm.name}CreateInput!]!) {
            ${typeFilm.operations.create}(input: $input) {
              ${typeFilm.plural} {
                  id
              }
            }
          }
        `;

        const expectedId = toGlobalId({ typeName: typeFilm.name, field: "title", id: "2001: A Space Odyssey" });

        const mutationResult = await testHelper.executeGraphQL(create, {
            variableValues: { input: [{ title: "2001: A Space Odyssey" }] },
        });

        expect(mutationResult.errors).toBeUndefined();

        const createdMovie = (mutationResult as { data: { [key: string]: Record<string, any> } }).data[
            typeFilm.operations.create
        ]?.[typeFilm.plural][0];
        expect(createdMovie).toEqual({ id: expectedId });
    });

    test("returns the correct id when queried", async () => {
        const typeDefs = `type ${typeFilm.name} @node {
            title: ID! @relayId
        }`;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
        });

        const query = `query {
            ${typeFilm.plural} {
                id
              }
            }`;

        const create = `
          mutation($input: [${typeFilm.name}CreateInput!]!) {
            ${typeFilm.operations.create}(input: $input) {
              ${typeFilm.plural} {
                  id
              }
            }
          }
        `;

        const expectedId = toGlobalId({
            typeName: typeFilm.name,
            field: "title",
            id: "2001: A Space Odyssey",
        });

        await testHelper.executeGraphQL(create, {
            variableValues: { input: [{ title: "2001: A Space Odyssey" }] },
        });

        const gqlResult = await testHelper.executeGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();

        const movie = (gqlResult as { data: { [key: string]: Record<string, any>[] } }).data[typeFilm.plural]?.[0];
        expect(movie).toEqual({ id: expectedId });
    });
    test("return the correct id when the underlying field is an aliased id db property", async () => {
        const typeDefs = gql`
        type ${typeFilm.name} @node {
          dbId: ID! @relayId @alias(property: "id")
          title: String!
          createdBy: ${typeUser.name}! @relationship(type: "CREATED_BY", direction: OUT)
        }

        type ${typeUser.name} @node {
          dbId: ID! @relayId @alias(property: "id")
          name: String!
          createdFilms: [${typeFilm.name}!]! @relationship(type: "CREATED_BY", direction: IN)
        }
      `;

        await testHelper.initNeo4jGraphQL({ typeDefs });

        const mutation = `
        mutation($input : [${typeUser.name}CreateInput!]!) {
          ${typeUser.operations.create} (input: $input) {
            ${typeUser.plural} {
              id
              dbId
              createdFilmsConnection {
                totalCount
                edges {
                  cursor
                  node {
                    id
                    dbId
                    title
                  }
                }
              }
            }
          }
        }
      `;

        const result = await testHelper.executeGraphQL(mutation, {
            variableValues: {
                input: [
                    {
                        dbId: 1234567,
                        name: "Johnny Appleseed",
                        createdFilms: {
                            create: [{ node: { dbId: 223454, title: "The Matrix 2: Timelord Boogaloo" } }],
                        },
                    },
                ],
            },
        });

        expect(result.errors).toBeUndefined();

        const user = (result.data as any)[typeUser.operations.create][typeUser.plural][0];

        expect(user.dbId).toBe("1234567");
        expect(user.id).toBe(toGlobalId({ typeName: typeUser.name, field: "dbId", id: 1234567 }));

        expect(user.createdFilmsConnection).toEqual({
            totalCount: 1,
            edges: [
                {
                    cursor: expect.any(String),
                    node: {
                        dbId: "223454",
                        id: toGlobalId({
                            typeName: typeFilm.name,
                            field: "dbId",
                            id: "223454",
                        }),
                        title: "The Matrix 2: Timelord Boogaloo",
                    },
                },
            ],
        });
    });
    test("return the correct id when the underlying field is of type Int", async () => {
        const typeDefs = gql`
        type ${typeFilm.name} @node {
          dbId: Int! @relayId @alias(property: "id")
          title: String!
          createdBy: ${typeUser.name}! @relationship(type: "CREATED_BY", direction: OUT)
        }

        type ${typeUser.name} @node {
          dbId: Int! @relayId @alias(property: "id")
          name: String!
          createdFilms: [${typeFilm.name}!]! @relationship(type: "CREATED_BY", direction: IN)
        }
      `;

        await testHelper.initNeo4jGraphQL({ typeDefs });

        const mutation = `
        mutation($input : [${typeUser.name}CreateInput!]!) {
          ${typeUser.operations.create} (input: $input) {
            ${typeUser.plural} {
              id
              dbId
              createdFilmsConnection {
                totalCount
                edges {
                  cursor
                  node {
                    id
                    dbId
                    title
                  }
                }
              }
            }
          }
        }
      `;

        const result = await testHelper.executeGraphQL(mutation, {
            variableValues: {
                input: [
                    {
                        dbId: 1234567,
                        name: "Johnny Appleseed",
                        createdFilms: {
                            create: [{ node: { dbId: 223454, title: "The Matrix 2: Timelord Boogaloo" } }],
                        },
                    },
                ],
            },
        });

        expect(result.errors).toBeUndefined();

        const user = (result.data as any)[typeUser.operations.create][typeUser.plural][0];

        expect(user.dbId).toBe(1234567);
        expect(user.id).toBe(toGlobalId({ typeName: typeUser.name, field: "dbId", id: 1234567 }));

        expect(user.createdFilmsConnection).toEqual({
            totalCount: 1,
            edges: [
                {
                    cursor: expect.any(String),
                    node: {
                        dbId: 223454,
                        id: toGlobalId({
                            typeName: typeFilm.name,
                            field: "dbId",
                            id: 223454,
                        }),
                        title: "The Matrix 2: Timelord Boogaloo",
                    },
                },
            ],
        });
    });
    test("sends and returns the correct selectionSet for the node", async () => {
        const typeDefs = `
        type ${typeFilm.name} @node {
          title: ID! @relayId
          website: String
        }

        type FilmActor @node {
          name: ID! @relayId
          hairColor: String
        }
      `;

        await testHelper.initNeo4jGraphQL({ typeDefs });

        const query = `
          query($id: ID!) {
            node(id: $id) {
              id
              ... on ${typeFilm.name} {
                title
                website
              }
              ... on FilmActor {
                name
                hairColor
              }
            }
          }
        `;

        const film = {
            id: toGlobalId({ typeName: typeFilm.name, field: "title", id: "The Matrix 2022" }),
            title: "The Matrix 2022",
            website: "http://whatisthematrix.com",
        };

        const firstMutation = `
        mutation($input: [${typeFilm.name}CreateInput!]!) {
          ${typeFilm.operations.create}(input: $input) {
            ${typeFilm.plural} {
                id
            }
          }
        }
      `;

        await testHelper.executeGraphQL(firstMutation, {
            variableValues: { input: [{ title: film.title, website: film.website }] },
        });
        const actor = {
            id: toGlobalId({ typeName: `FilmActor`, field: "name", id: "Keanu Reeves" }),
            name: "Keanu Reeves",
            hairColor: "BLACK",
        };

        const secondMutation = `
        mutation($input: [FilmActorCreateInput!]!) {
          createFilmActors(input: $input) {
            filmActors {
                id
            }
          }
        }
      `;

        await testHelper.executeGraphQL(secondMutation, {
            variableValues: { input: [{ name: actor.name, hairColor: actor.hairColor }] },
        });

        const filmQueryResult = await testHelper.executeGraphQL(query, {
            variableValues: { id: film.id },
        });

        expect(filmQueryResult.errors).toBeUndefined();

        const filmResult = (filmQueryResult as { data: { [key: string]: any } }).data.node;
        expect(filmResult).toEqual(film);

        const actorQueryResult = await testHelper.executeGraphQL(query, {
            variableValues: { id: actor.id },
        });

        expect(actorQueryResult.errors).toBeUndefined();

        const actorResult = (actorQueryResult as { data: { [key: string]: any } }).data.node;
        expect(actorResult).toEqual(actor);
    });
    test("it should throw forbidden when incorrect allow on a top-level node query", async () => {
        const typeDefs = `
          type ${typeUser.name} @node {
            dbId: ID! @id @unique @relayId @alias(property: "id")
            name: String!
            created: [${typeFilm.name}!]! @relationship(type: "CREATED", direction: OUT)
          }

          type ${typeFilm.name} @node {
            title: ID! @relayId
            creator: ${typeUser.name}! @relationship(type: "CREATED", direction: IN)
          }

          extend type ${typeFilm.name} @authorization(validate: [{ when: [BEFORE], where: { node: { creator: { dbId_EQ: "$jwt.sub" } } } }])
        `;

        const query = `
          query ($id: ID!) {
            node(id: $id) {
              id
              ...on ${typeFilm.name} {
                title
              }
              ...on ${typeUser.name} {
                name
              }
            }
          }
        `;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const mutation = `CREATE (this:${typeUser.name} { id: randomUUID(), name: "Johnny Appleseed" })-[:CREATED]->(film:${typeFilm.name} { title: randomUUID() }) RETURN this { id: this.dbId, film: film }`;
        const { records } = await testHelper.executeCypher(mutation);

        const record = records[0]?.toObject();
        // const dbId = record.this.dbId;
        const filmTitle = record?.this.film.properties.title;

        const token = createBearerToken(secret, { sub: "invalid" });

        const gqlResult = await testHelper.executeGraphQLWithToken(query, token, {
            variableValues: { id: toGlobalId({ typeName: typeFilm.name, field: "title", id: filmTitle }) },
        });

        expect((gqlResult.errors as any[])[0].message).toBe("Forbidden");
    });
    test("should permit access when using a correct allow auth param", async () => {
        const typeDefs = `

          type ${typeUser.name} @node {
            dbId: ID! @id @unique @relayId @alias(property: "id")
            name: String!
          }

          extend type ${typeUser.name} @authorization(validate: [{ when: [BEFORE], where: { node: { dbId_EQ: "$jwt.sub" } } }])
      `;

        const query = `
        query ($id: ID!) {
          node(id: $id) {
            id
            ...on ${typeUser.name} {
              dbId
            }
          }
        }
    `;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const mutation = `CREATE (this:${typeUser.name} { id: randomUUID(), name: "Johnny Appleseed" }) RETURN this`;
        const { records } = await testHelper.executeCypher(mutation);

        const record = records[0]?.toObject();

        const userId = record?.this.properties.id;
        const relayId = toGlobalId({ typeName: typeUser.name, field: "dbId", id: userId });

        const token = createBearerToken(secret, { sub: userId });

        const gqlResult = await testHelper.executeGraphQLWithToken(query, token, {
            variableValues: { id: relayId },
        });

        expect(gqlResult.errors).toBeUndefined();

        expect(gqlResult.data?.node).toEqual({ id: relayId, dbId: userId });
    });
    test("should permit access when using a correct allow auth param in an OR statement", async () => {
        const typeDefs = `

        type JWTPayload @jwt {
          roles: [String!]!
        }

        type ${typeUser.name} @node {
          dbId: ID! @id @unique @relayId @alias(property: "id")
          name: String!
        }

        extend type ${typeUser.name} @authorization(validate: [{ when: [BEFORE], where: { OR: [{ jwt: { roles_INCLUDES: "admin" } }, { node: { dbId_EQ: "$jwt.sub" } }] } }])
    `;

        const query = `
      query ($id: ID!) {
        node(id: $id) {
          id
          ...on ${typeUser.name} {
            dbId
          }
        }
      }
  `;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
            features: {
                authorization: {
                    key: secret,
                },
            },
        });
        const mutation = `CREATE (this:${typeUser.name} { id: randomUUID(), name: "Johnny Appleseed" }) RETURN this`;
        const { records } = await testHelper.executeCypher(mutation);

        const record = records[0]?.toObject();

        const userId = record?.this.properties.id;
        const relayId = toGlobalId({ typeName: typeUser.name, field: "dbId", id: userId });

        const token = createBearerToken(secret, { sub: userId });

        const gqlResult = await testHelper.executeGraphQLWithToken(query, token, {
            variableValues: { id: relayId },
        });

        expect(gqlResult.errors).toBeUndefined();

        expect(gqlResult.data?.node).toEqual({ id: relayId, dbId: userId });
    });
});
