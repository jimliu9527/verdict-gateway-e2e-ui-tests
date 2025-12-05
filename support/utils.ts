import { promises as fs } from 'fs';
import { By, WebDriver, Key, until, WebElement, Capabilities, Builder } from "selenium-webdriver";
import credentials from "../config/credentials.json";
import config from "../config/config.json";
import assert from "assert";
import * as smSteps from "../support/smSteps";
import { randomInt } from 'crypto';
import { MD5 } from 'crypto-js';
import { getStudentDriver, getAdminDriver } from "../support/testStepLibrary";
import { Page_BlockedPage } from "../pageObjects/SchoolManager/BlockedPage/blockedPage";

type envconfig = keyof typeof config.schoolManager;
type envcredentials = keyof typeof credentials.env;

export interface timeFormat {
    hours: string, 
    minutes: string, 
    period: string
}

let env:        string = process.env.AGENT_ENV as string;
if(!env || !(env in config.schoolManager)|| !(env in credentials.env))  env = "stg";

const zephyrAPI: string = config.Zephyr.baseUrl;
const zephyrAuthToken = process.env.ZEPHYR_AUTH_TOKEN;
const jiraAuthToken = process.env.JIRA_API_TOKEN;
const projectKey: string = config.Zephyr.projectKey;
const maxResults: number = config.Zephyr.maxQueryResults;
const schoolManagerUrl = config.schoolManager[env as envconfig].url;
const schoolManagerAdminUsername = credentials.env[env as envcredentials].schoolManager.adminUsername;
const schoolManagerAdminPassword = credentials.env[env as envcredentials].schoolManager.adminPassword;
const schoolManagerDeviceId = credentials.env[env as envcredentials].schoolManager.deviceId;
const waitTime = config.global.waitTime;
const blockedPagePage = new Page_BlockedPage();

let storedUnixTime: number;
let studentDriverMV3: WebDriver | undefined;
let studentDriverW10: WebDriver | undefined;
let studentDriverW11: WebDriver | undefined;
let studentDriverMV3OnNetwork: WebDriver | undefined;

/**
 * Gets data using the supplied url then cleans and returns the response as json
 * @param url 
 * @returns json
 */
const zephyrFetch = async (url: string): Promise<any> => {
    if(!zephyrAuthToken) {
        throw new Error('Not Zephyr Auth token found, unable to proceed')
    } else {
        const headers = {
            "Authorization": zephyrAuthToken
        };

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: headers
            });

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const respString = await response.text();
            const respCleaned = respString.replace(/\u200B/g, "");
            const json = JSON.parse(respCleaned);
            return json;
        } catch (error) {
            console.error(`Error fetching Zephyr data: ${error}`);
            throw error;
        }
    }

}

/**
 * Gets the ID for a given test case folder name
 * @param folderName 
 * @returns folderId
 */
export const getZephyrTestCaseFolders = async (folderName: string): Promise<number | undefined> => {

    if (zephyrAuthToken) {
        const url = `${zephyrAPI}/folders?maxResults=${maxResults}&startAt=0&projectKey=${projectKey}&folderType=TEST_CASE`

        try {
            const json = await zephyrFetch(url);

            const folder = json.values.find((folder: any) => folder.name === folderName);
            const folderId: number = folder.id as number;
            
            if (folder) {
                return folderId;
            } else {
                throw new Error(`Folder with name "${folderName}" not found.`);

            }
        } catch (error) {
            console.error(`Error fetching Zephyr Test Case Folders: ${error}`);
            throw error;
        }
    }
};

export interface Subfolder {
    id: number;
    name: string;
}

/**
 * Returns an array of IDs for all the subfolders of the specified folder
 * @param parentFolderId 
 * @returns number[] (test folder IDs)
 */
export const getZephyrSubFolderIds = async (parentFolderId: number): Promise<number[]> => {
    const allSubfolderIds: number[] = [];

    const url = `${zephyrAPI}/folders?maxResults=${maxResults}0&startAt=0&projectKey=${projectKey}&folderType=TEST_CASE`;

    try {
        const json = await zephyrFetch(url);

        // Get the immediate subfolders of the current parent folder
        const subfolders = json.values.filter((folder: any) => (folder.parentId === parentFolderId) && (folder.name != "Base Test Cases") );

        // Collect the IDs of the immediate subfolders
        const subfolderIds = subfolders.map((subfolder: any) => subfolder.id);
        allSubfolderIds.push(...subfolderIds);

        // Get IDs for each immediate subfolder
        for (const subfolderId of subfolderIds) {
            const nestedSubfolderIds = await getZephyrSubFolderIds(subfolderId);
            allSubfolderIds.push(...nestedSubfolderIds);
        }

        return allSubfolderIds;
    } catch (error) {
        console.error(`Error fetching all subfolder IDs for parent folder ID ${parentFolderId}:`, error);
        throw error;
    }
};

/**
 * Returns the testcase keys linked to a specified testcase folder
 * @param folderId 
 * @returns any (map of keys)
 */
export const getZephyrTestCaseKeys = async (folderId: number): Promise<any> => {
    const url = `${zephyrAPI}/testcases?projectKey=${projectKey}&folderId=${folderId}&maxResults=${maxResults}0&startAt=0`;

    try {
        const json = await zephyrFetch(url);
        const testCaseKeys = json.values.map((testCase: any) => testCase.key);
        
        console.log(`${testCaseKeys.length} test cases retrieved from ${folderId}`);
        return testCaseKeys;

    } catch (error) {
        console.error(`Error fetching all test case IDs for folder ID ${folderId}:`, error);
        throw error;
    }
};

interface TestStep {
    description: string | null;
    expectedResult: string | null;
    testData: string | null;
}

/**
 * Accepts an array of testCaseKeys and returns a Record object of each testcasekey containing an array of the available test steps
 * @param testCaseKeys 
 * @returns Record (testCaseKey: TestStep[])
 */
export const getZephyrTestCaseTestSteps = async (testCaseKeys: string[]): Promise<Record<string, TestStep[]>> => {
    const allTestSteps: Record<string, TestStep[]> = {};
    console.log(`Getting test steps for ${testCaseKeys.length} test cases`);
    let counter = 1;
    for (const testCaseKey of testCaseKeys) {
        console.log(`Getting steps for ${testCaseKey} - ${counter}/${testCaseKeys.length}`);
        const url = `${zephyrAPI}/testcases/${testCaseKey}/teststeps?maxResults=${maxResults}&startAt=0`;

        try {
            const json = await zephyrFetch(url);
            allTestSteps[testCaseKey] = [];

            for (let i = 0; i < json.values.length; i++) {
                const inline = json.values[i].inline;

                if (inline) {
                    // If inline isn't null, it's not a call to test
                    const description = inline.description || null;
                    const expectedResult = inline.expectedResult || null;
                    const testData = inline?.testData || null;
                    allTestSteps[testCaseKey].push({ description, expectedResult, testData });
                } else {
                    // If it is null, it's a call to test, so need to fetch that testCaseKey instead
                    const testCase = json.values[i].testCase;
                    if (testCase && testCase.testCaseKey) {
                        const callToTestUrl = `${zephyrAPI}/testcases/${testCase.testCaseKey}/teststeps?maxResults=${maxResults}0&startAt=0`;
                        const callToTestJson = await zephyrFetch(callToTestUrl);

                        for (let j = 0; j < callToTestJson.values.length; j++) {
                            const callToTestInline = callToTestJson.values[j].inline;
                            const description = callToTestInline?.description || null;
                            const expectedResult = callToTestInline?.expectedResult || null;
                            const testData = callToTestInline?.testData || null;
                            allTestSteps[testCaseKey].push({ description, expectedResult, testData });
                        }
                    }
                }
            }

        } catch (error) {
            console.error(`Error fetching test steps for test case ${testCaseKey}`, error);
            throw error;
        }
        counter++
    }

    return allTestSteps;
};

export interface TestStepResults {
    [testCaseKey: string]: {
        descriptions: string[];
        expectedResults: string[];
    };
};

export interface GetAllTestStepsResult {
    testCaseKeys: string[];
    testStepResults: TestStepResults;
};

/**
 * Accepts the testCaseFolderName and returns all of the test case keys with their step descriptions and expected results
 * @param testCaseFolderName 
 * @returns GetAllTestStepsResult (Descriptions and Expected results - see interface)
 */
