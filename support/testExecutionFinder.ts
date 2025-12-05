import * as utils from "./utils";
import fs from "fs";

/**
 * Used to check if an array of terms exist in test steps (descriptions and expected results)
 * Can be executed by changing directory to /support and running "npx ts-node testExecutionFinder"
 * Generates reports in the /reports folder, noMatchReport.txt and matchReport.txt
 * noMatchReport.txt will list the phrases that were not found in an execution
 * matchReport.txt will list the phrases that were found, and the test case keys they were found in
 * @param searchTerms a string array of the phrases to be iterated through
 */

const testExecutionFinder = async (searchTerms: string[]): Promise<void> => {
    const searchMatches: Record<string, string[]> = {};
    const parentFolderId: number = 15654686;

    // Get the sub-folder IDs for the given parent folder ID
    const subFolderIds = await utils.getZephyrSubFolderIds(parentFolderId);
    console.log(`Sub-folders for parent folder ${parentFolderId}:`, subFolderIds);

    // Fetch the test case keys for each sub-folder
    for (const subFolderId of subFolderIds) {
        console.log(`Fetching test cases for sub-folder ${subFolderId}`);
        
        // Fetch test case keys in this sub-folder
        const testCaseKeys = await utils.getZephyrTestCaseKeys(subFolderId);

        // Iterate over each test case key
        for (const testCaseKey of testCaseKeys) {
            console.log(`Getting execution for test case ${testCaseKey}`);

            // Get the test execution key for the test case
            const executionKey = await utils.getZephyrTestExecution(testCaseKey);
            if (executionKey) {
                console.log(`Fetching test steps for execution ${executionKey}`);
                
                // Get the test steps for the test execution
                const allTestSteps = await utils.zephyr_getExecTestSteps(executionKey);

                for (const step of allTestSteps) {
                    // Check each search term
                    for (const search of searchTerms) {
                        // Check if either description or expectedResult matches the search term
                        if ((step.description && step.description.includes(search)) || 
                            (step.expectedResult && step.expectedResult.includes(search))) {
                            
                            // If a match is found, store it
                            if (!searchMatches[search]) {
                                searchMatches[search] = [];
                            }
                            searchMatches[search].push(testCaseKey);
                        }
                    }
                }
            } else {
                console.log(`No execution found for ${testCaseKey}`);
            }
        }
    }

    // Generate reports
    const noMatchReport = searchTerms.filter(term => !searchMatches[term] || searchMatches[term].length === 0)
                                      .map(term => `"${term}" was not found.`);
    const matchReport = Object.entries(searchMatches)
                              .filter(([search, testCaseKeys]) => testCaseKeys.length > 0)
                              .map(([search, testCaseKeys]) => `"${search}" was found in ${testCaseKeys.join(', ')}`);

    // Write reports to files
    if (noMatchReport.length > 0) {
        fs.writeFileSync("../reports/noMatchReport.txt", noMatchReport.join("\n"), "utf8");
        console.log("No match report generated: noMatchReport.txt");
    } else {
        console.log("All search terms were found in at least one test execution.");
    }

    if (matchReport.length > 0) {
        fs.writeFileSync("../reports/matchReport.txt", matchReport.join("\n"), "utf8");
        console.log("Match report generated: matchReport.txt");
    } else {
        console.log("No search terms matched any test execution.");
    }
};

const searchTerms = [
    "Access to the content is allowed.", 
    "Access to the type is allowed for the group .", 
    "Access to the type is blocked for the user .", 
    "Access to the website is allowed for the user.", 
    "Any youtube video - ", 
    "Blocked Page is displayed in the browser preventing access to the content.", 
    "Blocked Page is displayed in the browser preventing access to the website.", 
    "Configuration is saved successfully.", 
    "Create a policy in School Manager to Allow signature .", 
    "Create a rule in School Manager to Block signature", 
    "Enable the rule", 
    "Enter the username of a user and select the user from the drop-down list.", 
    "entry description is displayed in the Description field.", 
    "example.com is accessed.", "example.com/path is accessed.", 
    "Google search for &quot;keyword&quot; is accessed.", 
    "Google search for &quot;porn&quot; or another flagged keyword - ", 
    "Google search for a keyword that is not a defintive, or keyword+matcher - ", 
    "https://www.youtube.com/watch?v=&lt;video_id&gt", 
    "In the Type field, select Search Keywords from the drop-down list.", 
    "keyword , entry description and keyword are added to the objet table.", 
    "keyword is displayed in the Entry field.", 
    "keyword is displayed in the Name field.", 
    "MITM Enabled checkbox displays a 'tick' to show it is enabled.", 
    "object description  is displayed in the Name field.", 
    "On the Windows Agent , attempt to access content that should be allowed as per the type ( signature ) and the criteria ( none ).", 
    "On the Windows Agent , attempt to access content that should be allowed as per the type ( signature ) and the criteria ( user ).", 
    "On the Windows Agent , attempt to access content that should be blocked as per the type ( google.search.familyzonedns.com ) and criteria ( none ).", 
    "On the Windows Agent , attempt to access content that should be blocked as per the type ( signature ) and criteria ( none ).", 
    "On the Windows Agent , attempt to access the type with a group that should not be affected by the policy as per the criteria.", 
    "On the Windows Agent , attempt to access the type with a user that should not be affected by the policy as per the criteria.", 
    "On the Windows Agent , browse to a website that should be blocked as per the signature", 
    "On the Windows Agent , browse to a website with a user  that should not be blocked as per the criteria.", 
    "Policy displays above the previously created Block policy.", 
    "Redirected to the Pools page for Search Keywords object - Search Keywords .", 
    "Search Keywords  is displayed in the Type field.", 
    "Search Keywords object is displayed in the Name field.", 
    "signature Example  is added as option to the inspected list.", 
    "Signature Google Search  is added as option to the inspected list.", 
    "Signature YouTube  is added as option to the inspected list.", 
    "The value of 'Http request uris' is populated and correct for the content accessed while using the Windows Agent .", 
    "Using the Windows Agent , open a browser and browse to ", 
    "Using the Windows Agent , open a browser and browse to Any youtube video - ", 
    "Using the Windows Agent , open a browser and browse to example.com .", 
    "Using the Windows Agent , open a browser and browse to example.com/path .", 
    "Using the Windows Agent , open a browser and browse to Google search for &quot;keyword&quot; .", 
    "Using the Windows Agent , open a browser and browse to Google search for &quot;porn&quot; or another flagged keyword - ", 
    "Using the Windows Agent , open a browser and browse to Google search for a keyword that is not a defintive, or keyword+matcher - ", 
    "YouTube  is added as option to the inspected list."
];

testExecutionFinder(searchTerms);
