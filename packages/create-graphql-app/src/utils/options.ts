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

import inquirer from "inquirer";
import arg from "arg";
import chalk from "chalk";
import execa from "execa";

function shouldUseYarn(): boolean {
    try {
        execa.sync("yarnpkg", ["--version"]);
        return true;
    } catch (e) {
        return false;
    }
}

const defaultNeo4jURI = "bolt://localhost:7687";
const defaultNeo4jUser = "neo4j";
const defaultNeo4jPassword = "password";

const APIQuestions = [
    {
        type: "input",
        name: "information",
        message: chalk.green(
            `Now let's configure your GraphQL API to connect to Neo4j. If you don't have a Neo4j instance you can create one for free in the cloud at https://console.neo4j.io

Hit <Return> When you are ready.`
        ),
    },
    {
        type: "input",
        name: "neo4jUri",
        message: `Enter the connection string for Neo4j
    (use neo4j+s:// or bolt+s:// scheme for encryption)`,
        default: defaultNeo4jURI,
    },
    {
        type: "input",
        name: "neo4jUser",
        message: "Enter the Neo4j user",
        default: defaultNeo4jUser,
    },
    {
        type: "password",
        name: "neo4jPassword",
        message: "Enter the password for this user",
        default: defaultNeo4jPassword,
    },
];

type Options = {
    skipPrompts: boolean;
    gitInit: boolean;
    projectPath: string;
    runInstall: boolean;
    useNpm: boolean;
};

export function parseArgumentsIntoOptions(rawArgs): Options {
    try {
        const args = arg(
            {
                "--git": Boolean,
                "--yes": Boolean,
                "--install": Boolean,
                "--use-npm": Boolean,
                "--init-db": Boolean,
                "-g": "--git",
                "-y": "--yes",
                "-i": "--install",
                "-un": "--use-npm",
            },
            {
                argv: rawArgs.slice(2),
            }
        );
        return {
            skipPrompts: args["--yes"] || false,
            gitInit: args["--git"] || false,
            projectPath: args._[0],
            runInstall: args["--install"] || false,
            useNpm: args["--use-npm"] || !shouldUseYarn(),
        };
    } catch (error) {
        console.log("unknown option");
        process.exit(0);
    }
}

export type CompleteOptions = Options & {
    neo4jUri: string;
    neo4jUser: string;
    neo4jPassword: string;
};

export async function promptForMissingOptions(options: Options): Promise<CompleteOptions> {
    const { skipPrompts, projectPath, gitInit, runInstall } = options;

    const defaultPath = "./neo4j-graphql-app";

    if (skipPrompts) {
        return {
            ...options,
            neo4jUri: defaultNeo4jURI,
            neo4jUser: defaultNeo4jUser,
            neo4jPassword: defaultNeo4jPassword,
            projectPath: projectPath || defaultPath,
        };
    }

    const questions: any[] = [];

    if (!runInstall) {
        questions.push({
            type: "confirm",
            name: "runInstall",
            message: "Install dependencies?",
            default: true,
        });
    }

    if (!gitInit) {
        questions.push({
            type: "confirm",
            name: "gitInit",
            message: "Initialize a git repository?",
            default: false,
        });
    }

    const {
        gitInit: inqGitInit,
        runInstall: inqRunInstall,
        ...rest
    } = await inquirer.prompt([...questions, ...APIQuestions]);
    return {
        ...options,
        ...rest,
        projectPath: projectPath || defaultPath,
        gitInit: gitInit || inqGitInit,
        runInstall: runInstall || inqRunInstall,
    };
}
