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
import type { ResolveTree } from "graphql-parse-resolve-info";
import type { AttributeAdapter } from "../../../../schema-model/attribute/model-adapters/AttributeAdapter";
import type { ConcreteEntityAdapter } from "../../../../schema-model/entity/model-adapters/ConcreteEntityAdapter";
import type { RelationshipAdapter } from "../../../../schema-model/relationship/model-adapters/RelationshipAdapter";
import type { Neo4jGraphQLTranslationContext } from "../../../../types/neo4j-graphql-translation-context";
import { asArray } from "../../../../utils/utils";
import { MutationOperationField } from "../../ast/input-fields/MutationOperationField";
import { PropertyInputField } from "../../ast/input-fields/PropertyInputField";
import { CreateOperation } from "../../ast/operations/CreateOperation";
import type { ReadOperation } from "../../ast/operations/ReadOperation";
import { UnwindCreateOperation } from "../../ast/operations/UnwindCreateOperation";
import { assertIsConcreteEntity, isConcreteEntity } from "../../utils/is-concrete-entity";
import { raiseAttributeAmbiguity } from "../../utils/raise-attribute-ambiguity";
import type { QueryASTFactory } from "../QueryASTFactory";
import { getAutogeneratedFields } from "../parsers/get-autogenerated-fields";

export class CreateFactory {
    private queryASTFactory: QueryASTFactory;

    constructor(queryASTFactory: QueryASTFactory) {
        this.queryASTFactory = queryASTFactory;
    }

    public createCreateOperation(
        entity: ConcreteEntityAdapter,
        resolveTree: ResolveTree,
        context: Neo4jGraphQLTranslationContext
    ): CreateOperation {
        const responseFields = Object.values(
            resolveTree.fieldsByTypeName[entity.operations.mutationResponseTypeNames.create] ?? {}
        );
        const createOP = new CreateOperation({ target: entity });
        const projectionFields = responseFields
            .filter((f) => f.name === entity.plural)
            .map((field) => {
                const readOP = this.queryASTFactory.operationsFactory.createReadOperation({
                    entityOrRel: entity,
                    resolveTree: field,
                    context,
                }) as ReadOperation;
                return readOP;
            });

        createOP.addProjectionOperations(projectionFields);
        return createOP;
    }

    public createUnwindCreateOperation(
        entity: ConcreteEntityAdapter,
        resolveTree: ResolveTree,
        context: Neo4jGraphQLTranslationContext
    ): UnwindCreateOperation {
        const responseFields = Object.values(
            resolveTree.fieldsByTypeName[entity.operations.mutationResponseTypeNames.create] ?? {}
        );
        const rawInput = resolveTree.args.input as Record<string, any>[];
        const input = rawInput ?? [];
        const unwindCreate = this.parseUnwindCreate({
            target: entity,
            input,
            context,
            argumentToUnwind: new Cypher.Param(input),
        });

        const projectionFields = responseFields
            .filter((f) => f.name === entity.plural)
            .map((field) => {
                return this.queryASTFactory.operationsFactory.createReadOperation({
                    entityOrRel: entity,
                    resolveTree: field,
                    context,
                }) as ReadOperation;
            });

        unwindCreate.addProjectionOperations(projectionFields);
        return unwindCreate;
    }

    private parseUnwindCreate({
        target,
        relationship,
        input,
        context,
        argumentToUnwind,
    }: {
        target: ConcreteEntityAdapter;
        relationship?: RelationshipAdapter;
        input: Record<string, any>[];
        context: Neo4jGraphQLTranslationContext;
        argumentToUnwind: Cypher.Property | Cypher.Param;
    }): UnwindCreateOperation {
        const isNested = Boolean(relationship);

        const unwindCreate = new UnwindCreateOperation({
            target: relationship ?? target,
            argumentToUnwind,
        });
        this.addEntityAuthorization({ entity: target, context, unwindCreate: unwindCreate });
        this.addAuthorizationsForAttributes({
            target,
            context,
            unwindCreate: unwindCreate,
            isNested,
        });
        this.hydrateUnwindCreateOperation({
            target,
            relationship,
            input,
            unwindCreate,
            context,
        });

        return unwindCreate;
    }

