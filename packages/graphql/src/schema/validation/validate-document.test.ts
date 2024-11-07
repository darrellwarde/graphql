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

import {
    parse,
    type EnumTypeDefinitionNode,
    type InterfaceTypeDefinitionNode,
    type ObjectTypeDefinitionNode,
    type UnionTypeDefinitionNode,
} from "graphql";
import { gql } from "graphql-tag";
import { NoErrorThrownError, getError } from "../../../tests/utils/get-error";
import { RESERVED_TYPE_NAMES } from "../../constants";
import { AuthorizationAnnotationArguments } from "../../schema-model/annotation/AuthorizationAnnotation";
import type { Neo4jGraphQLCallback } from "../../types";
import validateDocument from "./validate-document";

const additionalDefinitions = {
    enums: [] as EnumTypeDefinitionNode[],
    interfaces: [] as InterfaceTypeDefinitionNode[],
    unions: [] as UnionTypeDefinitionNode[],
    objects: [] as ObjectTypeDefinitionNode[],
};

describe("authorization warning", () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockReset();
    });

    test("authorization warning only occurs once for multiple directives", () => {
        const doc = gql`
            type Movie @authorization(validate: [{ where: { id: "1" } }]) @node {
                id: ID @authorization(validate: [{ where: { id: "1" } }])
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT)
            }

            type Actor @node {
                name: String
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });

        expect(warn).toHaveBeenCalledWith(
            "'@authentication', '@authorization' and/or @subscriptionsAuthorization detected - please ensure that you either specify authorization settings in 'features.authorization'. This warning can be ignored if you intend to pass a decoded JWT into 'context.jwt' on every request."
        );
        expect(warn).toHaveBeenCalledOnce();
    });
});

describe("list of lists warning", () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockReset();
    });

    test("list of lists warning only occurs once for multiple fields", () => {
        const doc = gql`
            type Movie @node {
                id: [[ID]]
            }

            type Actor @node {
                name: [[String]]
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });

        expect(warn).toHaveBeenCalledWith(
            "Encountered list field definition(s) with list elements. This is not supported by Neo4j, however, you can ignore this warning if the field is only used in the result of custom resolver/Cypher."
        );
        expect(warn).toHaveBeenCalledOnce();
    });

    test("works for non-nullable lists", () => {
        const doc = gql`
            type Movie @node {
                id: [[ID!]!]!
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });

        expect(warn).toHaveBeenCalledWith(
            "Encountered list field definition(s) with list elements. This is not supported by Neo4j, however, you can ignore this warning if the field is only used in the result of custom resolver/Cypher."
        );
        expect(warn).toHaveBeenCalledOnce();
    });
});

describe("default max limit bypass warning", () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockReset();
    });

    test("max limit on interface does not trigger warning if no limit on concrete", () => {
        const doc = gql`
            interface Production @limit(max: 10) {
                title: String
            }

            type Movie implements Production @node {
                title: String
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });
        expect(warn).not.toHaveBeenCalled();
    });

    test("max limit on concrete should trigger warning if no limit on interface", () => {
        const doc = gql`
            interface Production {
                title: String
            }

            type Movie implements Production @limit(max: 10) @node {
                title: String
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });

        expect(warn).toHaveBeenCalledWith(
            "Max limit set on Movie may be bypassed by its interface Production. To fix this update the `@limit` max value on the interface type. Ignore this message if the behavior is intended!"
        );
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test("max limit lower on interface than concrete does not trigger warning", () => {
        const doc = gql`
            interface Production @limit(max: 2) {
                title: String
            }

            type Movie implements Production @limit(max: 10) @node {
                title: String
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });
        expect(warn).not.toHaveBeenCalled();
    });

    test("Max limit higher on interface than concrete should trigger warning", () => {
        const doc = gql`
            interface Production @limit(max: 10) {
                title: String
            }

            type Movie implements Production @limit(max: 2) @node {
                title: String
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });

        expect(warn).toHaveBeenCalledWith(
            "Max limit set on Movie may be bypassed by its interface Production. To fix this update the `@limit` max value on the interface type. Ignore this message if the behavior is intended!"
        );
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test("Max limit higher on interface than concrete should trigger warning - multiple implementing types", () => {
        const doc = gql`
            interface Production @limit(max: 10) {
                title: String
            }

            type Movie implements Production @node {
                title: String
            }

            type Series implements Production @limit(max: 2) @node {
                title: String
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });

        expect(warn).toHaveBeenCalledWith(
            "Max limit set on Series may be bypassed by its interface Production. To fix this update the `@limit` max value on the interface type. Ignore this message if the behavior is intended!"
        );
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test("Max limit higher on interface than concrete should trigger warning - on both implementing types", () => {
        const doc = gql`
            interface Production @limit(max: 10) {
                title: String
            }

            type Movie implements Production @limit(max: 6) @node {
                title: String
            }

            type Series implements Production @limit(max: 2) @node {
                title: String
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });

        expect(warn).toHaveBeenCalledWith(
            "Max limit set on Movie may be bypassed by its interface Production. To fix this update the `@limit` max value on the interface type. Ignore this message if the behavior is intended!"
        );
        expect(warn).toHaveBeenCalledWith(
            "Max limit set on Series may be bypassed by its interface Production. To fix this update the `@limit` max value on the interface type. Ignore this message if the behavior is intended!"
        );
        expect(warn).toHaveBeenCalledTimes(2);
    });

    test("Max limit on interface does not trigger warning if only default limit set on concrete", () => {
        const doc = gql`
            interface Production @limit(max: 10) {
                title: String
            }

            type Movie implements Production @limit(default: 6) @node {
                title: String
            }

            type Series implements Production @limit(default: 3) @node {
                title: String
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });
        expect(warn).not.toHaveBeenCalled();
    });
});

