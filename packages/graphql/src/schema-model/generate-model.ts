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
    DocumentNode,
    FieldDefinitionNode,
    InterfaceTypeDefinitionNode,
    NamedTypeNode,
    ObjectTypeDefinitionNode,
    UnionTypeDefinitionNode,
} from "graphql";
import { Neo4jGraphQLSchemaValidationError } from "../classes";
import { declareRelationshipDirective, nodeDirective, relationshipDirective } from "../graphql/directives";
import getFieldTypeMeta from "../schema/get-field-type-meta";
import { getInnerTypeName } from "../schema/validation/custom-rules/utils/utils";
import { validateSchemaModel } from "../schema/validation/validate-schema-model";
import { isInArray } from "../utils/is-in-array";
import { filterTruthy } from "../utils/utils";
import type { Operations } from "./Neo4jGraphQLSchemaModel";
import { Neo4jGraphQLSchemaModel } from "./Neo4jGraphQLSchemaModel";
import { Operation } from "./Operation";
import type { Attribute } from "./attribute/Attribute";
import type { AttributeType } from "./attribute/AttributeType";
import { ListType, ObjectType } from "./attribute/AttributeType";
import type { CompositeEntity } from "./entity/CompositeEntity";
import { ConcreteEntity } from "./entity/ConcreteEntity";
import type { Entity } from "./entity/Entity";
import { InterfaceEntity } from "./entity/InterfaceEntity";
import { UnionEntity } from "./entity/UnionEntity";
import { SCHEMA_CONFIGURATION_OBJECT_DIRECTIVES } from "./library-directives";
import type { DefinitionCollection } from "./parser/definition-collection";
import { getDefinitionCollection } from "./parser/definition-collection";
import { parseAnnotations } from "./parser/parse-annotation";
import { parseArguments } from "./parser/parse-arguments";
import { parseAttribute, parseAttributeArguments } from "./parser/parse-attribute";
import { findDirective } from "./parser/utils";
import type { NestedOperation, QueryDirection, RelationshipDirection } from "./relationship/Relationship";
import { Relationship } from "./relationship/Relationship";
import { RelationshipDeclaration } from "./relationship/RelationshipDeclaration";

export function generateModel(document: DocumentNode): Neo4jGraphQLSchemaModel {
    const definitionCollection: DefinitionCollection = getDefinitionCollection(document);

    const operations: Operations = definitionCollection.operations.reduce((acc, definition): Operations => {
        acc[definition.name.value] = generateOperation(definition, definitionCollection);
        return acc;
    }, {});

    // hydrate interface to typeNames map
    hydrateInterfacesToTypeNamesMap(definitionCollection);

    const concreteEntities = Array.from(definitionCollection.nodes.values()).map((node) =>
        generateConcreteEntity(node, definitionCollection)
    );

    const concreteEntitiesMap = concreteEntities.reduce((acc, entity) => {
        acc.set(entity.name, entity);
        return acc;
    }, new Map<string, ConcreteEntity>());

    const interfaceEntities = Array.from(definitionCollection.interfaceToImplementingTypeNamesMap.entries()).map(
        ([name, concreteEntities]) => {
            const interfaceNode = definitionCollection.interfaceTypes.get(name);
            if (!interfaceNode) {
                throw new Error(`Cannot find interface ${name}`);
            }
            return generateInterfaceEntity(
                name,
                interfaceNode,
                concreteEntities,
                concreteEntitiesMap,
                definitionCollection
            );
        }
    );
    const unionEntities = Array.from(definitionCollection.unionTypes).map(([unionName, unionDefinition]) => {
        return generateUnionEntity(
            unionName,
            unionDefinition,
            unionDefinition.types?.map((t) => t.name.value) || [],
            concreteEntitiesMap
        );
    });

    const annotations = parseAnnotations(definitionCollection.schemaDirectives);

    const schema = new Neo4jGraphQLSchemaModel({
        compositeEntities: [...unionEntities, ...interfaceEntities],
        concreteEntities,
        operations,
        annotations,
    });

    validateSchemaModel(schema);

    definitionCollection.nodes.forEach((def) => hydrateRelationships(def, schema, definitionCollection));

    hydrateCypherAnnotations(schema, concreteEntities);

    definitionCollection.interfaceTypes.forEach((def) =>
        hydrateRelationshipDeclarations(def, schema, definitionCollection)
    );
    addCompositeEntitiesToConcreteEntity(interfaceEntities);
    addCompositeEntitiesToConcreteEntity(unionEntities);
    return schema;
}