export async function getAllTestSteps(testCaseFolderName: string): Promise<GetAllTestStepsResult> {
    try {
        const folderId = await getZephyrTestCaseFolders(testCaseFolderName);
        if(!folderId) return {testCaseKeys: [], testStepResults: {}};
        const subFolderIds = await getZephyrSubFolderIds(folderId);
        const allFolderIds = [folderId, ...subFolderIds];

        let allTestCaseKeys: string[] = [];
        for (const id of allFolderIds) {
            const testCaseKeys = await getZephyrTestCaseKeys(id);
            allTestCaseKeys.push(...testCaseKeys);
        }

        const rawTestSteps = await getZephyrTestCaseTestSteps(allTestCaseKeys);
        const result: TestStepResults = {};

        for (const key in rawTestSteps) {
            result[key] = {
                descriptions: rawTestSteps[key].map(step => step.description || ""),
                expectedResults: rawTestSteps[key].map(step => step.expectedResult || "")
            };
        }

        return {
            testCaseKeys: allTestCaseKeys,
            testStepResults: result
        };
    } catch (error) {
        console.error("An error occurred:", error);
        return {
            testCaseKeys: [],
            testStepResults: {}
        };
    }
};

/**
 * Return a date in Zulu format, intended for use with Zephyr API
 * @param daysAgo - number of days in the past, optional field, default is 0
 * @returns date string in Zulu format
 */
export const getZuluDate = async(daysAgo: number = 0): Promise<string> => {
    let isoDate: Date = new Date();
    isoDate.setDate(isoDate.getDate() - daysAgo);
    const dateString: string = isoDate.toISOString();
    return dateString;
}

/**
 * Uses the execution key to send a sync request to Zephyr Scale
 * This updates the execution so that it contains the latest test steps
 * From the test case
 * @param executionKey 
 */
export const syncTestExecution = async (executionKey: string): Promise<void> => {
    if (zephyrAuthToken) {
        const headers = {
            "Authorization": zephyrAuthToken
        };
        const updateExecEndpoint = `${zephyrAPI}/testexecutions/${executionKey}/teststeps/sync`;
        await fetch(updateExecEndpoint, {
            method: "POST",
            headers: headers
        });
    }
}

/**
 * Returns the latest test execution key for a given testCaseKey
 * If there isn't one, it will return undefined
 * Config is used to determine how many days prior to check
 * @param testCaseKey 
 * @returns string | undefined
 */
export const getZephyrTestExecution = async (testCaseKey: string): Promise<string | undefined> => {
    if (zephyrAuthToken) {
        const numDays = config.Zephyr.latestExecutionDays;
        const pastDate = await getZuluDate(numDays);
        const testExecutionsEndpoint = `${zephyrAPI}/testexecutions?projectKey=${projectKey}&testCase=${testCaseKey}&maxResults=${maxResults}&startAt=0&actualEndDateAfter=${pastDate}&onlyLastExecutions=true`;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const responseJson = await zephyrFetch(testExecutionsEndpoint);
    
                if (responseJson.total > 0) {
                    console.log(`Test Execution found for ${testCaseKey}`);
                    const allExecutions = responseJson.values;
                    const latestExecution = allExecutions[allExecutions.length - 1];
                    return latestExecution.key;
                } else {
                    console.log(`Test Execution does not exist for ${testCaseKey}, creating one now...`);
                    await createZephyrTestExecution(testCaseKey);
                }
            } catch (error) {
                console.error(`Error when retrieving test executions for ${testCaseKey}`, error);
            }
        }
        console.error("Max attempts reached. Test execution could not be retrieved.");
    } else {
        console.error("Zephyr Auth Token not found")
    }
};

export interface execTestStep {
    description: string,
    expectedResult: string,
    testData: any
};

/**
 * Accepts a testExecutionKey and returns an array of the execTestSteps for that execution
 * Returns empty array by default
 * @param testExecutionKey 
 * @returns execTestStep[] - see interface
 */
export const zephyr_getExecTestSteps = async(testExecutionKey: string): Promise<execTestStep[]> => {
    let execSteps: execTestStep[] = [];
    if(testExecutionKey != null) {
        if (zephyrAuthToken) {
            // get all test steps for a particular test execution
            const testExecutionsEndpoint = `${zephyrAPI}/testexecutions/${testExecutionKey}/teststeps?maxResults=${maxResults}&startAt=0`;
            try {
                const responseJson = await zephyrFetch(testExecutionsEndpoint);
                console.log('Number of steps found: ', responseJson.total);
                if (responseJson.total > 0) {
                    console.log(`Text Execution Steps found for ${testExecutionKey}`);
                    const tagRegex = /<[^>]*>/g;
                    const allSteps = responseJson.values;
                    
                    for (const step of allSteps) {
                        const cleanedDescription = step.inline.description.replace(tagRegex, '').replace(/&nbsp;/g, '').trim();
                        const cleanedExpectedResult = step.inline.expectedResult.replace(tagRegex, '') .replace(/&nbsp;/g, '').trim();
                        let thisData:any = {};
                        if (step.inline.testData != null) {
                            
                            const dataItems: string[] = step.inline.testData.split(/<br\s*\/?>/);
                            for(let eachDataItem of dataItems) {
                                if(eachDataItem.includes(":")) {
                                    const itemSplit = eachDataItem.split(":");
                                    const cleanedItemKey = itemSplit[0]
                                        .replace(/<[^>]+>/g, '')
                                        .replace(/&nbsp;/g, '')
                                        .replace(tagRegex, '')
                                        .trim();
                                    const cleanedItemValue = itemSplit[1]
                                        .replace(/<[^>]+>/g, '')    
                                        .replace(/&nbsp;/g, '')
                                        .replace(tagRegex, '')
                                        .trim();

                                    thisData[cleanedItemKey] = cleanedItemValue;
                                }
                            }
                        }

                        execSteps.push({
                            description: cleanedDescription,
                            expectedResult: cleanedExpectedResult,
                            testData: thisData
                        });
                    }

                } else {
                    console.log(`Zero test steps found for ${testExecutionKey}, please check the execution!`);
                    return [];
                }
            } catch (error) {
                console.error(`Error when retrieving test steps for execution ${testExecutionKey}`, error);
            }
        }
    } else {
        console.log('Test Execution Key was null, unable to retrieve an execution');
    }
    return execSteps;
}

/**
 * Creates a new, empty, execution for the specified test case
 * @param testCaseKey
 */
export const createZephyrTestExecution = async (testCaseKey: string): Promise<void> => {
    if(testCaseKey != null) {
        if(zephyrAuthToken) {
            const headers = {
                "Authorization": zephyrAuthToken,
                "Content-Type": "application/json",
                "Accept": "application/json"
            };
            const body = JSON.stringify({
                "projectKey": projectKey,
                "statusName": "Not Executed",
                "testCaseKey": testCaseKey,
                "testCycleKey": `${projectKey}-R1`
            })
            const testExecutionsEndpoint = `${zephyrAPI}/testexecutions`;
            try {
                const response = await fetch(testExecutionsEndpoint, {
                    method: "POST",
                    headers: headers,
                    body: body
                });
                const prefix: string = (response.status === 201) ? "S" : "Uns"
                console.log(`${prefix}uccessful attempt to create execution for ${testCaseKey} - response: ${response.status}`);
            } catch (error) {
                console.error(`Error when creating test execution for ${testCaseKey}`, error);
            }
        }
    }
}

/**
 * Function to retrieve the test case name for a given test case key
 * Useful when a value in the test case name can be used to configure the behaviour of a test step functon
 * @param testCaseKey - The test case key from Zephyr eg. TEST-123
 * @returns testCaseName string
 */
export const getZephyrTestCaseName = async (testCaseKey: string): Promise<string> => {
    if (zephyrAuthToken) {
        const testCasesEndpoint = `${zephyrAPI}/testcases/${testCaseKey}`;
        
        try {
            const responseJson = await zephyrFetch(testCasesEndpoint);
            const testCaseName: string = responseJson.name;
            console.log(`Test Case Name for ${testCaseKey}`);
            return testCaseName;
        } catch (error) {
            console.error(`Error when retrieving test case name for ${testCaseKey}`, error);
            throw new Error;
        }
    } else {
        console.error("Zephyr Auth Token not found!");
        throw new Error;
    }
};

/**
 * Returns the appropriate url to search for based on a provided search engine.
 * Used for a filtering rule with a search keyword object
 * Assumes the search keywords object includes an entry for "search keyword"
 * @param searchEngine 
 * @returns string (url)
 */
