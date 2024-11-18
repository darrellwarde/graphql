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

describe("Bigint", () => {
    test("BigInt", async () => {
        const typeDefs = gql`
            type File @node {
                name: String!
                size: BigInt!
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
            A BigInt value up to 64 bits in size, which can be a number or a string if used inline, or a string only if used as a variable. Always returned as a string.
            \\"\\"\\"
            scalar BigInt

            type BigIntAggregateSelection {
              average: BigInt
              max: BigInt
              min: BigInt
              sum: BigInt
            }

            type CreateFilesMutationResponse {
              files: [File!]!
              info: CreateInfo!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships created during a create mutation
            \\"\\"\\"
            type CreateInfo {
              nodesCreated: Int!
              relationshipsCreated: Int!
            }

            \\"\\"\\"
            Information about the number of nodes and relationships deleted during a delete mutation
            \\"\\"\\"
            type DeleteInfo {
              nodesDeleted: Int!
              relationshipsDeleted: Int!
            }

            type File {
              name: String!
              size: BigInt!
            }

            type FileAggregateSelection {
              count: Int!
              name: StringAggregateSelection!
              size: BigIntAggregateSelection!
            }

            input FileCreateInput {
              name: String!
              size: BigInt!
            }

            type FileEdge {
              cursor: String!
              node: File!
            }

            \\"\\"\\"
            Fields to sort Files by. The order in which sorts are applied is not guaranteed when specifying many fields in one FileSort object.
            \\"\\"\\"
            input FileSort {
              name: SortDirection
              size: SortDirection
            }

            input FileUpdateInput {
              name_SET: String
              size_DECREMENT: BigInt
              size_INCREMENT: BigInt
              size_SET: BigInt
            }

            input FileWhere {
              AND: [FileWhere!]
              NOT: FileWhere
              OR: [FileWhere!]
              name_CONTAINS: String
              name_ENDS_WITH: String
              name_EQ: String
              name_IN: [String!]
              name_STARTS_WITH: String
              size_EQ: BigInt
              size_GT: BigInt
              size_GTE: BigInt
              size_IN: [BigInt!]
              size_LT: BigInt
              size_LTE: BigInt
            }

            type FilesConnection {
              edges: [FileEdge!]!
              pageInfo: PageInfo!
              totalCount: Int!
            }

            type Mutation {
              createFiles(input: [FileCreateInput!]!): CreateFilesMutationResponse!
              deleteFiles(where: FileWhere): DeleteInfo!
              updateFiles(update: FileUpdateInput, where: FileWhere): UpdateFilesMutationResponse!
            }

            \\"\\"\\"Pagination information (Relay)\\"\\"\\"
            type PageInfo {
              endCursor: String
              hasNextPage: Boolean!
              hasPreviousPage: Boolean!
              startCursor: String
            }

            type Query {
              files(limit: Int, offset: Int, sort: [FileSort!], where: FileWhere): [File!]!
              filesAggregate(where: FileWhere): FileAggregateSelection!
              filesConnection(after: String, first: Int, sort: [FileSort!], where: FileWhere): FilesConnection!
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

            type UpdateFilesMutationResponse {
              files: [File!]!
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
            }"
        `);
    });
});
