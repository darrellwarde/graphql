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
import type { Node, Relationship } from "../classes";
import type { CallbackBucket } from "../classes/CallbackBucket";
import type { PredicateReturn, PrimitiveField, RelationField } from "../types";
import type { Neo4jGraphQLTranslationContext } from "../types/neo4j-graphql-translation-context";
import { getCypherRelationshipDirection } from "../utils/get-relationship-direction";
import { asArray, omitFields } from "../utils/utils";
import { checkAuthentication } from "./authorization/check-authentication";
import { createAuthorizationAfterPredicate } from "./authorization/create-authorization-after-predicate";
import { createAuthorizationBeforePredicate } from "./authorization/create-authorization-before-predicate";
import { parseWhereField } from "./queryAST/factory/parsers/parse-where-field";
import { assertNonAmbiguousUpdate } from "./utils/assert-non-ambiguous-update";
import { addCallbackAndSetParamCypher } from "./utils/callback-utils";

type CreateOrConnectInput = {
    where?: {
        node: Record<string, any>;
    };
    onCreate?: {
        node?: Record<string, any>;
        edge?: Record<string, any>;
    };
};

export function createConnectOrCreateAndParams({
    input,
    varName,
    parentVar,
    relationField,
    refNode,
    node,
    context,
    withVars,
    callbackBucket,
}: {
    input: CreateOrConnectInput[] | CreateOrConnectInput;
    varName: string;
    parentVar: string;
    relationField: RelationField;
    refNode: Node;
    node: Node;
    context: Neo4jGraphQLTranslationContext;
    withVars: string[];
    callbackBucket: CallbackBucket;
}): Cypher.CypherResult {
    asArray(input).forEach((connectOrCreateItem) => {
        assertNonAmbiguousUpdate(refNode, connectOrCreateItem.onCreate?.node ?? {});
    });

    // todo: add create
    checkAuthentication({ context, node, targetOperations: ["CREATE", "CREATE_RELATIONSHIP"] });
    checkAuthentication({ context, node: refNode, targetOperations: ["CREATE", "CREATE_RELATIONSHIP"] });

    const withVarsVariables = withVars.map((name) => new Cypher.NamedVariable(name));

    const statements = asArray(input).map((inputItem, index) => {
        const subqueryBaseName = `${varName}${index}`;
        const result = createConnectOrCreatePartialStatement({
            input: inputItem,
            baseName: subqueryBaseName,
            parentVar,
            relationField,
            refNode,
            node,
            context,
            callbackBucket,
            withVars,
        });
        return result;
    });

    const wrappedQueries = statements.map((statement) => {
        const returnStatement = new Cypher.Return([Cypher.count(new Cypher.Raw("*")), "_"]);

        const subqueryClause = new Cypher.With(...withVarsVariables)
            .call(Cypher.utils.concat(statement, returnStatement))
            .importWith(...withVarsVariables);

        return subqueryClause;
    });

    const query = Cypher.utils.concat(...wrappedQueries);
    return query.build({ prefix: `${varName}_` });
}

function createConnectOrCreatePartialStatement({
    input,
    baseName,
    parentVar,
    relationField,
    refNode,
    node,
    context,
    callbackBucket,
    withVars,
}: {
    input: CreateOrConnectInput;
    baseName: string;
    parentVar: string;
    relationField: RelationField;
    refNode: Node;
    node: Node;
    context: Neo4jGraphQLTranslationContext;
    callbackBucket: CallbackBucket;
    withVars: string[];
}): Cypher.Clause {
    let mergeQuery: Cypher.CompositeClause | undefined;

    // TODO: connectOrCreate currently doesn't honour field-level authorization - this should be fixed
    const authorizationBeforePredicateReturn = createAuthorizationBeforeConnectOrCreate({
        context,
        sourceNode: node,
        sourceName: parentVar,
        targetNode: refNode,
        targetName: baseName,
    });

    if (authorizationBeforePredicateReturn.predicate) {
        if (authorizationBeforePredicateReturn.preComputedSubqueries) {
            mergeQuery = Cypher.utils.concat(
                mergeQuery,
                new Cypher.With("*"),
                authorizationBeforePredicateReturn.preComputedSubqueries
            );
        }

        mergeQuery = Cypher.utils.concat(
            mergeQuery,
            new Cypher.With("*").where(authorizationBeforePredicateReturn.predicate)
        );
    }

    const mergeCypher = mergeStatement({
        input,
        refNode,
        context,
        relationField,
        parentNode: new Cypher.NamedNode(parentVar),
        varName: baseName,
        callbackBucket,
        withVars,
    });

    mergeQuery = Cypher.utils.concat(mergeQuery, mergeCypher);

    const authorizationAfterPredicateReturn = createAuthorizationAfterConnectOrCreate({
        context,
        sourceNode: node,
        sourceName: parentVar,
        targetNode: refNode,
        targetName: baseName,
    });

    if (authorizationAfterPredicateReturn.predicate) {
        if (
            authorizationAfterPredicateReturn.preComputedSubqueries &&
            !authorizationAfterPredicateReturn.preComputedSubqueries.empty
        ) {
            mergeQuery = Cypher.utils.concat(
                mergeQuery,
                new Cypher.With("*"),
                authorizationAfterPredicateReturn.preComputedSubqueries,
                new Cypher.With("*").where(authorizationAfterPredicateReturn.predicate)
            );
        } else {
            mergeQuery = Cypher.utils.concat(
                mergeQuery,
                new Cypher.With("*").where(authorizationAfterPredicateReturn.predicate)
            );
        }
    }

    return mergeQuery;
}

