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

import type { Context, RelationField } from "../../../types";
import type { CallbackBucket } from "../../../classes/CallbackBucket";
import type {
    Visitor,
    ICreateAST,
    INestedCreateAST,
    CreateAST,
    NestedCreateAST,
    IAST,
} from "../GraphQLInputAST/GraphQLInputAST";
import type { Node, Relationship } from "../../../classes";
import createRelationshipValidationString from "../../create-relationship-validation-string";
import { filterTruthy } from "../../../utils/utils";
import type { Expr, Map, MapProjection } from "@neo4j/cypher-builder";
import Cypher from "@neo4j/cypher-builder";
import mapToDbProperty from "../../../utils/map-to-db-property";
import { createAuthPredicates } from "../../create-auth-predicates";
import { AUTH_FORBIDDEN_ERROR } from "../../../constants";
import { getCypherRelationshipDirection } from "../../../utils/get-relationship-direction";
import { createAuthorizationAfterPredicate } from "../../authorization/create-authorization-after-predicate";

type UnwindCreateScopeDefinition = {
    unwindVar: Cypher.Variable;
    parentVar: Cypher.Variable;
    clause?: Cypher.Clause;
};
type GraphQLInputASTNodeRef = string;
type UnwindCreateEnvironment = Record<GraphQLInputASTNodeRef, UnwindCreateScopeDefinition>;

export class UnwindCreateVisitor implements Visitor {
    unwindVar: Cypher.Variable;
    callbackBucket: CallbackBucket;
    context: Context;
    rootNode: Cypher.Node | undefined;
    clause: Cypher.Clause | undefined;
    environment: UnwindCreateEnvironment;

    constructor(unwindVar: Cypher.Variable, callbackBucket: CallbackBucket, context: Context) {
        this.unwindVar = unwindVar;
        this.callbackBucket = callbackBucket;
        this.context = context;
        this.environment = {};
    }

    visitChildren(
        currentASTNode: IAST,
        unwindVar: Cypher.Variable,
        parentVar: Cypher.Variable
    ): (Cypher.Clause | undefined)[] {
        if (currentASTNode.children) {
            const childrenRefs = currentASTNode.children.map((children) => {
                this.environment[children.id] = { unwindVar, parentVar };
                children.accept(this);
                return children.id;
            });
            return childrenRefs.map(
                (childrenRef) => (this.environment[childrenRef] as UnwindCreateScopeDefinition).clause
            );
        }
        return [];
    }

    visitCreate(create: ICreateAST): void {
        const labels = create.node.getLabels(this.context);
        const currentNode = new Cypher.Node({
            labels,
        });

        const nestedClauses = this.visitChildren(create, this.unwindVar, currentNode);

        const setProperties = create.nodeProperties.map((property: string) =>
            fieldToSetParam(create.node, currentNode, property, this.unwindVar.property(property))
        );
        const autogeneratedProperties = getAutoGeneratedFields(create.node, currentNode);

        const createClause = new Cypher.Create(currentNode).set(...setProperties, ...autogeneratedProperties);

        const relationshipValidationClause = new Cypher.RawCypher((env: Cypher.Environment) => {
            const validationStr = createRelationshipValidationString({
                node: create.node,
                context: this.context,
                varName: env.getReferenceId(currentNode),
            });
            const cypher = [] as string[];

            if (validationStr) {
                cypher.push(`WITH ${env.getReferenceId(currentNode)}`);
                cypher.push(validationStr);
            }
            return cypher.join("\n");
        });

        const authNodeClause = this.getAuthNodeClause(create.node, this.context, currentNode);
        const authFieldsClause = this.getAuthFieldClause(create, this.context, currentNode, this.unwindVar);
        const clause = Cypher.concat(
            ...filterTruthy([
                createClause,
                ...nestedClauses,
                authNodeClause,
                authFieldsClause,
                relationshipValidationClause,
                new Cypher.Return(currentNode),
            ])
        );
        this.rootNode = currentNode;
        this.clause = new Cypher.Call(clause).innerWith(this.unwindVar);
    }

