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
import type { DirectiveNode, FieldDefinitionNode } from "graphql";
import { Kind } from "graphql";
import type { FulltextField } from "../../../../schema-model/annotation/FulltextAnnotation";
import { parseValueNode } from "../../../../schema-model/parser/parse-value-node";
import { DocumentValidationError } from "../utils/document-validation-error";
import type { ObjectOrInterfaceWithExtensions } from "../utils/path-parser";

export function verifyFulltext({
    directiveNode,
    traversedDef,
}: {
    directiveNode: DirectiveNode;
    traversedDef: ObjectOrInterfaceWithExtensions | FieldDefinitionNode;
}) {
    if (traversedDef.kind !== Kind.OBJECT_TYPE_DEFINITION && traversedDef.kind !== Kind.OBJECT_TYPE_EXTENSION) {
        // delegate
        return;
    }
    const indexesArg = directiveNode.arguments?.find((a) => a.name.value === "indexes");
    if (!indexesArg) {
        // delegate to DirectiveArgumentOfCorrectType rule
        return;
    }
    const indexesValue = parseValueNode(indexesArg.value) as FulltextField[];
    const compatibleFields = traversedDef.fields?.filter((f) => {
        if (f.type.kind === Kind.NON_NULL_TYPE) {
            const innerType = f.type.type;
            if (innerType.kind === Kind.NAMED_TYPE) {
                return ["String", "ID"].includes(innerType.name.value);
            }
        }
        if (f.type.kind === Kind.NAMED_TYPE) {
            return ["String", "ID"].includes(f.type.name.value);
        }
        return false;
    });
    indexesValue.forEach((index) => {
        const indexName = index.indexName;
        const indexNames = indexesValue.filter((i) => indexName === i.indexName);
        if (indexNames.length > 1) {
            throw new DocumentValidationError(
                `@fulltext.indexes invalid value for: ${indexName}. Duplicate index name.`,
                ["indexes"]
            );
        }

        const queryName = index.queryName;
        const queryNames = indexesValue.filter((i) => queryName === i.queryName);
        if (queryNames.length > 1) {
            throw new DocumentValidationError(
                `@fulltext.indexes invalid value for: ${queryName}. Duplicate query name.`,
                ["indexes"]
            );
        }

        (index.fields || []).forEach((field) => {
            const foundField = compatibleFields?.some((f) => f.name.value === field);
            if (!foundField) {
                throw new DocumentValidationError(
                    `@fulltext.indexes invalid value for: ${indexName}. Field ${field} is not of type String or ID.`,
                    ["indexes"]
                );
            }
        });
    });
}
