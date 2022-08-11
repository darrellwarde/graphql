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

import type { Variable } from "./variables/Variable";
import type { Operation } from "./operations/Operation";
import type { PropertyRef } from "./PropertyRef";
import type { CypherFunction } from "./functions/CypherFunction";
import type { Literal } from "./variables/Literal";
import type { Exists } from "./sub-clauses/Exists";
import type { CypherEnvironment } from "./Environment";
import type { ComprehensionExpr } from "./list/ComprehensionExpr";
import type { MapExpr } from "./variables/map/MapExpr";
import type { BooleanOp } from "./operations/boolean";
import type { ComparisonOp } from "./operations/comparison";
import type { RawCypher } from "./clauses/RawCypher";
import type { PredicateFunction } from "./functions/PredicateFunctions";
import type { ValidatePredicate } from "./procedures/apoc/apoc";

export type Expr =
    | Operation
    | Variable
    | PropertyRef
    | CypherFunction
    | Literal
    | Predicate
    | ComprehensionExpr
    | MapExpr;

/** Represents a predicate statement (i.e returns a boolean). Note that RawCypher is only added for compatibility */
export type Predicate =
    | BooleanOp
    | ComparisonOp
    | RawCypher
    | Exists
    | PredicateFunction
    | ValidatePredicate
    | Literal<boolean>;

export type CypherResult = {
    cypher: string;
    params: Record<string, string>;
};

/** Defines the interface for a class that can be compiled into Cypher */
export interface CypherCompilable {
    getCypher(env: CypherEnvironment): string;
}