    private hydrateUnwindCreateOperation({
        target,
        relationship,
        input,
        unwindCreate,
        context,
    }: {
        target: ConcreteEntityAdapter;
        relationship?: RelationshipAdapter;
        input: Record<string, any>[];
        unwindCreate: UnwindCreateOperation;
        context: Neo4jGraphQLTranslationContext;
    }) {
        const isNested = Boolean(relationship);
        // TODO: there is no need to get always the autogenerated field as these are static fields and can be cached
        [target, relationship].forEach((t) =>
            this.addAutogeneratedFields({
                target: t,
                unwindCreate,
            })
        );
        asArray(input).forEach((inputItem) => {
            const targetInput = this.getInputNode(inputItem, isNested);
            raiseAttributeAmbiguity(Object.keys(targetInput), target);
            raiseAttributeAmbiguity(Object.keys(this.getInputEdge(target)), relationship);
            for (const key of Object.keys(targetInput)) {
                const nestedRelationship = target.relationships.get(key);
                const attribute = target.attributes.get(key);
                if (!attribute && !nestedRelationship) {
                    throw new Error(`Transpile Error: Input field ${key} not found in entity ${target.name}`);
                }
                if (attribute) {
                    this.parseAttributeInputField({
                        target,
                        attribute,
                        unwindCreate,
                    });
                } else if (nestedRelationship) {
                    const nestedEntity = nestedRelationship.target;
                    assertIsConcreteEntity(nestedEntity);
                    const relField = unwindCreate.getField(key, "node");
                    const nestedCreateInput = targetInput[key]?.create;
                    if (
                        relField &&
                        relField instanceof MutationOperationField &&
                        relField.mutationOperation instanceof UnwindCreateOperation
                    ) {
                        // in case relationship field is already present in the unwind operation we want still to hydrate the unwind-create operation as it might have different fields.
                        this.hydrateUnwindCreateOperation({
                            target: nestedEntity,
                            relationship: nestedRelationship,
                            input: nestedCreateInput,
                            unwindCreate: relField.mutationOperation,
                            context,
                        });
                    } else {
                        this.addRelationshipInputFieldToUnwindOperation({
                            relationship: nestedRelationship,
                            unwindCreate,
                            context,
                            nestedCreateInput,
                            isNested,
                        });
                    }
                }
            }
            if (relationship) {
                for (const key of Object.keys(this.getInputEdge(inputItem))) {
                    const attribute = relationship.attributes.get(key);
                    if (attribute) {
                        this.parseAttributeInputField({
                            target: relationship,
                            attribute,
                            unwindCreate,
                        });
                    }
                }
            }
        });
    }

    private getInputNode(inputItem: Record<string, any>, isNested: boolean): Record<string, any> {
        if (isNested) {
            return inputItem.node ?? {};
        }
        return inputItem;
    }

    private getInputEdge(inputItem: Record<string, any>): Record<string, any> {
        return inputItem.edge ?? {};
    }

    private addAutogeneratedFields({
        target,
        unwindCreate,
    }: {
        target: ConcreteEntityAdapter | RelationshipAdapter | undefined;
        unwindCreate: UnwindCreateOperation;
    }): void {
        if (!target) {
            return;
        }
        const attachedTo = isConcreteEntity(target) ? "node" : "relationship";
        const autoGeneratedFields = getAutogeneratedFields(target);

        autoGeneratedFields.forEach((field) => {
            if (unwindCreate.getField(field.name, attachedTo)) {
                return;
            }
            unwindCreate.addField(field, attachedTo);
        });
    }

    private parseAttributeInputField({
        target,
        attribute,
        unwindCreate,
    }: {
        target: ConcreteEntityAdapter | RelationshipAdapter;
        attribute: AttributeAdapter;
        unwindCreate: UnwindCreateOperation;
    }) {
        const isConcreteEntityTarget = isConcreteEntity(target);
        const attachedTo = isConcreteEntityTarget ? "node" : "relationship";

        this.addAttributeInputFieldToUnwindOperation({
            attribute,
            unwindCreate,
            pathStr: isConcreteEntityTarget ? "edge" : "node",
            attachedTo,
        });
    }

