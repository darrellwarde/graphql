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

import { validateSchema } from "graphql";
import { Neo4jGraphQL } from "../../../src/classes";

describe("https://github.com/neo4j/graphql/issues/556", () => {
    test("should compile type defs with no errors", async () => {
        const typeDefs = /* GraphQL */ `
            type Journalist {
                articles: [Article!]! @relationship(type: "HAS_ARTICLE", direction: OUT, properties: "HasArticle")
            }

            interface HasArticle @relationshipProperties {
                createdAt: DateTime! @timestamp
            }

            type Article {
                id: ID! @id @unique
                blocks: [Block!]! @relationship(type: "HAS_BLOCK", direction: OUT, properties: "HasBlock")
                images: [Image!]! @relationship(type: "HAS_IMAGE", direction: OUT)
            }

            interface HasBlock @relationshipProperties {
                order: Int!
            }

            interface Block {
                id: ID @id
            }

            type TextBlock implements Block {
                id: ID @id @unique
                text: String
            }

            type DividerBlock implements Block {
                id: ID @id @unique
            }

            type ImageBlock implements Block {
                id: ID @id @unique
                images: [Image!]! @relationship(type: "HAS_IMAGE", direction: OUT)
            }

            interface Image {
                featuredIn: [Article!]
            }

            type PDFImage implements Image {
                featuredIn: [Article!]! @relationship(type: "HAS_IMAGE", direction: IN)
                url: String!
            }
        `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        const schema = await neoSchema.getSchema();

        expect(schema).toBeDefined();

        const errors = validateSchema(schema);
        expect(errors).toEqual([]);
    });
    test("should compile empty type def with error", async () => {
        const typeDefs = `
            type Journalist {
            }

        `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        await expect(neoSchema.getSchema()).rejects.toThrow();
    });
    test("should compile empty input with error", async () => {
        const typeDefs = `
            input JournalistInput {
            }
            type Journalist {
                query(input: JournalistInput): Int
            }

        `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        await expect(neoSchema.getSchema()).rejects.toThrow();
    });
    test("should compile empty interface with error", async () => {
        const typeDefs = `
            interface Person {
            }

            type Journalist implements Person {
                test: Int
            }

        `;

        const neoSchema = new Neo4jGraphQL({ typeDefs });

        await expect(neoSchema.getSchema()).rejects.toThrow();
    });
});
