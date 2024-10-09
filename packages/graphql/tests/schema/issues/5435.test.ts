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

import { printSchemaWithDirectives } from "@graphql-tools/utils";
import { gql } from "graphql-tag";
import { lexicographicSortSchema } from "graphql/utilities";
import { Neo4jGraphQL } from "../../../src";

describe("https://github.com/neo4j/graphql/issues/5435", () => {
    test("filters should be generated for non-list relationships with array filters disabled", async () => {
        const typeDefs = gql`
            type User @node {
                id: ID! @id
            }

            type Post @authorization(validate: [{ where: { node: { author: { id: "$jwt.sub" } } } }]) @node {
                title: String!
                content: String!
                author: User! @relationship(type: "AUTHORED", direction: IN)
            }
        `;
        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                excludeDeprecatedFields: {
                    arrayFilters: true,
                },
                authorization: {
                    key: "key",
                },
            },
        });
        const printedSchema = printSchemaWithDirectives(lexicographicSortSchema(await neoSchema.getSchema()));

        expect(printedSchema).toMatchInlineSnapshot(`
            "schema {
              query: Query
              mutation: Mutation
            }

            \\"\\"\\"
            Information about the number of nodes and relationships created during a create mutation
            \\"\\"\\"
            type CreateInfo {
              nodesCreated: Int!
              relationshipsCreated: Int!
            }

            type CreatePostsMutationResponse {
              info: CreateInfo!
              posts: [Post!]!
            }

            type CreateUsersMutationResponse {
              info: CreateInfo!
              users: [User!]!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type IDAggregateSelection {
              longest: ID
              shortest: ID
            }

            type Mutation {
              createPosts(input: [PostCreateInput!]!): CreatePostsMutationResponse!
              createUsers(input: [UserCreateInput!]!): CreateUsersMutationResponse!
              deletePosts(delete: PostDeleteInput, where: PostWhere): DeleteInfo!
              deleteUsers(where: UserWhere): DeleteInfo!
              updatePosts(connect: PostConnectInput @deprecated(reason: \\"Top level connect input argument in update is deprecated. Use the nested connect field in the relationship within the update argument\\"), create: PostRelationInput @deprecated(reason: \\"Top level create input argument in update is deprecated. Use the nested create field in the relationship within the update argument\\"), delete: PostDeleteInput @deprecated(reason: \\"Top level delete input argument in update is deprecated. Use the nested delete field in the relationship within the update argument\\"), disconnect: PostDisconnectInput @deprecated(reason: \\"Top level disconnect input argument in update is deprecated. Use the nested disconnect field in the relationship within the update argument\\"), update: PostUpdateInput, where: PostWhere): UpdatePostsMutationResponse!
              updateUsers(update: UserUpdateInput, where: UserWhere): UpdateUsersMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            type Post {
              author(directed: Boolean = true, limit: Int, offset: Int, options: UserOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [UserSort!], where: UserWhere): User!
              authorAggregate(directed: Boolean = true, where: UserWhere): PostUserAuthorAggregationSelection
              authorConnection(after: String, directed: Boolean = true, first: Int, sort: [PostAuthorConnectionSort!], where: PostAuthorConnectionWhere): PostAuthorConnection!
              content: String!
              title: String!
            }

            type PostAggregateSelection {
              content: StringAggregateSelection!
              count: Int!
              title: StringAggregateSelection!
            }

            input PostAuthorAggregateInput {
              AND: [PostAuthorAggregateInput!]
              NOT: PostAuthorAggregateInput
              OR: [PostAuthorAggregateInput!]
              count: Int @deprecated(reason: \\"Please use the explicit _EQ version\\")
              count_EQ: Int
              count_GT: Int
              count_GTE: Int
              count_LT: Int
              count_LTE: Int
              node: PostAuthorNodeAggregationWhereInput
            }

            input PostAuthorConnectFieldInput {
              \\"\\"\\"
              Whether or not to overwrite any matching relationship with the new properties.
              \\"\\"\\"
              overwrite: Boolean! = true
              where: UserConnectWhere
            }

            type PostAuthorConnection {
              edges: [PostAuthorRelationship!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            input PostAuthorConnectionSort {
              node: UserSort
            }

            input PostAuthorConnectionWhere {
              AND: [PostAuthorConnectionWhere!]
              NOT: PostAuthorConnectionWhere
              OR: [PostAuthorConnectionWhere!]
              node: UserWhere
            }

            input PostAuthorCreateFieldInput {
              node: UserCreateInput!
            }

            input PostAuthorDeleteFieldInput {
              where: PostAuthorConnectionWhere
            }

            input PostAuthorDisconnectFieldInput {
              where: PostAuthorConnectionWhere
            }

            input PostAuthorFieldInput {
              connect: PostAuthorConnectFieldInput
              create: PostAuthorCreateFieldInput
            }

            input PostAuthorNodeAggregationWhereInput {
              AND: [PostAuthorNodeAggregationWhereInput!]
              NOT: PostAuthorNodeAggregationWhereInput
              OR: [PostAuthorNodeAggregationWhereInput!]
              id_EQUAL: ID @deprecated(reason: \\"Aggregation filters that are not relying on an aggregating function will be deprecated.\\")
            }

            type PostAuthorRelationship {
              cursor: String!
              node: User!
            }

            input PostAuthorUpdateConnectionInput {
              node: UserUpdateInput
            }

            input PostAuthorUpdateFieldInput {
              connect: PostAuthorConnectFieldInput
              create: PostAuthorCreateFieldInput
              delete: PostAuthorDeleteFieldInput
              disconnect: PostAuthorDisconnectFieldInput
              update: PostAuthorUpdateConnectionInput
              where: PostAuthorConnectionWhere
            }

            input PostConnectInput {
              author: PostAuthorConnectFieldInput
            }

            input PostCreateInput {
              author: PostAuthorFieldInput
              content: String!
              title: String!
            }

            input PostDeleteInput {
              author: PostAuthorDeleteFieldInput
            }

            input PostDisconnectInput {
              author: PostAuthorDisconnectFieldInput
            }

            type PostEdge {
              cursor: String!
              node: Post!
            }

            input PostOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more PostSort objects to sort Posts by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [PostSort!]
            }

            input PostRelationInput {
              author: PostAuthorCreateFieldInput
            }

            \\"\\"\\"
            Fields to sort Posts by. The order in which sorts are applied is not guaranteed when specifying many fields in one PostSort object.
            \\"\\"\\"
            input PostSort {
              content: SortDirection
              title: SortDirection
            }

            input PostUpdateInput {
              author: PostAuthorUpdateFieldInput
              content: String
              title: String
            }

            type PostUserAuthorAggregationSelection {
              count: Int!
              node: PostUserAuthorNodeAggregateSelection
            }

            type PostUserAuthorNodeAggregateSelection {
              id: IDAggregateSelection!
            }

            input PostWhere {
              AND: [PostWhere!]
              NOT: PostWhere
              OR: [PostWhere!]
              author: UserWhere
              authorAggregate: PostAuthorAggregateInput
              authorConnection: PostAuthorConnectionWhere
              content: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              content_CONTAINS: String
              content_ENDS_WITH: String
              content_EQ: String
              content_IN: [String!]
              content_STARTS_WITH: String
              title: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              title_CONTAINS: String
              title_ENDS_WITH: String
              title_EQ: String
              title_IN: [String!]
              title_STARTS_WITH: String
            }

            type PostsConnection {
              edges: [PostEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            type Query {
              posts(limit: Int, offset: Int, options: PostOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [PostSort!], where: PostWhere): [Post!]!
              postsAggregate(where: PostWhere): PostAggregateSelection!
              postsConnection(after: String, first: Int, sort: [PostSort!], where: PostWhere): PostsConnection!
              users(limit: Int, offset: Int, options: UserOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [UserSort!], where: UserWhere): [User!]!
              usersAggregate(where: UserWhere): UserAggregateSelection!
              usersConnection(after: String, first: Int, sort: [UserSort!], where: UserWhere): UsersConnection!
            }

            \\"\\"\\"An enum for sorting in either ascending or descending order.\\"\\"\\"
            enum SortDirection {
              \\"\\"\\"Sort by field values in ascending order.\\"\\"\\"
              ASC
              \\"\\"\\"Sort by field values in descending order.\\"\\"\\"
              DESC
            }

            type StringAggregateSelection {
              longest: String
              shortest: String
            }

            \\"\\"\\"
            Information about the number of nodes and relationships created and deleted during an update mutation
            \\"\\"\\"
            type UpdateInfo {
              nodesCreated: Int!
              nodesDeleted: Int!
              relationshipsCreated: Int!
              relationshipsDeleted: Int!
            }

            type UpdatePostsMutationResponse {
              info: UpdateInfo!
              posts: [Post!]!
            }

            type UpdateUsersMutationResponse {
              info: UpdateInfo!
              users: [User!]!
            }

            type User {
              id: ID!
            }

            type UserAggregateSelection {
              count: Int!
              id: IDAggregateSelection!
            }

            input UserConnectWhere {
              node: UserWhere!
            }

            input UserCreateInput {
              \\"\\"\\"
              Appears because this input type would be empty otherwise because this type is composed of just generated and/or relationship properties. See https://neo4j.com/docs/graphql-manual/current/troubleshooting/faqs/
              \\"\\"\\"
              _emptyInput: Boolean
            }

            type UserEdge {
              cursor: String!
              node: User!
            }

            input UserOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more UserSort objects to sort Users by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [UserSort!]
            }

            \\"\\"\\"
            Fields to sort Users by. The order in which sorts are applied is not guaranteed when specifying many fields in one UserSort object.
            \\"\\"\\"
            input UserSort {
              id: SortDirection
            }

            input UserUpdateInput {
              \\"\\"\\"
              Appears because this input type would be empty otherwise because this type is composed of just generated and/or relationship properties. See https://neo4j.com/docs/graphql-manual/current/troubleshooting/faqs/
              \\"\\"\\"
              _emptyInput: Boolean
            }

            input UserWhere {
              AND: [UserWhere!]
              NOT: UserWhere
              OR: [UserWhere!]
              id: ID @deprecated(reason: \\"Please use the explicit _EQ version\\")
              id_CONTAINS: ID
              id_ENDS_WITH: ID
              id_EQ: ID
              id_IN: [ID!]
              id_STARTS_WITH: ID
            }

            type UsersConnection {
              edges: [UserEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }"
        `);
    });
});