export const searchKeyWordObject = async (searchEngine: string): Promise<string> => {

    let urlToBrowseTo = "";
    
    switch (searchEngine) {
        case "google search":
            console.log("Searching on Google");
            urlToBrowseTo = "https://www.google.com/search?q=search+keyword";
            break;
        case "bing":
            console.log("Searching on Bing");
            urlToBrowseTo = "https://www.bing.com/search?q=search+keyword";
            break;
        case "youtube":
            console.log("Searching on YouTube");
            urlToBrowseTo = "https://www.youtube.com/results?search_query=search+keyword";
            break;
        case "vimeo":
            console.log("Searching on Vimeo");
            urlToBrowseTo = "https://vimeo.com/search?q=search%20keyword";
            break;
        default:
            console.error("Undefined or urecognised search engine");
            throw new Error;
    }
    return urlToBrowseTo;
};

/**
 * Will return the searchEngine url for any of the matching options, including a search term
 * appropriate for the specified category
 * @param searchEngine google, bing, vimeo or youtube
 * @param category 
 * @returns string (url)
 */
export const searchesForCategory = async (searchEngine: string, category: string): Promise<string> => {

    if (searchEngine === "google search") { // to account for some variance
        searchEngine = "google"
    }

    const searchEngineUrls: any = {
        "google": "https://google.com/search?q=",
        "bing": "https://bing.com/search?q=",
        "vimeo": "https://vimeo.com/search?q=",
        "youtube": "https://youtube.com/results?search_query="
    }

    const categoryKeywords: any = {
        "searches for violence": "shooter",
        "searches for depression": "feel+alone",
        "searches for suicide": "cut+myself",
        "searches for hate speech": "back+door+bandit",
        "searches for adult content": "skinnydipper",
        "searches for substance abuse": "cream+cartridges",
        "searches for bullying": "your+stupid",
        "searches for vpn search": "OpenVPN",
        "searches for academic dishonesty": "what+are+the+answers+to+this+exam"
    };

    const baseUrl = searchEngineUrls[searchEngine];
    const searchQuery = categoryKeywords[category];

    if (baseUrl && searchQuery) {
        console.log(`Searching for ${searchQuery} on ${searchEngine}`);
        const urlToBrowseTo = `${baseUrl}${searchQuery}`;
        console.log(urlToBrowseTo);
        return urlToBrowseTo;
    } else {
        throw new Error(`Invalid search engine or category: "${searchEngine}", "${category}"`);
    }
}
/**
 * Receiving true from this function should be treated as instruction not to create a new Jira issue.
 * If there is an error with Jira or no API token present, true will be returned as a default
 * to avoid further attempts to create new issues.
 * 
 * @param taskName The test step that needs to be implemented
 * @returns ticketExists (boolean). By default this is true.
 * 
 */
export const checkExistingJiraTasks = async (taskName: string): Promise<boolean> => {
    const projectKey = config.Jira.projectKey;
    const epicKey = config.Jira.parentEpic;
    const jiraBaseUrl = config.Jira.baseUrl;
    const maxResults = 10000;

    let ticketExists = true;

    const queryUrl = `${jiraBaseUrl}/rest/api/3/search?maxResults=${maxResults}&fields=Key,Summary&jql=Project%3D${projectKey}%20AND%20type%3DTask%20and%20parentEpic%3D${epicKey}%20and%20summary%20~"${taskName}"%20and%20status%20%21%3D%20Done`;

    if (jiraAuthToken) {
        const headers = {
            "Authorization": jiraAuthToken,
            "Accept": "application/json",
            "Accept-Language": "en-US"
        };
        try {
            const response = await fetch(queryUrl, {
                method: "GET",
                headers: headers
            });

            const responseJson = await response.json();

            if (!responseJson.issues) {
                throw new Error(`Response from Jira did not contain any issues. API response: ${JSON.stringify(responseJson)}`);
            }

            const existingIssues = responseJson.issues;
            const numExistingIssues = existingIssues.length;
            console.log(`Found ${numExistingIssues} existing issues`);

            if (numExistingIssues) {
                const firstMatch = existingIssues[0];
                const firstMatchKey = firstMatch.key;
                ticketExists = true;
                console.log(`There is already a task for "${taskName}": ${firstMatchKey}`);
            } else {
                console.log(`No existing task for "${taskName}", creating new task`);
                ticketExists = false;
            }
        } catch (error) {
            console.error(`Error when searching for existing Jira tickets with taskName: "${taskName}".`, error);
            ticketExists = false;
        }
    } else {
        console.error("Jira token not found, set env variable JIRA_API_TOKEN");
        ticketExists = false;
    }

    return ticketExists;
};

/**
 * Creates a new Jira issue.
 * Values in the config file for project, parent epic and issue type ID should be set before using this function
 * 
 * @param taskName The name of the Jira Task to be created - this should be the step description or expected result
 * Checks should be performed using checkExistingJiraTasks(taskName) first
 * @param description OPTIONAL text to be added to the description field of the new Jira Task
 */
export const createJiraTask = async (taskName: string, description: string = ""): Promise<void> => {
    const projectKey = config.Jira.projectKey;
    const epicKey = config.Jira.parentEpic;
    const jiraBaseUrl = config.Jira.baseUrl;
    const issueTypeId = config.Jira.newTaskTypeId;

    const createUrl = `${jiraBaseUrl}/rest/api/2/issue`

    if(jiraAuthToken) {
        const headers = {
            "Authorization": jiraAuthToken,
            "Accept": "application/json",
            "Content-Type": "application/json"
        };
        const body = JSON.stringify({
            "fields": {
                "project":{
                    "key":projectKey
                },
                "issuetype":{
                    "id":issueTypeId
                },
                "summary":taskName,
                "parent":{
                    "key":epicKey
                },
                "description":description
            }
        });

        try {
            const response = await fetch(createUrl, {
                method: "POST",
                headers: headers,
                body: body
            });
            const responseJson = await response.json();
            const newIssueKey = responseJson.key;
            console.log(`New issue created: ${newIssueKey}`);
        } catch (error) {
            console.log(`Error when creating new Jira ticket: ${error}`);
        }
    } else {
        console.log("Jira token not found, set env variable JIRA_API_TOKEN");
    }
}

/**
 * Waits for the specified time in milliseconds
 * Default is 500
 * Intended to be used where animations mean an object does not become visibile/invisibile immediately
 * @param waitTime
 */
export const waitForAnimation = async (waitTime: number = 500): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, waitTime));
};

/**
 * Shared test context used across the test suite.
 * 
 * This object holds important state and references that need to be accessed
 * globally within the test steps. It can store various pieces of information 
 * such as the WebDriver instance (`driver`) and any other relevant data 
 * that needs to persist throughout the lifecycle of a test case.
 * 
 * Example usage:
 * - `testContext.driver`: The WebDriver instance for the IT admin.
 * - Other dynamic test-specific data (e.g., agent, policy details).
 * 
 * The state of `testContext` should be managed carefully to avoid conflicts
 * between test cases, especially in parallel test executions.
 * 
 * Note: This object is typically initialized and updated by different 
 * utility functions and steps across the test lifecycle.
 */

interface TestContext {
    agent?: string;
    driver?: WebDriver;
    enrollmentDriver?: WebDriver;
    currentTime?: timeFormat;
    videoGenerationTime?: timeFormat;
    currentUrl? : string;
    actualUrls?: string[];
    searchEngine?: string;
    bypassCodeValue? : string;
    timeStamp: Record<string, string>;
    bypassCodeExpiry?: string;
    bypassCodeCreation?: string;
    [key: string]: unknown; // Allows additional properties
}
// Shared across all files
export const testContext: TestContext = {
    timeStamp: {}
}; 

/**
 * Builds a driver for a user with no extensions added, to be used for signing into School Manager to perform tasks.
 * @returns WebDriver
 */
export const buildDriverForITAdmin = async(): Promise<WebDriver> => {
    console.log(`Building driver for IT admin`);
    const adminCapabilities = Capabilities.chrome();
    adminCapabilities.set("nodename:applicationName", "it_admin");

    let adminDriver = new Builder()
        .forBrowser("chrome")
        .usingServer(config.selenium.hub)
        .withCapabilities(adminCapabilities)
        .build();

    // if it fails to build don't proceed
    try {
        await smSteps.signIn(adminDriver);
    } catch (error) {
        console.error("Error when building driver for IT Admin: ", error);
        await adminDriver.quit();
        throw error;
    }

    return adminDriver;
};

/**
 * Builds a driver intended to be used for student activities
 * Accepts an agent parameter so the builder knows which node to build for.
 * Current options: 
 * "browser extension mv3", 
 * "browser extension mv3 other", 
 * "windows 10 agent", 
 * "windows 10 agent other", 
 * "windows 11 agent", 
 * "windows 11 agent other",
 * "windows 10 enrollment",
 * "windows 11 enrollment"
 * "browser extension mv3 on network"
 * "browser extension mv3 other on network"
 * @param agent
 * @returns studentDriver
 */
