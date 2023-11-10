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

import type {
    EnumTypeDefinitionNode,
    InterfaceTypeDefinitionNode,
    ObjectTypeDefinitionNode,
    UnionTypeDefinitionNode,
} from "graphql";
import gql from "graphql-tag";
import { getError, NoErrorThrownError } from "../../../tests/utils/get-error";
import validateDocument from "./validate-document";

describe("validateDuplicateRelationshipFields", () => {
    const additionalDefinitions = {
        enums: [] as EnumTypeDefinitionNode[],
        interfaces: [] as InterfaceTypeDefinitionNode[],
        unions: [] as UnionTypeDefinitionNode[],
        objects: [] as ObjectTypeDefinitionNode[],
    };
    test("should throw an error if multiple relationship fields in the same type have the same relationship type.", () => {
        const doc = gql`
            type Team {
                name: String!
                player1: Person! @relationship(type: "PLAYS_IN", direction: IN)
                player2: Person! @relationship(type: "PLAYS_IN", direction: IN)
                backupPlayers: [Person!]! @relationship(type: "PLAYS_IN", direction: IN)
            }

            type Person {
                name: String!
                teams: [Team!]! @relationship(type: "PLAYS_IN", direction: OUT)
            }
        `;

        const errors = getError(() =>
            validateDocument({
                document: doc,
                features: {},
                additionalDefinitions,
                experimental: false,
            })
        );
        expect(errors).toHaveLength(1);
        expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
        expect(errors[0]).toHaveProperty(
            "message",
            "@relationship invalid. Multiple fields of the same type cannot have a relationship with the same direction and type combination."
        );
        expect(errors[0]).toHaveProperty("path", ["Team", "player2", "@relationship"]);
    });

    test("should not throw an error if multiple relationship fields of different types have the same relationship type.", () => {
        const doc = gql`
            type Team {
                name: String!
                player: Person! @relationship(type: "PLAYS_IN", direction: IN)
                venue: Venue! @relationship(type: "PLAYS_IN", direction: IN)
            }

            type Person {
                name: String!
                teams: [Team!]! @relationship(type: "PLAYS_IN", direction: OUT)
            }

            type Venue {
                location: String!
            }
        `;

        expect(() =>
            validateDocument({ document: doc, features: {}, additionalDefinitions, experimental: false })
        ).not.toThrow();
    });

    test("should not throw an error if multiple relationship fields in the same type have the same relationship type but have different directions.", () => {
        const doc = gql`
            type Person {
                name: String!
                knows: [Person!]! @relationship(type: "KNOWS", direction: OUT)
                knowedBy: [Person!]! @relationship(type: "KNOWS", direction: IN)
            }
        `;

        expect(() =>
            validateDocument({ document: doc, features: {}, additionalDefinitions, experimental: false })
        ).not.toThrow();
    });
});