function mergeStatement({
    input,
    refNode,
    context,
    relationField,
    parentNode,
    varName,
    callbackBucket,
}: {
    input: CreateOrConnectInput;
    refNode: Node;
    context: Neo4jGraphQLTranslationContext;
    relationField: RelationField;
    parentNode: Cypher.Node;
    varName: string;
    callbackBucket: CallbackBucket;
    withVars: string[];
}): Cypher.Clause {
    const whereAttributes = Object.fromEntries(
        Object.entries(input.where?.node ?? {}).map((whereAttribute) => {
            const { fieldName } = parseWhereField(whereAttribute[0]);
            return [fieldName, whereAttribute[1]];
        })
    );

    const whereNodeParameters = getCypherParameters(whereAttributes, refNode);
    const onCreateNodeParameters = getCypherParameters(input.onCreate?.node, refNode);

    const autogeneratedParams = getAutogeneratedParams(refNode);
    const node = new Cypher.NamedNode(varName);
    const nodePattern = new Cypher.Pattern(node, {
        properties: whereNodeParameters,
        labels: refNode.getLabels(context),
    });

    const unsetAutogeneratedParams = omitFields(autogeneratedParams, Object.keys(whereAttributes));
    const callbackFields = getCallbackFields(refNode);

    const callbackParams = callbackFields
        .map((callbackField): [Cypher.Property, Cypher.Raw] | [] => {
            const varNameVariable = new Cypher.NamedVariable(varName);
            return addCallbackAndSetParamCypher(
                callbackField,
                varNameVariable,
                parentNode,
                callbackBucket,
                "CREATE",
                node
            );
        })
        .filter((tuple) => tuple.length !== 0) as [Cypher.Property, Cypher.Raw][];

    const rawNodeParams = {
        ...unsetAutogeneratedParams,
        ...onCreateNodeParameters,
    };

    const onCreateParams = Object.entries(rawNodeParams).map(([key, param]): [Cypher.Property, Cypher.Param] => {
        return [node.property(key), param];
    });

    const merge = new Cypher.Merge(nodePattern).onCreateSet(...onCreateParams, ...callbackParams);

    const relationshipFields = context.relationships.find((x) => x.properties === relationField.properties);
    const autogeneratedRelationshipParams = relationshipFields ? getAutogeneratedParams(relationshipFields) : {};
    const rawOnCreateRelationshipParams = Cypher.utils.toCypherParams(input.onCreate?.edge || {});

    const rawRelationshipParams = {
        ...autogeneratedRelationshipParams,
        ...rawOnCreateRelationshipParams,
    };

    const relationship = new Cypher.Relationship();
    const direction = getCypherRelationshipDirection(relationField);
    const relationshipPattern = new Cypher.Pattern(parentNode)
        .related(relationship, { type: relationField.type, direction })
        .to(node);

    const onCreateRelationshipParams = Object.entries(rawRelationshipParams).map(
        ([key, param]): [Cypher.Property, Cypher.Param] => {
            return [relationship.property(key), param];
        }
    );
    const relationshipMerge = new Cypher.Merge(relationshipPattern).onCreateSet(...onCreateRelationshipParams);

    let withClause: Cypher.Clause | undefined;

    return Cypher.utils.concat(merge, relationshipMerge, withClause);
}