export const buildStudentDriver = async (agent: string): Promise<WebDriver> => {

    const thisAgent = agent.toLowerCase().trim();
    let studentCapability: string = "";

    switch (thisAgent) {
        case "browser extension mv3":
            studentCapability = "browser_extension_mv3-main";
            break;
        case "browser extension mv3 other":
            studentCapability = "browser_extension_mv3-other";
            break;
        case "windows 10 agent":
            studentCapability = "windows_10_agent-main";
            break;
        case "windows 10 agent other":
            studentCapability = "windows_10_agent-other";
            break;
        case "windows 11 agent":
            studentCapability = "windows_11_agent-main";
            break;
        case "windows 11 agent other":
            studentCapability = "windows_11_agent-other";
            break;
        case "windows 10 agent enrollment":
            studentCapability = "windows_10_agent-enrollment";
            break;
        case "windows 11 agent enrollment":
            studentCapability = "windows_11_agent-enrollment";
            break;
        case "browser extension mv3 on network": 
            studentCapability = "browser_extension_mv3-main_on_network";
            break;
        case "browser extension mv3 other on network":
            studentCapability = "browser_extension_mv3-other_on_network";
            break;
        case "windows 11 agent logs":
            studentCapability = "windows_11_agent-logs";
            break;
        default:
            throw new Error(`Unsupported agent type: ${agent}`);
    }

    console.log(`Building driver for ${agent}`);
    const studentCapabilities = Capabilities.chrome();
    studentCapabilities.set("nodename:applicationName", studentCapability);
    const studentDriver = await new Builder()
         .forBrowser("chrome")
         .withCapabilities(studentCapabilities)
         .usingServer(config.selenium.hub)
         .build();

    if (thisAgent.includes("extension mv3")) {
        // give the extension more time to pull config
        await waitForAnimation(10000);
    } else {
        await waitForAnimation();   
    }

    return studentDriver;
};

/**
 * Browses to the provided url for a given driver.
 * @param driver
 * @param url 
 */
export const browseToUrl = async (driver: WebDriver, url: string): Promise<void> => {
    let paramChar = "?";
    if(url.includes("?")) {
        paramChar = "&"
    }
    // add http:// or https:// if it doesn't have it as driver.get requires it
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `https://${url}`;
    }
    const encodedDateTime = MD5(new Date().toISOString());
    const newUrl = `${url}${paramChar}random=${encodedDateTime}`
    console.log(`Navigating to ${newUrl}`);
    try {
        await driver.get(newUrl);
    } catch(error) {
        if(`${error}`.includes("ERR_CONNECTION_ABORTED")) {
            console.log("CONNECT WAS ABORTED")
        }
    }
    
};

/**
 * Browses to a url without adding the randomised parameter
 * Needed for youtube.
 * @param driver 
 * @param url 
 */
export const browseToVideo = async (driver: WebDriver, url: string): Promise<void> => {
    try {
        await driver.get(`https://${url}`);
    } catch (error) {
        console.error(`Error occurred when browsing to a youtube video: ${error}`);
        throw error;
    }
};

/**
 * Browses to multiple provided urls for a given driver.
 * @param driver
 * @param urls An array of URLs to visit
 * @param newTabs If true, each website will open in a new tab, default value is false
 * @returns an array of urls to be used for block page checking later
 */
export const browseToMultipleUrls = async (driver: WebDriver, urls: string[], newTabs: Boolean = false): Promise<string[]> => {
    const pageErrorLocator = `//*[text()="ERR_SOCKET_NOT_CONNECTED"]`
    const actualUrls: string[] = [];
    const encodedDateTime = MD5(new Date().toISOString());
    for (const url of urls) {

        let paramChar = "?";
        if(url.includes("?")) {
            paramChar = "&"
        }
        const newUrl = `${url}${paramChar}random=${encodedDateTime}`

        console.log(`Navigating to ${newUrl}`);
        try {
            if (newTabs) {
                await driver.switchTo().newWindow('tab');
            }
            await driver.get(`https://${newUrl}`);
        } catch (error) {
            if(`${error}`.includes("ERR_CONNECTION_ABORTED")) {
                console.log('connection aborted message');
                await driver.get(`https://${newUrl}`);
            }
        }
        
        await waitForAnimation();
        const allErrors = await driver.findElements(By.xpath(pageErrorLocator));
        if(allErrors.length === 0) {
            console.log("Getting the current url");
            const currentUrl = await driver.getCurrentUrl();
            actualUrls.push(currentUrl); // Store the current URL
            console.log("Current url has been stored for later use");
        } else {
            actualUrls.push("error_page"); // Store that page wasn't shown
        }        
        
    }
    return actualUrls;
};


/**
 * Compares the current url against an expected url
 * @param driver
 * @param expectedUrl 
 */
export const verifyUrl = async (driver: WebDriver, expectedUrl: RegExp, bypassCode?: boolean): Promise<void> => {
    await waitForAnimation();
    const currentUrl = await driver.getCurrentUrl();
    const blockedPageUrl = new RegExp(config.schoolManager[env as envconfig].blockedPage);
    const pageErrorLocator = `//*[text()="ERR_SOCKET_NOT_CONNECTED"]`

    const allErrors = await driver.findElements(By.xpath(pageErrorLocator));
    console.log(`The current URL is ${currentUrl}`);
    // Assert that the current URL matches the expected one
    try {
        let contentBlocked = false;
        if (expectedUrl === blockedPageUrl) {
            if (blockedPageUrl.test(currentUrl) || allErrors.length > 0) {
                contentBlocked = true;
            }
            assert.ok(contentBlocked, `Expected URL to be blocked, got : ${currentUrl}`);
        } else {
            assert.match(currentUrl, expectedUrl, `Expected URL to contain ${expectedUrl}, got: ${currentUrl}`);
        }
    } finally {
        if (!bypassCode) { // keep the driver going if it needs to
            console.log("Quitting the driver");
            try {
                await driver.quit();
            } catch (error) {
                console.error("Error when quitting driver", error);
                throw error; // Optionally rethrow the error to indicate cleanup issues
            }
        }
    }
};

/**
 * Verifies that each stored url retrived while browsing to multiple urls matches the blocked page url
 * We can confirm multiple urls were blocked by using this function
 * @param driver
 * @param actualUrls
 * @param blockedPageUrl 
 */
export const verifyUrls = async (driver: WebDriver, actualUrls: string[], blockedPageUrl: RegExp): Promise<void> => {
    if (!actualUrls || actualUrls.length === 0) {
        throw new Error("No visited URLs provided.");
    }

    try {
        for (const actualUrl of actualUrls) {
            let contentBlocked = false;
            console.log(`Verifying blocked page for: ${actualUrl}`);

            try {
                if(blockedPageUrl.test(actualUrl) || actualUrl === "error_page") {
                    contentBlocked = true;
                }
                assert.ok(contentBlocked, `Expected URL to be blocked, got : ${actualUrl}`)
            } catch (error) {
                console.error(`Verification failed for URL: ${actualUrl}`, error);
                throw error; // Ensure test fails but driver still quits in `finally`
            }
        }
    } finally {
        // Ensuring the driver quits no matter what happens
        console.log("Quitting the driver after verification");
        try {
            await driver.quit();
        } catch (error) {
            console.error("Error when quitting driver", error);
        }
    }
};


/**
 * Verifies that the current URL does not match the blocked URL pattern
 * @param driver WebDriver instance
 * @param expectedBlockedUrl RegExp of the blocked URL pattern
 */
export const verifyUrlIsNotBlocked = async (driver: WebDriver, expectedBlockedUrl: RegExp): Promise<void> => {
    await waitForAnimation();
    const currentUrl = await driver.getCurrentUrl();
    const pageErrorLocator = `//*[text()="ERR_SOCKET_NOT_CONNECTED"]`
    const allErrors = await driver.findElements(By.xpath(pageErrorLocator));
    let contentBlocked = false;

    try {
        console.log(`Verifying that ${currentUrl} is not blocked`);
        if(expectedBlockedUrl.test(currentUrl) || allErrors.length > 0) {
            contentBlocked = true;
        }
        assert.ok(!contentBlocked, `Expected url not to be blocked: ${currentUrl}`);
        console.log(`URL is not blocked: ${currentUrl}`);
    }
    catch(error) {
        console.log(`error checking url not blocked: ${error}`);
        throw error;
    } finally {
        console.log("Quitting the driver");
        try {
            await driver.quit();
        } catch (error) {
            console.error("Error when quitting driver", error);
            throw error;
        }
    }
};

