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

describe("Connect Or Create", () => {
    test("With Unions", async () => {
        const typeDefs = gql`
            type Movie @node {
                title: String!
                isan: String! @unique
            }

            type Series @node {
                title: String!
                isan: String! @unique
            }

            union Production = Movie | Series

            type ActedIn @relationshipProperties {
                screenTime: Int!
            }

            type Actor @node {
                name: String!
                actedIn: [Production!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
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
            The edge properties for the following fields:
            * Actor.actedIn
            \\"\\"\\"
            type ActedIn {
              screenTime: Int!
            }

            input ActedInCreateInput {
              screenTime: Int!
            }

            input ActedInSort {
              screenTime: SortDirection
            }

            input ActedInUpdateInput {
              screenTime: Int
              screenTime_DECREMENT: Int
              screenTime_INCREMENT: Int
            }

            input ActedInWhere {
              AND: [ActedInWhere!]
              NOT: ActedInWhere
              OR: [ActedInWhere!]
              screenTime: Int @deprecated(reason: \\"Please use the explicit _EQ version\\")
              screenTime_EQ: Int
              screenTime_GT: Int
              screenTime_GTE: Int
              screenTime_IN: [Int!]
              screenTime_LT: Int
              screenTime_LTE: Int
            }

            type Actor {
              actedIn(directed: Boolean = true, limit: Int, offset: Int, options: QueryOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), where: ProductionWhere): [Production!]!
              actedInConnection(after: String, directed: Boolean = true, first: Int, sort: [ActorActedInConnectionSort!], where: ActorActedInConnectionWhere): ActorActedInConnection!
              name: String!
            }

            input ActorActedInConnectInput {
              Movie: [ActorActedInMovieConnectFieldInput!]
              Series: [ActorActedInSeriesConnectFieldInput!]
            }

            input ActorActedInConnectOrCreateInput {
              Movie: [ActorActedInMovieConnectOrCreateFieldInput!]
              Series: [ActorActedInSeriesConnectOrCreateFieldInput!]
            }

            type ActorActedInConnection {
              edges: [ActorActedInRelationship!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            input ActorActedInConnectionSort {
              edge: ActedInSort
            }

            input ActorActedInConnectionWhere {
              Movie: ActorActedInMovieConnectionWhere
              Series: ActorActedInSeriesConnectionWhere
            }

            input ActorActedInCreateFieldInput {
              Movie: [ActorActedInMovieCreateFieldInput!]
              Series: [ActorActedInSeriesCreateFieldInput!]
            }

            input ActorActedInCreateInput {
              Movie: ActorActedInMovieFieldInput
              Series: ActorActedInSeriesFieldInput
            }

            input ActorActedInDeleteInput {
              Movie: [ActorActedInMovieDeleteFieldInput!]
              Series: [ActorActedInSeriesDeleteFieldInput!]
            }

            input ActorActedInDisconnectInput {
              Movie: [ActorActedInMovieDisconnectFieldInput!]
              Series: [ActorActedInSeriesDisconnectFieldInput!]
            }

            input ActorActedInMovieConnectFieldInput {
              edge: ActedInCreateInput!
              where: MovieConnectWhere
            }

            input ActorActedInMovieConnectOrCreateFieldInput {
              onCreate: ActorActedInMovieConnectOrCreateFieldInputOnCreate!
              where: MovieConnectOrCreateWhere!
            }

            input ActorActedInMovieConnectOrCreateFieldInputOnCreate {
              edge: ActedInCreateInput!
              node: MovieOnCreateInput!
            }

            input ActorActedInMovieConnectionWhere {
              AND: [ActorActedInMovieConnectionWhere!]
              NOT: ActorActedInMovieConnectionWhere
              OR: [ActorActedInMovieConnectionWhere!]
              edge: ActedInWhere
              node: MovieWhere
            }

            input ActorActedInMovieCreateFieldInput {
              edge: ActedInCreateInput!
              node: MovieCreateInput!
            }

            input ActorActedInMovieDeleteFieldInput {
              where: ActorActedInMovieConnectionWhere
            }

            input ActorActedInMovieDisconnectFieldInput {
              where: ActorActedInMovieConnectionWhere
            }

            input ActorActedInMovieFieldInput {
              connect: [ActorActedInMovieConnectFieldInput!]
              connectOrCreate: [ActorActedInMovieConnectOrCreateFieldInput!]
              create: [ActorActedInMovieCreateFieldInput!]
            }

            input ActorActedInMovieUpdateConnectionInput {
              edge: ActedInUpdateInput
              node: MovieUpdateInput
            }

            input ActorActedInMovieUpdateFieldInput {
              connect: [ActorActedInMovieConnectFieldInput!]
              connectOrCreate: [ActorActedInMovieConnectOrCreateFieldInput!]
              create: [ActorActedInMovieCreateFieldInput!]
              delete: [ActorActedInMovieDeleteFieldInput!]
              disconnect: [ActorActedInMovieDisconnectFieldInput!]
              update: ActorActedInMovieUpdateConnectionInput
              where: ActorActedInMovieConnectionWhere
            }

            type ActorActedInRelationship {
              cursor: String!
              node: Production!
              properties: ActedIn!
            }

            input ActorActedInSeriesConnectFieldInput {
              edge: ActedInCreateInput!
              where: SeriesConnectWhere
            }

            input ActorActedInSeriesConnectOrCreateFieldInput {
              onCreate: ActorActedInSeriesConnectOrCreateFieldInputOnCreate!
              where: SeriesConnectOrCreateWhere!
            }

            input ActorActedInSeriesConnectOrCreateFieldInputOnCreate {
              edge: ActedInCreateInput!
              node: SeriesOnCreateInput!
            }

            input ActorActedInSeriesConnectionWhere {
              AND: [ActorActedInSeriesConnectionWhere!]
              NOT: ActorActedInSeriesConnectionWhere
              OR: [ActorActedInSeriesConnectionWhere!]
              edge: ActedInWhere
              node: SeriesWhere
            }

            input ActorActedInSeriesCreateFieldInput {
              edge: ActedInCreateInput!
              node: SeriesCreateInput!
            }

            input ActorActedInSeriesDeleteFieldInput {
              where: ActorActedInSeriesConnectionWhere
            }

            input ActorActedInSeriesDisconnectFieldInput {
              where: ActorActedInSeriesConnectionWhere
            }

            input ActorActedInSeriesFieldInput {
              connect: [ActorActedInSeriesConnectFieldInput!]
              connectOrCreate: [ActorActedInSeriesConnectOrCreateFieldInput!]
              create: [ActorActedInSeriesCreateFieldInput!]
            }

            input ActorActedInSeriesUpdateConnectionInput {
              edge: ActedInUpdateInput
              node: SeriesUpdateInput
            }

            input ActorActedInSeriesUpdateFieldInput {
              connect: [ActorActedInSeriesConnectFieldInput!]
              connectOrCreate: [ActorActedInSeriesConnectOrCreateFieldInput!]
              create: [ActorActedInSeriesCreateFieldInput!]
              delete: [ActorActedInSeriesDeleteFieldInput!]
              disconnect: [ActorActedInSeriesDisconnectFieldInput!]
              update: ActorActedInSeriesUpdateConnectionInput
              where: ActorActedInSeriesConnectionWhere
            }

            input ActorActedInUpdateInput {
              Movie: [ActorActedInMovieUpdateFieldInput!]
              Series: [ActorActedInSeriesUpdateFieldInput!]
            }

            type ActorAggregateSelection {
              count: Int!
              name: StringAggregateSelection!
            }

            input ActorConnectInput {
              actedIn: ActorActedInConnectInput
            }

            input ActorConnectOrCreateInput {
              actedIn: ActorActedInConnectOrCreateInput
            }

            input ActorCreateInput {
              actedIn: ActorActedInCreateInput
              name: String!
            }

            input ActorDeleteInput {
              actedIn: ActorActedInDeleteInput
            }

            input ActorDisconnectInput {
              actedIn: ActorActedInDisconnectInput
            }

            type ActorEdge {
              cursor: String!
              node: Actor!
            }

            input ActorOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more ActorSort objects to sort Actors by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [ActorSort!]
            }

            input ActorRelationInput {
              actedIn: ActorActedInCreateFieldInput
            }

            \\"\\"\\"
            Fields to sort Actors by. The order in which sorts are applied is not guaranteed when specifying many fields in one ActorSort object.
            \\"\\"\\"
            input ActorSort {
              name: SortDirection
            }

            input ActorUpdateInput {
              actedIn: ActorActedInUpdateInput
              name: String
            }

            input ActorWhere {
              AND: [ActorWhere!]
              NOT: ActorWhere
              OR: [ActorWhere!]
              actedIn: ProductionWhere @deprecated(reason: \\"Use \`actedIn_SOME\` instead.\\")
              actedInConnection: ActorActedInConnectionWhere @deprecated(reason: \\"Use \`actedInConnection_SOME\` instead.\\")
              \\"\\"\\"
              Return Actors where all of the related ActorActedInConnections match this filter
              \\"\\"\\"
              actedInConnection_ALL: ActorActedInConnectionWhere
              \\"\\"\\"
              Return Actors where none of the related ActorActedInConnections match this filter
              \\"\\"\\"
              actedInConnection_NONE: ActorActedInConnectionWhere
              \\"\\"\\"
              Return Actors where one of the related ActorActedInConnections match this filter
              \\"\\"\\"
              actedInConnection_SINGLE: ActorActedInConnectionWhere
              \\"\\"\\"
              Return Actors where some of the related ActorActedInConnections match this filter
              \\"\\"\\"
              actedInConnection_SOME: ActorActedInConnectionWhere
              \\"\\"\\"Return Actors where all of the related Productions match this filter\\"\\"\\"
              actedIn_ALL: ProductionWhere
              \\"\\"\\"Return Actors where none of the related Productions match this filter\\"\\"\\"
              actedIn_NONE: ProductionWhere
              \\"\\"\\"Return Actors where one of the related Productions match this filter\\"\\"\\"
              actedIn_SINGLE: ProductionWhere
              \\"\\"\\"Return Actors where some of the related Productions match this filter\\"\\"\\"
              actedIn_SOME: ProductionWhere
              name: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              name_CONTAINS: String
              name_ENDS_WITH: String
              name_EQ: String
              name_IN: [String!]
              name_STARTS_WITH: String
            }

            type ActorsConnection {
              edges: [ActorEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            type CreateActorsMutationResponse {
              actors: [Actor!]!
              info: CreateInfo!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships created during a create mutation
            \\"\\"\\"
            type CreateInfo {
              nodesCreated: Int!
              relationshipsCreated: Int!
            }

            type CreateMoviesMutationResponse {
              info: CreateInfo!
              movies: [Movie!]!
            }

            type CreateSeriesMutationResponse {
              info: CreateInfo!
              series: [Series!]!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type Movie {
              isan: String!
              title: String!
            }

            type MovieAggregateSelection {
              count: Int!
              isan: StringAggregateSelection!
              title: StringAggregateSelection!
            }

            input MovieConnectOrCreateWhere {
              node: MovieUniqueWhere!
            }

            input MovieConnectWhere {
              node: MovieWhere!
            }

            input MovieCreateInput {
              isan: String!
              title: String!
            }

            type MovieEdge {
              cursor: String!
              node: Movie!
            }

            input MovieOnCreateInput {
              isan: String!
              title: String!
            }

            input MovieOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more MovieSort objects to sort Movies by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [MovieSort!]
            }

            \\"\\"\\"
            Fields to sort Movies by. The order in which sorts are applied is not guaranteed when specifying many fields in one MovieSort object.
            \\"\\"\\"
            input MovieSort {
              isan: SortDirection
              title: SortDirection
            }

            input MovieUniqueWhere {
              isan: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              isan_EQ: String
            }

            input MovieUpdateInput {
              isan: String
              title: String
            }

            input MovieWhere {
              AND: [MovieWhere!]
              NOT: MovieWhere
              OR: [MovieWhere!]
              isan: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              isan_CONTAINS: String
              isan_ENDS_WITH: String
              isan_EQ: String
              isan_IN: [String!]
              isan_STARTS_WITH: String
              title: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              title_CONTAINS: String
              title_ENDS_WITH: String
              title_EQ: String
              title_IN: [String!]
              title_STARTS_WITH: String
            }

            type MoviesConnection {
              edges: [MovieEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            type Mutation {
              createActors(input: [ActorCreateInput!]!): CreateActorsMutationResponse!
              createMovies(input: [MovieCreateInput!]!): CreateMoviesMutationResponse!
              createSeries(input: [SeriesCreateInput!]!): CreateSeriesMutationResponse!
              deleteActors(delete: ActorDeleteInput, where: ActorWhere): DeleteInfo!
              deleteMovies(where: MovieWhere): DeleteInfo!
              deleteSeries(where: SeriesWhere): DeleteInfo!
              updateActors(connect: ActorConnectInput @deprecated(reason: \\"Top level connect input argument in update is deprecated. Use the nested connect field in the relationship within the update argument\\"), connectOrCreate: ActorConnectOrCreateInput @deprecated(reason: \\"Top level connectOrCreate input argument in update is deprecated. Use the nested connectOrCreate field in the relationship within the update argument\\"), create: ActorRelationInput @deprecated(reason: \\"Top level create input argument in update is deprecated. Use the nested create field in the relationship within the update argument\\"), delete: ActorDeleteInput @deprecated(reason: \\"Top level delete input argument in update is deprecated. Use the nested delete field in the relationship within the update argument\\"), disconnect: ActorDisconnectInput @deprecated(reason: \\"Top level disconnect input argument in update is deprecated. Use the nested disconnect field in the relationship within the update argument\\"), update: ActorUpdateInput, where: ActorWhere): UpdateActorsMutationResponse!
              updateMovies(update: MovieUpdateInput, where: MovieWhere): UpdateMoviesMutationResponse!
              updateSeries(update: SeriesUpdateInput, where: SeriesWhere): UpdateSeriesMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            union Production = Movie | Series

            input ProductionWhere {
              Movie: MovieWhere
              Series: SeriesWhere
            }

            type Query {
              actors(limit: Int, offset: Int, options: ActorOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [ActorSort!], where: ActorWhere): [Actor!]!
              actorsAggregate(where: ActorWhere): ActorAggregateSelection!
              actorsConnection(after: String, first: Int, sort: [ActorSort!], where: ActorWhere): ActorsConnection!
              movies(limit: Int, offset: Int, options: MovieOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [MovieSort!], where: MovieWhere): [Movie!]!
              moviesAggregate(where: MovieWhere): MovieAggregateSelection!
              moviesConnection(after: String, first: Int, sort: [MovieSort!], where: MovieWhere): MoviesConnection!
              productions(limit: Int, offset: Int, options: QueryOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), where: ProductionWhere): [Production!]!
              series(limit: Int, offset: Int, options: SeriesOptions @deprecated(reason: \\"Query options argument is deprecated, please use pagination arguments like limit, offset and sort instead.\\"), sort: [SeriesSort!], where: SeriesWhere): [Series!]!
              seriesAggregate(where: SeriesWhere): SeriesAggregateSelection!
              seriesConnection(after: String, first: Int, sort: [SeriesSort!], where: SeriesWhere): SeriesConnection!
            }

            \\"\\"\\"Input type for options that can be specified on a query operation.\\"\\"\\"
            input QueryOptions {
              limit: Int
              offset: Int
            }

            type Series {
              isan: String!
              title: String!
            }

            type SeriesAggregateSelection {
              count: Int!
              isan: StringAggregateSelection!
              title: StringAggregateSelection!
            }

            input SeriesConnectOrCreateWhere {
              node: SeriesUniqueWhere!
            }

            input SeriesConnectWhere {
              node: SeriesWhere!
            }

            type SeriesConnection {
              edges: [SeriesEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            input SeriesCreateInput {
              isan: String!
              title: String!
            }

            type SeriesEdge {
              cursor: String!
              node: Series!
            }

            input SeriesOnCreateInput {
              isan: String!
              title: String!
            }

            input SeriesOptions {
              limit: Int
              offset: Int
              \\"\\"\\"
              Specify one or more SeriesSort objects to sort Series by. The sorts will be applied in the order in which they are arranged in the array.
              \\"\\"\\"
              sort: [SeriesSort!]
            }

            \\"\\"\\"
            Fields to sort Series by. The order in which sorts are applied is not guaranteed when specifying many fields in one SeriesSort object.
            \\"\\"\\"
            input SeriesSort {
              isan: SortDirection
              title: SortDirection
            }

            input SeriesUniqueWhere {
              isan: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              isan_EQ: String
            }

            input SeriesUpdateInput {
              isan: String
              title: String
            }

            input SeriesWhere {
              AND: [SeriesWhere!]
              NOT: SeriesWhere
              OR: [SeriesWhere!]
              isan: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              isan_CONTAINS: String
              isan_ENDS_WITH: String
              isan_EQ: String
              isan_IN: [String!]
              isan_STARTS_WITH: String
              title: String @deprecated(reason: \\"Please use the explicit _EQ version\\")
              title_CONTAINS: String
              title_ENDS_WITH: String
              title_EQ: String
              title_IN: [String!]
              title_STARTS_WITH: String
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

            type UpdateActorsMutationResponse {
              actors: [Actor!]!
              info: UpdateInfo!
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

            type UpdateMoviesMutationResponse {
              info: UpdateInfo!
              movies: [Movie!]!
            }

            type UpdateSeriesMutationResponse {
              info: UpdateInfo!
              series: [Series!]!
            }"
        `);
    });
});
