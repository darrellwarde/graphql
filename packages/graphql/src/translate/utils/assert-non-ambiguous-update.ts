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

import type { Node, Relationship } from "../../classes";
import { Neo4jGraphQLError } from "../../classes";
import { findConflictingProperties } from "../../utils/find-conflicting-properties";

export function assertNonAmbiguousUpdate(graphElement: Relationship | Node, input: Record<string, any>): void {
    const conflictingProperties = findConflictingProperties({ graphElement, input });
    if (conflictingProperties.length > 0) {
        throw new Neo4jGraphQLError(
            `Conflicting modification of ${conflictingProperties.map((n) => `[[${n}]]`).join(", ")} on type ${
                graphElement.name
            }`
        );
    }
}