/**
 * Verifies that none of the provided URLs are blocked.
 * @param driver WebDriver instance
 * @param actualUrls An array of visited URLs to check
 * @param blockedPageUrl RegExp of the blocked URL pattern
 */
export const verifyUrlsAreNotBlocked = async (driver: WebDriver, actualUrls: string[], expectedBlockedUrl: RegExp): Promise<void> => {
    if (!actualUrls || actualUrls.length === 0) {
        throw new Error("No visited URLs provided.");
    }

    try {
        for (const actualUrl of actualUrls) {
            console.log(`Verifying that URL is not blocked: ${actualUrl}`);
            try {
                let contentBlocked = false;
                if(expectedBlockedUrl.test(actualUrl) || actualUrl === "error_page") {
                    contentBlocked = true;
                }
                assert.ok(!contentBlocked, `Expected url not to be blocked: ${actualUrl}`);
               
            } catch (error) {
                console.error(`Verification failed for URL: ${actualUrl}`, error);
                throw error;
            }
        }
    } finally {
        try {
            await driver.quit();
        } catch (error) {
            console.error("Error when quitting driver", error);
        }
    }
};


/**
 * Verifies the status of Google SafeSearch. It checks for the presence of the SafeSearch banner 
 * and the "Filter" option being selected when SafeSearch is expected to be active. It also 
 * validates the first 5 search result links to ensure they do not contain any forbidden domains 
 * (e.g., "pornhub.com"). When SafeSearch is not expected to be active, it verifies the 
 * SafeSearch banner is not displayed and the "Filter" option is not selected.
 *
 * @param {WebDriver} driver - The WebDriver instance used for interacting with the browser.
 * @param {boolean} active - Indicates whether SafeSearch is expected to be active (`true`) or inactive (`false`).
 * @throws {Error} - Throws an error if any verification step fails or an unexpected result is found.
 */
export const assertGoogleSafeSearch = async (driver: WebDriver, active: boolean) => {
    const currentUrl = await driver.getCurrentUrl();
    // make sure before running the assert that the driver is on a search page
    if (currentUrl.includes("google.com/search?q=")) {
        try {
            const isEnforced = active ? "enforced" : "unenforced";
            console.log(`Safe search is expected to be ${isEnforced}, running assertions`);
                
                try {
                    const resultLinks = await driver.findElements(By.css("a[href^='http']"));
                    const forbiddenDomain = "pornhub.com";
                    let isForbiddenFound = false;
                    let validLinkCount = 0;
            
                    console.log("Checking first 5 valid links:");
                    for (let i = 0; i < resultLinks.length && validLinkCount < 5; i++) {
                        const linkElement = resultLinks[i];
                        const href = await linkElement.getAttribute("href");
            
                        // Skip google.com and other non-search result links
                        // There's a lot of these and they seem to be background links?
                        if (href && href.includes("google.com")) {
                            console.log(`Skipping Google-related link: ${href}`);
                            continue;
                        }
            
                        console.log(`Checking link: ${href}`);
                        if (href && href.includes(forbiddenDomain)) {
                            isForbiddenFound = true;
                            console.error(`Inappropriate result found: ${href}`);
                            break;
                        }
            
                        validLinkCount++;
                    }

                    if (active) {
                        // Assert that forbidden domains are not found when SafeSearch is enforced
                        assert.strictEqual(
                            isForbiddenFound,
                            false,
                            `"${forbiddenDomain}" was found in the search results.`
                        );
                        console.log("No inappropriate results found. SafeSearch is working.");
                    } else {
                        // Assert that forbidden domains are found when SafeSearch is not enforced
                        assert.strictEqual(
                            isForbiddenFound,
                            true,
                            `"${forbiddenDomain}" was not found in the search results when SafeSearch is not enforced.`
                        );
                        console.log(`Forbidden domain "${forbiddenDomain}" was found as expected.`);
                    }

                } catch (error) {
                    console.error("Error verifying search results:", error);
                    throw new Error("Search results verification failed.");
                }
        
        } finally {
            console.log("Quitting the driver");
            try {
                await driver.quit();
            } catch (error) {
                console.error("Error when quitting driver", error);
                throw error;
            }
        }
    } else {
        throw new Error(`Unable to assert google search as the current url is unexpected: ${currentUrl}`);
    }
};

/**
 * Verifies that Bing's SafeSearch is working by ensuring that the SafeSearch message is displayed,
 * which indicates that the search results are being filtered to exclude adult content. 
 * The function checks for the presence of a specific message displayed by Bing when SafeSearch is enabled:
 * 
 * "Your current Bing SafeSearch setting filters out results that might return adult content. 
 * To view those results as well, change your SafeSearch setting."
 * 
 * @param {WebDriver} driver - The WebDriver instance used for interacting with the browser.
 * @throws {Error} - Throws an error if the SafeSearch message is not displayed or any error occurs during the process.
 */

export const assertBingSafeSearch = async (driver: WebDriver, active: boolean): Promise<void> => {
    const currentUrl = await driver.getCurrentUrl();
    // make sure before running the assert that the driver is on a search page
    if (currentUrl.includes("bing.com/search?q=")) {
        try {
            const isEnforced = active ? "enforced" : "unenforced";
            console.log(`Safe search is expected to be ${isEnforced}, running assertions`);
            const safeSearchMessage = await driver.findElements(By.xpath(`//div[text()="Your current Bing SafeSearch setting filters out results that might return adult content. To view those results as well, change your SafeSearch setting. "]`));
            
            if (active) {
                assert.ok(safeSearchMessage.length > 0, "Safe search message is not displayed when it should be.");
                console.log("SafeSearch message is correctly displayed");
            } else {
                assert.ok(safeSearchMessage.length == 0, "Safe search message is displayed when it should not be.")
                console.log("SafeSearch message is correctly not displayed");
            }

        } finally {
            console.log("Quitting the driver");
            try {
                await driver.quit();
            } catch (error) {
                console.error("Error when quitting driver", error);
                throw error;
            }
        }
    } else {
        throw new Error(`Unable to assert bing search as the current url is unexpected: ${currentUrl}`);
    }
};

/**
 * This function asserts that YouTube's SafeSearch is functioning correctly.
 * It navigates to a restricted video and verifies that:
 * 1. The SafeSearch message is displayed indicating that some results are hidden.
 * 2. The restricted video is not present in the search results.
 *
 * @param {WebDriver} driver - The Selenium WebDriver instance.
 * @throws {Error} If the SafeSearch message is not displayed or the restricted video is still visible.
 */
export const assertYoutubeSafeSearch = async (driver: WebDriver, active: boolean): Promise<void> => {
    const restrictedVideoPath = "watch?v=LDZX4ooRsWs"; // Anaconda - Nicki Minaj
    const currentUrl = await driver.getCurrentUrl();
    // make sure before running the assert that the driver is on a search page
    if (currentUrl.includes("youtube.com/results?search_query=")) {
        try {
            const isEnforced = active ? "enforced" : "unenforced";
            console.log(`Safe search is expected to be ${isEnforced}, running assertions`);
           
            // Verify that the SafeSearch message is displayed
            const restrictedMessage = await driver.findElements(By.xpath(`//ytd-text-header-renderer[contains(text(), "Some results are hidden because Restricted mode is turned on.")]`));
            
            if (active) {
                assert.ok(restrictedMessage.length > 0, "Safe search message is not displayed when it should be.");
                console.log("SafeSearch message is displayed, now checking video is removed");
                const videoElement = await driver.findElements(By.xpath(`//a[@id="thumbnail" and contains(@href, "${restrictedVideoPath}")]`));
                assert.strictEqual(videoElement.length, 0, `The video ${restrictedVideoPath} is still visible in the search results despite Restricted Mode being enabled`);
                console.log(`The video ${restrictedVideoPath} is not visible in the search results`);
            } else {
                assert.ok(restrictedMessage.length == 0, "Safe search message is displayed when it should not be.")
                console.log("SafeSearch message is correctly not displayed");
            }
        } finally {
            console.log("Quitting the driver");
            try {
                await driver.quit();
            } catch (error) {
                console.error("Error when quitting driver", error);
                throw error;
            }
        }
    } else {
        throw new Error(`Unable to assert youtube search as the current url is unexpected: ${currentUrl}`);
    }   
};

/**
 * Converts a string of URLs (from the test data) into an array of individual URLs.
 * 
 * @param {string | undefined} data - The string of URLs to be converted. Example: "Urls to check: url1.com, url2.com, url3.com, url4.com"
 * @returns {string[]} An array of trimmed URLs. Example: ["url1.com", "url2.com", "url3.com", "url4.com"]
 */
