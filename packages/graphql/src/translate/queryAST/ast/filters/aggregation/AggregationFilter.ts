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
import { InterfaceEntityAdapter } from "../../../../../schema-model/entity/model-adapters/InterfaceEntityAdapter";
import type { RelationshipAdapter } from "../../../../../schema-model/relationship/model-adapters/RelationshipAdapter";
import { hasTarget } from "../../../utils/context-has-target";
import { getEntityLabels } from "../../../utils/create-node-from-entity";
import type { QueryASTContext } from "../../QueryASTContext";
import type { QueryASTNode } from "../../QueryASTNode";
import { Filter } from "../Filter";
import type { LogicalFilter } from "../LogicalFilter";
import type { AggregationPropertyFilter } from "./AggregationPropertyFilter";
import type { CountFilter } from "./CountFilter";

export class AggregationFilter extends Filter {
    private relationship: RelationshipAdapter;

    private filters: Array<AggregationPropertyFilter | CountFilter | LogicalFilter> = [];

    private subqueryReturnVariable: Cypher.Variable | undefined;

    constructor(relationship: RelationshipAdapter) {
        super();
        this.relationship = relationship;
    }

    public addFilters(...filter: Array<AggregationPropertyFilter | CountFilter | LogicalFilter>) {
        this.filters.push(...filter);
    }

    public getChildren(): QueryASTNode[] {
        return [...this.filters];
    }

    public getSubqueries(context: QueryASTContext): Cypher.Clause[] {
        if (!hasTarget(context)) throw new Error("No parent node found!");
        this.subqueryReturnVariable = new Cypher.Variable();
        const relatedEntity = this.relationship.target;

        const relatedNode: Cypher.Node = new Cypher.Node();
        let relatedNodeLabels: string[] = [];
        let labelsFilter: Cypher.Predicate | undefined;

        if (relatedEntity instanceof InterfaceEntityAdapter) {
            const labelsForImplementations = relatedEntity.concreteEntities.map((e) =>
                relatedNode.hasLabels(...e.getLabels())
            );
            labelsFilter = Cypher.or(...labelsForImplementations);
        } else {
            relatedNodeLabels = getEntityLabels(relatedEntity, context.neo4jGraphQLContext);
        }
        const relationshipTarget = new Cypher.Relationship();

        const pattern = new Cypher.Pattern(context.target)
            .related(relationshipTarget, {
                direction: this.relationship.getCypherDirection(),
                type: this.relationship.type,
            })
            .to(relatedNode, { labels: relatedNodeLabels });

        const nestedContext = context.push({
            target: relatedNode,
            relationship: relationshipTarget,
        });

        const predicates = Cypher.and(...this.filters.map((f) => f.getPredicate(nestedContext)));

        const returnColumns: Cypher.ProjectionColumn[] = [];

        if (predicates) {
            returnColumns.push([predicates, this.subqueryReturnVariable]);
        }

        if (returnColumns.length === 0) return []; // Maybe throw?

        const subquery = labelsFilter
            ? new Cypher.Match(pattern).where(labelsFilter).return(...returnColumns)
            : new Cypher.Match(pattern).return(...returnColumns);

        return [subquery];
    }

    public getPredicate(_queryASTContext: QueryASTContext): Cypher.Predicate | undefined {
        // should this throw instead?
        if (!this.subqueryReturnVariable) return undefined;
        return Cypher.eq(this.subqueryReturnVariable, Cypher.true);
    }
}