function addCompositeEntitiesToConcreteEntity(compositeEntities: CompositeEntity[]): void {
    compositeEntities.forEach((compositeEntity: CompositeEntity) => {
        compositeEntity.concreteEntities.forEach((concreteEntity: ConcreteEntity) =>
            concreteEntity.addCompositeEntities(compositeEntity)
        );
    });
}

function getCypherTarget(schema: Neo4jGraphQLSchemaModel, attributeType: AttributeType): ConcreteEntity | undefined {
    if (attributeType instanceof ListType) {
        return getCypherTarget(schema, attributeType.ofType);
    }
    if (attributeType instanceof ObjectType) {
        const foundConcreteEntity = schema.getConcreteEntity(attributeType.name);
        if (!foundConcreteEntity) {
            throw new Neo4jGraphQLSchemaValidationError(
                `@cypher field must target type annotated with the @node directive${attributeType.name}, `
            );
        }
        return schema.getConcreteEntity(attributeType.name);
    }
    if (attributeType instanceof InterfaceEntity || attributeType instanceof UnionEntity) {
        throw new Error("@cypher field target cannot be an interface or an union");
    }
}

// TODO: currently the below is used only for Filtering purposes, and therefore the target is set only for ObjectTypes but in the future we might want to use it for other types as well
function hydrateCypherAnnotations(schema: Neo4jGraphQLSchemaModel, concreteEntities: ConcreteEntity[]) {
    for (const concreteEntity of concreteEntities) {
        for (const attributeField of concreteEntity.attributes.values()) {
            if (attributeField.annotations.cypher) {
                const target = getCypherTarget(schema, attributeField.type);
                attributeField.annotations.cypher.targetEntity = target;
            }
        }
    }
}

function hydrateInterfacesToTypeNamesMap(definitionCollection: DefinitionCollection) {
    return definitionCollection.nodes.forEach((node) => {
        if (!node.interfaces) {
            return;
        }
        const objectTypeName = node.name.value;
        node.interfaces?.forEach((i) => {
            const interfaceTypeName = i.name.value;
            const concreteEntities = definitionCollection.interfaceToImplementingTypeNamesMap.get(interfaceTypeName);
            if (!concreteEntities) {
                throw new Neo4jGraphQLSchemaValidationError(
                    `Could not find composite entity with name ${interfaceTypeName}`
                );
            }
            // TODO: modify the existing array instead of creating a new one
            definitionCollection.interfaceToImplementingTypeNamesMap.set(
                interfaceTypeName,
                concreteEntities.concat(objectTypeName)
            );
        });
    });
}

function generateUnionEntity(
    entityDefinitionName: string,
    unionDefinition: UnionTypeDefinitionNode,
    entityImplementingTypeNames: string[],
    concreteEntities: Map<string, ConcreteEntity>
): UnionEntity {
    const unionEntity = generateCompositeEntity(entityDefinitionName, entityImplementingTypeNames, concreteEntities);
    const annotations = parseAnnotations(unionDefinition.directives || []);
    return new UnionEntity({ ...unionEntity, annotations });
}

function generateInterfaceEntity(
    entityDefinitionName: string,
    definition: InterfaceTypeDefinitionNode,
    entityImplementingTypeNames: string[],
    concreteEntities: Map<string, ConcreteEntity>,
    definitionCollection: DefinitionCollection
): InterfaceEntity {
    const interfaceEntity = generateCompositeEntity(
        entityDefinitionName,
        entityImplementingTypeNames,
        concreteEntities
    );

    const fields = (definition.fields || []).map((fieldDefinition) => {
        const isRelationshipAttribute = findDirective(fieldDefinition.directives, declareRelationshipDirective.name);
        if (isRelationshipAttribute) {
            return;
        }
        return parseAttribute(fieldDefinition, definitionCollection, definition.fields);
    });

    const annotations = parseAnnotations(definition.directives || []);

    return new InterfaceEntity({
        ...interfaceEntity,
        description: definition.description?.value,
        attributes: filterTruthy(fields),
        annotations,
    });
}