export const urlsArray = (data: string | undefined): string[] => {
    if (!data) return [];

    // Remove the "Urls to check: " part and split the string by commas
    const urlString = data.replace('Urls to check: ', '').trim();
    
    // Split by commas and clean each URL
    return urlString.split(',').map(url => url.trim());
};

/**
 * The parent folder refers to the folder in Zephyr Scale.
 * By default, the value in Zephyr.testCaseFolderName from the config file will be used
 * If a folderName="parent folder name" argument is used to run the tests, this value will be used instead.
 * @returns string
 */
export const getParentFolderName = async (): Promise<string> => {
    const allArguments = process.argv;
    for(const eachArg of allArguments) {
        if(eachArg.includes("folderName=")) {
            const thisFolder: string = eachArg.split("=")[1];
            return thisFolder;
        }
    }
    return config.Zephyr.testCaseFolderName;
};


/**
 * Generates a search URL and performs a search on the specified search engine with the given search term.
 * 
 * This function checks if `testContext.currentTime` is set, cleans the search term (replacing spaces with '+' and removing zero-width spaces), constructs the search URL, and navigates to it.
 * If an error occurs during the search, it logs the error and attempts to quit the WebDriver.
 * 
 * @param driver - The WebDriver instance to navigate to the search URL.
 * @param searchEngine - The search engine to use (e.g., "google", "bing").
 * @param searchTerm - The term to search for.
 * @returns A promise that resolves when the search is complete.
 * @throws Will throw an error if the search fails or there is an issue quitting the driver.
 */

export const generateSearchTerm = async (driver: WebDriver, searchEngine: string, searchTerm: string): Promise<void> => {
    
    // Check if testContext.currentTime is already set
    if (!testContext.currentTime) {
        // Get the current time
        const currentTime = getCurrentTime();

        // Store the current time in the test context for subsequent steps
        testContext.currentTime = currentTime;
    }
    
    const cleanedSearchEngine = searchEngine.toLowerCase().trim();
    
    // if the search term has a space, replace the space with a +
    if (searchTerm.includes(" ")) {
        searchTerm = searchTerm.replace(/ /g, "+");
    }

    // if the search term contains a zero-width space, replace it with an empty string or other character
    // this was causing issues with the expected vs actual assertion and was lilely coming from zephyr, there was a zero width character at the end
    if (searchTerm.includes("\u200B")) {
        searchTerm = searchTerm.replace(/\u200B/g, "");
    }

    const searchEngineUrls: Record<string, string> = {
        "google": "https://www.google.com",
        "bing": "https://bing.com"
    };
    
    try {
        console.log(`Searching for ${searchTerm} on ${searchEngine}`);
        const searchUrl = `${searchEngineUrls[cleanedSearchEngine]}/search?q=${searchTerm}`;
        await browseToUrl(driver, searchUrl);

    } catch (error) {
        console.error(`Error when searching for ${searchTerm} on ${searchEngine}: ${error}`);
        try {
            console.log("Quitting the driver due to an error..."); // only quit the driver if there is an error, as the next step requires the driver
            await driver.quit();
        } catch (error) {
            console.error("Error when quitting driver", error);
        }
        throw error;
    }
};

/**
 * Asserts that a specific search term appears in the current URL on a given search engine.
 * 
 * The function cleans the search term (replaces spaces with '+' and removes zero-width spaces),
 * checks if the current URL contains the search term or its encoded version, and ensures the
 * WebDriver is quit, even if an error occurs.
 * 
 * @param driver - The WebDriver instance to get the current URL.
 * @param searchEngine - The name of the search engine being used.
 * @param searchTerm - The search term to verify in the URL.
 * @returns A promise that resolves when the assertion is complete.
 * @throws Will throw an error if the URL does not contain the search term or if there is an issue quitting the driver.
 */
export const assertSearchTermAccessed = async (driver: WebDriver, searchEngine: string, searchTerm: string): Promise<void> => {

    const cleanedSearchEngine = searchEngine.toLowerCase().trim();

    // if the search term has a space, replace the space with a +
    if (searchTerm.includes(" ")) {
        searchTerm = searchTerm.replace(/ /g, "+");
    }

    // if the search term contains a zero-width space, replace it with an empty string or other character
    // this was causing issues with the expected vs actual assertion and was lilely coming from zephyr, there was a zero width character at the end
    if (searchTerm.includes("\u200B")) {
        searchTerm = searchTerm.replace(/\u200B/g, "");
    }

    try {
        console.log(`Asserting ${searchTerm} was searched for on ${searchEngine}`)
        // assert that the current url is inclusive of the search url
        const encodedSearchTerm = encodeURIComponent(searchTerm);
        const currentUrl = await driver.getCurrentUrl();
        assert.ok(
            currentUrl.includes(searchTerm) || currentUrl.includes(encodedSearchTerm), // encoded search term will be in the bot check url, but still gets reported to SM
            `Expected the current URL to contain either '${searchTerm}' or '${encodedSearchTerm}', but it did not.\nActual: ${currentUrl}`
        );
    } catch (error) {
        console.error(`Error when asserting for ${searchTerm} on ${searchEngine}: ${error}`);
        console.log("Quitting the driver due to an error"); // the driver only really needs to be quit if there is an error
        try {
            await driver.quit();
        } catch (error) {
            console.error("Error when quitting driver", error);
        }
        throw error;
    }
};

/**
 * Returns the current time in 12-hour format with AM/PM, suitable for the time configurator in SM
 */
export const getCurrentTime = (): timeFormat => {
    const now = new Date();

    let hours = now.getHours(); // 0-23 format
    const minutes = now.getMinutes();
    const isPM = hours >= 12;

    // Convert to 12-hour format
    if (hours === 0) {
        hours = 12; // Midnight should be 12 AM
    } else if (hours > 12) {
        hours -= 12; // Convert 24-hour to 12-hour
    }

    // Ensure minutes always have two digits
    const formattedMinutes = minutes.toString().padStart(2, "0");

    const formattedHours = hours.toString();

    // Get the period (AM/PM)
    const period = isPM ? "PM" : "AM";

    // Log the current time
    console.log(`Current time is ${hours}:${formattedMinutes} ${period}`);
    return {
        hours: formattedHours,
        minutes: formattedMinutes,
        period
    };
};

/**
 * Returns the current time along with its ±N minute variants in 24-hour HH:MM format.
 * @param variantMinutes - The number of minutes to offset before and after the current time (default is 1).
 * @returns An object containing: current time, current time minus variantMinutes, current time plus variantMinutes 
 */
export const getCurrentTimeVariants = (variantMinutes: number = 2): {current:string, minus: string, plus: string}=> {
    const getFormattedTime = (date: Date): string => {
         const hours = date.getHours().toString().padStart(2, "0");
         const mins = date.getMinutes().toString().padStart(2, "0");
         return `${hours}${mins}`
     }
 
     const now = new Date();
     const currentTime = getFormattedTime(now);
 
     const minus = new Date(now.getTime() - variantMinutes*60*1000);
     const plus = new Date(now.getTime() + variantMinutes*60*1000);
     const minusTime = getFormattedTime(minus);
     const plusTime = getFormattedTime(plus);
 
     return {current:currentTime, minus:minusTime, plus:plusTime}
 };

/**
 *  Performs a drag-and-drop operation to move a policy row above another in the policy list.
 * This simulates a real user action to reorder policies in the UI.
 * @param policy1 - The target policy name
 * @param policy2 - The policy being dragged and moved above `policy1`.
 * @param driver 
 */
export const dragAndDrop = async (policy1: string, policy2: string, driver: WebDriver): Promise<void> => {

    await driver.wait(until.elementLocated(By.xpath("//p[@role='heading' and text()='Content Filtering']")));
    await driver.wait(until.elementLocated(By.xpath("//iframe[@title='Resource center']")));

    const row1Locator = By.xpath(`//p[text()='${policy1}']`);
    const row2Locator = By.xpath(`//p[text()='${policy2}']`); 

    const row1 = await driver.wait(until.elementLocated(row1Locator));
    const row2 = await driver.wait(until.elementLocated(row2Locator));

    const actions = driver.actions({async: true});
    
    await actions.move({origin: row2}).perform();
    await actions.press().perform();
    await actions.move({origin: row1}).perform();
    await actions.release().perform();
};

/**
 * Determines if a video should be generated during the before step.
 * This function will view youtube videos if a folder id in the configured folder for running tests,
 * includes the folder is of the youtube video test cases
 * 
 * @param allFolderIds - The folder ids for all the test folders that will be run
 * @returns Boolean (true) value if this function has been required to run, else false
 */
