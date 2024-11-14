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

import type { ASTVisitor, FieldDefinitionNode, ListTypeNode, NonNullTypeNode } from "graphql";
import { Kind } from "graphql";
import { relationshipDirective } from "../../../../graphql/directives";

export function WarnIfSingleRelationships(): ASTVisitor {
    let warningAlreadyIssued = false;

    return {
        FieldDefinition(field: FieldDefinitionNode) {
            if (!warningAlreadyIssued) {
                let isRelationship = false;
                for (const directive of field.directives ?? []) {
                    if (directive.name.value === relationshipDirective.name) {
                        isRelationship = true;
                    }
                }

                const isList = Boolean(getListTypeNode(field));

                if (isRelationship && !isList) {
                    console.warn(
                        "Using @relationship directive on a non-list element is deprecated and will be removed in next major version."
                    );
                    warningAlreadyIssued = true;
                }
            }
        },
    };
}

function getListTypeNode(definition: FieldDefinitionNode | ListTypeNode | NonNullTypeNode): ListTypeNode | undefined {
    if (definition.type.kind === Kind.NON_NULL_TYPE) {
        return getListTypeNode(definition.type);
    }

    if (definition.type.kind === Kind.LIST_TYPE) {
        return definition.type;
    }

    return;
}
