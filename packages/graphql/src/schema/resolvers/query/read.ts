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

import type { GraphQLResolveInfo } from "graphql";
import type { SchemaComposer } from "graphql-compose";
import { QueryOptions } from "../../../graphql/input-objects/QueryOptions";
import type { EntityAdapter } from "../../../schema-model/entity/EntityAdapter";
import { UnionEntityAdapter } from "../../../schema-model/entity/model-adapters/UnionEntityAdapter";
import { translateRead } from "../../../translate";
import { isConcreteEntity } from "../../../translate/queryAST/utils/is-concrete-entity";
import type { Neo4jFeaturesSettings } from "../../../types";
import type { Neo4jGraphQLTranslationContext } from "../../../types/neo4j-graphql-translation-context";
import { execute } from "../../../utils";
import getNeo4jResolveTree from "../../../utils/get-neo4j-resolve-tree";
import { DEPRECATE_OPTIONS_ARGUMENT } from "../../constants";
import { makeSortInput } from "../../generation/sort-and-options-input";
import { shouldAddDeprecatedFields } from "../../generation/utils";
import type { Neo4jGraphQLComposedContext } from "../composition/wrap-query-and-mutation";

export function findResolver({
    entityAdapter,
    features,
    composer,
}: {
    entityAdapter: EntityAdapter;
    features?: Neo4jFeaturesSettings;
    composer: SchemaComposer;
}) {
    async function resolve(_root: any, args: any, context: Neo4jGraphQLComposedContext, info: GraphQLResolveInfo) {
        const resolveTree = getNeo4jResolveTree(info, { args });

        (context as Neo4jGraphQLTranslationContext).resolveTree = resolveTree;
        // for composite entities we don't use "this" as varName but we use an autogenerated variable
        let varName;
        if (isConcreteEntity(entityAdapter)) {
            varName = "this";
        }
        const { cypher, params } = translateRead({
            context: context as Neo4jGraphQLTranslationContext,
            entityAdapter,
            varName,
        });
        const executeResult = await execute({
            cypher,
            params,
            defaultAccessMode: "READ",
            context,
            info,
        });

        return executeResult.records.map((x) => x.this);
    }

    const extraArgs = {};
    if (isConcreteEntity(entityAdapter)) {
        if (entityAdapter.annotations.fulltext) {
            extraArgs["fulltext"] = {
                type: `${entityAdapter.name}Fulltext`,
                description:
                    "Query a full-text index. Allows for the aggregation of results, but does not return the query score. Use the root full-text query fields if you require the score.",
            };
        }
    }

    const whereArgumentType = entityAdapter.operations.whereInputTypeName;
    const args = {
        where: whereArgumentType,
        limit: "Int",
        offset: "Int",
        ...extraArgs,
    };
    if (!(entityAdapter instanceof UnionEntityAdapter)) {
        const sortConfig = makeSortInput({ entityAdapter, userDefinedFieldDirectives: new Map(), composer });
        if (sortConfig) {
            args["sort"] = sortConfig.NonNull.List;
        }
    }
    // SOFT_DEPRECATION: OPTIONS-ARGUMENT
    if (shouldAddDeprecatedFields(features, "deprecatedOptionsArgument")) {
        args["options"] = {
            type:
                entityAdapter instanceof UnionEntityAdapter
                    ? QueryOptions
                    : entityAdapter.operations.optionsInputTypeName,
            directives: [DEPRECATE_OPTIONS_ARGUMENT],
        };
    }

    return {
        type: `[${entityAdapter.name}!]!`,
        resolve,
        args,
    };
}