export const generateYoutubeData = async (allFolderIds: number[]): Promise<boolean> => {

    try {
        let windows10IdsArray: number[] = [];
        let windows11IdsArray: number[] = [];
        let browserExtensionMV3IdsArray: number[] = [];
        let browserExtensionMV3OnNetworkIdsArray: number[] = [];

        let youtubeDataGenerated: boolean = false;

         // if preload folder is in array, preload
         const windows10Folders = config.Zephyr.preloadDataFolders["windows10Agent"];
         const windows11Folders = config.Zephyr.preloadDataFolders["windows11Agent"];
         const browserExtensionMV3Folders = config.Zephyr.preloadDataFolders["browserExtensionMV3"];
         const browserExtensionMV3OnNetworkFolders = config.Zephyr.preloadDataFolders["browserExtensionMV3OnNetwork"];

        // get the folder ids for the data generation folders
        for (const windows10Folder of windows10Folders) {
            const preloadIds = await getZephyrTestCaseFolders(windows10Folder);
            if (preloadIds) {
                windows10IdsArray.push(preloadIds);
            }
        }

        for (const windows11Folder of windows11Folders) {
            const preloadIds = await getZephyrTestCaseFolders(windows11Folder);
            if (preloadIds) {
                windows11IdsArray.push(preloadIds);
            }
        }

        for (const browserExtensionMV3Folder of browserExtensionMV3Folders) {
            const preloadIds = await getZephyrTestCaseFolders(browserExtensionMV3Folder);
            if (preloadIds) {
                browserExtensionMV3IdsArray.push(preloadIds);
            }
        }

        for (const browserExtensionMV3OnNetworkFolder of browserExtensionMV3OnNetworkFolders) {
            const preloadIds = await getZephyrTestCaseFolders(browserExtensionMV3OnNetworkFolder);
            if (preloadIds) {
                browserExtensionMV3OnNetworkIdsArray.push(preloadIds);
            }
        }

         // find which of the folder ids are also included in the allFolderIds array
         const intersectionWindows10 = windows10IdsArray.filter(id => allFolderIds.includes(id));
         const intersectionWindows11 = windows11IdsArray.filter(id => allFolderIds.includes(id));
         const intersectionBrowseExtensionMV3 = browserExtensionMV3IdsArray.filter(id => allFolderIds.includes(id));
         const intersectionBrowseExtensionMV3OnNetwork = browserExtensionMV3OnNetworkIdsArray.filter(id => allFolderIds.includes(id));

        // if there is a cross section, run the functions to generate the data
        // these if statements are where the storedUnixTime is determined, which will be overwritten if multiple agents are generating data
        // this is wanted behaviour - we want to wait at least 5 minutes from the time the last set of data is generated, to give the agents
        // and backend systems are sufficient amount of time to send the report and be received by the SM front-end
        // there is a calculation later where the difference between the storedUnixTime and the current time, if that difference is more than 5 minutes,
        // the test will wait until that 5 minutes has elapsed

        let hasTimeBeenSet: boolean = false;

        if (intersectionBrowseExtensionMV3.length > 0) {
            youtubeDataGenerated = true;
            console.log("The test folders to be run were found to contain the youtube tests for browser extension mv3")
            console.log(`Browser Extension MV3 IDs array: `, browserExtensionMV3IdsArray);
            console.log(`All Folder Ids: `, allFolderIds);
            console.log(`Intersection between the arrays: `, intersectionBrowseExtensionMV3);
            const url = "youtube.com/watch?v=uAkk3g4_C48"; // from zephyr scale
            studentDriverMV3 = await getStudentDriver("browser extension mv3");

            // we only want this time to be set from the time the first video is watched
            // to account for multiple video tests, only set it if it has not been set prevously using the boolean flag
            // otherwise, if the time set is after when the video was watched, it may not be found due to filtering out the video due to the timestamp      
            if (!hasTimeBeenSet) { 
                testContext.videoGenerationTime = getCurrentTime();
                hasTimeBeenSet = true;
            }
            await browseToVideo(studentDriverMV3, url);
            storedUnixTime = Date.now(); // set the current unix time (fine to overwrite)

        }

        if (intersectionBrowseExtensionMV3OnNetwork.length > 0) {
            youtubeDataGenerated = true;
            console.log("The test folders to be run were found to contain the youtube tests for browser extension mv3 on network")
            console.log(`Browser Extension MV3 On NetworkIDs array: `, browserExtensionMV3IdsArray);
            console.log(`All Folder Ids: `, allFolderIds);
            console.log(`Intersection between the arrays: `, intersectionBrowseExtensionMV3);
            const url = "youtube.com/watch?v=x12R44v98JM"; // from zephyr scale
            studentDriverMV3OnNetwork = await getStudentDriver("browser extension mv3 on network");

            // we only want this time to be set from the time the first video is watched
            // to account for multiple video tests, only set it if it has not been set prevously using the boolean flag
            // otherwise, if the time set is after when the video was watched, it may not be found due to filtering out the video due to the timestamp          
            if (!hasTimeBeenSet) { 
                testContext.videoGenerationTime = getCurrentTime();
                hasTimeBeenSet = true;
            }
            await browseToVideo(studentDriverMV3OnNetwork, url);
            storedUnixTime = Date.now(); // set the current unix time (fine to overwrite)

        }

        if (intersectionWindows10.length > 0) {
            youtubeDataGenerated = true;
            console.log("The test folders to be run were found to contain the youtube tests for windows 10 agent")
            console.log(`Windows 10 Agent IDs array: `, windows10IdsArray);
            console.log(`All Folder Ids: `, allFolderIds);
            console.log(`Intersection between the arrays: `, intersectionWindows10);

            // confirm MITM is active first
            console.log(`Confirming MITM is active...`);
            const driver = await getAdminDriver();
            await driver.get(`${schoolManagerUrl}/config/device/mobileagentconfiguration`);
            await smSteps.clickMitmEnabledCheckbox(driver);
            await smSteps.assertMitmCheckboxEnabled(driver);

            const url = "youtube.com/watch?v=N8gnau37i7w"; // from zephyr scale
            studentDriverW10 = await getStudentDriver("windows 10 agent");

            // we only want this time to be set from the time the first video is watched
            // to account for multiple video tests, only set it if it has not been set prevously using the boolean flag
            // otherwise, if the time set is after when the video was watched, it may not be found due to filtering out the video due to the timestamp      
            if (!hasTimeBeenSet) { 
                testContext.videoGenerationTime = getCurrentTime();
                hasTimeBeenSet = true;
            }

            await browseToVideo(studentDriverW10, url);

            storedUnixTime = Date.now() // set the current unix time (fine to overwrite)
        }

        if (intersectionWindows11.length > 0) {
            youtubeDataGenerated = true;
            console.log("The test folders to be run were found to contain the youtube tests for windows 11 agent")
            console.log(`Windoes 11 Agent IDs array: `, windows11IdsArray);
            console.log(`All Folder Ids: `, allFolderIds);
            console.log(`Intersection between the arrays: `, intersectionWindows11);

            // confirm MITM is active first
            console.log(`Confirming MITM is active...`);
            const driver = await getAdminDriver();
            await driver.get(`${schoolManagerUrl}/config/device/mobileagentconfiguration`);
            await smSteps.clickMitmEnabledCheckbox(driver);
            await smSteps.assertMitmCheckboxEnabled(driver);

            // browse to the video
            const url = "youtube.com/watch?v=f9Ao0b1YAMY"; // from zephyr scale
            studentDriverW11 = await getStudentDriver("windows 11 agent");

            // we only want this time to be set from the time the first video is watched
            // to account for multiple video tests, only set it if it has not been set prevously using the boolean flag
            if (!hasTimeBeenSet) { 
                testContext.videoGenerationTime = getCurrentTime();
                hasTimeBeenSet = true;
            }

            await browseToVideo(studentDriverW11, url);
            storedUnixTime = Date.now() // set the current unix time (fine to overwrite)
        }

        return youtubeDataGenerated;


    } catch (error) {
        console.error(`Error occurred when trying to generate youtube data: ${error}`);

        // quit drivers if there is an error
        if (studentDriverMV3 != undefined) {
            console.log(`The Student MV3 driver was being used for data generation, closing...`);
            await studentDriverMV3.quit();
        }

        if (studentDriverMV3OnNetwork != undefined) {
            console.log(`The Student MV3 driver was being used for data generation, closing...`);
            await studentDriverMV3OnNetwork.quit();
        }

        if (studentDriverW10 != undefined) {
            console.log(`The Student W10 driver was being used for data generation, closing...`);
            await studentDriverW10.quit();
        }
        
        if (studentDriverW11 != undefined) {
            console.log(`The Student W11 driver was being used for data generation, closing...`);
            await studentDriverW11.quit();
        }

        throw error;
    }
}