function createAuthorizationBeforeConnectOrCreate({
    context,
    sourceNode,
    sourceName,
}: {
    context: Neo4jGraphQLTranslationContext;
    sourceNode: Node;
    sourceName: string;
    targetNode: Node;
    targetName: string;
}): PredicateReturn {
    const predicates: Cypher.Predicate[] = [];
    let subqueries: Cypher.CompositeClause | undefined;

    const sourceAuthorizationBefore = createAuthorizationBeforePredicate({
        context,
        nodes: [
            {
                node: sourceNode,
                variable: new Cypher.NamedNode(sourceName),
            },
        ],
        operations: ["CREATE_RELATIONSHIP"],
    });

    if (sourceAuthorizationBefore) {
        const { predicate, preComputedSubqueries } = sourceAuthorizationBefore;

        if (predicate) {
            predicates.push(predicate);
        }

        if (preComputedSubqueries) {
            subqueries = Cypher.utils.concat(subqueries, preComputedSubqueries);
        }
    }

    return {
        predicate: Cypher.and(...predicates),
        preComputedSubqueries: subqueries,
    };
}

function createAuthorizationAfterConnectOrCreate({
    context,
    sourceNode,
    sourceName,
    targetNode,
    targetName,
}: {
    context: Neo4jGraphQLTranslationContext;
    sourceNode: Node;
    sourceName: string;
    targetNode: Node;
    targetName: string;
}): PredicateReturn {
    const predicates: Cypher.Predicate[] = [];
    let subqueries: Cypher.CompositeClause | undefined;

    const sourceAuthorizationAfter = createAuthorizationAfterPredicate({
        context,
        nodes: [
            {
                node: sourceNode,
                variable: new Cypher.NamedNode(sourceName),
            },
        ],
        operations: ["CREATE_RELATIONSHIP"],
    });

    const targetAuthorizationAfter = createAuthorizationAfterPredicate({
        context,
        nodes: [
            {
                node: targetNode,
                variable: new Cypher.NamedNode(targetName),
            },
        ],
        operations: ["CREATE_RELATIONSHIP", "CREATE"],
    });

    if (sourceAuthorizationAfter) {
        const { predicate, preComputedSubqueries } = sourceAuthorizationAfter;

        if (predicate) {
            predicates.push(predicate);
        }

        if (preComputedSubqueries) {
            subqueries = Cypher.utils.concat(subqueries, preComputedSubqueries);
        }
    }

    if (targetAuthorizationAfter) {
        const { predicate, preComputedSubqueries } = targetAuthorizationAfter;

        if (predicate) {
            predicates.push(predicate);
        }

        if (preComputedSubqueries) {
            subqueries = Cypher.utils.concat(subqueries, preComputedSubqueries);
        }
    }

    return {
        predicate: Cypher.and(...predicates),
        preComputedSubqueries: subqueries,
    };
}

function getCallbackFields(node: Node | Relationship): PrimitiveField[] {
    const callbackFields = [
        ...node.primitiveFields.filter((f) => f.callback),
        ...node.temporalFields.filter((f) => f.callback),
    ];
    return callbackFields;
}

// Helper for compatibility reasons
function getAutogeneratedParams(node: Node | Relationship): Record<string, Cypher.Param<any>> {
    const autogeneratedFields = node.primitiveFields
        .filter((f) => f.autogenerate)
        .reduce((acc, field) => {
            if (field.dbPropertyName) {
                acc[field.dbPropertyName] = new Cypher.Raw("randomUUID()");
            }
            return acc;
        }, {});

    const autogeneratedTemporalFields = node.temporalFields
        .filter((field) => ["DateTime", "Time"].includes(field.typeMeta.name) && field.timestamps?.includes("CREATE"))
        .reduce((acc, field) => {
            if (field.dbPropertyName) {
                acc[field.dbPropertyName] = new Cypher.Raw(`${field.typeMeta.name.toLowerCase()}()`);
            }
            return acc;
        }, {});
    return { ...autogeneratedTemporalFields, ...autogeneratedFields };
}

function getCypherParameters(onCreateParams: Record<string, any> = {}, node?: Node): Record<string, Cypher.Param<any>> {
    const params = Object.entries(onCreateParams).reduce((acc, [key, value]) => {
        const nodeField = node?.constrainableFields.find((f) => f.fieldName === key);
        const nodeFieldName = nodeField?.dbPropertyNameUnescaped || nodeField?.fieldName;
        const fieldName = nodeFieldName || key;
        const valueOrArray = nodeField?.typeMeta.array ? asArray(value) : value;
        acc[fieldName] = valueOrArray;
        return acc;
    }, {});
    return Cypher.utils.toCypherParams(params);
}
