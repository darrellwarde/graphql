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
import { GraphQLError } from "graphql";
import { gql } from "graphql-tag";
import { lexicographicSortSchema } from "graphql/utilities";
import { Neo4jGraphQL } from "../../../src";

describe("Plural option", () => {
    test("Partial types with plural", async () => {
        const typeDefs = gql`
            type Tech @plural(value: "Techs") @node {
                name: String
            }

            type Tech @node {
                value: String
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

            type CreateTechsMutationResponse {
              info: CreateInfo!
              techs: [Tech!]!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type Mutation {
              createTechs(input: [TechCreateInput!]!): CreateTechsMutationResponse!
              deleteTechs(where: TechWhere): DeleteInfo!
              updateTechs(update: TechUpdateInput, where: TechWhere): UpdateTechsMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            type Query {
              techs(limit: Int, offset: Int, sort: [TechSort!], where: TechWhere): [Tech!]!
              techsAggregate(where: TechWhere): TechAggregateSelection!
              techsConnection(after: String, first: Int, sort: [TechSort!], where: TechWhere): TechsConnection!
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

            type Tech {
              name: String
              value: String
            }

            type TechAggregateSelection {
              count: Int!
              name: StringAggregateSelection!
              value: StringAggregateSelection!
            }

            input TechCreateInput {
              name: String
              value: String
            }

            type TechEdge {
              cursor: String!
              node: Tech!
            }

            \\"\\"\\"
            Fields to sort Techs by. The order in which sorts are applied is not guaranteed when specifying many fields in one TechSort object.
            \\"\\"\\"
            input TechSort {
              name: SortDirection
              value: SortDirection
            }

            input TechUpdateInput {
              name_SET: String
              value_SET: String
            }

            input TechWhere {
              AND: [TechWhere!]
              NOT: TechWhere
              OR: [TechWhere!]
              name_CONTAINS: String
              name_ENDS_WITH: String
              name_EQ: String
              name_IN: [String]
              name_STARTS_WITH: String
              value_CONTAINS: String
              value_ENDS_WITH: String
              value_EQ: String
              value_IN: [String]
              value_STARTS_WITH: String
            }

            type TechsConnection {
              edges: [TechEdge!]!
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

            type UpdateTechsMutationResponse {
              info: UpdateInfo!
              techs: [Tech!]!
            }"
        `);
    });

    test("Partial types with same plural in both", async () => {
        const typeDefs = gql`
            type Tech @plural(value: "Techs") @node {
                name: String
            }

            type Tech @plural(value: "Techs") @node {
                value: String
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

            type CreateTechsMutationResponse {
              info: CreateInfo!
              techs: [Tech!]!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type Mutation {
              createTechs(input: [TechCreateInput!]!): CreateTechsMutationResponse!
              deleteTechs(where: TechWhere): DeleteInfo!
              updateTechs(update: TechUpdateInput, where: TechWhere): UpdateTechsMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            type Query {
              techs(limit: Int, offset: Int, sort: [TechSort!], where: TechWhere): [Tech!]!
              techsAggregate(where: TechWhere): TechAggregateSelection!
              techsConnection(after: String, first: Int, sort: [TechSort!], where: TechWhere): TechsConnection!
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

            type Tech {
              name: String
              value: String
            }

            type TechAggregateSelection {
              count: Int!
              name: StringAggregateSelection!
              value: StringAggregateSelection!
            }

            input TechCreateInput {
              name: String
              value: String
            }

            type TechEdge {
              cursor: String!
              node: Tech!
            }

            \\"\\"\\"
            Fields to sort Techs by. The order in which sorts are applied is not guaranteed when specifying many fields in one TechSort object.
            \\"\\"\\"
            input TechSort {
              name: SortDirection
              value: SortDirection
            }

            input TechUpdateInput {
              name_SET: String
              value_SET: String
            }

            input TechWhere {
              AND: [TechWhere!]
              NOT: TechWhere
              OR: [TechWhere!]
              name_CONTAINS: String
              name_ENDS_WITH: String
              name_EQ: String
              name_IN: [String]
              name_STARTS_WITH: String
              value_CONTAINS: String
              value_ENDS_WITH: String
              value_EQ: String
              value_IN: [String]
              value_STARTS_WITH: String
            }

            type TechsConnection {
              edges: [TechEdge!]!
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

            type UpdateTechsMutationResponse {
              info: UpdateInfo!
              techs: [Tech!]!
            }"
        `);
    });

    test("Partial types with different plural", async () => {
        const typeDefs = gql`
            type Tech @plural(value: "Techs") @node {
                name: String
            }

            type Tech @plural(value: "Technologies") @node {
                value: String
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

            type CreateTechnologiesMutationResponse {
              info: CreateInfo!
              technologies: [Tech!]!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type Mutation {
              createTechnologies(input: [TechCreateInput!]!): CreateTechnologiesMutationResponse!
              deleteTechnologies(where: TechWhere): DeleteInfo!
              updateTechnologies(update: TechUpdateInput, where: TechWhere): UpdateTechnologiesMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            type Query {
              technologies(limit: Int, offset: Int, sort: [TechSort!], where: TechWhere): [Tech!]!
              technologiesAggregate(where: TechWhere): TechAggregateSelection!
              technologiesConnection(after: String, first: Int, sort: [TechSort!], where: TechWhere): TechnologiesConnection!
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

            type Tech {
              name: String
              value: String
            }

            type TechAggregateSelection {
              count: Int!
              name: StringAggregateSelection!
              value: StringAggregateSelection!
            }

            input TechCreateInput {
              name: String
              value: String
            }

            type TechEdge {
              cursor: String!
              node: Tech!
            }

            \\"\\"\\"
            Fields to sort Technologies by. The order in which sorts are applied is not guaranteed when specifying many fields in one TechSort object.
            \\"\\"\\"
            input TechSort {
              name: SortDirection
              value: SortDirection
            }

            input TechUpdateInput {
              name_SET: String
              value_SET: String
            }

            input TechWhere {
              AND: [TechWhere!]
              NOT: TechWhere
              OR: [TechWhere!]
              name_CONTAINS: String
              name_ENDS_WITH: String
              name_EQ: String
              name_IN: [String]
              name_STARTS_WITH: String
              value_CONTAINS: String
              value_ENDS_WITH: String
              value_EQ: String
              value_IN: [String]
              value_STARTS_WITH: String
            }

            type TechnologiesConnection {
              edges: [TechEdge!]!
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

            type UpdateTechnologiesMutationResponse {
              info: UpdateInfo!
              technologies: [Tech!]!
            }"
        `);
    });

    test("Same plural on multiple nodes", async () => {
        const typeDefs = gql`
            type Tech @plural(value: "Techs") @node {
                name: String
            }

            type User @plural(value: "Techs") @node {
                value: String
            }
        `;

        await expect(async () => {
            const neoSchema = new Neo4jGraphQL({
                typeDefs,
            });
            await neoSchema.getSchema();
        }).rejects.toIncludeSameMembers([new GraphQLError(`Ambiguous plural "techs" in "User"`)]);
    });

    test("Type collision with pluralize", async () => {
        const typeDefs = gql`
            type User @node {
                name: String
            }

            type Users @node {
                value: String
            }
        `;
        await expect(async () => {
            const neoSchema = new Neo4jGraphQL({
                typeDefs,
            });
            await neoSchema.getSchema();
        }).rejects.toIncludeSameMembers([new GraphQLError(`Ambiguous plural "users" in "Users"`)]);
    });
});