/**
 * Uses time calculations to determine how long to wait for a youtube video to be watched
 * Quits drivers after reaching this period of time
 */
export const waitForDataToGenerate = async () => {
    try {
        
        const currentUnixTime = Date.now();
        const maxWaitTime: number = 300000
        const timeDifference = currentUnixTime - storedUnixTime;

        if (timeDifference < maxWaitTime) {
            console.log(`It hasn't been ${maxWaitTime / 60000} minutes since the last set of data was generated`);
            const timeLeft = maxWaitTime - timeDifference;
            console.log(`Waiting for another ${timeLeft/1000} seconds`);
            await new Promise(resolve => setTimeout(resolve, timeLeft));
            console.log(`It has now been ${maxWaitTime / 60000} minutes since data generation, proceeding...`)
        } else {
            console.log(`It has been ${timeDifference/1000} seconds since starting data generation, proceeding...`)
        }

         // then quit the drivers if they were being used for data
        if (studentDriverMV3 != undefined) {
            console.log(`The Student MV3 driver was being used for data generation, closing...`);
            await studentDriverMV3.quit();
        }
        if (studentDriverW10 != undefined) {
            console.log(`The Student W10 driver was being used for data generation, closing...`);
            await studentDriverW10.quit();
        }
        
        if (studentDriverW11 != undefined) {
            console.log(`The Student W11 driver was being used for data generation, closing...`);
            await studentDriverW11.quit();
        }
    } catch (error) {
        console.error(`Error occurred when trying to wait for data to generate: ${error}`);
        throw error;
    }
};

/**
 * Asserts that the YouTube Shorts content mod is working by verifying that the injected styles prevent a YouTube Short from loading.
 * This function checks for the presence of the shorts container and shorts inner container elements, and verifies that 2 out of 3 have the "display: none" css value.
 * @param driver - The WebDriver instance used for interacting with the browser.
 */
export const assertYoutubeShortContentMod = async (driver: WebDriver): Promise<void> => {
    try {
        console.log("Asserting YouTube Shorts content mod prevents a YouTube Short from loading by verifying injected styles");

        // Wait for the URL to no longer include "?random=", which comes from the browseToUrl function
        await driver.wait(async () => {
            const currentUrl = await driver.getCurrentUrl();
            return !currentUrl.includes("?random=");
        }, 
        waitTime, 
        "Redirect to a YouTube Short did not happen within the wait time.");

        // Wait for the YouTube Shorts video player to be present
        const videoPlayerLocator = By.id("ytd-player");
        await driver.wait(
            until.elementLocated(videoPlayerLocator),
            waitTime,
            "The YouTube Shorts video player element was not found within the wait time."
        );

        const shortsContainerLocator = By.css("#shorts-container");
        const shortsInnerContainerLocator = By.css("#shorts-inner-container");

        await driver.wait(
            until.elementLocated(shortsContainerLocator),
            waitTime,
            "Did not find the shorts container element within wait time"
        );

        await driver.wait(
            until.elementLocated(shortsInnerContainerLocator),
            waitTime,
            "Did not find the shorts inner container element within wait time"
        );

        console.log("Page has redirected, checking elements");
       
        // Find <style> elements that contain "display: none" for #shorts-container
        const stylesWithShortsHidden = await driver.executeScript(() => {
            const styles = Array.from(document.querySelectorAll("style"));
            return styles
                .map((style) => style.innerHTML.trim())
                .filter((cssText) => cssText.includes("#shorts-container") && cssText.includes("display: none"));
        }) as string[];

        console.log(`Found ${stylesWithShortsHidden.length} <style> elements that hide #shorts-container`);

        stylesWithShortsHidden.forEach((cssText, index) => {
            console.log(`Style ${index + 1}:`, cssText);
        });

        // Assert that exactly 2 <style> elements hide the shorts container
        assert.ok(
            stylesWithShortsHidden.length === 2,
            `Expected 2 <style> elements hiding #shorts-container, found ${stylesWithShortsHidden.length}`
        );

        // Find <style> elements that contain "display: none" for #shorts-inner-container
        const stylesWithInnerShortsHidden = await driver.executeScript(() => {
            const styles = Array.from(document.querySelectorAll("style"));
            return styles
                .map((style) => style.innerHTML.trim())
                .filter((cssText) => cssText.includes("#shorts-inner-container") && cssText.includes("display: none"));
        }) as string[];

        console.log(`Found ${stylesWithInnerShortsHidden.length} <style> elements that hide #shorts-inner-container`);

        stylesWithInnerShortsHidden.forEach((cssText, index) => {
            console.log(`Style ${index + 1}:`, cssText);
        });

        // Assert that exactly 2 <style> elements hide the shorts inner container
        assert.ok(
            stylesWithShortsHidden.length === 2,
            `Expected 2 <style> elements hiding #shorts-container, found ${stylesWithShortsHidden.length}`
        );

    } catch (error) {
        console.error(`Error occurred while asserting YouTube Shorts content mod: ${error}`);
        throw error;
    } finally {
        await driver.quit();
    }
};

/**
 * Enters a bypass code on a blocked page to unblock access.
 *
 * This function interacts with a web page to reveal the bypass code input field,
 * enters the bypass code from the test context, and clicks the unblock button.
 *
 * @param driver - The WebDriver instance used to interact with the web page.
 * @returns A promise that resolves when the bypass code is successfully entered and the unblock button is clicked.
 * @throws Will throw an error if any of the required elements (e.g., "See Why It's Blocked" button, bypass code input field, or unblock button)
 *         are not found within the specified wait time, or if the bypass code is not set in the test context.
 */
export const enterBypassCodeOnBlockedPage = async (driver: WebDriver): Promise<void> => {

    try {

        // click the See Why it's blocked button to reveal bypass code field
        const seeWhyItsBlockedBtn = await driver.wait(
            until.elementLocated(blockedPagePage.seeWhyItsBlockedBtn()),
            waitTime,
            "See Why It's Blocked button not found within wait time"
        );

        await seeWhyItsBlockedBtn.click();

        const bypassCodeInputField = await driver.wait(
            until.elementLocated(blockedPagePage.bypassCodeInputField()),
            waitTime,
            "Bypass code input field not found within wait time"
        );
        await bypassCodeInputField.click();

        const bypassCode = testContext.bypassCodeValue;

        if (!bypassCode) {
            throw new Error("Bypass code is not set in the test context.");
        }

        console.log(`Entering bypass code: ${bypassCode} on blocked page`);
        await bypassCodeInputField.sendKeys(bypassCode);
        console.log("Bypass code entered successfully");

        const unblockBtn = await driver.wait(
            until.elementLocated(blockedPagePage.unblockBtn()),
            waitTime,
            "Unblock button not found within wait time"
        );

        await unblockBtn.click();
    } catch (error) {
        console.error(`Error occurred while entering bypass code on blocked page: ${error}`);
        throw error;
    }

};

/**
 * Confirms the success message displays on the page
 * @param driver 
 * @param website 
 */
export const assertBypassCodeSuccess = async (driver: WebDriver): Promise<void> => {

    try {
        // wait until success message
        console.log("Confirming the success message is shown");
        const success = await driver.wait(
            until.elementLocated(blockedPagePage.success()),
            waitTime,
            "Expected to see the success message within the wait time"
        );
        console.log("Success message found!");
        
        // allow time for the animation to finish
        await waitForAnimation(2000);

        // Wait until the success message is no longer present
        console.log("Waiting for the success message to disappear");
        await driver.wait(
            until.stalenessOf(success),
            waitTime,
            "Expected the success message to disappear within the wait time"
        );
        console.log("Success message has disappeared!");        
   
    } catch (error) {
        console.error(`Error occurred while asserting bypass code allowed access: ${error}`);
        throw error;
    }

};

/**
 * Interacts with the provided By object (locator) for an input element
 * If a "value" is provided, it will be entered
 * If "submit" is provided as TRUE, the Enter key will be pressed to submit the provided value
 * @param locator 
 * @param value 
 * @param submit 
 */
export const inputField = async (driver: WebDriver, locator: By, value?: string, submit?: boolean): Promise<void> => {
    const inputElement = await driver.wait(until.elementLocated(locator), waitTime);
    await driver.wait(until.elementIsVisible(inputElement), waitTime);
    await driver.wait(until.elementIsEnabled(inputElement), waitTime);
    await driver.executeScript("arguments[0].click();", inputElement);
    if (value) {
        await inputElement.sendKeys(value); // only enter a value if there is one to enter
        if (submit === true) {
            await inputElement.sendKeys(Key.ENTER); // only submit if submit is true
        }
    }
};