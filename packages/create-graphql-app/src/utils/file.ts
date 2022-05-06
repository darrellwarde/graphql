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
import fs from "fs";
import fsExtra from "fs-extra";
import execa from "execa";
import axios from "axios";
import path from "path";
import tmp from "tmp";
import decompress from "decompress";

const dirExists = (dir: string) => fs.existsSync(dir);
const dirIsNotEmpty = (dir: string) => fs.readdirSync(dir).length > 0;

export const checkAppDir = (targetDir: string) => {
    const exists = dirExists(targetDir);
    if (exists && dirIsNotEmpty(targetDir)) {
        console.log(`%s '${targetDir}' already exists and is not empty.`, chalk.yellow.bold("ALREADYEXISTS"));
        process.exit(1);
    }
};

export const appDir = (targetDir) => path.resolve(process.cwd(), targetDir);

export const initGit = async (newAppDir) => {
    const result = await execa("git", ["init"], {
        cwd: newAppDir,
    });
    if (result.failed) {
        return Promise.reject(new Error("Failed to initialize git"));
    }
    return;
};

export const writeDotEnv = ({ newAppDir, neo4jUri, neo4jUser, neo4jPassword }) => {
    const dotenvpath = newAppDir;

    // FIXME: It would be better to replace into a template instead of rewrite entire file
    const dotenvstring = `# Use this file to set environment variables with credentials and configuration options
# This file is provided as an example and should be replaced with your own values
# You probably don't want to check this into version control!

NEO4J_URI=${neo4jUri}
NEO4J_USER=${neo4jUser}
NEO4J_PASSWORD=${neo4jPassword}

# Uncomment this line to specify a specific Neo4j database (v4.x+ only)
#NEO4J_DATABASE=neo4j

GRAPHQL_SERVER_HOST=0.0.0.0
GRAPHQL_SERVER_PORT=4001
GRAPHQL_SERVER_PATH=/graphql

`;

    fs.writeFileSync(path.join(dotenvpath, ".env"), dotenvstring);
};

// export const writeConfigJson = ({ newAppDir }) => {
//     const configPath = path.join(newAppDir, "scripts", "config");
//     if (!fs.existsSync(configPath)) {
//         fs.mkdirSync(configPath);
//     }

//     fs.writeFileSync(path.join(configPath, "index.json"), JSON.stringify(config));
// };

export const latestReleaseZipFile = async () => {
    const RELEASE_URL = "https://api.github.com/repos/neo4j/graphql/releases";
    const res = await axios.get(RELEASE_URL);
    return res.data[0].zipball_url;
};

export const downloadFile = async (sourceUrl, targetFile) => {
    const writer = fs.createWriteStream(targetFile);
    const response = await axios.get(sourceUrl, {
        responseType: "stream",
    });
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
    });
};

export const createProjectTasks = ({ newAppDir, ...creds }) => {
    const tmpDownloadPath = tmp.tmpNameSync({
        prefix: "grandstack",
        postfix: ".zip",
    });

    const { neo4jUri, neo4jUser, neo4jPassword } = creds;

    return [
        {
            title: `${dirExists(newAppDir) ? "Using" : "Creating"} directory '${newAppDir}'`,
            task: () => {
                fs.mkdirSync(newAppDir, { recursive: true });
            },
        },
        // {
        //     title: "Downloading latest release",
        //     task: async () => {
        //         const url = await latestReleaseZipFile();
        //         return downloadFile(url, tmpDownloadPath);
        //     },
        // },
        // {
        //     title: "Extracting latest release",
        //     task: () => decompress(tmpDownloadPath, newAppDir, { strip: 1 }),
        // },
        {
            title: "Copying working dir",
            task: () => fsExtra.copySync(path.join(__dirname, "../../../../templates/graphql-template"), newAppDir),
        },
        // {
        //     title: "Introspecting",
        //     task: () => introspect(neo4jUri, neo4jUser, neo4jPassword, newAppDir),
        // },
        {
            title: "Creating Local env file with configuration options...",
            task: () =>
                writeDotEnv({
                    newAppDir,
                    neo4jUri,
                    neo4jUser,
                    neo4jPassword,
                }),
        },
        // {
        //     title: "Creating scripts configuration...",
        //     task: () => writeConfigJson({ newAppDir }),
        // },
    ];
};
