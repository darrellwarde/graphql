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

import chalk from "chalk";
import Listr from "listr";
import path from "path";
import { projectInstall } from "pkg-install";
import { createProjectTasks, checkAppDir, initGit, appDir } from "./file";
import { CompleteOptions, parseArgumentsIntoOptions, promptForMissingOptions } from "./options";

async function createApp(options: CompleteOptions) {
    const { projectPath, gitInit, useNpm, neo4jUri, neo4jUser, neo4jPassword, runInstall } = options;

    const creds = { neo4jUri, neo4jUser, neo4jPassword };

    // Check to see if path exists and return joined path
    const newAppDir = appDir(projectPath);
    const packageManager = useNpm ? "npm" : "yarn";

    // Main task loop, build and concat based on options
    console.log("%s", chalk.green.bold("Initializing Project..."));
    const tasks = new Listr(
        [
            {
                title: "Create GRANDstack App",
                task: () =>
                    new Listr(
                        createProjectTasks({
                            newAppDir,
                            ...creds,
                        })
                    ),
            },
            {
                title: "Initialize git",
                task: () => initGit(newAppDir),
                enabled: () => gitInit,
            },
            {
                title: `Installing Packages with ${packageManager}`,
                task: () =>
                    new Listr([
                        {
                            title: "Installing API dependencies",
                            task: () =>
                                projectInstall({
                                    cwd: path.join(newAppDir),
                                    prefer: packageManager,
                                }),
                        },
                    ]),
                skip: () => (!runInstall ? "Pass --install to automatically install dependencies" : undefined),
            },
        ],
        { collapse: false, exitOnError: true }
    );

    await tasks.run();
    console.log();
    console.log(chalk.green(`Thanks for using @neo4j/graphql! We've created your app in '${newAppDir}'`));
    console.log(`You can find documentation at: https://neo4j.com/docs/graphql-manual/current/`);
    console.log();
    console.log(`
To start your @neo4j/graphql API run:

        cd ${projectPath}
        npm run start:dev

The default application is a simple business reviews application. Feel free to suggest updates by visiting the open source template repo and opening an issue: https://github.com/grand-stack/grand-stack-starter/issues.
`);
    return true;
}

export const main = async (args) => {
    const options = parseArgumentsIntoOptions(args);
    checkAppDir(options.projectPath);
    const prompted = await promptForMissingOptions(options);
    createApp(prompted);
};
