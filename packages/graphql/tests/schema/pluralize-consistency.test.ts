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
import { Neo4jGraphQL } from "../../src";

describe("Pluralize consistency", () => {
    test("Schema with underscore types", async () => {
        const typeDefs = gql`
            type super_user @node {
                name: String!
                my_friend: [super_friend!]! @relationship(type: "FRIEND", direction: OUT)
            }

            type super_friend @node {
                name: String!
            }
        `;
        const neoSchema = new Neo4jGraphQL({ typeDefs });
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

            type CreateSuperFriendsMutationResponse {
              info: CreateInfo!
              superFriends: [super_friend!]!
            }

            type CreateSuperUsersMutationResponse {
              info: CreateInfo!
              superUsers: [super_user!]!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type Mutation {
              createSuperFriends(input: [super_friendCreateInput!]!): CreateSuperFriendsMutationResponse!
              createSuperUsers(input: [super_userCreateInput!]!): CreateSuperUsersMutationResponse!
              deleteSuperFriends(where: super_friendWhere): DeleteInfo!
              deleteSuperUsers(delete: super_userDeleteInput, where: super_userWhere): DeleteInfo!
              updateSuperFriends(update: super_friendUpdateInput, where: super_friendWhere): UpdateSuperFriendsMutationResponse!
              updateSuperUsers(update: super_userUpdateInput, where: super_userWhere): UpdateSuperUsersMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            type Query {
              superFriends(limit: Int, offset: Int, options: super_friendOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [super_friendSort!], where: super_friendWhere): [super_friend!]!
              superFriendsAggregate(where: super_friendWhere): super_friendAggregateSelection!
              superFriendsConnection(after: String, first: Int, sort: [super_friendSort!], where: super_friendWhere): SuperFriendsConnection!
              superUsers(limit: Int, offset: Int, options: super_userOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [super_userSort!], where: super_userWhere): [super_user!]!
              superUsersAggregate(where: super_userWhere): super_userAggregateSelection!
              superUsersConnection(after: String, first: Int, sort: [super_userSort!], where: super_userWhere): SuperUsersConnection!
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

            type SuperFriendsConnection {
              edges: [super_friendEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            type SuperUsersConnection {
              edges: [super_userEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
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

            type UpdateSuperFriendsMutationResponse {
              info: UpdateInfo!
              superFriends: [super_friend!]!
            }

            type UpdateSuperUsersMutationResponse {
              info: UpdateInfo!
              superUsers: [super_user!]!
            }

            type super_friend {
              name: String!
            }

            type super_friendAggregateSelection {
              count: Int!
              name: StringAggregateSelection!
            }

            input super_friendConnectWhere {
              node: super_friendWhere!
            }

            input super_friendCreateInput {
              name: String!
            }

            type super_friendEdge {
              cursor: String!
              node: super_friend!
            }

            input super_friendOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more super_friendSort objects to sort SuperFriends by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [super_friendSort!]
            }

            \\"\\"\\"
            Fields to sort SuperFriends by. The order in which sorts are applied is not guaranteed when specifying many fields in one super_friendSort object.
            \\"\\"\\"
            input super_friendSort {
              name: SortDirection
            }

            input super_friendUpdateInput {
              name: String @deprecated(reason: \\"Please use the explicit _SET field\\")
              name_SET: String
            }

            input super_friendWhere {
              AND: [super_friendWhere!]
              NOT: super_friendWhere
              OR: [super_friendWhere!]
              name: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              name_CONTAINS: String
              name_ENDS_WITH: String
              name_EQ: String
              name_IN: [String!]
              name_STARTS_WITH: String
            }

            type super_user {
              my_friend(limit: Int, offset: Int, options: super_friendOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [super_friendSort!], where: super_friendWhere): [super_friend!]!
              my_friendAggregate(where: super_friendWhere): super_usersuper_friendMy_friendAggregationSelection
              my_friendConnection(after: String, first: Int, sort: [super_userMy_friendConnectionSort!], where: super_userMy_friendConnectionWhere): super_userMy_friendConnection!
              name: String!
            }

            type super_userAggregateSelection {
              count: Int!
              name: StringAggregateSelection!
            }

            input super_userCreateInput {
              my_friend: super_userMy_friendFieldInput
              name: String!
            }

            input super_userDeleteInput {
              my_friend: [super_userMy_friendDeleteFieldInput!]
            }

            type super_userEdge {
              cursor: String!
              node: super_user!
            }

            input super_userMy_friendAggregateInput {
              AND: [super_userMy_friendAggregateInput!]
              NOT: super_userMy_friendAggregateInput
              OR: [super_userMy_friendAggregateInput!]
              count: Int @deprecated(reason: \\"Please use the explicit _EQ version\\")
              count_EQ: Int
              count_GT: Int
              count_GTE: Int
              count_LT: Int
              count_LTE: Int
              node: super_userMy_friendNodeAggregationWhereInput
            }

            input super_userMy_friendConnectFieldInput {
              where: super_friendConnectWhere
            }

            type super_userMy_friendConnection {
              edges: [super_userMy_friendRelationship!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            input super_userMy_friendConnectionSort {
              node: super_friendSort
            }

            input super_userMy_friendConnectionWhere {
              AND: [super_userMy_friendConnectionWhere!]
              NOT: super_userMy_friendConnectionWhere
              OR: [super_userMy_friendConnectionWhere!]
              node: super_friendWhere
            }

            input super_userMy_friendCreateFieldInput {
              node: super_friendCreateInput!
            }

            input super_userMy_friendDeleteFieldInput {
              where: super_userMy_friendConnectionWhere
            }

            input super_userMy_friendDisconnectFieldInput {
              where: super_userMy_friendConnectionWhere
            }

            input super_userMy_friendFieldInput {
              connect: [super_userMy_friendConnectFieldInput!]
              create: [super_userMy_friendCreateFieldInput!]
            }

            input super_userMy_friendNodeAggregationWhereInput {
              AND: [super_userMy_friendNodeAggregationWhereInput!]
              NOT: super_userMy_friendNodeAggregationWhereInput
              OR: [super_userMy_friendNodeAggregationWhereInput!]
              name_AVERAGE_LENGTH_EQUAL: Float
              name_AVERAGE_LENGTH_GT: Float
              name_AVERAGE_LENGTH_GTE: Float
              name_AVERAGE_LENGTH_LT: Float
              name_AVERAGE_LENGTH_LTE: Float
              name_LONGEST_LENGTH_EQUAL: Int
              name_LONGEST_LENGTH_GT: Int
              name_LONGEST_LENGTH_GTE: Int
              name_LONGEST_LENGTH_LT: Int
              name_LONGEST_LENGTH_LTE: Int
              name_SHORTEST_LENGTH_EQUAL: Int
              name_SHORTEST_LENGTH_GT: Int
              name_SHORTEST_LENGTH_GTE: Int
              name_SHORTEST_LENGTH_LT: Int
              name_SHORTEST_LENGTH_LTE: Int
            }

            type super_userMy_friendRelationship {
              cursor: String!
              node: super_friend!
            }

            input super_userMy_friendUpdateConnectionInput {
              node: super_friendUpdateInput
            }

            input super_userMy_friendUpdateFieldInput {
              connect: [super_userMy_friendConnectFieldInput!]
              create: [super_userMy_friendCreateFieldInput!]
              delete: [super_userMy_friendDeleteFieldInput!]
              disconnect: [super_userMy_friendDisconnectFieldInput!]
              update: super_userMy_friendUpdateConnectionInput
              where: super_userMy_friendConnectionWhere
            }

            input super_userOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more super_userSort objects to sort SuperUsers by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [super_userSort!]
            }

            \\"\\"\\"
            Fields to sort SuperUsers by. The order in which sorts are applied is not guaranteed when specifying many fields in one super_userSort object.
            \\"\\"\\"
            input super_userSort {
              name: SortDirection
            }

            input super_userUpdateInput {
              my_friend: [super_userMy_friendUpdateFieldInput!]
              name: String @deprecated(reason: \\"Please use the explicit _SET field\\")
              name_SET: String
            }

            input super_userWhere {
              AND: [super_userWhere!]
              NOT: super_userWhere
              OR: [super_userWhere!]
              my_friendAggregate: super_userMy_friendAggregateInput
              \\"\\"\\"
              Return super_users where all of the related super_userMy_friendConnections match this filter
              \\"\\"\\"
              my_friendConnection_ALL: super_userMy_friendConnectionWhere
              \\"\\"\\"
              Return super_users where none of the related super_userMy_friendConnections match this filter
              \\"\\"\\"
              my_friendConnection_NONE: super_userMy_friendConnectionWhere
              \\"\\"\\"
              Return super_users where one of the related super_userMy_friendConnections match this filter
              \\"\\"\\"
              my_friendConnection_SINGLE: super_userMy_friendConnectionWhere
              \\"\\"\\"
              Return super_users where some of the related super_userMy_friendConnections match this filter
              \\"\\"\\"
              my_friendConnection_SOME: super_userMy_friendConnectionWhere
              \\"\\"\\"
              Return super_users where all of the related super_friends match this filter
              \\"\\"\\"
              my_friend_ALL: super_friendWhere
              \\"\\"\\"
              Return super_users where none of the related super_friends match this filter
              \\"\\"\\"
              my_friend_NONE: super_friendWhere
              \\"\\"\\"
              Return super_users where one of the related super_friends match this filter
              \\"\\"\\"
              my_friend_SINGLE: super_friendWhere
              \\"\\"\\"
              Return super_users where some of the related super_friends match this filter
              \\"\\"\\"
              my_friend_SOME: super_friendWhere
              name: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              name_CONTAINS: String
              name_ENDS_WITH: String
              name_EQ: String
              name_IN: [String!]
              name_STARTS_WITH: String
            }

            type super_usersuper_friendMy_friendAggregationSelection {
              count: Int!
              node: super_usersuper_friendMy_friendNodeAggregateSelection
            }

            type super_usersuper_friendMy_friendNodeAggregateSelection {
              name: StringAggregateSelection!
            }"
        `);
    });
});
