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
import { lexicographicSortSchema } from "graphql";
import { gql } from "graphql-tag";
import { Neo4jGraphQL } from "../../../src/classes";

describe("https://github.com/neo4j/graphql/issues/1614", () => {
    test("should include enumFields on relationships", async () => {
        const typeDefs = gql`
            enum CrewPositionType {
                BoomOperator
                Gaffer
                KeyGrip
            }

            type CrewPosition @relationshipProperties {
                position: CrewPositionType
            }

            type Movie @node {
                name: String!
            }

            type CrewMember @node {
                movies: Movie! @relationship(type: "WORKED_ON", direction: OUT, properties: "CrewPosition")
            }
        `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });
        const printedSchema = printSchemaWithDirectives(lexicographicSortSchema(await neoSchema.getSchema()));

        expect(printedSchema).toMatchInlineSnapshot(`
            "schema {
              query: Query
              mutation: Mutation
            }

            type CreateCrewMembersMutationResponse {
              crewMembers: [CrewMember!]!
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

            type CrewMember {
              movies(limit: Int, offset: Int, sort: [MovieSort!], where: MovieWhere): Movie!
              moviesAggregate(where: MovieWhere): CrewMemberMovieMoviesAggregationSelection
              moviesConnection(after: String, first: Int, sort: [CrewMemberMoviesConnectionSort!], where: CrewMemberMoviesConnectionWhere): CrewMemberMoviesConnection!
            }

            type CrewMemberAggregateSelection {
              count: Int!
            }

            input CrewMemberCreateInput {
              movies: CrewMemberMoviesFieldInput
            }

            input CrewMemberDeleteInput {
              movies: CrewMemberMoviesDeleteFieldInput
            }

            type CrewMemberEdge {
              cursor: String!
              node: CrewMember!
            }

            type CrewMemberMovieMoviesAggregationSelection {
              count: Int!
              node: CrewMemberMovieMoviesNodeAggregateSelection
            }

            type CrewMemberMovieMoviesNodeAggregateSelection {
              name: StringAggregateSelection!
            }

            input CrewMemberMoviesAggregateInput {
              AND: [CrewMemberMoviesAggregateInput!]
              NOT: CrewMemberMoviesAggregateInput
              OR: [CrewMemberMoviesAggregateInput!]
              count_EQ: Int
              count_GT: Int
              count_GTE: Int
              count_LT: Int
              count_LTE: Int
              node: CrewMemberMoviesNodeAggregationWhereInput
            }

            input CrewMemberMoviesConnectFieldInput {
              edge: CrewPositionCreateInput
              where: MovieConnectWhere
            }

            type CrewMemberMoviesConnection {
              edges: [CrewMemberMoviesRelationship!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            input CrewMemberMoviesConnectionSort {
              edge: CrewPositionSort
              node: MovieSort
            }

            input CrewMemberMoviesConnectionWhere {
              AND: [CrewMemberMoviesConnectionWhere!]
              NOT: CrewMemberMoviesConnectionWhere
              OR: [CrewMemberMoviesConnectionWhere!]
              edge: CrewPositionWhere
              node: MovieWhere
            }

            input CrewMemberMoviesCreateFieldInput {
              edge: CrewPositionCreateInput
              node: MovieCreateInput!
            }

            input CrewMemberMoviesDeleteFieldInput {
              where: CrewMemberMoviesConnectionWhere
            }

            input CrewMemberMoviesDisconnectFieldInput {
              where: CrewMemberMoviesConnectionWhere
            }

            input CrewMemberMoviesFieldInput {
              connect: CrewMemberMoviesConnectFieldInput
              create: CrewMemberMoviesCreateFieldInput
            }

            input CrewMemberMoviesNodeAggregationWhereInput {
              AND: [CrewMemberMoviesNodeAggregationWhereInput!]
              NOT: CrewMemberMoviesNodeAggregationWhereInput
              OR: [CrewMemberMoviesNodeAggregationWhereInput!]
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

            type CrewMemberMoviesRelationship {
              cursor: String!
              node: Movie!
              properties: CrewPosition!
            }

            input CrewMemberMoviesUpdateConnectionInput {
              edge: CrewPositionUpdateInput
              node: MovieUpdateInput
            }

            input CrewMemberMoviesUpdateFieldInput {
              connect: CrewMemberMoviesConnectFieldInput
              create: CrewMemberMoviesCreateFieldInput
              delete: CrewMemberMoviesDeleteFieldInput
              disconnect: CrewMemberMoviesDisconnectFieldInput
              update: CrewMemberMoviesUpdateConnectionInput
              where: CrewMemberMoviesConnectionWhere
            }

            input CrewMemberUpdateInput {
              movies: CrewMemberMoviesUpdateFieldInput
            }

            input CrewMemberWhere {
              AND: [CrewMemberWhere!]
              NOT: CrewMemberWhere
              OR: [CrewMemberWhere!]
              movies: MovieWhere
              moviesAggregate: CrewMemberMoviesAggregateInput
              moviesConnection: CrewMemberMoviesConnectionWhere
            }

            type CrewMembersConnection {
              edges: [CrewMemberEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            \\"\\"\\"
            The edge properties for the following fields:
            * CrewMember.movies
            \\"\\"\\"
            type CrewPosition {
              position: CrewPositionType
            }

            input CrewPositionCreateInput {
              position: CrewPositionType
            }

            input CrewPositionSort {
              position: SortDirection
            }

            enum CrewPositionType {
              BoomOperator
              Gaffer
              KeyGrip
            }

            input CrewPositionUpdateInput {
              position_SET: CrewPositionType
            }

            input CrewPositionWhere {
              AND: [CrewPositionWhere!]
              NOT: CrewPositionWhere
              OR: [CrewPositionWhere!]
              position_EQ: CrewPositionType
              position_IN: [CrewPositionType]
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type Movie {
              name: String!
            }

            type MovieAggregateSelection {
              count: Int!
              name: StringAggregateSelection!
            }

            input MovieConnectWhere {
              node: MovieWhere!
            }

            input MovieCreateInput {
              name: String!
            }

            type MovieEdge {
              cursor: String!
              node: Movie!
            }

            \\"\\"\\"
            Fields to sort Movies by. The order in which sorts are applied is not guaranteed when specifying many fields in one MovieSort object.
            \\"\\"\\"
            input MovieSort {
              name: SortDirection
            }

            input MovieUpdateInput {
              name_SET: String
            }

            input MovieWhere {
              AND: [MovieWhere!]
              NOT: MovieWhere
              OR: [MovieWhere!]
              name_CONTAINS: String
              name_ENDS_WITH: String
              name_EQ: String
              name_IN: [String!]
              name_STARTS_WITH: String
            }

            type MoviesConnection {
              edges: [MovieEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            type Mutation {
              createCrewMembers(input: [CrewMemberCreateInput!]!): CreateCrewMembersMutationResponse!
              createMovies(input: [MovieCreateInput!]!): CreateMoviesMutationResponse!
              deleteCrewMembers(delete: CrewMemberDeleteInput, where: CrewMemberWhere): DeleteInfo!
              deleteMovies(where: MovieWhere): DeleteInfo!
              updateCrewMembers(update: CrewMemberUpdateInput, where: CrewMemberWhere): UpdateCrewMembersMutationResponse!
              updateMovies(update: MovieUpdateInput, where: MovieWhere): UpdateMoviesMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            type Query {
              crewMembers(limit: Int, offset: Int, where: CrewMemberWhere): [CrewMember!]!
              crewMembersAggregate(where: CrewMemberWhere): CrewMemberAggregateSelection!
              crewMembersConnection(after: String, first: Int, where: CrewMemberWhere): CrewMembersConnection!
              movies(limit: Int, offset: Int, sort: [MovieSort!], where: MovieWhere): [Movie!]!
              moviesAggregate(where: MovieWhere): MovieAggregateSelection!
              moviesConnection(after: String, first: Int, sort: [MovieSort!], where: MovieWhere): MoviesConnection!
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

            type UpdateCrewMembersMutationResponse {
              crewMembers: [CrewMember!]!
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
            }"
        `);

        // NOTE: are these checks relevant if the schema remains the same?
        // const schema = await neoSchema.getSchema();
        // expect(schema).toBeDefined();

        // const errors = validateSchema(schema);
        // expect(errors).toEqual([]);

        // const relationship = neoSchema["relationships"].find((r) => r.name === "CrewMemberMoviesRelationship");
        // expect(relationship).toBeDefined();
        // expect(relationship?.enumFields?.length).toBe(1);
        // expect(relationship?.properties).toBe("CrewPosition");

        // const enumField = relationship?.enumFields[0];
        // expect(enumField?.kind).toBe("Enum");
        // expect(enumField?.fieldName).toBe("position");
        // expect(enumField?.typeMeta?.name).toBe("CrewPositionType");
    });
});