describe("warns if queryDirection deprecated values are used", () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        warn.mockReset();
    });

    test("should warn if queryDirection with DEFAULT prefix is used", () => {
        const doc = gql`
            type Actor @node {
                name: String
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN)
            }
            type Movie @node {
                title: String
                movies: [Movie!]! @relationship(type: "ACTED_IN", direction: IN, queryDirection: DEFAULT_DIRECTED)
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });
        expect(warn).toHaveBeenCalledExactlyOnceWith(
            `Found @relationship argument "queryDirection" used with DEFAULT_DIRECTED which is deprecated. \n These default values were used to set a default for the "directed" argument, which is also now deprecated.`
        );
    });

    test("should warn if queryDirection with DIRECTED_ONLY suffix is used", () => {
        const doc = gql`
            type Actor @node {
                name: String
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN)
            }
            type Movie @node {
                title: String
                movies: [Movie!]! @relationship(type: "ACTED_IN", direction: IN, queryDirection: DIRECTED_ONLY)
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });
        expect(warn).toHaveBeenCalledExactlyOnceWith(
            `Found @relationship argument "queryDirection" used with DIRECTED_ONLY which is deprecated. Please use "DIRECTED" or "UNDIRECTED" instead.`
        );
    });

    test("should warn once if multiple deprecation values are used", () => {
        const doc = gql`
            type Actor @node {
                name: String
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN, queryDirection: DEFAULT_DIRECTED)
            }
            type Movie @node {
                title: String
                movies: [Movie!]! @relationship(type: "ACTED_IN", direction: IN, queryDirection: DIRECTED_ONLY)
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });
        expect(warn).toHaveBeenCalledTimes(1);
    });

    test("should not warn if no deprecation values are used", () => {
        const doc = gql`
            type Actor @node {
                name: String
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN, queryDirection: DIRECTED)
            }
            type Movie @node {
                title: String
                movies: [Movie!]! @relationship(type: "ACTED_IN", direction: IN, queryDirection: UNDIRECTED)
            }
        `;

        validateDocument({
            document: doc,
            additionalDefinitions,
            features: {},
        });
        expect(warn).toHaveBeenCalledTimes(0);
    });
});

describe("validation 2.0", () => {
    describe("Directive Argument (existence)", () => {
        describe("@cypher", () => {
            test("@cypher columnName required", () => {
                const doc = gql`
                    type User @node {
                        name: String
                            @cypher(
                                statement: """
                                WITH "whatever" AS x RETURN x
                                """
                            )
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).toThrow(
                    'Directive "@cypher" argument "columnName" of type "String!" is required, but it was not provided.'
                );
            });
            test("@cypher statement required", () => {
                const doc = gql`
                    type User @node {
                        name: String @cypher(columnName: "x")
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).toThrow(
                    'Directive "@cypher" argument "statement" of type "String!" is required, but it was not provided.'
                );
            });
            test("@cypher ok", () => {
                const doc = gql`
                    type User @node {
                        name: String
                            @cypher(
                                statement: """
                                WITH "whatever" AS x RETURN x
                                """
                                columnName: "x"
                            )
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).not.toThrow();
            });
        });
        describe("@alias", () => {
            test("@alias property required", () => {
                const doc = gql`
                    type User @node {
                        name: String @alias
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).toThrow(
                    'Directive "@alias" argument "property" of type "String!" is required, but it was not provided.'
                );
            });
            test("@cypher ok", () => {
                const doc = gql`
                    type User @node {
                        name: String @alias(property: "sub")
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).not.toThrow();
            });
        });
        describe("@coalesce", () => {
            test("@coalesce property required", () => {
                const doc = gql`
                    type User @node {
                        name: String @coalesce
                    }
                `;
                // TODO: is "ScalarOrEnum" type exposed to the user?

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                expect(executeValidate).toThrow(
                    'Directive "@coalesce" argument "value" of type "ScalarOrEnum!" is required, but it was not provided.'
                );
            });
            test("@coalesce ok", () => {
                const doc = gql`
                    type User @node {
                        name: String @coalesce(value: "dummy")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });
        });
        describe("@default", () => {
            test("@default property required", () => {
                const doc = gql`
                    type User @node {
                        name: String @default
                    }
                `;
                // TODO: is "ScalarOrEnum" type exposed to the user?

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                expect(executeValidate).toThrow(
                    'Directive "@default" argument "value" of type "ScalarOrEnum!" is required, but it was not provided.'
                );
            });
            test("@default ok", () => {
                const doc = gql`
                    type User @node {
                        name: String @default(value: "dummy")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });
        });
        describe("@fulltext", () => {
            test("@fulltext property required", () => {
                const doc = gql`
                    type User @fulltext @node {
                        name: String
                    }
                `;
                // TODO: is "[FulltextInput]!" type exposed to the user?
                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).toThrow(
                    'Directive "@fulltext" argument "indexes" of type "[FulltextInput]!" is required, but it was not provided.'
                );
            });
            test("@fulltext ok", () => {
                const doc = gql`
                    type User
                        @fulltext(indexes: [{ indexName: "UserIndex", queryName: "usersByName", fields: ["name"] }])
                        @node {
                        name: String
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).not.toThrow();
            });
        });
        describe("@jwtClaim", () => {
            test("@jwtClaim property required", () => {
                const doc = gql`
                    type User @node {
                        name: String @jwtClaim
                    }
                `;
                // TODO: is "ScalarOrEnum" type exposed to the user?
                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).toThrow(
                    'Directive "@jwtClaim" argument "path" of type "String!" is required, but it was not provided.'
                );
            });
            test("@jwtClaim ok", () => {
                const doc = gql`
                    type User @jwt {
                        name: String @jwtClaim(path: "dummy")
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).not.toThrow();
            });
        });
        describe("@node", () => {
            test("@node ok", () => {
                const doc = gql`
                    type User @node(labels: ["awesome"]) {
                        name: String
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).not.toThrow();
            });
        });
        describe("@plural", () => {
            test("@plural property required", () => {
                const doc = gql`
                    type User @plural @node {
                        name: String
                    }
                `;
                // TODO: is "ScalarOrEnum" type exposed to the user?
                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).toThrow(
                    'Directive "@plural" argument "value" of type "String!" is required, but it was not provided.'
                );
            });
            test("@plural ok", () => {
                const doc = gql`
                    type User @plural(value: "kings") @node {
                        name: String
                    }
                `;

                expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).not.toThrow();
            });
        });
        describe("@populatedBy", () => {
            test("@populatedBy property required", () => {
                const doc = gql`
                    type User @node {
                        name: String @populatedBy
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        features: { populatedBy: { callbacks: { myCallback: () => "hello" } } },
                        additionalDefinitions,
                    });
                expect(executeValidate).toThrow(
                    'Directive "@populatedBy" argument "callback" of type "String!" is required, but it was not provided.'
                );
            });

            test.each([
                "Int",
                "Float",
                "String",
                "Boolean",
                "ID",
                "BigInt",
                "DateTime",
                "Date",
                "Time",
                "LocalDateTime",
                "LocalTime",
                "Duration",
            ])("@populatedBy does not throw with correct arguments on type %s", (type: string) => {
                const doc = /* GraphQL */ `
                    type User @node {
                        name: ${type} @populatedBy(callback: "myCallback")
                    }
                `;

                expect(() =>
                    validateDocument({
                        document: parse(doc),
                        features: { populatedBy: { callbacks: { myCallback: () => "hello" } } },
                        additionalDefinitions,
                    })
                ).not.toThrow();
            });

            test.each(["Point", "CartesianPoint"])(
                "@populatedBy throws when used on invalid type %s",
                (type: string) => {
                    const doc = /* GraphQL */ `
                    type User @node {
                        name: ${type} @populatedBy(callback: "myCallback")
                    }
                `;

                    const executeValidate = () =>
                        validateDocument({
                            document: parse(doc),
                            features: { populatedBy: { callbacks: { myCallback: () => "hello" } } },
                            additionalDefinitions,
                        });
                    expect(executeValidate).toThrow(
                        "@populatedBy can only be used on fields of type Int, Float, String, Boolean, ID, BigInt, DateTime, Date, Time, LocalDateTime, LocalTime or Duration."
                    );
                }
            );

            test.each(["Point", "CartesianPoint"])(
                "@populatedBy throws when used on invalid type %s",
                (type: string) => {
                    const doc = /* GraphQL */ `
                    type User @node {
                        name: ${type} @populatedBy(callback: "myCallback")
                    }
                `;

                    const executeValidate = () =>
                        validateDocument({
                            document: parse(doc),
                            features: { populatedBy: { callbacks: { myCallback: () => "hello" } } },
                            additionalDefinitions,
                        });
                    expect(executeValidate).toThrow(
                        "@populatedBy can only be used on fields of type Int, Float, String, Boolean, ID, BigInt, DateTime, Date, Time, LocalDateTime, LocalTime or Duration."
                    );
                }
            );
        });
        describe("@relationship", () => {
            test("@relationship properties required", () => {
                const doc = gql`
                    type User @node {
                        name: Post @relationship
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                expect(executeValidate).toThrow(
                    'Directive "@relationship" argument "type" of type "String!" is required, but it was not provided.'
                );
            });
            test("@relationship type required", () => {
                const doc = gql`
                    type User @node {
                        name: Post @relationship(direction: IN)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                expect(executeValidate).toThrow(
                    'Directive "@relationship" argument "type" of type "String!" is required, but it was not provided.'
                );
            });
            test("@relationship direction required", () => {
                const doc = gql`
                    type User @node {
                        name: Post @relationship(type: "HAS_POST")
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                expect(executeValidate).toThrow(
                    'Directive "@relationship" argument "direction" of type "RelationshipDirection!" is required, but it was not provided.'
                );
            });
            test("@relationship ok", () => {
                const doc = gql`
                    type User @node {
                        name: Post @relationship(direction: IN, type: "HAS_POST")
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });
        });
    });

    describe("Directive Argument Type", () => {
        test("@fulltext.indexes property required", () => {
            const doc = gql`
                type User @fulltext(indexes: [{ indexName: "something", queryName: "something" }]) @node {
                    name: String
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                'Invalid argument: indexes, error: Field "fields" of required type "[String]!" was not provided.'
            );
            expect(errors[0]).toHaveProperty("path", ["User", "@fulltext", "indexes", 0]);
        });

        test("@fulltext.indexes property required extension", () => {
            const doc = gql`
                type User @node {
                    name: String
                }
                extend type User @fulltext(indexes: [{ indexName: "something", queryName: "something" }])
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                'Invalid argument: indexes, error: Field "fields" of required type "[String]!" was not provided.'
            );
            expect(errors[0]).toHaveProperty("path", ["User", "@fulltext", "indexes", 0]);
        });

        test("@relationship.direction property must be enum value", () => {
            const doc = gql`
                type User @node {
                    post: Post @relationship(direction: "EVERYWHERE", type: "HAS_NAME")
                }
                type Post @node {
                    title: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                'Invalid argument: direction, error: Value "EVERYWHERE" does not exist in "RelationshipDirection" enum.'
            );
            expect(errors[0]).toHaveProperty("path", ["User", "post", "@relationship", "direction"]);
        });

        test("@relationship.direction property must be enum value extension", () => {
            const doc = gql`
                type User @node {
                    id: ID
                }
                extend type User {
                    post: Post @relationship(direction: "EVERYWHERE", type: "HAS_NAME")
                }
                type Post @node {
                    title: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                'Invalid argument: direction, error: Value "EVERYWHERE" does not exist in "RelationshipDirection" enum.'
            );
            expect(errors[0]).toHaveProperty("path", ["User", "post", "@relationship", "direction"]);
        });

        test("@relationship.type property must be string", () => {
            const doc = gql`
                type User @node {
                    post: Post @relationship(type: 42, direction: IN)
                }
                type Post @node {
                    title: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid argument: type, error: String cannot represent a non string value: 42"
            );
            expect(errors[0]).toHaveProperty("path", ["User", "post", "@relationship", "type"]);
        });

        test("@relationship.type property must be string inherited", () => {
            const interfaceDoc = gql`
                interface Person {
                    post: Post @declareRelationship
                }
            `;
            const doc = gql`
                type User implements Person @node {
                    post: Post @relationship(type: 42, direction: IN)
                }
                type Post @node {
                    title: String
                }
                ${interfaceDoc}
            `;

            const interfaces = interfaceDoc.definitions as InterfaceTypeDefinitionNode[];
            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions: { ...additionalDefinitions, interfaces },
                    features: {},
                });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid argument: type, error: String cannot represent a non string value: 42"
            );
            expect(errors[0]).toHaveProperty("path", ["User", "post", "@relationship", "type"]);
        });

        test("@relationship.type property must be string inherited extension", () => {
            const interfaceDoc = gql`
                interface Person {
                    id: ID
                }
                extend interface Person {
                    post: Post @declareRelationship
                }
            `;
            const doc = gql`
                type User implements Person @node {
                    id: ID
                    post: Post @relationship(type: 42, direction: IN)
                }
                type Post @node {
                    title: String
                }
                ${interfaceDoc}
            `;

            const interfaces = interfaceDoc.definitions as InterfaceTypeDefinitionNode[];
            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions: { ...additionalDefinitions, interfaces },
                    features: {},
                });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid argument: type, error: String cannot represent a non string value: 42"
            );
            expect(errors[0]).toHaveProperty("path", ["User", "post", "@relationship", "type"]);
        });

        test("@customResolver.required property must be string", () => {
            const doc = gql`
                type User @node {
                    myStuff: String @customResolver(requires: 42)
                }
            `;
            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid argument: requires, error: SelectionSet cannot represent non string value: 42"
            );
            expect(errors[0]).toHaveProperty("path", ["User", "myStuff", "@customResolver", "requires"]);
        });

        test("@cypher.columnName property must be string", () => {
            const doc = gql`
                type User @node {
                    name: String @cypher(statement: 42, columnName: "x")
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid argument: statement, error: String cannot represent a non string value: 42"
            );
            expect(errors[0]).toHaveProperty("path", ["User", "name", "@cypher", "statement"]);
        });

        test("@cypher.columnName property must be string extension", () => {
            const doc = gql`
                type User @node {
                    id: ID
                }
                extend type User {
                    name: String @cypher(statement: 42, columnName: "x")
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid argument: statement, error: String cannot represent a non string value: 42"
            );
            expect(errors[0]).toHaveProperty("path", ["User", "name", "@cypher", "statement"]);
        });

        test("@cypher.statement property must be string", () => {
            const doc = gql`
                type User @node {
                    name: String
                        @cypher(
                            statement: """
                            MATCH (n) RETURN n
                            """
                            columnName: 1
                        )
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid argument: columnName, error: String cannot represent a non string value: 1"
            );
            expect(errors[0]).toHaveProperty("path", ["User", "name", "@cypher", "columnName"]);
        });

        test("@node.labels property required", () => {
            const doc = gql`
                type User @node(labels: [null]) {
                    name: String
                }
            `;
            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                'Invalid argument: labels, error: Expected non-nullable type "String!" not to be null.'
            );
            expect(errors[0]).toHaveProperty("path", ["User", "@node", "labels", 0]);
        });

        test("@node.labels property required extension", () => {
            const doc = gql`
                type User {
                    name: String
                }
                extend type User @node(labels: [null])
            `;
            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);
            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                'Invalid argument: labels, error: Expected non-nullable type "String!" not to be null.'
            );
            expect(errors[0]).toHaveProperty("path", ["User", "@node", "labels", 0]);
        });
    });

    describe("Directive Argument Value", () => {
        describe("@default", () => {
            test("@default on datetime must be valid datetime", () => {
                const doc = gql`
                    type User @node {
                        updatedAt: DateTime @default(value: "dummy")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default.value is not a valid DateTime");
                expect(errors[0]).toHaveProperty("path", ["User", "updatedAt", "@default", "value"]);
            });

            test("@default on datetime must be valid datetime extension", () => {
                const doc = gql`
                    type User @node {
                        id: ID
                    }
                    extend type User {
                        updatedAt: DateTime @default(value: "dummy")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default.value is not a valid DateTime");
                expect(errors[0]).toHaveProperty("path", ["User", "updatedAt", "@default", "value"]);
            });

            test("@default on datetime must be valid datetime correct", () => {
                const doc = gql`
                    type User @node {
                        updatedAt: DateTime @default(value: "2023-07-06T09:45:11.336Z")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on enum must be enum", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        status: Status @default(value: "dummy")
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default.value on Status fields must be of type Status");
                expect(errors[0]).toHaveProperty("path", ["User", "status", "@default", "value"]);
            });

            test("@default on enum must be enum correct", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        status: Status @default(value: REGISTERED)
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });

            test("@default on enum list must be list", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        statuses: [Status] @default(value: "dummy")
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@default.value on Status list fields must be a list of Status values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "statuses", "@default", "value"]);
            });

            test("@default on enum list must be list of enum values", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        statuses: [Status] @default(value: ["dummy"])
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@default.value on Status list fields must be a list of Status values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "statuses", "@default", "value"]);
            });

            test("@default on enum list must be list of enum values correct", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        statuses: [Status] @default(value: [PENDING])
                    }
                `;
                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });

            test("@default on int must be int", () => {
                const doc = gql`
                    type User @node {
                        age: Int @default(value: "dummy")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default.value on Int fields must be of type Int");
                expect(errors[0]).toHaveProperty("path", ["User", "age", "@default", "value"]);
            });

            test("@default on int must be int correct", () => {
                const doc = gql`
                    type User @node {
                        age: Int @default(value: 23)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on int list must be list of int values", () => {
                const doc = gql`
                    type User @node {
                        ages: [Int] @default(value: ["dummy"])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@default.value on Int list fields must be a list of Int values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "ages", "@default", "value"]);
            });

            test("@default on int list must be list of int values correct", () => {
                const doc = gql`
                    type User @node {
                        ages: [Int] @default(value: [12])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on float must be float", () => {
                const doc = gql`
                    type User @node {
                        avg: Float @default(value: 2)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default.value on Float fields must be of type Float");
                expect(errors[0]).toHaveProperty("path", ["User", "avg", "@default", "value"]);
            });

            test("@default on float must be float correct", () => {
                const doc = gql`
                    type User @node {
                        avg: Float @default(value: 2.3)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on float list must be list of float values", () => {
                const doc = gql`
                    type User @node {
                        avgs: [Float] @default(value: [1])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@default.value on Float list fields must be a list of Float values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "avgs", "@default", "value"]);
            });

            test("@default on float list must be list of float values correct", () => {
                const doc = gql`
                    type User @node {
                        avgs: [Float] @default(value: [1.2])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on boolean must be boolean", () => {
                const doc = gql`
                    type User @node {
                        registered: Boolean @default(value: 2)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default.value on Boolean fields must be of type Boolean");
                expect(errors[0]).toHaveProperty("path", ["User", "registered", "@default", "value"]);
            });

            test("@default on boolean must be boolean correct", () => {
                const doc = gql`
                    type User @node {
                        registered: Boolean @default(value: false)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on boolean list must be list of boolean values", () => {
                const doc = gql`
                    type User @node {
                        statuses: [Boolean] @default(value: [2])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@default.value on Boolean list fields must be a list of Boolean values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "statuses", "@default", "value"]);
            });

            test("@default on boolean list must be list of boolean values correct", () => {
                const doc = gql`
                    type User @node {
                        statuses: [Boolean] @default(value: [true])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on string must be string", () => {
                const doc = gql`
                    type User @node {
                        name: String @default(value: 2)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default.value on String fields must be of type String");
                expect(errors[0]).toHaveProperty("path", ["User", "name", "@default", "value"]);
            });

            test("@default on string must be string correct", () => {
                const doc = gql`
                    type User @node {
                        registered: String @default(value: "Bob")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on string list must be list of string values", () => {
                const doc = gql`
                    type User @node {
                        names: [String] @default(value: [2])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@default.value on String list fields must be a list of String values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "names", "@default", "value"]);
            });

            test("@default on string list must be list of string values correct", () => {
                const doc = gql`
                    type User @node {
                        names: [String] @default(value: ["Bob"])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on ID must be ID", () => {
                const doc = gql`
                    type User @node {
                        uid: ID @default(value: 2)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default.value on ID fields must be of type ID");
                expect(errors[0]).toHaveProperty("path", ["User", "uid", "@default", "value"]);
            });

            test("@default on ID list must be list of ID values", () => {
                const doc = gql`
                    type User @node {
                        ids: [ID] @default(value: [2])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@default.value on ID list fields must be a list of ID values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "ids", "@default", "value"]);
            });

            test("@default on ID list must be list of ID values correct", () => {
                const doc = gql`
                    type User @node {
                        ids: [ID] @default(value: ["123-223"])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default on ID must be ID correct", () => {
                const doc = gql`
                    type User @node {
                        uid: ID @default(value: "234-432")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@default not supported on Spatial types", () => {
                const doc = gql`
                    type User @node {
                        updatedAt: Point @default(value: "test")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@default is not supported by Spatial types.");
                expect(errors[0]).toHaveProperty("path", ["User", "updatedAt", "@default", "value"]);
            });

            test("@default only supported on scalar types", () => {
                const doc = gql`
                    type User @node {
                        post: Post @default(value: "test")
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@default directive can only be used on Temporal types and types: Int | Float | String | Boolean | ID | Enum"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "post", "@default"]);
            });
        });

        describe("@coalesce", () => {
            test("@coalesce on enum must be enum", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        status: Status @coalesce(value: "dummy")
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@coalesce.value on Status fields must be of type Status");
                expect(errors[0]).toHaveProperty("path", ["User", "status", "@coalesce", "value"]);
            });

            test("@coalesce on enum must be enum extension", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        id: ID
                    }
                    extend type User {
                        status: Status @coalesce(value: "dummy")
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@coalesce.value on Status fields must be of type Status");
                expect(errors[0]).toHaveProperty("path", ["User", "status", "@coalesce", "value"]);
            });

            test("@coalesce on enum must be enum correct", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        status: Status @default(value: REGISTERED)
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on enum list must be list", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        statuses: [Status] @coalesce(value: "dummy")
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce.value on Status list fields must be a list of Status values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "statuses", "@coalesce", "value"]);
            });

            test("@coalesce on enum list must be list of enum values", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        statuses: [Status] @coalesce(value: ["dummy"])
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce.value on Status list fields must be a list of Status values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "statuses", "@coalesce", "value"]);
            });

            test("@coalesce on enum list must be list of enum values correct", () => {
                const enumTypes = gql`
                    enum Status {
                        REGISTERED
                        PENDING
                    }
                `;
                const doc = gql`
                    ${enumTypes}
                    type User @node {
                        statuses: [Status] @coalesce(value: [PENDING])
                    }
                `;

                const enums = enumTypes.definitions as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on int must be int", () => {
                const doc = gql`
                    type User @node {
                        age: Int @coalesce(value: "dummy")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@coalesce.value on Int fields must be of type Int");
                expect(errors[0]).toHaveProperty("path", ["User", "age", "@coalesce", "value"]);
            });

            test("@coalesce on int must be int correct", () => {
                const doc = gql`
                    type User @node {
                        age: Int @coalesce(value: 23)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on int list must be list of int values", () => {
                const doc = gql`
                    type User @node {
                        ages: [Int] @coalesce(value: ["dummy"])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce.value on Int list fields must be a list of Int values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "ages", "@coalesce", "value"]);
            });

            test("@coalesce on int list must be list of int values correct", () => {
                const doc = gql`
                    type User @node {
                        ages: [Int] @coalesce(value: [12])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on float must be float", () => {
                const doc = gql`
                    type User @node {
                        avg: Float @coalesce(value: 2)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@coalesce.value on Float fields must be of type Float");
                expect(errors[0]).toHaveProperty("path", ["User", "avg", "@coalesce", "value"]);
            });

            test("@coalesce on float must be float correct", () => {
                const doc = gql`
                    type User @node {
                        avg: Float @coalesce(value: 2.3)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on float list must be list of float values", () => {
                const doc = gql`
                    type User @node {
                        avgs: [Float] @coalesce(value: [1])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce.value on Float list fields must be a list of Float values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "avgs", "@coalesce", "value"]);
            });

            test("@coalesce on float list must be list of float values correct", () => {
                const doc = gql`
                    type User @node {
                        avgs: [Float] @coalesce(value: [1.2])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on boolean must be boolean", () => {
                const doc = gql`
                    type User @node {
                        registered: Boolean @coalesce(value: 2)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce.value on Boolean fields must be of type Boolean"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "registered", "@coalesce", "value"]);
            });

            test("@coalesce on boolean must be boolean correct", () => {
                const doc = gql`
                    type User @node {
                        registered: Boolean @coalesce(value: false)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on boolean list must be list of boolean values", () => {
                const doc = gql`
                    type User @node {
                        statuses: [Boolean] @coalesce(value: [2])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce.value on Boolean list fields must be a list of Boolean values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "statuses", "@coalesce", "value"]);
            });

            test("@coalesce on boolean list must be list of boolean values correct", () => {
                const doc = gql`
                    type User @node {
                        statuses: [Boolean] @coalesce(value: [true])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on string must be string", () => {
                const doc = gql`
                    type User @node {
                        name: String @coalesce(value: 2)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@coalesce.value on String fields must be of type String");
                expect(errors[0]).toHaveProperty("path", ["User", "name", "@coalesce", "value"]);
            });

            test("@coalesce on string must be string correct", () => {
                const doc = gql`
                    type User @node {
                        registered: String @coalesce(value: "Bob")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on string list must be list of string values", () => {
                const doc = gql`
                    type User @node {
                        names: [String] @coalesce(value: [2])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce.value on String list fields must be a list of String values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "names", "@coalesce", "value"]);
            });

            test("@coalesce on string list must be list of string values correct", () => {
                const doc = gql`
                    type User @node {
                        names: [String] @coalesce(value: ["Bob"])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on ID must be ID", () => {
                const doc = gql`
                    type User @node {
                        uid: ID @coalesce(value: 2)
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@coalesce.value on ID fields must be of type ID");
                expect(errors[0]).toHaveProperty("path", ["User", "uid", "@coalesce", "value"]);
            });

            test("@coalesce on ID list must be list of ID values", () => {
                const doc = gql`
                    type User @node {
                        ids: [ID] @coalesce(value: [2])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce.value on ID list fields must be a list of ID values"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "ids", "@coalesce", "value"]);
            });

            test("@coalesce on ID list must be list of ID values correct", () => {
                const doc = gql`
                    type User @node {
                        ids: [ID] @coalesce(value: ["123-223"])
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce on ID must be ID correct", () => {
                const doc = gql`
                    type User @node {
                        uid: ID @coalesce(value: "234-432")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("@coalesce not supported on Spatial types", () => {
                const doc = gql`
                    type User @node {
                        updatedAt: Point @coalesce(value: "test")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@coalesce is not supported by Spatial types.");
                expect(errors[0]).toHaveProperty("path", ["User", "updatedAt", "@coalesce", "value"]);
            });

            test("@coalesce not supported on Temporal types", () => {
                const doc = gql`
                    type User @node {
                        updatedAt: DateTime @coalesce(value: "test")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@coalesce is not supported by Temporal types.");
                expect(errors[0]).toHaveProperty("path", ["User", "updatedAt", "@coalesce", "value"]);
            });

            test("@coalesce only supported on scalar types", () => {
                const doc = gql`
                    type User @node {
                        post: Post @coalesce(value: "test")
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@coalesce directive can only be used on types: Int | Float | String | Boolean | ID | Enum"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "post", "@coalesce"]);
            });
        });

        describe("@limit", () => {
            test("@limit default must be > 0 on Interface", () => {
                const doc = gql`
                    interface Person @limit(default: -1) {
                        name: String
                    }
                    type User implements Person @node {
                        name: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@limit.default invalid value: -1. Must be greater than 0."
                );
                expect(errors[0]).toHaveProperty("path", ["Person", "@limit", "default"]);
            });

            test("@limit default must be > 0", () => {
                const doc = gql`
                    type User @limit(default: -1) @node {
                        name: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@limit.default invalid value: -1. Must be greater than 0."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "@limit", "default"]);
            });

            test("@limit default must be > 0 extension", () => {
                const doc = gql`
                    type User @node {
                        name: String
                    }
                    extend type User @limit(default: -1)
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@limit.default invalid value: -1. Must be greater than 0."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "@limit", "default"]);
            });

            test("@limit max must be > 0", () => {
                const doc = gql`
                    type User @limit(max: -1) @node {
                        name: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "@limit.max invalid value: -1. Must be greater than 0.");
                expect(errors[0]).toHaveProperty("path", ["User", "@limit", "max"]);
            });

            test("@limit default must be < max", () => {
                const doc = gql`
                    type User @limit(default: 10, max: 9) @node {
                        name: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@limit.max invalid value: 9. Must be greater than limit.default: 10."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "@limit", "max"]);
            });

            test("@limit empty limit argument is correct", () => {
                const doc = gql`
                    type User @limit @node {
                        name: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });

            test("@limit correct", () => {
                const doc = gql`
                    type User @limit(default: 1, max: 2) @node {
                        name: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });
        });

        describe("@fulltext", () => {
            test("@fulltext duplicate index names", () => {
                const doc = gql`
                    type User
                        @fulltext(
                            indexes: [
                                { indexName: "a", queryName: "a", fields: ["name"] }
                                { indexName: "a", queryName: "b", fields: ["id"] }
                            ]
                        ) {
                        name: String
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@fulltext.indexes invalid value for: a. Duplicate index name."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "@fulltext", "indexes"]);
            });

            test("@fulltext duplicate index names extension", () => {
                const doc = gql`
                    type User @node {
                        name: String
                        id: ID
                    }
                    extend type User
                        @fulltext(
                            indexes: [
                                { indexName: "a", queryName: "a", fields: ["name"] }
                                { indexName: "a", queryName: "b", fields: ["id"] }
                            ]
                        )
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@fulltext.indexes invalid value for: a. Duplicate index name."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "@fulltext", "indexes"]);
            });

            test("@fulltext duplicate query names", () => {
                const doc = gql`
                    type User
                        @fulltext(
                            indexes: [
                                { indexName: "a", queryName: "a", fields: ["name"] }
                                { indexName: "b", queryName: "a", fields: ["id"] }
                            ]
                        ) {
                        name: String
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@fulltext.indexes invalid value for: a. Duplicate query name."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "@fulltext", "indexes"]);
            });

            test("@fulltext duplicate query names extension", () => {
                const doc = gql`
                    type User @node {
                        name: String
                        id: ID
                    }
                    extend type User
                        @fulltext(
                            indexes: [
                                { indexName: "a", queryName: "a", fields: ["name"] }
                                { indexName: "b", queryName: "a", fields: ["id"] }
                            ]
                        )
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@fulltext.indexes invalid value for: a. Duplicate query name."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "@fulltext", "indexes"]);
            });

            test("@fulltext index on type not String or ID", () => {
                const doc = gql`
                    type User @fulltext(indexes: [{ indexName: "a", queryName: "a", fields: ["age"] }]) @node {
                        age: Int
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@fulltext.indexes invalid value for: a. Field age is not of type String or ID."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "@fulltext", "indexes"]);
            });

            test("@fulltext correct usage", () => {
                const doc = gql`
                    type User
                        @fulltext(
                            indexes: [
                                { indexName: "a", queryName: "a", fields: ["name"] }
                                { indexName: "b", queryName: "b", fields: ["id"] }
                            ]
                        ) {
                        id: ID
                        name: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });
        });

        describe("@relationship", () => {
            test("@relationship duplicate [type, direction, fieldType] combination", () => {
                const doc = gql`
                    type User @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                        liked: [Post!]! @relationship(type: "HAS_POST", direction: IN)
                        archivedPosts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@relationship invalid. Multiple fields of the same type cannot have a relationship with the same direction and type combination."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "archivedPosts", "@relationship"]);
            });

            test("@relationship duplicate [type, direction, fieldType] combination on interface", () => {
                const interfaceDoc = gql`
                    interface Site {
                        posts: [Post!]! @declareRelationship
                    }
                `;
                const doc = gql`
                    ${interfaceDoc}
                    type SomeSite implements Site @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                        archivedPosts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@relationship invalid. Multiple fields of the same type cannot have a relationship with the same direction and type combination."
                );
                expect(errors[0]).toHaveProperty("path", ["SomeSite", "archivedPosts", "@relationship"]);
            });

            test("@relationship duplicate [type, direction, fieldType] combination on interface extension", () => {
                const interfaceDoc = gql`
                    interface Site {
                        name: String
                    }
                    extend interface Site {
                        posts: [Post!]! @declareRelationship
                    }
                `;
                const doc = gql`
                    ${interfaceDoc}
                    type SomeSite implements Site @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                        archivedPosts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@relationship invalid. Multiple fields of the same type cannot have a relationship with the same direction and type combination."
                );
                expect(errors[0]).toHaveProperty("path", ["SomeSite", "archivedPosts", "@relationship"]);
            });

            test("@relationship no relationshipProperties type found", () => {
                const doc = gql`
                    type User @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT, properties: "Poster")
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@relationship.properties invalid. Cannot find type to represent the relationship properties: Poster."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "posts", "@relationship", "properties"]);
            });

            test("@relationship no relationshipProperties type found extension", () => {
                const doc = gql`
                    type User @node {
                        name: String
                    }
                    type Post @node {
                        title: String
                    }
                    extend type User {
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT, properties: "Poster")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@relationship.properties invalid. Cannot find type to represent the relationship properties: Poster."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "posts", "@relationship", "properties"]);
            });

            test("@relationship relationshipProperties type not annotated with @relationshipProperties", () => {
                const relationshipProperties = gql`
                    type Poster @node {
                        createdAt: String
                    }
                `;
                const doc = gql`
                    type User @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT, properties: "Poster")
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@relationship.properties invalid. Properties type Poster must use directive `@relationshipProperties`."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "posts", "@relationship", "properties"]);
            });

            test("@relationship correct usage", () => {
                const relationshipProps = gql`
                    type Poster @relationshipProperties {
                        createdAt: String
                    }
                `;
                const doc = gql`
                    type User @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT, properties: "Poster")
                        archived: [Post!]!
                            @relationship(type: "HAS_ARCHIVED_POST", direction: OUT, properties: "Poster")
                        favorite: Post @relationship(type: "HAS_FAVORITE", direction: OUT)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = relationshipProps.definitions as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });

            test("@relationship correct usage with interface", () => {
                const interfaceDoc = gql`
                    interface Site {
                        posts: [Post!]! @declareRelationship
                    }
                `;
                const doc = gql`
                    ${interfaceDoc}
                    type SomeSite implements Site @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = interfaceDoc.definitions as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                expect(executeValidate).not.toThrow();
            });

            test("@relationship correct usage when different type", () => {
                const doc = gql`
                    type SomeSite @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                    }
                    type OtherSite @node {
                        name: String
                        posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });
                try {
                    executeValidate();
                } catch (err) {
                    console.error(err);
                }
                expect(executeValidate).not.toThrow();
            });
        });

        describe("@populatedBy", () => {
            test("@populatedBy callback not provided", () => {
                const doc = gql`
                    type User @node {
                        name: String @populatedBy(operations: [CREATE], callback: "getUName")
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@populatedBy.callback needs to be provided in features option."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "name", "@populatedBy", "callback"]);
            });

            test("@populatedBy callback not a function", () => {
                const doc = gql`
                    type User @node {
                        name: String @populatedBy(operations: [CREATE], callback: "getUName")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        features: {
                            populatedBy: {
                                callbacks: {
                                    getUName: "i should really be a Function.." as unknown as Neo4jGraphQLCallback,
                                },
                            },
                        },
                        additionalDefinitions,
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@populatedBy.callback `getUName` must be of type Function."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "name", "@populatedBy", "callback"]);
            });

            test("@populatedBy callback not a function extension", () => {
                const doc = gql`
                    type User @node {
                        id: ID
                    }
                    extend type User {
                        name: String @populatedBy(operations: [CREATE], callback: "getUName")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        features: {
                            populatedBy: {
                                callbacks: {
                                    getUName: "i should really be a Function.." as unknown as Neo4jGraphQLCallback,
                                },
                            },
                        },
                        additionalDefinitions,
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "@populatedBy.callback `getUName` must be of type Function."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "name", "@populatedBy", "callback"]);
            });

            test("@populatedBy correct usage", () => {
                const doc = gql`
                    type User @node {
                        name: String @populatedBy(operations: [CREATE], callback: "getUName")
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        features: { populatedBy: { callbacks: { getUName: () => "myUserName" } } },
                        additionalDefinitions,
                    });
                expect(executeValidate).not.toThrow();
            });
        });

        test("should throw cannot auto-generate a non ID field", () => {
            const doc = gql`
                type Movie @node {
                    name: String! @id
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty("message", "Cannot autogenerate a non ID field.");
            expect(errors[0]).toHaveProperty("path", ["Movie", "name", "@id"]);
        });

        test("should throw cannot auto-generate an array", () => {
            const doc = gql`
                type Movie @node {
                    name: [ID] @id
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty("message", "Cannot autogenerate an array.");
            expect(errors[0]).toHaveProperty("path", ["Movie", "name", "@id"]);
        });

        describe("@timestamp", () => {
            test("@timestamp valid", () => {
                const doc = gql`
                    type User @node {
                        lastSeenAt: DateTime @timestamp
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });

            test("@timestamp cannot autogenerate array", () => {
                const doc = gql`
                    type User @node {
                        lastSeenAt: [DateTime] @timestamp
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "Cannot autogenerate an array.");
                expect(errors[0]).toHaveProperty("path", ["User", "lastSeenAt", "@timestamp"]);
            });

            test("should throw cannot timestamp on array of DateTime", () => {
                const doc = gql`
                    type Movie @node {
                        name: [DateTime] @timestamp(operations: [CREATE])
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "Cannot autogenerate an array.");
                expect(errors[0]).toHaveProperty("path", ["Movie", "name", "@timestamp"]);
            });

            test("@timestamp cannot timestamp temporal fields lacking time zone information", () => {
                const doc = gql`
                    type User @node {
                        lastSeenAt: Date @timestamp
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Cannot timestamp Temporal fields lacking time zone information."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "lastSeenAt", "@timestamp"]);
            });
        });

        describe("@id", () => {
            test("@id autogenerate valid", () => {
                const doc = gql`
                    type User @node {
                        uid: ID @id
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });

            test("@id autogenerate cannot autogenerate array", () => {
                const doc = gql`
                    type User @node {
                        uid: [ID] @id
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "Cannot autogenerate an array.");
                expect(errors[0]).toHaveProperty("path", ["User", "uid", "@id"]);
            });

            test("@id autogenerate cannot autogenerate a non ID field", () => {
                const doc = gql`
                    type User @node {
                        uid: String @id
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "Cannot autogenerate a non ID field.");
                expect(errors[0]).toHaveProperty("path", ["User", "uid", "@id"]);
            });
        });

        // TODO: validate custom resolver
        // needs a schema for graphql validation but then not running validators anymore for the logical validation
        // validate-custom-resolver-requires -> graphql validation
        // get-custom-resolver-meta -> logical validation
    });

    describe("Directive Combination", () => {
        describe("valid", () => {
            test("@cypher with @timestamp on Field", () => {
                const doc = gql`
                    type User @node {
                        id: ID
                        name: DateTime
                            @cypher(
                                statement: """
                                MATCH (u:User {id: 1}) RETURN u.lastSeenAt AS u
                                """
                                columnName: "u"
                            )
                            @timestamp
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });

            test("@node with @query on Object", () => {
                const doc = gql`
                    type User @node(labels: ["Person"]) @query(read: false) {
                        id: ID
                        name: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });

            test("@query and @mutation", () => {
                const doc = gql`
                    type User @query(read: false) {
                        id: ID
                        name: String
                    }
                    extend schema @mutation(operations: [])
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });
        });
        describe("invalid", () => {
            test("@authentication can't be used with @relationship", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID
                        actors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT) @authentication
                    }

                    type Actor @node {
                        name: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @relationship cannot be used in combination with @authentication"
                );
                expect(errors[0]).toHaveProperty("path", ["Movie", "actors"]);
            });

            test("@subscriptionsAuthorization can't be used with @relationship", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID
                        actors: [Actor!]!
                            @relationship(type: "ACTED_IN", direction: OUT)
                            @subscriptionsAuthorization(filter: [{ where: { id: "1" } }])
                    }

                    type Actor @node {
                        name: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @relationship cannot be used in combination with @subscriptionsAuthorization"
                );
                expect(errors[0]).toHaveProperty("path", ["Movie", "actors"]);
            });

            test("@authorization can't be used with @relationship", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID
                        actors: [Actor!]!
                            @relationship(type: "ACTED_IN", direction: OUT)
                            @authorization(validate: [{ where: { id: "1" } }])
                    }

                    type Actor @node {
                        name: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @relationship cannot be used in combination with @authorization"
                );
                expect(errors[0]).toHaveProperty("path", ["Movie", "actors"]);
            });

            test("@cypher with @relationship on Field", () => {
                const doc = gql`
                    type User @node {
                        id: ID
                        post: [Post!]!
                            @cypher(
                                statement: """
                                MATCH (u:User {id: 1})-[:HAS_POST]->(p:Post) RETURN p
                                """
                                columnName: "p"
                            )
                            @relationship(type: "HAS_POST", direction: OUT)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @cypher cannot be used in combination with @relationship"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "post"]);
            });

            test("@cypher with inherited @relationship on Field", () => {
                const doc = gql`
                    interface Person {
                        post: [Post!]! @declareRelationship
                    }
                    type User implements Person @node {
                        id: ID
                        post: [Post!]!
                            @cypher(
                                statement: """
                                MATCH (u:User {id: 1})-[:HAS_POST]->(p:Post) RETURN p
                                """
                                columnName: "p"
                            )
                            @relationship(type: "HAS_POST", direction: OUT)
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @cypher cannot be used in combination with @relationship"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "post"]);
            });

            test("@cypher with inherited @relationship on Field reverse order", () => {
                const doc = gql`
                    type User implements Person @node {
                        id: ID
                        post: [Post!]!
                            @cypher(
                                statement: """
                                MATCH (u:User {id: 1})-[:HAS_POST]->(p:Post) RETURN p
                                """
                                columnName: "p"
                            )
                            @relationship(type: "HAS_POST", direction: OUT)
                    }
                    interface Person {
                        post: [Post!]! @declareRelationship
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @cypher cannot be used in combination with @relationship"
                );
                expect(errors[0]).toHaveProperty("path", ["User", "post"]);
            });

            test("@cypher double", () => {
                const doc = gql`
                    type User @node {
                        id: ID
                        post: [Post]
                            @cypher(
                                statement: """
                                MATCH (u:User {id: 1})-[:HAS_POST]->(p:Post) RETURN p
                                """
                                columnName: "p"
                            )
                            @cypher(
                                statement: """
                                RETURN "test" AS p
                                """
                                columnName: "p"
                            )
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    'The directive "@cypher" can only be used once at this location.'
                );
            });

            test("@query both on extension and object", () => {
                const doc = gql`
                    type User @query(read: false) {
                        id: ID
                        name: String
                    }
                    extend type User @query(read: false)
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    'The directive "@query" can only be used once at this location.'
                );
            });

            test("@query both on schema and object", () => {
                const doc = gql`
                    type User @query(read: false) {
                        id: ID
                        name: String
                    }
                    extend schema @query(read: false)
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @query can only be used in one location: either schema or type."
                );
            });
        });
    });

    describe("Valid directives on fields of root types (Query|Mutation|Subscription)", () => {
        test("@relationship can't be used on the field of a root type", () => {
            const doc = gql`
                type Query {
                    someActors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT)
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @relationship is not supported on fields of the Query type."
            );
            expect(errors[0]).toHaveProperty("path", ["Query", "someActors", "@relationship"]);
        });

        test("@relationship can't be used on the field of a root type extension", () => {
            const doc = gql`
                type Query {
                    me: String
                }

                type Actor @node {
                    name: String
                }

                extend type Query {
                    someActors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT)
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @relationship is not supported on fields of the Query type."
            );
            expect(errors[0]).toHaveProperty("path", ["Query", "someActors", "@relationship"]);
        });

        test("@authorization can't be used on the field of a root type", () => {
            const doc = gql`
                type Query {
                    someActors: [Actor!]! @authorization(filter: [{ where: { jwt: { roles_INCLUDES: "admin" } } }])
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @authorization is not supported on fields of the Query type."
            );
            expect(errors[0]).toHaveProperty("path", ["Query", "someActors", "@authorization"]);
        });

        test("@authorization can't be used on the field of a root type extension", () => {
            const doc = gql`
                type Query {
                    me: String
                }

                type Actor @node {
                    name: String
                }
                extend type Query {
                    someActors: [Actor!]! @authorization(filter: [{ where: { jwt: { roles_INCLUDES: "admin" } } }])
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @authorization is not supported on fields of the Query type."
            );
            expect(errors[0]).toHaveProperty("path", ["Query", "someActors", "@authorization"]);
        });

        test("@authorization with @cypher suggest to use @authentication instead", () => {
            const doc = gql`
                type Query {
                    someActors: [Actor!]!
                        @cypher(
                            statement: """
                            RETURN {name: "Keanu"} AS actor
                            """
                            columnName: "actor"
                        )
                        @authorization(filter: [{ where: { jwt: { roles_INCLUDES: "admin" } } }])
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @authorization is not supported on fields of the Query type. Did you mean to use @authentication?"
            );
            expect(errors[0]).toHaveProperty("path", ["Query", "someActors", "@authorization"]);
        });

        test("@populatedBy can't be used on the field of a root type", () => {
            const doc = gql`
                type Query {
                    someActors: [Actor!]! @populatedBy(callback: "myCallback")
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {
                        populatedBy: {
                            callbacks: {
                                myCallback: () => "test",
                            },
                        },
                    },
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(2);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "@populatedBy can only be used on fields of type Int, Float, String, Boolean, ID, BigInt, DateTime, Date, Time, LocalDateTime, LocalTime or Duration."
            );
            expect(errors[0]).toHaveProperty("path", ["Query", "someActors", "@populatedBy"]);
            expect(errors[1]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[1]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @populatedBy is not supported on fields of the Query type."
            );
            expect(errors[1]).toHaveProperty("path", ["Query", "someActors", "@populatedBy"]);
        });

        test("@authentication ok to be used on the field of a root type", () => {
            const doc = gql`
                type Query {
                    someActors: [Actor!]! @authentication
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@authentication with @cypher ok to be used on the field of a root type", () => {
            const doc = gql`
                type Query {
                    someActors: [Actor!]!
                        @cypher(
                            statement: """
                            RETURN {name: "Keanu"} AS actor
                            """
                            columnName: "actor"
                        )
                        @authentication
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@cypher ok to be used on the field of a root type", () => {
            const doc = gql`
                type Query {
                    someActors: [Actor!]!
                        @cypher(
                            statement: """
                            RETURN {name: "Keanu"} AS actor
                            """
                            columnName: "actor"
                        )
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@cypher can't be used on the field of the Subscription type", () => {
            const doc = gql`
                type Subscription {
                    someActors: [Actor!]!
                        @cypher(
                            statement: """
                            RETURN {name: "Keanu"} AS actor
                            """
                            columnName: "actor"
                        )
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @cypher is not supported on fields of the Subscription type."
            );
            expect(errors[0]).toHaveProperty("path", ["Subscription", "someActors", "@cypher"]);
        });
    });

    describe("Valid directives on fields of interface types", () => {
        test("@cypher can't be used on the field of an interface type", () => {
            const doc = gql`
                interface Person {
                    name: String
                        @cypher(
                            statement: """
                            RETURN "Keanu" as x
                            """
                            columnName: "x"
                        )
                }

                type Actor implements Person @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @cypher is not supported on fields of the Person type."
            );
            expect(errors[0]).toHaveProperty("path", ["Person", "name", "@cypher"]);
        });

        test("@relationship cannot be used on the field of an interface type", () => {
            const doc = gql`
                interface Person {
                    actor: [Actor!]! @relationship(type: "IS_ACTOR", direction: IN)
                }

                type Actor implements Person @node {
                    name: String
                    actor: [Actor!]!
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @relationship is not supported on fields of interface types (Person). Since version 5.0.0, interface fields can only have @declareRelationship. Please add the @relationship directive to the fields in all types which implement it."
            );
            expect(errors[0]).toHaveProperty("path", ["Person", "actor", "@relationship"]);
        });

        test("@private ok to be used on the field of an interface type", () => {
            const doc = gql`
                interface Person {
                    name: String @private
                    id: ID
                }

                type Actor implements Person @node {
                    name: String
                    id: ID
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@settable ok to be used on the field of an interface type", () => {
            const doc = gql`
                interface Person {
                    name: String @settable(onCreate: false)
                }

                type Actor implements Person @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });
    });

    describe("@declareRelationship", () => {
        test("@declareRelationship cannot be used on the field of an object type", () => {
            const doc = gql`
                type Person @node {
                    name: String
                }

                type Actor @node {
                    name: Person @declareRelationship
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "`@declareRelationship` is only available on Interface fields. Use `@relationship` if in an Object type."
            );
            expect(errors[0]).toHaveProperty("path", ["Actor", "name"]);
        });

        test("@declareRelationship can be used on the field of an interface type", () => {
            const doc = gql`
                interface Person {
                    name: Actor @declareRelationship
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@declareRelationship cannot have scalar type", () => {
            const doc = gql`
                interface Person {
                    name: String @declareRelationship
                }

                type Actor @node {
                    name: String
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid field type: Scalar types cannot be relationship targets. Please use an Object type instead."
            );
            expect(errors[0]).toHaveProperty("path", ["Person", "name"]);
        });

        test("@declareRelationship correct usage", () => {
            const doc = gql`
                interface Person {
                    actor: [Actor!]! @declareRelationship
                }

                type Actor implements Person @node {
                    name: String
                    actor: [Actor!]! @relationship(type: "IS_ACTOR", direction: IN)
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@declareRelationship correct usage - reverse definitions", () => {
            const doc = gql`
                type Actor implements Person @node {
                    name: String
                    actor: [Actor!]! @relationship(type: "IS_ACTOR", direction: IN)
                }

                interface Person {
                    actor: [Actor!]! @declareRelationship
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@declareRelationship does not have a corresponding @relationship", () => {
            const doc = gql`
                interface Person {
                    actor: [Actor!]! @declareRelationship
                }

                type Actor implements Person @node {
                    name: String
                    actor: [Actor!]!
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Field was declared as a relationship but the `@relationship` directive is missing from the implementation."
            );
            expect(errors[0]).toHaveProperty("path", ["Actor", "actor"]);
        });

        test("@declareRelationship does not have a corresponding @relationship - reverse definitions", () => {
            const doc = gql`
                type Actor implements Person @node {
                    name: String
                    actor: [Actor!]!
                }

                interface Person {
                    actor: [Actor!]! @declareRelationship
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Field was declared as a relationship but the `@relationship` directive is missing from the implementation."
            );
            expect(errors[0]).toHaveProperty("path", ["Person", "actor"]);
        });

        test("@declareRelationship on extension, does not have a corresponding @relationship", () => {
            const doc = gql`
                interface Person {
                    name: String
                }

                type Actor implements Person @node {
                    name: String
                    actor: [Actor!]!
                }

                extend interface Person {
                    actor: [Actor!]! @declareRelationship
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Field was declared as a relationship but the `@relationship` directive is missing from the implementation."
            );
            expect(errors[0]).toHaveProperty("path", ["Actor", "actor"]);
        });

        test("@declareRelationship correct usage on extension", () => {
            const doc = gql`
                type Actor implements Person @node {
                    name: String
                }

                interface Person {
                    actor: [Actor!]! @declareRelationship
                }

                extend type Actor {
                    actor: [Actor!]! @relationship(type: "IS_ACTOR", direction: IN)
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@declareRelationship does not have corresponding @relationship, implements on extension", () => {
            const doc = gql`
                type Actor @node {
                    name: String
                    actor: [Actor!]!
                }

                interface Person {
                    actor: [Actor!]! @declareRelationship
                }

                extend type Actor implements Person
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Field was declared as a relationship but the `@relationship` directive is missing from the implementation."
            );
            expect(errors[0]).toHaveProperty("path", ["Person", "actor"]);
        });

        test("@declareRelationship correct usage on extension, relationship on extension", () => {
            const doc = gql`
                type Actor @node {
                    name: String
                }

                interface Person {
                    name: String
                }

                extend type Actor implements Person {
                    actor: [Actor!]! @relationship(type: "IS_ACTOR", direction: IN)
                }

                extend interface Person {
                    actor: [Actor!]! @declareRelationship
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            expect(executeValidate).not.toThrow();
        });

        test("@declareRelationship on extension, does not have a corresponding @relationship, one of 2", () => {
            const doc = gql`
                interface Person {
                    actor: [Actor!]! @declareRelationship
                }

                type Actor implements Person @node {
                    name: String
                    actor: [Actor!]! @relationship(type: "IS_ACTOR", direction: IN)
                    director: [Actor!]!
                }

                extend interface Person {
                    director: [Actor!]! @declareRelationship
                }
            `;

            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions,
                    features: {},
                });

            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Field was declared as a relationship but the `@relationship` directive is missing from the implementation."
            );
            expect(errors[0]).toHaveProperty("path", ["Actor", "director"]);
        });
    });

    describe("JWT directives", () => {
        describe("invalid", () => {
            test("@jwt cannot combined", () => {
                const doc = gql`
                    type JWTPayload @jwt @query(read: false) {
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @jwt cannot be used in combination with other directives."
                );
                expect(errors[0]).toHaveProperty("path", ["JWTPayload", "@jwt"]);
            });

            test("@jwt cannot combined extension", () => {
                const doc = gql`
                    type JWTPayload @query(read: false) {
                        id: ID
                    }
                    extend type JWTPayload @jwt
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @jwt cannot be used in combination with other directives."
                );
                expect(errors[0]).toHaveProperty("path", ["JWTPayload", "@jwt"]);
            });

            test("@jwtClaim cannot combined", () => {
                const doc = gql`
                    type JWTPayload @jwt {
                        id: ID
                            @jwtClaim(path: "user.id")
                            @cypher(
                                statement: """
                                RETURN 1 as x
                                """
                                columnName: "x"
                            )
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @jwtClaim cannot be used in combination with @cypher"
                );
                expect(errors[0]).toHaveProperty("path", ["JWTPayload", "id"]);
            });

            test("@jwtClaim incorrect location outside @jwt", () => {
                const doc = gql`
                    type JWTPayload {
                        id: ID @jwtClaim(path: "user.id")
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    'Invalid directive usage: Directive @jwtClaim can only be used in \\"@jwt\\" types.'
                );
                expect(errors[0]).toHaveProperty("path", ["JWTPayload", "id", "@jwtClaim"]);
            });

            test("multiple @jwt in type defs", () => {
                const doc = gql`
                    type JWTPayload @jwt {
                        id: ID @jwtClaim(path: "sub")
                    }

                    type OtherJWTPayload @jwt {
                        id: ID @jwtClaim(path: "uid")
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(2);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @jwt can only be used once in the Type Definitions."
                );
                expect(errors[0]).toHaveProperty("path", ["JWTPayload", "@jwt"]);
                expect(errors[1]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[1]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Directive @jwt can only be used once in the Type Definitions."
                );
                expect(errors[1]).toHaveProperty("path", ["OtherJWTPayload", "@jwt"]);
            });

            test("@jwt fields not scalars", () => {
                const doc = gql`
                    type JWTPayload @jwt {
                        post: Post
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Fields of a @jwt type can only be Scalars or Lists of Scalars."
                );
                expect(errors[0]).toHaveProperty("path", ["JWTPayload", "@jwt"]);
            });

            test("@jwt fields not scalars extension", () => {
                const doc = gql`
                    type JWTPayload @jwt {
                        me: String
                    }
                    type Post @node {
                        title: String
                    }
                    extend type JWTPayload {
                        post: Post
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Fields of a @jwt type can only be Scalars or Lists of Scalars."
                );
                expect(errors[0]).toHaveProperty("path", ["JWTPayload", "@jwt"]);
            });

            test("@jwt fields not scalars inherited", () => {
                const interfaceDoc = gql`
                    interface Something {
                        post: Post
                    }
                `;
                const doc = gql`
                    ${interfaceDoc}
                    type JWTPayload implements Something @jwt {
                        me: String
                        post: Post
                    }
                    type Post @node {
                        title: String
                    }
                `;

                const interfaces = interfaceDoc.definitions as InterfaceTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        features: {},
                        additionalDefinitions: { ...additionalDefinitions, interfaces },
                    });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Fields of a @jwt type can only be Scalars or Lists of Scalars."
                );
                expect(errors[0]).toHaveProperty("path", ["JWTPayload", "@jwt"]);
            });
        });

        describe("valid", () => {
            test("@jwt and @jwtClaim", () => {
                const doc = gql`
                    type JWTPayload @jwt {
                        id: ID @jwtClaim(path: "sub")
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });
        });
    });

    describe("relayId", () => {
        describe("global nodes", () => {
            test("should throw error if more than one @relayId directive field", () => {
                const doc = gql`
                    type User @node {
                        email: ID! @relayId
                        name: ID! @relayId
                    }
                `;
                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Only one field may be decorated with the `@relayId` directive."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "name", "@relayId"]);
            });
            test("should throw error if more than one @relayId directive field extension", () => {
                const doc = gql`
                    type User @node {
                        email: ID! @relayId
                    }
                    extend type User {
                        name: ID! @relayId
                    }
                `;
                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid directive usage: Only one field may be decorated with the `@relayId` directive."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "name", "@relayId"]);
            });

            test("should throw if a type already contains an id field", () => {
                const doc = gql`
                    type User @node {
                        id: ID!
                        email: ID! @relayId
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type already has a field `id`, which is reserved for Relay global node identification.\nEither remove it, or if you need access to this property, consider using the `@alias` directive to access it via another field."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "id"]);
            });

            test("should throw if a type already contains an id field extension", () => {
                const doc = gql`
                    type User @node {
                        email: ID! @relayId
                    }
                    extend type User {
                        id: ID!
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type already has a field `id`, which is reserved for Relay global node identification.\nEither remove it, or if you need access to this property, consider using the `@alias` directive to access it via another field."
                );
                expect(errors[0]).toHaveProperty("path", ["User", "id"]);
            });
            test("should not throw if a type already contains an id field but the field is aliased", () => {
                const doc = gql`
                    type User @node {
                        id: Int @alias(property: "other")
                        dbId: ID! @relayId
                    }
                `;
                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });

            test("should not throw if a type already contains an id field but the field is aliased on extension", () => {
                const doc = gql`
                    type User @node {
                        dbId: ID! @relayId
                    }
                    extend type User {
                        id: Int @alias(property: "other")
                    }
                `;
                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });
        });

        test("only one field can be @relayId", () => {
            const doc = gql`
                type Movie @node {
                    rottenid: ID! @relayId
                    imdbid: ID @relayId
                    title: String
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Only one field may be decorated with the `@relayId` directive."
            );
            expect(errors[0]).toHaveProperty("path", ["Movie", "imdbid", "@relayId"]);
        });

        test("only one field can be @relayId with interface", () => {
            const doc = gql`
                interface MovieInterface {
                    imdbid: ID! @relayId
                }

                type Movie implements MovieInterface @node {
                    rottenid: ID! @relayId
                    imdbid: ID!
                    title: String
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);

            expect(errors).toHaveLength(2);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Invalid directive usage: Directive @relayId is not supported on fields of the MovieInterface type."
            );
            expect(errors[0]).toHaveProperty("path", ["MovieInterface", "imdbid", "@relayId"]);
            expect(errors[1]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[1]).toHaveProperty(
                "message",
                "Invalid directive usage: Only one field may be decorated with the `@relayId` directive."
            );
            expect(errors[1]).toHaveProperty("path", ["Movie", "rottenid", "@relayId"]);
        });

        test("field named id already exists and not aliased on interface - multiple interfaces", () => {
            const doc = gql`
                interface ScorableInterface {
                    id: ID!
                }

                interface MovieInterface implements ScorableInterface {
                    id: ID!
                }

                type Movie implements MovieInterface & ScorableInterface @node {
                    rottenid: ID! @relayId
                    id: ID!
                    title: String
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Type already has a field `id`, which is reserved for Relay global node identification.\nEither remove it, or if you need access to this property, consider using the `@alias` directive to access it via another field."
            );
            expect(errors[0]).toHaveProperty("path", ["Movie", "id"]);
        });

        test("field named id already exists", () => {
            const doc = gql`
                type Movie @node {
                    id: ID!
                    imdbd: ID @relayId
                    title: String
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Type already has a field `id`, which is reserved for Relay global node identification.\nEither remove it, or if you need access to this property, consider using the `@alias` directive to access it via another field."
            );
            expect(errors[0]).toHaveProperty("path", ["Movie", "id"]);
        });

        test("field named id already exists and not aliased on interface", () => {
            const doc = gql`
                type Movie implements MovieInterface @node {
                    rottenid: ID! @relayId
                    id: ID!
                    title: String
                }
                interface MovieInterface {
                    id: ID!
                }
            `;
            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty(
                "message",
                "Type already has a field `id`, which is reserved for Relay global node identification.\nEither remove it, or if you need access to this property, consider using the `@alias` directive to access it via another field."
            );
            expect(errors[0]).toHaveProperty("path", ["MovieInterface", "id"]);
        });

        test("valid", () => {
            const doc = gql`
                type Movie @node {
                    rottenid: ID! @id
                    imdbId: ID! @relayId
                    title: String
                }
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            expect(executeValidate).not.toThrow();
        });
    });

    describe("union has no types", () => {
        test("union has no types - invalid", () => {
            const doc = gql`
                type Movie @node {
                    id: ID!
                    title: String
                }
                type Series @node {
                    title: String
                    episodes: Int
                }
                union Production
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            const errors = getError(executeValidate);

            expect(errors).toHaveLength(1);
            expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
            expect(errors[0]).toHaveProperty("message", "Union type Production must define one or more member types.");
        });

        test("union has types - valid", () => {
            const doc = gql`
                type Movie @node {
                    id: ID!
                    title: String
                }
                type Series @node {
                    title: String
                    episodes: Int
                }
                union Production = Movie | Series
            `;

            const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
            expect(executeValidate).not.toThrow();
        });
    });

    describe("Objects and Interfaces must have one or more fields", () => {
        describe("@private", () => {
            test("should throw error if @private would leave no fields in interface", () => {
                const interfaceTypes = gql`
                    interface UserInterface {
                        private: String @private
                    }
                `;
                const doc = gql`
                    ${interfaceTypes}
                    type User implements UserInterface @node {
                        id: ID
                        password: String @private
                        private: String
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = interfaceTypes.definitions as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "Objects and Interfaces must have one or more fields.");
            });

            test("should throw error if @private would leave no fields in object", () => {
                const interfaceTypes = gql`
                    interface UserInterface {
                        private: String @private
                    }
                `;
                const doc = gql`
                    ${interfaceTypes}
                    type User implements UserInterface @node {
                        id: ID
                        password: String @private
                        private: String
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = interfaceTypes.definitions as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "Objects and Interfaces must have one or more fields.");
            });

            test("should throw error if @private would leave no fields in object extension", () => {
                const interfaceTypes = gql`
                    interface UserInterface {
                        private: String
                    }
                `;
                const doc = gql`
                    ${interfaceTypes}
                    type User implements UserInterface @node {
                        password: String @private
                    }
                    extend type User {
                        private: String @private
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = interfaceTypes.definitions as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = [] as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "Objects and Interfaces must have one or more fields.");
            });

            test("Interfaces must have one or more fields", () => {
                const doc = gql`
                    interface Production
                    type Movie implements Production @node {
                        id: ID!
                        title: String
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty("message", "Objects and Interfaces must have one or more fields.");
            });

            test("valid", () => {
                const doc = gql`
                    type Movie implements Production @node {
                        id: ID!
                        title: String
                        episodes: Int
                    }
                    interface Production {
                        episodes: Int
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });
        });
        describe("@authorization", () => {
            test("should throw error if there are no arguments", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID!
                        title: String @authorization
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);

                const error = `@authorization requires at least one of ${AuthorizationAnnotationArguments.join(
                    ", "
                )} arguments`;
                expect(errors[0]).toHaveProperty("message", error);
            });

            test("should not throw error when there is a valid argument", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID!
                        title: String @authorization(filter: ["filter"])
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });

            test("should throw error when there is an invalid argument", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID!
                        title: String @authorization(test: "test")
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                const error = `@authorization requires at least one of ${AuthorizationAnnotationArguments.join(
                    ", "
                )} arguments`;
                expect(errors).toHaveLength(2);
                expect(errors[0]).toHaveProperty("message", `Unknown argument "test" on directive "@authorization".`);
                expect(errors[1]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[1]).toHaveProperty("message", error);
            });
        });
        describe("@subscriptionsAuthorization", () => {
            test("should throw error if there are no arguments", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID!
                        title: String @subscriptionsAuthorization
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    `Directive "@subscriptionsAuthorization" argument "filter" of type "[String]!" is required, but it was not provided.`
                );
            });

            test("should not throw error when there is a valid argument", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID!
                        title: String @subscriptionsAuthorization(filter: ["filter"])
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                expect(executeValidate).not.toThrow();
            });

            test("should throw error when there is an invalid argument", () => {
                const doc = gql`
                    type Movie @node {
                        id: ID!
                        title: String @subscriptionsAuthorization(test: "test")
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(2);
                expect(errors[0]).toHaveProperty(
                    "message",
                    `Unknown argument "test" on directive "@subscriptionsAuthorization".`
                );
                expect(errors[1]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[1]).toHaveProperty(
                    "message",
                    `Directive "@subscriptionsAuthorization" argument "filter" of type "[String]!" is required, but it was not provided.`
                );
            });
        });

        describe("@relationshipProperties", () => {
            describe("invalid", () => {
                test("should throw error if @authorization is used on relationship property", () => {
                    const relationshipProperties = gql`
                        type ActedIn @relationshipProperties {
                            screenTime: Int @authorization(validate: [{ where: { id: "1" } }])
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type Movie @node {
                            actors: Actor! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    const errors = getError(executeValidate);

                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid @relationshipProperties field: Cannot use the @authorization directive on relationship properties."
                    );
                    expect(errors[0]).toHaveProperty("path", ["ActedIn", "screenTime"]);
                });

                test("should throw error if @authorization is used on relationship property extension", () => {
                    const relationshipProperties = gql`
                        type ActedIn @relationshipProperties {
                            me: String
                        }
                        extend type ActedIn {
                            screenTime: Int @authorization(validate: [{ where: { id: "1" } }])
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type Movie @node {
                            actors: Actor! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    const errors = getError(executeValidate);

                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid @relationshipProperties field: Cannot use the @authorization directive on relationship properties."
                    );
                    expect(errors[0]).toHaveProperty("path", ["ActedIn", "screenTime"]);
                });
                test("should throw error if @authentication is used on relationship property", () => {
                    const relationshipProperties = gql`
                        type ActedIn @relationshipProperties {
                            screenTime: Int @authentication
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type Movie @node {
                            actors: Actor! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    const errors = getError(executeValidate);

                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid @relationshipProperties field: Cannot use the @authentication directive on relationship properties."
                    );
                    expect(errors[0]).toHaveProperty("path", ["ActedIn", "screenTime"]);
                });
                test("should throw error if @subscriptionsAuthorization is used on relationship property", () => {
                    const relationshipProperties = gql`
                        type ActedIn @relationshipProperties {
                            screenTime: Int @subscriptionsAuthorization(filter: [{ where: { id: "1" } }])
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type Movie @node {
                            actors: Actor! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    const errors = getError(executeValidate);

                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid @relationshipProperties field: Cannot use the @subscriptionsAuthorization directive on relationship properties."
                    );
                    expect(errors[0]).toHaveProperty("path", ["ActedIn", "screenTime"]);
                });

                test("should throw error if @relationship is used on relationship property", () => {
                    const relationshipProperties = gql`
                        type ActedIn @relationshipProperties {
                            actors: Actor! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type Movie @node {
                            actors: Actor! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    const errors = getError(executeValidate);

                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid @relationshipProperties field: Cannot use the @relationship directive on relationship properties."
                    );
                    expect(errors[0]).toHaveProperty("path", ["ActedIn", "actors"]);
                });

                test("should throw error if @cypher is used on relationship property", () => {
                    const relationshipProperties = gql`
                        type ActedIn @relationshipProperties {
                            id: ID @cypher(statement: "RETURN id(this) as id", columnName: "id")
                            roles: [String]
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type Movie @node {
                            actors: Actor! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    const errors = getError(executeValidate);

                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid @relationshipProperties field: Cannot use the @cypher directive on relationship properties."
                    );
                    expect(errors[0]).toHaveProperty("path", ["ActedIn", "id"]);
                });

                test("@relationshipProperties reserved field name", () => {
                    const relationshipProperties = gql`
                        type HasPost @relationshipProperties {
                            cursor: Int
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type User @node {
                            name: String
                            posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT, properties: "HasPost")
                        }
                        type Post @node {
                            title: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    const errors = getError(executeValidate);

                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid @relationshipProperties field: Interface field name 'cursor' reserved to support relay See https://relay.dev/graphql/"
                    );
                    expect(errors[0]).toHaveProperty("path", ["HasPost", "cursor"]);
                });

                test("@cypher forbidden on @relationshipProperties field", () => {
                    const relationshipProperties = gql`
                        type HasPost @relationshipProperties {
                            review: Float
                                @cypher(
                                    statement: """
                                    WITH 2 as x RETURN x
                                    """
                                    columnName: "x"
                                )
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type User @node {
                            name: String
                            posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT, properties: "HasPost")
                        }
                        type Post @node {
                            title: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    const errors = getError(executeValidate);

                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid @relationshipProperties field: Cannot use the @cypher directive on relationship properties."
                    );
                    expect(errors[0]).toHaveProperty("path", ["HasPost", "review"]);
                });
            });

            describe("valid", () => {
                test("@relationshipProperties", () => {
                    const relationshipProperties = gql`
                        type HasPost @relationshipProperties {
                            review: Float
                        }
                    `;
                    const doc = gql`
                        ${relationshipProperties}
                        type User @node {
                            name: String
                            posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT, properties: "HasPost")
                        }
                        type Post @node {
                            title: String
                        }
                    `;

                    const enums = [] as EnumTypeDefinitionNode[];
                    const interfaces = [] as InterfaceTypeDefinitionNode[];
                    const unions = [] as UnionTypeDefinitionNode[];
                    const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions: { enums, interfaces, unions, objects },
                            features: {},
                        });

                    expect(executeValidate).not.toThrow();
                });
            });
        });

        describe("Field Type", () => {
            describe("invalid", () => {
                test("@relationship nullable list type", () => {
                    const doc = gql`
                        type User @node {
                            posts: [Post!] @relationship(type: "HAS_POST", direction: OUT)
                        }
                        type Post @node {
                            title: String
                        }
                    `;

                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions,
                            features: {},
                        });

                    const errors = getError(executeValidate);
                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid field type: List type relationship fields must be non-nullable and have non-nullable entries, please change type to [Post!]!"
                    );
                    expect(errors[0]).toHaveProperty("path", ["User", "posts"]);
                });

                test("@relationship non-nullable list of nullable type", () => {
                    const doc = gql`
                        type User @node {
                            posts: [Post]! @relationship(type: "HAS_POST", direction: OUT)
                        }
                        type Post @node {
                            title: String
                        }
                    `;

                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions,
                            features: {},
                        });

                    const errors = getError(executeValidate);
                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid field type: List type relationship fields must be non-nullable and have non-nullable entries, please change type to [Post!]!"
                    );
                    expect(errors[0]).toHaveProperty("path", ["User", "posts"]);
                });

                test("@relationship non-nullable list of nullable type extension", () => {
                    const doc = gql`
                        type User @node {
                            name: String
                        }

                        type Post @node {
                            title: String
                        }
                        extend type User {
                            posts: [Post]! @relationship(type: "HAS_POST", direction: OUT)
                        }
                    `;

                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions,
                            features: {},
                        });

                    const errors = getError(executeValidate);
                    expect(errors).toHaveLength(1);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid field type: List type relationship fields must be non-nullable and have non-nullable entries, please change type to [Post!]!"
                    );
                    expect(errors[0]).toHaveProperty("path", ["User", "posts"]);
                });

                test("@relationship scalar", () => {
                    const doc = gql`
                        type User @node {
                            name: String
                            posts: Int! @relationship(type: "HAS_POST", direction: OUT)
                            allPosts: [Int!] @relationship(type: "HAS_POST", direction: OUT)
                        }
                    `;

                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions,
                            features: {},
                        });

                    const errors = getError(executeValidate);
                    expect(errors).toHaveLength(2);
                    expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[1]).not.toBeInstanceOf(NoErrorThrownError);
                    expect(errors[0]).toHaveProperty(
                        "message",
                        "Invalid field type: Scalar types cannot be relationship targets. Please use an Object type instead."
                    );
                    expect(errors[1]).toHaveProperty(
                        "message",
                        "Invalid field type: Scalar types cannot be relationship targets. Please use an Object type instead."
                    );
                    expect(errors[0]).toHaveProperty("path", ["User", "posts"]);
                    expect(errors[1]).toHaveProperty("path", ["User", "allPosts"]);
                });
            });

            describe("valid", () => {
                test("simple list", () => {
                    const doc = gql`
                        type Post @node {
                            titles: [String]
                        }
                    `;

                    const executeValidate = () =>
                        validateDocument({ document: doc, features: {}, additionalDefinitions });
                    expect(executeValidate).not.toThrow();
                });

                test("@relationship non-null list of non-nullable type", () => {
                    const doc = gql`
                        type User @node {
                            posts: [Post!]! @relationship(type: "HAS_POST", direction: OUT)
                        }
                        type Post @node {
                            title: String
                        }
                    `;

                    const executeValidate = () =>
                        validateDocument({
                            document: doc,
                            additionalDefinitions,
                            features: {},
                        });

                    expect(executeValidate).not.toThrow();
                });
            });
        });

        describe("Reserved Type Name", () => {
            test("should throw when using 'node' as a relationship property", () => {
                const relationshipPropertiesTypes = gql`
                    type ActedIn @relationshipProperties {
                        node: ID
                    }
                `;
                const doc = gql`
                    ${relationshipPropertiesTypes}
                    type Movie @node {
                        id: ID
                        actors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                    }

                    type Actor @node {
                        name: String
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = relationshipPropertiesTypes.definitions as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);
                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid @relationshipProperties field: Interface field name 'node' reserved to support relay See https://relay.dev/graphql/"
                );
            });

            test("should throw when using 'node' as a relationship property extension", () => {
                const relationshipPropertiesTypes = gql`
                    type ActedIn @relationshipProperties {
                        me: String
                    }
                    extend type ActedIn {
                        node: ID
                    }
                `;
                const doc = gql`
                    ${relationshipPropertiesTypes}
                    type Movie @node {
                        id: ID
                        actors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                    }

                    type Actor @node {
                        name: String
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = relationshipPropertiesTypes.definitions as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid @relationshipProperties field: Interface field name 'node' reserved to support relay See https://relay.dev/graphql/"
                );
            });

            test("should throw when using 'cursor' as a relationship property", () => {
                const relationshipPropertiesTypes = gql`
                    type ActedIn @relationshipProperties {
                        cursor: ID
                    }
                `;
                const doc = gql`
                    ${relationshipPropertiesTypes}
                    type Movie @node {
                        id: ID
                        actors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                    }

                    type Actor @node {
                        name: String
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = relationshipPropertiesTypes.definitions as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: {},
                    });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Invalid @relationshipProperties field: Interface field name 'cursor' reserved to support relay See https://relay.dev/graphql/"
                );
            });

            test("PageInfo type", () => {
                const doc = gql`
                    type PageInfo @node {
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `PageInfo` reserved to support the pagination model of connections. See https://relay.dev/graphql/connections.htm#sec-Reserved-Types for more information."
                );
            });

            test("PageInfo interface", () => {
                const doc = gql`
                    interface PageInfo {
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `PageInfo` reserved to support the pagination model of connections. See https://relay.dev/graphql/connections.htm#sec-Reserved-Types for more information."
                );
            });

            test("PageInfo union", () => {
                const doc = gql`
                    union PageInfo
                    {
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `PageInfo` reserved to support the pagination model of connections. See https://relay.dev/graphql/connections.htm#sec-Reserved-Types for more information."
                );
            });

            test("PageInfo enum", () => {
                const doc = gql`
                    enum PageInfo {
                        FIRST
                        SECOND
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `PageInfo` reserved to support the pagination model of connections. See https://relay.dev/graphql/connections.htm#sec-Reserved-Types for more information."
                );
            });

            test("PageInfo scalar", () => {
                const doc = gql`
                    scalar PageInfo
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `PageInfo` reserved to support the pagination model of connections. See https://relay.dev/graphql/connections.htm#sec-Reserved-Types for more information."
                );
            });

            test("Connection", () => {
                const doc = gql`
                    type SomeConnection @node {
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    'Type or Interface with name ending "Connection" are reserved to support the pagination model of connections. See https://relay.dev/graphql/connections.htm#sec-Reserved-Types for more information.'
                );
            });

            test("Node type", () => {
                const doc = gql`
                    type Node @node {
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `Node` reserved to support Relay. See https://relay.dev/graphql/ for more information."
                );
            });

            test("Node interface", () => {
                const doc = gql`
                    interface Node {
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `Node` reserved to support Relay. See https://relay.dev/graphql/ for more information."
                );
            });

            test("Node union", () => {
                const doc = gql`
                    union Node
                    {
                        id: ID
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `Node` reserved to support Relay. See https://relay.dev/graphql/ for more information."
                );
            });

            test("Node enum", () => {
                const doc = gql`
                    enum Node {
                        ONE
                        TWO
                    }
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `Node` reserved to support Relay. See https://relay.dev/graphql/ for more information."
                );
            });

            test("Node scalar", () => {
                const doc = gql`
                    scalar Node
                `;

                const executeValidate = () => validateDocument({ document: doc, features: {}, additionalDefinitions });
                const errors = getError(executeValidate);

                expect(errors).toHaveLength(1);
                expect(errors[0]).not.toBeInstanceOf(NoErrorThrownError);
                expect(errors[0]).toHaveProperty(
                    "message",
                    "Type or Interface with name `Node` reserved to support Relay. See https://relay.dev/graphql/ for more information."
                );
            });
        });
    });

    describe("validateDocument", () => {
        test("should throw an error if a directive is in the wrong location", () => {
            const doc = gql`
                type User @coalesce @node {
                    name: String
                }
            `;

            const enums = [] as EnumTypeDefinitionNode[];
            const interfaces = [] as InterfaceTypeDefinitionNode[];
            const unions = [] as UnionTypeDefinitionNode[];
            const objects = [] as ObjectTypeDefinitionNode[];
            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions: { enums, interfaces, unions, objects },
                    features: undefined,
                });

            expect(executeValidate).toThrow('Directive "@coalesce" may not be used on OBJECT.');
        });

        test("should throw an error if a directive is missing an argument", () => {
            const doc = gql`
                type User @node {
                    name: String @coalesce
                }
            `;

            const enums = [] as EnumTypeDefinitionNode[];
            const interfaces = [] as InterfaceTypeDefinitionNode[];
            const unions = [] as UnionTypeDefinitionNode[];
            const objects = [] as ObjectTypeDefinitionNode[];
            const executeValidate = () =>
                validateDocument({
                    document: doc,
                    additionalDefinitions: { enums, interfaces, unions, objects },
                    features: undefined,
                });

            expect(executeValidate).toThrow(
                'Directive "@coalesce" argument "value" of type "ScalarOrEnum!" is required, but it was not provided.'
            );
        });

        test("should throw a missing scalar error", () => {
            const doc = gql`
                type User @node {
                    name: Unknown
                }
            `;

            expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                'Unknown type "Unknown".'
            );
        });

        test("should throw an error if a user tries to pass in their own Point definition", () => {
            const doc = gql`
                type Point @node {
                    latitude: Float!
                    longitude: Float!
                }

                type User @node {
                    location: Point
                }
            `;

            expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                'Type "Point" already exists in the schema. It cannot also be defined in this type definition.'
            );
        });

        test("should throw an error if a user tries to pass in their own DateTime definition", () => {
            const doc = gql`
                scalar DateTime

                type User @node {
                    birthDateTime: DateTime
                }
            `;

            expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                'Type "DateTime" already exists in the schema. It cannot also be defined in this type definition.'
            );
        });

        test("should throw an error if a user tries to user @fulltext incorrectly", () => {
            const doc = gql`
                type User @node {
                    name: String
                }

                extend type User @fulltext
            `;

            expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                'Directive "@fulltext" argument "indexes" of type "[FulltextInput]!" is required, but it was not provided.'
            );
        });

        test("should throw an error if a user tries to pass in their own PointInput definition", () => {
            const doc = gql`
                input PointInput {
                    latitude: Float!
                    longitude: Float!
                }

                type Query {
                    pointQuery(point: PointInput!): String
                }
            `;

            expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                'Type "PointInput" already exists in the schema. It cannot also be defined in this type definition.'
            );
        });

        test("should throw an error if an interface is incorrectly implemented", () => {
            const doc = gql`
                interface UserInterface {
                    age: Int!
                }

                type User implements UserInterface @node {
                    name: String!
                }
            `;

            expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                "Interface field UserInterface.age expected but User does not provide it."
            );
        });

        test("should throw an error a user tries to redefine one of our directives", () => {
            const doc = gql`
                directive @relationship on FIELD_DEFINITION

                type Movie @node {
                    title: String
                }
            `;

            expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                'Directive "@relationship" already exists in the schema. It cannot be redefined.'
            );
        });

        test("should not throw error on use of internal node input types", () => {
            const doc = gql`
                type Mutation {
                    login: String
                    createPost(input: PostCreateInput!, options: PostOptions): Post!
                        @cypher(
                            statement: """
                            CREATE (post:Post)
                            SET
                              post = $input,
                              post.datetime = datetime(),
                              post.id = randomUUID()
                            RETURN post
                            """
                            columnName: "post"
                        )
                }

                type Post @node {
                    id: ID! @id
                    title: String!
                    datetime: DateTime @timestamp(operations: [CREATE])
                }
            `;

            const res = validateDocument({
                document: doc,
                features: undefined,
                additionalDefinitions,
            });
            expect(res).toBeUndefined();
        });

        describe("relationshipProperties directive", () => {
            test("should not throw when used correctly on an interface", () => {
                const relationshipProperties = gql`
                    type ActedIn @relationshipProperties {
                        screenTime: Int!
                    }
                `;
                const doc = gql`
                    ${relationshipProperties}

                    type Actor @node {
                        name: String!
                        movies: [Movie!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
                    }

                    type Movie @node {
                        title: String!
                        actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN, properties: "ActedIn")
                    }
                `;

                const enums = [] as EnumTypeDefinitionNode[];
                const interfaces = [] as InterfaceTypeDefinitionNode[];
                const unions = [] as UnionTypeDefinitionNode[];
                const objects = relationshipProperties.definitions as ObjectTypeDefinitionNode[];
                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions: { enums, interfaces, unions, objects },
                        features: undefined,
                    });

                expect(executeValidate).not.toThrow();
            });

            test("should throw if used on an interface type", () => {
                const doc = gql`
                    interface ActedIn @relationshipProperties {
                        screenTime: Int!
                    }
                `;

                expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                    'Directive "@relationshipProperties" may not be used on INTERFACE.'
                );
            });

            test("should throw if used on a field", () => {
                const doc = gql`
                    type ActedIn @node {
                        screenTime: Int! @relationshipProperties
                    }
                `;

                expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                    'Directive "@relationshipProperties" may not be used on FIELD_DEFINITION.'
                );
            });
        });

        test("should not throw error on use of internal input types within input types", () => {
            const doc = gql`
                type Salary @node {
                    salaryId: ID!
                    amount: Float
                    currency: String
                    frequency: String
                    eligibleForBonus: Boolean
                    bonusPercentage: Float
                    salaryReviewDate: DateTime
                    pays_salary: EmploymentRecord! @relationship(type: "PAYS_SALARY", direction: IN)
                }

                type EmploymentRecord @node {
                    employmentRecordId: ID!
                    pays_salary: [Salary!]! @relationship(type: "PAYS_SALARY", direction: OUT)
                }

                input EmpRecord {
                    employmentRecordId: ID!
                    salary: SalaryCreateInput
                    startDate: Date
                    endDate: Date
                }

                type Mutation {
                    mergeSalaries(salaries: [SalaryCreateInput!]): [Salary]
                        @cypher(
                            statement: """
                            UNWIND $salaries as salary
                            MERGE (s:Salary {salaryId: salary.salaryId})
                            ON CREATE SET s.amount = salary.amount,
                                          s.currency = salary.currency,
                                          s.frequency = salary.frequency,
                                          s.eligibleForBonus = salary.eligibleForBonus,
                                          s.bonusPercentage = salary.bonusPercentage,
                                          s.salaryReviewDate = salary.salaryReviewDate
                            ON MATCH SET  s.amount = salary.amount,
                                          s.currency = salary.currency,
                                          s.frequency = salary.frequency,
                                          s.eligibleForBonus = salary.eligibleForBonus,
                                          s.bonusPercentage = salary.bonusPercentage,
                                          s.salaryReviewDate = salary.salaryReviewDate
                            RETURN s
                            """
                            columnName: "s"
                        )

                    mergeEmploymentRecords(employmentRecords: [EmpRecord]): [EmploymentRecord]
                        @cypher(
                            statement: """
                            UNWIND $employmentRecords as employmentRecord
                            MERGE (er:EmploymentRecord {
                              employmentRecordId: employmentRecord.employmentRecordId
                            })
                            MERGE (s:Salary {salaryId: employmentRecord.salary.salaryId})
                            ON CREATE SET s.amount = employmentRecord.salary.amount,
                                          s.currency = employmentRecord.salary.currency,
                                          s.frequency = employmentRecord.salary.frequency,
                                          s.eligibleForBonus = employmentRecord.salary.eligibleForBonus,
                                          s.bonusPercentage = employmentRecord.salary.bonusPercentage,
                                          s.salaryReviewDate = employmentRecord.salary.salaryReviewDate
                            ON MATCH SET  s.amount = employmentRecord.salary.amount,
                                          s.currency = employmentRecord.salary.currency,
                                          s.frequency = employmentRecord.salary.frequency,
                                          s.eligibleForBonus = employmentRecord.salary.eligibleForBonus,
                                          s.bonusPercentage = employmentRecord.salary.bonusPercentage,
                                          s.salaryReviewDate = employmentRecord.salary.salaryReviewDate

                            MERGE (er)-[:PAYS_SALARY]->(s)
                            RETURN er
                            """
                            columnName: "er"
                        )
                }
            `;

            const res = validateDocument({
                document: doc,
                features: undefined,
                additionalDefinitions,
            });
            expect(res).toBeUndefined();
        });

        describe("Github Issue 158", () => {
            test("should not throw error on validation of schema", () => {
                const doc = gql`
                    type Test {
                        createdAt: DateTime
                    }

                    type Query {
                        nodes: [Test] @cypher(statement: "", columnName: "")
                    }
                `;

                const res = validateDocument({
                    document: doc,
                    features: undefined,
                    additionalDefinitions,
                });
                expect(res).toBeUndefined();
            });
        });

        describe("https://github.com/neo4j/graphql/issues/4232", () => {
            test("interface at the end", () => {
                const doc = gql`
                    type Person @node {
                        name: String!
                    }

                    type Episode implements IProduct @node {
                        editorsInCharge: [Person!]!
                            @relationship(
                                type: "EDITORS_IN_CHARGE"
                                direction: OUT
                                nestedOperations: [CONNECT, DISCONNECT]
                            )
                    }

                    type Series implements IProduct @node {
                        editorsInCharge: [Person!]!
                            @cypher(
                                statement: """
                                MATCH (this)-[:HAS_PART]->()-[:EDITORS_IN_CHARGE]->(n)
                                RETURN distinct(n) as editorsInCharge
                                """
                                columnName: "editorsInCharge"
                            )
                    }

                    interface IProduct {
                        editorsInCharge: [Person!]!
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });

            test("interface at the beginning", () => {
                const doc = gql`
                    type Person @node {
                        name: String!
                    }

                    interface IProduct {
                        editorsInCharge: [Person!]!
                    }

                    type Episode implements IProduct @node {
                        editorsInCharge: [Person!]!
                            @relationship(
                                type: "EDITORS_IN_CHARGE"
                                direction: OUT
                                nestedOperations: [CONNECT, DISCONNECT]
                            )
                    }

                    type Series implements IProduct @node {
                        editorsInCharge: [Person!]!
                            @cypher(
                                statement: """
                                MATCH (this)-[:HAS_PART]->()-[:EDITORS_IN_CHARGE]->(n)
                                RETURN distinct(n) as editorsInCharge
                                """
                                columnName: "editorsInCharge"
                            )
                    }
                `;

                const executeValidate = () =>
                    validateDocument({
                        document: doc,
                        additionalDefinitions,
                        features: {},
                    });

                expect(executeValidate).not.toThrow();
            });
        });

        describe("https://github.com/neo4j/graphql/issues/442", () => {
            test("should not throw error on validation of schema if MutationResponse used", () => {
                const doc = gql`
                    type Post @node {
                        id: Int!
                        text: String!
                    }

                    type Mutation {
                        create_Post(text: String!): CreatePostsMutationResponse!
                    }
                `;

                const res = validateDocument({
                    document: doc,
                    features: undefined,
                    additionalDefinitions,
                });
                expect(res).toBeUndefined();
            });

            test("should not throw error on validation of schema if SortDirection used", () => {
                const doc = gql`
                    type Post @node {
                        id: Int!
                        text: String!
                    }

                    type Mutation {
                        create_Post(direction: SortDirection!): CreatePostsMutationResponse!
                    }
                `;

                const res = validateDocument({
                    document: doc,
                    features: undefined,
                    additionalDefinitions,
                });
                expect(res).toBeUndefined();
            });
        });

        describe("Issue https://codesandbox.io/s/github/johnymontana/training-v3/tree/master/modules/graphql-apis/supplemental/code/03-graphql-apis-custom-logic/end?file=/schema.graphql:64-86", () => {
            test("should not throw error on validation of schema", () => {
                const doc = gql`
                    type Order @node {
                        orderID: ID! @id
                        placedAt: DateTime @timestamp
                        shipTo: Address! @relationship(type: "SHIPS_TO", direction: OUT)
                        customer: Customer! @relationship(type: "PLACED", direction: IN)
                        books: [Book!]! @relationship(type: "CONTAINS", direction: OUT)
                    }

                    extend type Order {
                        subTotal: Float
                            @cypher(
                                statement: "MATCH (this)-[:CONTAINS]->(b:Book) RETURN sum(b.price) as result"
                                columnName: "result"
                            )
                        shippingCost: Float
                            @cypher(
                                statement: "MATCH (this)-[:SHIPS_TO]->(a:Address) RETURN round(0.01 * distance(a.location, Point({latitude: 40.7128, longitude: -74.0060})) / 1000, 2) as result"
                                columnName: "result"
                            )
                        estimatedDelivery: DateTime @customResolver
                    }

                    type Customer @node {
                        username: String
                        orders: [Order!]! @relationship(type: "PLACED", direction: OUT)
                        reviews: [Review!]! @relationship(type: "WROTE", direction: OUT)
                        recommended(limit: Int = 3): [Book]
                            @cypher(
                                statement: "MATCH (this)-[:PLACED]->(:Order)-[:CONTAINS]->(:Book)<-[:CONTAINS]-(:Order)<-[:PLACED]-(c:Customer) MATCH (c)-[:PLACED]->(:Order)-[:CONTAINS]->(rec:Book) WHERE NOT exists((this)-[:PLACED]->(:Order)-[:CONTAINS]->(rec)) RETURN rec LIMIT $limit"
                                columnName: "rec"
                            )
                    }

                    type Address @node {
                        address: String
                        location: Point
                        order: Order @relationship(type: "SHIPS_TO", direction: IN)
                    }

                    extend type Address {
                        currentWeather: Weather
                            @cypher(
                                statement: "CALL apoc.load.json('https://www.7timer.info/bin/civil.php?lon=' + this.location.longitude + '&lat=' + this.location.latitude + '&ac=0&unit=metric&output=json&tzshift=0') YIELD value WITH value.dataseries[0] as weather RETURN {temperature: weather.temp2m, windSpeed: weather.wind10m.speed, windDirection: weather.wind10m.direction, precipitation: weather.prec_type, summary: weather.weather} AS conditions"
                                columnName: "conditions"
                            )
                    }

                    type Weather @node {
                        temperature: Int
                        windSpeed: Int
                        windDirection: Int
                        precipitation: String
                        summary: String
                    }

                    type Book @node {
                        isbn: ID!
                        title: String
                        price: Float
                        description: String
                        authors: [Author!]! @relationship(type: "AUTHOR_OF", direction: IN)
                        subjects: [Subject!]! @relationship(type: "ABOUT", direction: OUT)
                        reviews: [Review!]! @relationship(type: "REVIEWS", direction: IN)
                    }

                    extend type Book {
                        similar: [Book]
                            @cypher(
                                statement: """
                                MATCH (this)-[:ABOUT]->(s:Subject)
                                WITH this, COLLECT(id(s)) AS s1
                                MATCH (b:Book)-[:ABOUT]->(s:Subject) WHERE b <> this
                                WITH this, b, s1, COLLECT(id(s)) AS s2
                                WITH b, gds.alpha.similarity.jaccard(s2, s2) AS jaccard
                                ORDER BY jaccard DESC
                                RETURN b LIMIT 1
                                """
                                columnName: "b"
                            )
                    }

                    type Review @node {
                        rating: Int
                        text: String
                        createdAt: DateTime @timestamp
                        book: Book! @relationship(type: "REVIEWS", direction: OUT)
                        author: Customer! @relationship(type: "WROTE", direction: IN)
                    }

                    type Author @node {
                        name: String!
                        books: [Book!]! @relationship(type: "AUTHOR_OF", direction: OUT)
                    }

                    type Subject @node {
                        name: String!
                        books: [Book!]! @relationship(type: "ABOUT", direction: IN)
                    }

                    type Mutation {
                        mergeBookSubjects(subject: String!, bookTitles: [String!]!): Subject
                            @cypher(
                                statement: """
                                MERGE (s:Subject {name: $subject})
                                WITH s
                                UNWIND $bookTitles AS bookTitle
                                MATCH (t:Book {title: bookTitle})
                                MERGE (t)-[:ABOUT]->(s)
                                RETURN s
                                """
                                columnName: "s"
                            )
                    }

                    type Query {
                        bookSearch(searchString: String!): [Book]
                            @cypher(
                                statement: """
                                CALL db.index.fulltext.queryNodes('bookIndex', $searchString+'~')
                                YIELD node RETURN node
                                """
                                columnName: "node"
                            )
                    }
                `;

                const res = validateDocument({
                    document: doc,
                    features: undefined,
                    additionalDefinitions,
                });
                expect(res).toBeUndefined();
            });
        });

        describe("Github Issue 213", () => {
            test("should not throw error on validation of schema", () => {
                const doc = gql`
                    interface Vehicle {
                        id: ID!
                        color: String # NOTE: 'color' is optional on the interface
                    }

                    type Car implements Vehicle @node {
                        id: ID!
                        color: String! # NOTE: 'color' is mandatory on the type, which should be okay
                    }

                    type Query {
                        cars: [Vehicle!]!
                    }
                `;

                const res = validateDocument({
                    document: doc,
                    features: undefined,
                    additionalDefinitions,
                });
                expect(res).toBeUndefined();
            });
        });

        describe("@alias directive", () => {
            test("should throw an error if missing an argument", () => {
                const doc = gql`
                    type User @node {
                        name: String @alias
                    }
                `;
                expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                    'Directive "@alias" argument "property" of type "String!" is required, but it was not provided.'
                );
            });
            test("should throw an error if a directive is in the wrong location", () => {
                const doc = gql`
                    type User @alias @node {
                        name: String
                    }
                `;
                expect(() => validateDocument({ document: doc, features: undefined, additionalDefinitions })).toThrow(
                    'Directive "@alias" may not be used on OBJECT.'
                );
            });
            test("should not throw when used correctly", () => {
                const doc = gql`
                    type User @node {
                        name: String @alias(property: "dbName")
                    }
                `;
                const res = validateDocument({
                    document: doc,
                    features: undefined,
                    additionalDefinitions,
                });
                expect(res).toBeUndefined();
            });
        });

        describe("Reserved Names", () => {
            describe("Node", () => {
                test("should throw when using PageInfo as node name", () => {
                    const doc = gql`
                        type PageInfo @node {
                            id: ID
                        }
                    `;

                    expect(() =>
                        validateDocument({
                            document: doc,
                            features: undefined,
                            additionalDefinitions,
                        })
                    ).toThrow(RESERVED_TYPE_NAMES.find((x) => x.regex.test("PageInfo"))?.error);
                });

                test("should throw when using Connection in a node name", () => {
                    const doc = gql`
                        type NodeConnection @node {
                            id: ID
                        }
                    `;

                    expect(() =>
                        validateDocument({
                            document: doc,
                            features: undefined,
                            additionalDefinitions,
                        })
                    ).toThrow(RESERVED_TYPE_NAMES.find((x) => x.regex.test("NodeConnection"))?.error);
                });

                test("should throw when using Node as node name", () => {
                    const doc = gql`
                        type Node @node {
                            id: ID
                        }
                    `;

                    expect(() =>
                        validateDocument({
                            document: doc,
                            features: undefined,
                            additionalDefinitions,
                        })
                    ).toThrow(RESERVED_TYPE_NAMES.find((x) => x.regex.test("Node"))?.error);
                });
            });

            describe("Interface", () => {
                test("should throw when using PageInfo as relationship properties interface name", () => {
                    const doc = gql`
                        type Movie @node {
                            id: ID
                            actors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "PageInfo")
                        }

                        interface PageInfo {
                            screenTime: Int
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    expect(() =>
                        validateDocument({
                            document: doc,
                            features: undefined,
                            additionalDefinitions,
                        })
                    ).toThrow(RESERVED_TYPE_NAMES.find((x) => x.regex.test("PageInfo"))?.error);
                });

                test("should throw when using Connection in a properties interface name", () => {
                    const doc = gql`
                        type Movie @node {
                            id: ID
                            actors: [Actor!]!
                                @relationship(type: "ACTED_IN", direction: OUT, properties: "NodeConnection")
                        }

                        interface NodeConnection {
                            screenTime: Int
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    expect(() =>
                        validateDocument({
                            document: doc,
                            features: undefined,
                            additionalDefinitions,
                        })
                    ).toThrow(RESERVED_TYPE_NAMES.find((x) => x.regex.test("NodeConnection"))?.error);
                });

                test("should throw when using Node as relationship properties interface name", () => {
                    const doc = gql`
                        type Movie @node {
                            id: ID
                            actors: [Actor!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "Node")
                        }

                        interface Node {
                            screenTime: Int
                        }

                        type Actor @node {
                            name: String
                        }
                    `;

                    expect(() =>
                        validateDocument({
                            document: doc,
                            features: undefined,
                            additionalDefinitions,
                        })
                    ).toThrow(RESERVED_TYPE_NAMES.find((x) => x.regex.test("Node"))?.error);
                });
            });
        });

        describe("https://github.com/neo4j/graphql/issues/609 - specified directives", () => {
            test("should not throw error when using @deprecated directive", () => {
                const doc = gql`
                    type Deprecated @node {
                        deprecatedField: String @deprecated
                    }
                `;

                const res = validateDocument({
                    document: doc,
                    features: undefined,
                    additionalDefinitions,
                });
                expect(res).toBeUndefined();
            });
        });

        describe("https://github.com/neo4j/graphql/issues/2325 - SortDirection", () => {
            test("should not throw error when using SortDirection", () => {
                const doc = gql`
                    type Movie @node {
                        title: String
                        actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN)
                    }
                    type Actor @node {
                        name: String
                        movies: [Movie!]! @relationship(type: "ACTED_IN", direction: OUT)
                    }
                    type Mutation {
                        hello(direction: SortDirection): Boolean!
                    }
                `;

                const res = validateDocument({
                    document: doc,
                    features: undefined,
                    additionalDefinitions,
                });
                expect(res).toBeUndefined();
            });
        });
    });
});

// Validations that must be added
/* eslint-disable-next-line jest/no-disabled-tests */
describe.skip("TODO", () => {
    // TODO: add validation rule such that this is not possible
    // interface Production implements Thing & Show & WatchableThing
    // breaks everything,
    // eg. actorConnection result would be ThingActorsConnection or WatchableThingActorsConnection? technically needs to be both bc interface implements both Thing and WatchableThing

    test("type cannot implement a relationship declared in two interface chains", () => {
        // type Movie implements:
        // chain 1: Thing - Show - Production
        // chain 2: WatchableThing
        const doc = gql`
            interface Thing {
                title: String!
                actors: [Actor!]! @declareRelationship
            }

            interface WatchableThing {
                title: String!
                actors: [Actor!]! @declareRelationship
            }

            interface Show implements Thing {
                title: String!
                actors: [Actor!]! @declareRelationship
            }

            interface Production implements Thing & Show & WatchableThing {
                title: String!
                actors: [Actor!]!
            }

            type Movie implements WatchableThing & Production & Show & Thing @node {
                title: String!
                runtime: Int!
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN, properties: "ActedIn")
            }

            type Series implements WatchableThing & Production & Show & Thing @node {
                title: String!
                episodeCount: Int!
                actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN, properties: "StarredIn")
            }

            type ActedIn @relationshipProperties {
                screenTime: Int!
            }

            type StarredIn @relationshipProperties {
                episodeNr: Int!
            }

            type Actor @node {
                name: String!
                actedIn: [Production!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
            }
        `;

        expect(() => validateDocument({ document: doc, features: {}, additionalDefinitions })).toThrow(
            "Type cannot implement a relationship declared in more than one interface chain!"
        );
    });
});
