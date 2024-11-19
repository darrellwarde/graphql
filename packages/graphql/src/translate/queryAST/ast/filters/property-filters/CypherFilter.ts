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

import Cypher from "@neo4j/cypher-builder";
import type { AttributeAdapter } from "../../../../../schema-model/attribute/model-adapters/AttributeAdapter";
import { createComparisonOperation } from "../../../utils/create-comparison-operator";
import type { QueryASTContext } from "../../QueryASTContext";
import type { QueryASTNode } from "../../QueryASTNode";
import type { CustomCypherSelection } from "../../selection/CustomCypherSelection";
import type { FilterOperator } from "../Filter";
import { Filter } from "../Filter";
import { coalesceValueIfNeeded } from "../utils/coalesce-if-needed";
import { createDurationOperation } from "../utils/create-duration-operation";
import { createPointOperation } from "../utils/create-point-operation";

/** A property which comparison has already been parsed into a Param */
export class CypherFilter extends Filter {
    private returnVariable: Cypher.Variable = new Cypher.Variable();
    private attribute: AttributeAdapter;
    private selection: CustomCypherSelection;
    private operator: FilterOperator;
    protected comparisonValue: Cypher.Param | Cypher.Variable | Cypher.Property;
    private checkIsNotNull: boolean;

    constructor({
        selection,
        attribute,
        operator,
        comparisonValue,
        checkIsNotNull = false,
    }: {
        selection: CustomCypherSelection;
        attribute: AttributeAdapter;
        operator: FilterOperator;
        comparisonValue: Cypher.Param | Cypher.Variable | Cypher.Property;
        checkIsNotNull?: boolean;
    }) {
        super();
        this.selection = selection;
        this.attribute = attribute;
        this.operator = operator;
        this.comparisonValue = comparisonValue;
        this.checkIsNotNull = checkIsNotNull;
    }

    public getChildren(): QueryASTNode[] {
        return [this.selection];
    }

    public print(): string {
        return `${super.print()} [${this.attribute.name}] <${this.operator}>`;
    }

    public getSubqueries(context: QueryASTContext): Cypher.Clause[] {
        const { selection: cypherSubquery, nestedContext } = this.selection.apply(context);

        const nestedReturnVariable = this.attribute.typeHelper.isList()
            ? Cypher.collect(nestedContext.returnVariable)
            : nestedContext.returnVariable;

        const clause: Cypher.Clause = cypherSubquery.return([nestedReturnVariable, this.returnVariable]);

        return [clause];
    }

    public getPredicate(_queryASTContext: QueryASTContext): Cypher.Predicate {
        const operation = this.createBaseOperation({
            operator: this.operator,
            property: this.returnVariable,
            param: this.comparisonValue,
        });

        if (this.checkIsNotNull) {
            return Cypher.and(Cypher.isNotNull(this.comparisonValue), Cypher.isNotNull(this.returnVariable), operation);
        }

        return operation;
    }

    /** Returns the default operation for a given filter */
    private createBaseOperation({
        operator,
        property,
        param,
    }: {
        operator: FilterOperator;
        property: Cypher.Expr;
        param: Cypher.Expr;
    }): Cypher.ComparisonOp {
        const coalesceProperty = coalesceValueIfNeeded(this.attribute, property);

        // This could be solved with specific a specific CypherDurationFilter but
        // we need to use the return variable for the cypher subquery.
        // To allow us to extend the DurationFilter class with a CypherDurationFilter class
        // we would need to have a way to provide the return variable
        // to the PropertyFilter's getPropertyRef method.
        if (this.attribute.typeHelper.isDuration()) {
            return createDurationOperation({
                operator,
                property: coalesceProperty,
                param: this.comparisonValue,
            });
        }

        if (this.attribute.typeHelper.isSpatial()) {
            return createPointOperation({
                operator,
                property: coalesceProperty,
                param: this.comparisonValue,
                attribute: this.attribute,
            });
        }

        return createComparisonOperation({ operator, property: coalesceProperty, param });
    }
}