    private getEdgeOrNodePath({
        unwindVariable,
        isNested,
        isRelField,
    }: {
        unwindVariable: Cypher.Variable | Cypher.Property | Cypher.Param;
        isNested: boolean;
        isRelField: boolean;
    }): Cypher.Property | Cypher.Variable {
        if (!isNested && isRelField) {
            throw new Error("Transpile error: invalid invoke of getEdgeOrNodePath for relationship field.");
        }

        if (isNested) {
            const path = isRelField ? "edge" : "node";
            return unwindVariable.property(path);
        }
        return unwindVariable;
    }

    private addAttributeInputFieldToUnwindOperation({
        attribute,
        unwindCreate,
        attachedTo,
    }: {
        attribute: AttributeAdapter;
        unwindCreate: UnwindCreateOperation;
        pathStr: string;
        attachedTo: "relationship" | "node";
    }): void {
        if (unwindCreate.getField(attribute.name, attachedTo)) {
            return;
        }

        const inputField = new PropertyInputField({
            attribute,
            attachedTo,
        });

        unwindCreate.addField(inputField, attachedTo);
    }

    private addRelationshipInputFieldToUnwindOperation({
        relationship,
        unwindCreate,
        context,
        nestedCreateInput,
        isNested,
    }: {
        relationship: RelationshipAdapter;
        unwindCreate: UnwindCreateOperation;
        context: Neo4jGraphQLTranslationContext;
        nestedCreateInput: Record<string, any>[];
        isNested: boolean;
    }): void {
        const relField = unwindCreate.getField(relationship.name, "node");
        if (!relField) {
            if (nestedCreateInput) {
                const partialPath = this.getEdgeOrNodePath({
                    unwindVariable: unwindCreate.getUnwindVariable(),
                    isNested,
                    isRelField: false,
                });
                const path = partialPath.property(relationship.name).property("create");
                const nestedUnwind = this.parseUnwindCreate({
                    target: relationship.target as ConcreteEntityAdapter,
                    relationship: relationship,
                    input: nestedCreateInput,
                    argumentToUnwind: path,
                    context,
                });

                const mutationOperationField = new MutationOperationField(relationship.name, nestedUnwind);
                unwindCreate.addField(mutationOperationField, "node");
            } else {
                throw new Error(`Expected create operation, but found: ${relationship.name}`);
            }
        }
    }

    private addEntityAuthorization({
        entity,
        context,
        unwindCreate,
    }: {
        entity: ConcreteEntityAdapter;
        context: Neo4jGraphQLTranslationContext;
        unwindCreate: UnwindCreateOperation;
    }): void {
        const authFilters = this.queryASTFactory.authorizationFactory.createAuthValidateRule({
            entity,
            authAnnotation: entity.annotations.authorization,
            when: "AFTER",
            operations: ["CREATE"],
            context,
        });
        if (authFilters) {
            unwindCreate.addAuthFilters(authFilters);
        }
    }

    private addAttributeAuthorization({
        attribute,
        context,
        unwindCreate,
        entity,
        conditionForEvaluation,
    }: {
        attribute: AttributeAdapter;
        context: Neo4jGraphQLTranslationContext;
        unwindCreate: UnwindCreateOperation;
        entity: ConcreteEntityAdapter;
        conditionForEvaluation?: Cypher.Predicate;
    }): void {
        const attributeAuthorization = this.queryASTFactory.authorizationFactory.createAuthValidateRule({
            entity,
            when: "AFTER",
            authAnnotation: attribute.annotations.authorization,
            conditionForEvaluation,
            operations: ["CREATE"],
            context,
        });
        if (attributeAuthorization) {
            unwindCreate.addAuthFilters(attributeAuthorization);
        }
    }

    private addAuthorizationsForAttributes({
        target,
        context,
        unwindCreate,
        isNested,
    }: {
        target: ConcreteEntityAdapter;
        context: Neo4jGraphQLTranslationContext;
        unwindCreate: UnwindCreateOperation;
        isNested: boolean;
    }): void {
        const edgeOrNodePath = this.getEdgeOrNodePath({
            unwindVariable: unwindCreate.getUnwindVariable(),
            isRelField: false,
            isNested,
        });

        for (const attribute of target.attributes.values()) {
            const path = edgeOrNodePath.property(attribute.name);
            this.addAttributeAuthorization({
                attribute,
                context,
                unwindCreate,
                entity: target,
                conditionForEvaluation: Cypher.isNotNull(path),
            });
        }
    }
}
