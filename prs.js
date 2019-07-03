// Load in templates
const {robotDisclaimer} = require("./templates.js");

// Load in all the cnames stuff
const {getCNAMEsFile, getCNAMEs, generateCNAMEsFile} = require("./cnames.js");

// Load in our config
const config = require("./config.json");

// Load in Octokit for GitHub API
const Octokit = require("@octokit/rest").plugin(require("octokit-create-pull-request"));
const octokit = new Octokit({auth: config.github_token});

// Load in chalk for logging
const chalk = require("chalk");

/**
 * Generates a perfect cnames_active.js file w/ pull request
 * @returns {Promise<void>}
 */
const perfectCNAMEsFile = async () => {
    // Log
    console.log(chalk.cyanBright.bold("\nStarting perfectCNAMEsFile process"));

    // Get the original file
    const file = await getCNAMEsFile();

    // Get the raw cnames
    const cnames = await getCNAMEs(file);

    // Get the new file
    const newFile = await generateCNAMEsFile(cnames, file);

    // Compare
    if (newFile == file) {
        // Log
        console.log(chalk.yellow("  Existing file is already perfect, no changes"));
        console.log(chalk.greenBright.bold("Generation completed for perfectCNAMEsFile"));
        // Done
        return;
    }

    // Create fork, commit & PR
    console.log(chalk.yellow("  Changes are required to make the file perfect"));
    console.log(chalk.blue("  Creating pull request with changes..."));
    const pr = await octokit.createPullRequest({
        owner: config.repository_owner,
        repo: config.repository_name,
        title: "Cleanup: Perfect Format & Sorting",
        body: `This pull request cleans up the cnames_active.js file by ensuring the formatting and sorting is perfect.${await robotDisclaimer()}`,
        head: "cleanup-perfect",
        changes: {
            files: {
                "cnames_active.js": newFile
            },
            commit: "Cleanup: Perfect Format & Sorting"
        }
    });
    // TODO: Link to PR in console - waiting on https://github.com/gr2m/octokit-create-pull-request/pull/13
    //  console.log(pr);

    // Log
    console.log(chalk.greenBright.bold("Generation completed for perfectCNAMEsFile"));
};

/*
    TODO: Complete PR process for main cleanup

    // Get the file so we only need to fetch once
    const file = await getCNAMEsFile();

    // Fetch all cname data
    const allCNAMEs = await getCNAMEs(file);

    // Generate new cname data w/o bad cnames
    const newCNAMEs = {};
    for (const cname in allCNAMEs) {
        if (!allCNAMEs.hasOwnProperty(cname)) continue;
        if (cname in badCNAMEs) {
            console.log(chalk.green(`  Removed ${cname} from cnames_active`));
            continue;
        }
        newCNAMEs[cname] = allCNAMEs[cname];
    }

    // Generate new cnames_active
    const cnamesActive = await generateCNAMEsFile(newCNAMEs, file);
*/

// Export
module.exports = {perfectCNAMEsFile};