    visitNestedCreate(nestedCreate: INestedCreateAST): void {
        const parentVar = (this.environment[nestedCreate.id] as UnwindCreateScopeDefinition).parentVar;
        const unwindVar = (this.environment[nestedCreate.id] as UnwindCreateScopeDefinition).unwindVar;
        const { node, relationship, relationshipPropertyPath } = nestedCreate;
        const blockWith = new Cypher.With(parentVar, unwindVar);
        const createUnwindVar = new Cypher.Variable();
        const createUnwindClause = new Cypher.Unwind([
            unwindVar.property(relationshipPropertyPath).property("create"),
            createUnwindVar,
        ]);

        const labels = node.getLabels(this.context);
        const currentNode = new Cypher.Node({
            labels,
        });
        const nodeVar = new Cypher.Variable();
        const edgeVar = new Cypher.Variable();
        const withCreate = new Cypher.With(
            [createUnwindVar.property("node"), nodeVar],
            [createUnwindVar.property("edge"), edgeVar],
            parentVar
        );

        const nestedClauses = this.visitChildren(nestedCreate, nodeVar, currentNode);

        const createClause = new Cypher.Create(currentNode);
        const relationField = relationship[0] as RelationField;

        const relationshipVar = new Cypher.Relationship({ type: relationField.type });

        const direction = getCypherRelationshipDirection(relationField);

        const relationshipPattern = new Cypher.Pattern(parentVar as Cypher.Node)
            .withoutLabels()
            .related(relationshipVar)
            .withDirection(direction)
            .to(currentNode)
            .withoutLabels();

        const mergeClause = new Cypher.Merge(relationshipPattern);

        const setPropertiesNode = nestedCreate.nodeProperties.map((property: string) =>
            fieldToSetParam(node, currentNode, property, nodeVar.property(property))
        );
        const autogeneratedProperties = getAutoGeneratedFields(node, currentNode);

        createClause.set(...setPropertiesNode, ...autogeneratedProperties);
        if (nestedCreate.edgeProperties && nestedCreate.edgeProperties.length && nestedCreate.edge) {
            const setPropertiesEdge = nestedCreate.edgeProperties.map((property) => {
                return fieldToSetParam(
                    nestedCreate.edge as Relationship,
                    relationshipVar,
                    property,
                    edgeVar.property(property)
                );
            });
            const autogeneratedEdgeProperties = getAutoGeneratedFields(nestedCreate.edge, relationshipVar);
            mergeClause.set(...setPropertiesEdge, ...autogeneratedEdgeProperties);
        }

        const subQueryStatements = [blockWith, createUnwindClause, withCreate, createClause, mergeClause] as (
            | undefined
            | Cypher.Clause
        )[];
        const relationshipValidationClause = new Cypher.RawCypher((env: Cypher.Environment) => {
            const validationStr = createRelationshipValidationString({
                node,
                context: this.context,
                varName: env.getReferenceId(currentNode),
            });
            const cypher = [] as string[];
            if (validationStr) {
                cypher.push(`WITH ${env.getReferenceId(currentNode)}`);
                cypher.push(validationStr);
            }
            return cypher.join("\n");
        });

        const authNodeClause = this.getAuthNodeClause(nestedCreate.node, this.context, currentNode);
        const authFieldsClause = this.getAuthFieldClause(nestedCreate, this.context, currentNode, nodeVar);
        subQueryStatements.push(...nestedClauses);
        subQueryStatements.push(authNodeClause);
        subQueryStatements.push(authFieldsClause);
        subQueryStatements.push(relationshipValidationClause);
        subQueryStatements.push(new Cypher.Return([Cypher.collect(new Cypher.Literal(null)), new Cypher.Variable()]));
        const subQuery = Cypher.concat(...subQueryStatements);
        const callClause = new Cypher.Call(subQuery);
        const outsideWith = new Cypher.With(parentVar, unwindVar);

        (this.environment[nestedCreate.id] as UnwindCreateScopeDefinition).clause = Cypher.concat(
            outsideWith,
            callClause
        );
    }

    private getAuthNodeClause(node: Node, context: Context, nodeRef: Cypher.Node): Cypher.Clause | undefined {
        const authorizationPredicateReturn = createAuthorizationAfterPredicate({
            context,
            variable: nodeRef,
            node,
            operations: ["CREATE"],
        });

        if (authorizationPredicateReturn) {
            const { predicate, preComputedSubqueries } = authorizationPredicateReturn;

            if (predicate) {
                if (preComputedSubqueries && !preComputedSubqueries.empty) {
                    return Cypher.concat(
                        new Cypher.With("*"),
                        preComputedSubqueries,
                        new Cypher.With("*").where(predicate)
                    );
                }

                return new Cypher.With("*").where(predicate);
            }
        } else if (node.auth) {
            // TODO: Authorization - delete for 4.0.0
            const authExpr = createAuthPredicates({
                entity: node,
                operations: "CREATE",
                context,
                bind: { node, varName: nodeRef },
            });
            if (authExpr) {
                return Cypher.concat(
                    new Cypher.With("*").where(
                        Cypher.apoc.util.validatePredicate(Cypher.not(authExpr), AUTH_FORBIDDEN_ERROR)
                    )
                );
            }
        }
    }