function generateCompositeEntity(
    entityDefinitionName: string,
    entityImplementingTypeNames: string[],
    concreteEntities: Map<string, ConcreteEntity>
): { name: string; concreteEntities: ConcreteEntity[] } {
    const compositeFields = filterTruthy(
        entityImplementingTypeNames.map((type) => {
            return concreteEntities.get(type);
        })
    );

    return {
        name: entityDefinitionName,
        concreteEntities: compositeFields,
    };
}

function hydrateRelationships(
    definition: ObjectTypeDefinitionNode,
    schema: Neo4jGraphQLSchemaModel,
    definitionCollection: DefinitionCollection
): void {
    const name = definition.name.value;
    const entity = schema.getEntity(name);

    if (!entity) {
        throw new Error(`Cannot find entity ${name}`);
    }
    if (!(entity instanceof ConcreteEntity)) {
        throw new Error(`Can only add relationship to concrete entity and ${name} is not concrete.`);
    }
    if (!definition.fields?.length) {
        return;
    }

    for (const fieldDefinition of definition.fields) {
        const { firstDeclaredInTypeName, originalTarget } = getFirstDeclaration(
            definition,
            fieldDefinition.name.value,
            definitionCollection,
            schema
        );
        const relationshipField = generateRelationshipField(
            fieldDefinition,
            schema,
            entity,
            definitionCollection,
            firstDeclaredInTypeName,
            originalTarget
        );
        if (relationshipField) {
            entity.addRelationship(relationshipField);
        }
    }
}

function hydrateRelationshipDeclarations(
    definition: InterfaceTypeDefinitionNode,
    schema: Neo4jGraphQLSchemaModel,
    definitionCollection: DefinitionCollection
): void {
    const name = definition.name.value;
    const entity = schema.getEntity(name);

    if (!entity) {
        throw new Error(`Cannot find entity ${name}`);
    }
    if (!(entity instanceof InterfaceEntity)) {
        throw new Error(`Can only declare relationships on Interface entities and ${name} is not an Interface.`);
    }
    if (!definition.fields?.length) {
        return;
    }
    for (const fieldDefinition of definition.fields) {
        const { firstDeclaredInTypeName } = getFirstDeclaration(
            definition,
            fieldDefinition.name.value,
            definitionCollection,
            schema
        );
        const relationshipField = generateRelationshipDeclaration(
            fieldDefinition,
            schema,
            entity,
            definitionCollection,
            firstDeclaredInTypeName
        );
        if (relationshipField) {
            entity.addRelationshipDeclaration(relationshipField);
            const allImplementationsPropertiesTypeNames = filterTruthy(
                relationshipField.relationshipImplementations.map((impl) => impl.propertiesTypeName)
            );
            for (const impl of relationshipField.relationshipImplementations) {
                impl.setSiblings(allImplementationsPropertiesTypeNames);
            }
        }
    }
}

function getFieldDeclaredAsRelationship(
    interfaceDef: InterfaceTypeDefinitionNode | undefined,
    fieldName: string
): FieldDefinitionNode | undefined {
    const fields = interfaceDef?.fields || [];
    return fields.find(
        (field) =>
            field.name.value === fieldName && field.directives?.some((d) => d.name.value === "declareRelationship")
    );
}
function getDefinitionNodeFromNamedNode(
    interfaceNamedNode: NamedTypeNode,
    definitionCollection: DefinitionCollection
): InterfaceTypeDefinitionNode | undefined {
    const interfaceName = interfaceNamedNode.name.value;
    return definitionCollection.interfaceTypes.get(interfaceName);
}

/**
 * Goes up the inheritance chain checking for the field to have the @relationshipDeclaration directive
 * Finds the first interface that declares the field as a relationship
 * Returns the name of the first interface and the target of the relationship declaration in that first interface
 *
 * @param definition Entity with relationship field (Starting point)
 * @param fieldName Relationship field name (The one we look for first declaration for)
 * @param definitionCollection
 * @param schema
 * @returns Info about the interface at the top of the chain, nullable because there might not be any
 */
