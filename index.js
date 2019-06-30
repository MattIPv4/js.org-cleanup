// Load in Octokit for GitHub API
const Octokit = require("@octokit/rest");
const octokit = new Octokit();

// Load in fetch for URL testing
const fetch = require("node-fetch");

// Custom String.format
if (!String.prototype.format) {
    String.prototype.format = function () {
        const args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != "undefined"
                ? args[number]
                : match
                ;
        });
    };
}

/**
 * @typedef {object} cnameObject
 * @property {string} target - The CNAME target
 * @property {string} [noCF] - The noCF tag (if present) on the record
 * @property {string} [http] - The status of the HTTP test (if failed)
 * @property {string} [https] - The status of the HTTPS test (if failed)
 */

/**
 * Get all valid CNAME entries from the js.org repository
 * @returns {Promise<Object.<string, cnameObject>>} - Every entry in the CNAMEs file
 */
const getCNAMEs = async () => {
    // Get the raw GitHub API data
    const req = await octokit.repos.getContents({
        owner: "js-org",
        repo: "js.org",
        path: "cnames_active.js"
    });

    // Get the contents of the file
    const file = Buffer.from(req.data.content, req.data.encoding).toString();

    // Regex time
    const reg = new RegExp(/[ \t]*["'](.*)["'][ \t]*:[ \t]*["'](.*)["'][ \t]*,?[ \t]*(.+)?[ \t]*\n/g);
    const cnames = {};
    let match;
    while ((match = reg.exec(file)) !== null) {
        cnames[match[1]] = {
            target: match[2],
            noCF: match[3]
        }
    }

    // Done
    return cnames
};

/**
 * Test a given URL and provides a string with the error
 * @param {string} url - The URL to test
 * @returns {Promise<?string>} - The failure error message (or undefined if successful)
 */
const testUrl = async url => {
    let resp;
    try {
        resp = await fetch(url, {timeout: 1000});
    } catch (err) {
        return `Failed during request with error \`${err}\``
    }
    if (!resp.ok) {
        return `Failed with status code \`${resp.status} ${resp.statusText}\``
    }
    if (!resp.text()) {
        return `Failed with empty return body (status \`${resp.status} ${resp.statusText}\`)`
    }
};

/**
 * Fetches the js.org CNAME entries and then validates each one using a HTTP & HTTPS test
 * @returns {Promise<Object.<string, cnameObject>>} - Any failed CNAME entries
 */
const validateCNAMEs = async () => {
    // Get the CNAMEs
    const cnames = await getCNAMEs();

    // Define some stuff
    const urlBase = "http{0}://{1}js.org";
    const failed = {};

    // DEV: only test the first few
    const slice = Object.keys(cnames).slice(10);
    for (const key in slice) {
        delete cnames[slice[key]];
    }

    // Test each entry
    for (const cname in cnames) {
        // Set our testing URLs
        const subdomain = cname + (cname == "" ? "" : ".");
        const urlHttp = urlBase.format("", subdomain);
        const urlHttps = urlBase.format("s", subdomain);

        // Run the tests
        console.log(`Testing ${urlHttp}...`);
        const failedHttp = await testUrl(urlHttp);
        const failedHttps = await testUrl(urlHttps);

        // Allow one to fail without care
        if (failedHttp && failedHttps) {
            // Log
            console.log(`  ...failed: HTTP: \`${failedHttp}\` HTTPS: \`${failedHttps}\``);

            // Save
            const data = cnames[cname];
            data.http = failedHttp;
            data.https = failedHttps;
            failed[cname] = data;

            // Next
            continue;
        }

        // Success
        console.log(`  ...succeeded`);
    }

    // Done
    return failed
};

validateCNAMEs();