    private getAuthFieldClause(
        astNode: CreateAST | NestedCreateAST,
        context: Context,
        nodeRef: Cypher.Node,
        unwindVar: Cypher.Variable
    ): Cypher.RawCypher | undefined {
        const authFields = astNode.node.primitiveFields.filter((field) => field.auth);
        const usedAuthFields = astNode.nodeProperties
            .flatMap((property) => {
                return authFields.filter((authField) => authField.fieldName === property);
            })
            .filter((n) => n);
        if (usedAuthFields.length) {
            return new Cypher.RawCypher((env: Cypher.Environment) => {
                const fieldsPredicates = usedAuthFields
                    .map((field) => {
                        const fieldAuthCypher = createAuthPredicates({
                            entity: field,
                            operations: "CREATE",
                            context,
                            bind: {
                                node: astNode.node,
                                varName: nodeRef,
                            },
                        });
                        if (fieldAuthCypher) {
                            return Cypher.or(Cypher.isNull(unwindVar.property(field.fieldName)), fieldAuthCypher);
                        }
                    })
                    .filter((predicate) => predicate !== undefined) as Cypher.BooleanOp[];
                if (fieldsPredicates.length) {
                    const predicate = Cypher.not(Cypher.and(...fieldsPredicates));

                    const fieldsAuth = Cypher.concat(
                        new Cypher.With("*").where(Cypher.apoc.util.validatePredicate(predicate, AUTH_FORBIDDEN_ERROR))
                    ).getCypher(env);

                    const fieldsPredicateParams = fieldsPredicates.reduce((prev, next) => {
                        return {
                            ...prev[1],
                            ...next[1],
                        };
                    }, {});
                    return [fieldsAuth, fieldsPredicateParams as [string, Record<string, any>]];
                }
            });
        }
    }

    /*
     * Returns the Cypher Reference of the root Nodes and the Cypher Clause generated
     */
    build(): [Cypher.Node?, Cypher.Clause?] {
        return [this.rootNode, this.clause];
    }
}

function getAutoGeneratedFields(
    graphQLElement: Node | Relationship,
    cypherNodeRef: Cypher.Node | Cypher.Relationship
): Cypher.SetParam[] {
    const setParams: Cypher.SetParam[] = [];
    const timestampedFields = graphQLElement.temporalFields.filter(
        (x) => ["DateTime", "Time"].includes(x.typeMeta.name) && x.timestamps?.includes("CREATE")
    );
    timestampedFields.forEach((field) => {
        // DateTime -> datetime(); Time -> time()
        const relatedCypherExpression = Cypher[field.typeMeta.name.toLowerCase()]() as Cypher.Expr;
        setParams.push([
            cypherNodeRef.property(field.dbPropertyName as string),
            relatedCypherExpression,
        ] as Cypher.SetParam);
    });

    const autogeneratedIdFields = graphQLElement.primitiveFields.filter((x) => x.autogenerate);
    autogeneratedIdFields.forEach((field) => {
        setParams.push([
            cypherNodeRef.property(field.dbPropertyName as string),
            Cypher.randomUUID(),
        ] as Cypher.SetParam);
    });
    return setParams;
}

function fieldToSetParam(
    graphQLElement: Node | Relationship,
    cypherNodeRef: Cypher.Node | Cypher.Relationship,
    key: string,
    value: Exclude<Expr, Map | MapProjection>
): Cypher.SetParam {
    const pointField = graphQLElement.pointFields.find((x) => key === x.fieldName);
    const dbName = mapToDbProperty(graphQLElement, key);
    if (pointField) {
        if (pointField.typeMeta.array) {
            const comprehensionVar = new Cypher.Variable();
            const mapPoint = Cypher.point(comprehensionVar);
            const expression = new Cypher.ListComprehension(comprehensionVar, value).map(mapPoint);
            return [cypherNodeRef.property(dbName), expression];
        }
        return [cypherNodeRef.property(dbName), Cypher.point(value)];
    }
    return [cypherNodeRef.property(dbName), value];
}