function getFirstDeclaration(
    definition: ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode | undefined,
    fieldName: string,
    definitionCollection: DefinitionCollection,
    schema: Neo4jGraphQLSchemaModel
): { originalTarget?: Entity; firstDeclaredInTypeName?: string } {
    if (!definition || !definition.interfaces) {
        return {};
    }
    let inheritedInterfaceWithDeclaredField: NamedTypeNode | undefined;
    let declaredFieldTypeName: string | undefined;
    for (const interfaceNamedNode of definition.interfaces) {
        const interfaceDef = getDefinitionNodeFromNamedNode(interfaceNamedNode, definitionCollection);
        const declaredRelationshipField = getFieldDeclaredAsRelationship(interfaceDef, fieldName);
        if (declaredRelationshipField) {
            inheritedInterfaceWithDeclaredField = interfaceNamedNode;
            declaredFieldTypeName = getInnerTypeName(declaredRelationshipField.type);
        }
    }

    if (!inheritedInterfaceWithDeclaredField) {
        // definition declares it first
        return {};
    }

    // found implemented interface that declares it
    const currentInChain = {
        originalTarget: schema.getEntity(declaredFieldTypeName || ""),
        firstDeclaredInTypeName: inheritedInterfaceWithDeclaredField.name.value,
    };

    // attempt to go up in chain
    const interfaceDef = getDefinitionNodeFromNamedNode(inheritedInterfaceWithDeclaredField, definitionCollection);
    const prevInChain = getFirstDeclaration(interfaceDef, fieldName, definitionCollection, schema);
    if (prevInChain.firstDeclaredInTypeName) {
        // found interface that declares it up in chain
        return prevInChain;
    }

    // this interface declares it first
    return currentInChain;
}

function generateRelationshipField(
    field: FieldDefinitionNode,
    schema: Neo4jGraphQLSchemaModel,
    source: ConcreteEntity | InterfaceEntity,
    definitionCollection: DefinitionCollection,
    firstDeclaredInTypeName: string | undefined,
    originalTarget: Entity | undefined
): Relationship | undefined {
    // TODO: remove reference to getFieldTypeMeta
    const fieldTypeMeta = getFieldTypeMeta(field.type);
    const relationshipUsage = findDirective(field.directives, "relationship");
    if (!relationshipUsage) return undefined;

    const fieldName = field.name.value;
    const relatedEntityName = fieldTypeMeta.name;
    const relatedToEntity = schema.getEntity(relatedEntityName);
    if (!relatedToEntity) throw new Error(`Entity ${relatedEntityName} Not Found`);
    const { type, direction, properties, queryDirection, nestedOperations, aggregate } = parseArguments<{
        type: string;
        direction: RelationshipDirection;
        properties: unknown;
        queryDirection: QueryDirection;
        nestedOperations: NestedOperation[];
        aggregate: boolean;
    }>(relationshipDirective, relationshipUsage);

    let attributes: Attribute[] = [];
    let propertiesTypeName: string | undefined = undefined;
    if (properties && typeof properties === "string") {
        const propertyInterface = definitionCollection.relationshipProperties.get(properties);
        if (!propertyInterface) {
            throw new Error(
                `The \`@relationshipProperties\` directive could not be found on the \`${properties}\` interface`
            );
        }
        propertiesTypeName = properties;

        const fields = (propertyInterface.fields || []).map((fieldDefinition) => {
            return parseAttribute(fieldDefinition, definitionCollection, propertyInterface.fields);
        });

        attributes = filterTruthy(fields);
    }

    const annotations = parseAnnotations(field.directives || []);
    const args = parseAttributeArguments(field.arguments || [], definitionCollection);

    return new Relationship({
        name: fieldName,
        type,
        args,
        attributes,
        source,
        target: relatedToEntity,
        direction,
        isList: Boolean(fieldTypeMeta.array),
        queryDirection,
        nestedOperations,
        aggregate,
        isNullable: !fieldTypeMeta.required,
        description: field.description?.value,
        annotations: annotations,
        propertiesTypeName,
        firstDeclaredInTypeName,
        originalTarget,
    });
}

