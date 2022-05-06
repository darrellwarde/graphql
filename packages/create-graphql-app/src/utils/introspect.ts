// /*
//  * Copyright (c) "Neo4j"
//  * Neo4j Sweden AB [http://neo4j.com]
//  *
//  * This file is part of Neo4j.
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */

// import { toGraphQLTypeDefs } from "@neo4j/introspector";
// import neo4j from "neo4j-driver";
// import fs from "fs";
// import path from "path";

// export async function introspect(neo4jUri, neo4jUser, neo4jPassword, newAppDir) {
//     const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));

//     const sessionFactory = () => driver.session({ defaultAccessMode: neo4j.session.READ });

//     const typeDefs = await toGraphQLTypeDefs(sessionFactory);
//     fs.writeFileSync(path.join(newAppDir, "src/schema.graphql"), typeDefs);
//     await driver.close();
// }