function generateRelationshipDeclaration(
    field: FieldDefinitionNode,
    schema: Neo4jGraphQLSchemaModel,
    source: InterfaceEntity,
    definitionCollection: DefinitionCollection,
    firstDeclaredInTypeName: string | undefined
): RelationshipDeclaration | undefined {
    // TODO: remove reference to getFieldTypeMeta
    const fieldTypeMeta = getFieldTypeMeta(field.type);
    const declareRelationshipUsage = findDirective(field.directives, "declareRelationship");
    if (!declareRelationshipUsage) {
        return;
    }
    const fieldName = field.name.value;
    const relatedEntityName = fieldTypeMeta.name;
    const relatedToEntity = schema.getEntity(relatedEntityName);
    if (!relatedToEntity) {
        throw new Error(`Entity ${relatedEntityName} Not Found`);
    }
    const { nestedOperations, aggregate } = parseArguments<{
        nestedOperations: NestedOperation[];
        aggregate: boolean;
    }>(declareRelationshipDirective, declareRelationshipUsage);

    const annotations = parseAnnotations(field.directives || []);
    const relationshipImplementations = source.concreteEntities
        .map((concreteEntity) => concreteEntity.findRelationship(fieldName))
        .filter((x) => x) as Relationship[];

    return new RelationshipDeclaration({
        name: fieldName,
        source,
        target: relatedToEntity,
        isList: Boolean(fieldTypeMeta.array),
        nestedOperations,
        aggregate,
        isNullable: !fieldTypeMeta.required,
        description: field.description?.value,
        args: parseAttributeArguments(field.arguments || [], definitionCollection),
        annotations,
        relationshipImplementations,
        firstDeclaredInTypeName,
    });
}

function generateConcreteEntity(
    definition: ObjectTypeDefinitionNode,
    definitionCollection: DefinitionCollection
): ConcreteEntity {
    const fields = (definition.fields || []).map((fieldDefinition) => {
        const isRelationshipAttribute = findDirective(fieldDefinition.directives, relationshipDirective.name);
        if (isRelationshipAttribute) {
            return;
        }
        return parseAttribute(fieldDefinition, definitionCollection, definition.fields);
    });

    // schema configuration directives are propagated onto concrete entities
    const schemaDirectives = definitionCollection.schemaExtensions?.directives?.filter((x) =>
        isInArray(SCHEMA_CONFIGURATION_OBJECT_DIRECTIVES, x.name.value)
    );
    const annotations = parseAnnotations((definition.directives || []).concat(schemaDirectives || []));

    return new ConcreteEntity({
        name: definition.name.value,
        description: definition.description?.value,
        labels: getLabels(definition),
        attributes: filterTruthy(fields),
        annotations,
    });
}

function getLabels(entityDefinition: ObjectTypeDefinitionNode): string[] {
    const nodeDirectiveUsage = findDirective(entityDefinition.directives, nodeDirective.name);
    if (nodeDirectiveUsage) {
        const nodeArguments = parseArguments<{ labels?: string[] }>(nodeDirective, nodeDirectiveUsage);
        if (nodeArguments.labels?.length) {
            return nodeArguments.labels;
        }
    }
    return [entityDefinition.name.value];
}

function generateOperation(
    definition: ObjectTypeDefinitionNode,
    definitionCollection: DefinitionCollection
): Operation {
    const { attributes, userResolvedAttributes } = (definition.fields || [])
        .map((fieldDefinition) => parseAttribute(fieldDefinition, definitionCollection))
        .reduce<{ attributes: Attribute[]; userResolvedAttributes: Attribute[] }>(
            (acc, attribute) => {
                if (attribute.annotations.cypher) {
                    acc.attributes.push(attribute);
                } else {
                    acc.userResolvedAttributes.push(attribute);
                }
                return acc;
            },
            { attributes: [], userResolvedAttributes: [] }
        );
    return new Operation({
        name: definition.name.value,
        attributes,
        userResolvedAttributes,
        annotations: parseAnnotations(definition.directives || []),
    });
}
