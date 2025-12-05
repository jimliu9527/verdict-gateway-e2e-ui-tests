import { By, WebDriver} from "selenium-webdriver";
import config from "../config/config.json"
import * as smSteps from "./smSteps";
import * as enrollmentSteps from "./enrollmentSteps";
import * as utils from "./utils";
import * as credentials from "../config/credentials.json";
import MD5 from "crypto-js/md5";
import * as fs from "fs";
import * as path from "path";
import { Modal_AddObjectPool } from "../pageObjects/SchoolManager/Configuration/Objects/modal_addObjectPool";
import { Modal_CreateNewEntry } from "../pageObjects/SchoolManager/Configuration/Objects/modal_createNewEntry";
import { Modal_CategorySearch } from "../pageObjects/SchoolManager/ContentFiltering/modal_categorySearch";
import { Modal_TestPolicy } from "../pageObjects/SchoolManager/ContentFiltering/modal_testPolicy";
import { Modal_CreatePolicyContentMod } from "../pageObjects/SchoolManager/ContentModification/modal_createPolicyContentMod";
import { testContext } from "./utils";

type RegexHandler = {
    regex: RegExp;
    handler: (testCaseKey: string, testData: any) => (...args: string[]) => Promise<void>;
};

type envconfig = keyof typeof config.schoolManager;
type envcredentials = keyof typeof credentials.env;

let env: string = process.env.AGENT_ENV as string;
if(!env || !(env in config.schoolManager)|| !(env in credentials.env))  env = "stg";

const schoolManagerUrl = config.schoolManager[env as envconfig].url;
const blockedPageUrl = new RegExp(config.schoolManager[env as envconfig].blockedPage);
let studentDriver: WebDriver;
let otherStudentDriver: WebDriver;
let otherStudentDriverActive: Boolean = false;
const addObjectPoolModal = new Modal_AddObjectPool();
const categorySearchModal = new Modal_CategorySearch();
const testPolicyModal = new Modal_TestPolicy();
const createNewEntryModal = new Modal_CreateNewEntry();
const createPolicyModalContentMod = new Modal_CreatePolicyContentMod();
const unixTimestampInSeconds: string = Math.floor(Date.now() / 1000).toString();
let currentTime: string;
let plusTime: string;
let minusTime: string;

const students: Record<string, { studentName: string; webdriver?: WebDriver }> = {
    "browser extension mv3": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwBrowserExtensionMV3User,
    },
    "browser extension mv3 other": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwBrowserExtensionMV3OtherUser,
    },
    "browser extension mv3 on network": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwBrowserExtensionMV3User,
    },
    "browser extension mv3 other on network": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwBrowserExtensionMV3OtherUser,
    },
    "windows 10 agent": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwWindows10AgentUser,
    },
    "windows 11 agent": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwWindows11AgentUser,
    },
    "windows 10 agent enrollment": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwWindows10AgentEnrollUser,
    },
    "windows 11 agent enrollment": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwWindows11AgentEnrollUser,
    },
    "windows 11 agent logs": {
        studentName: credentials.env[env as envcredentials].schoolManager.lwWindows11AgentLogs
    }
};

/**
 * Returns the appropriate WebDriver for the given agent name
 * If no webdriver is currently active, a new webdriver will be created and returned
 * @param agent 
 * @returns WebDriver
 */
export const getStudentDriver = async (agent: string): Promise<WebDriver> => {
    const agentKey = agent.toLowerCase().replace(/\u200B/g, '').trim(); // sometimes there's a zero width space char

    if (!students[agentKey]) {
        throw new Error(`Student not specified for agent type: ${agent}`);
    }

    if (!students[agentKey].webdriver) {
        console.log(`Initializing WebDriver for ${agent}`);
        students[agentKey].webdriver = await utils.buildStudentDriver(agentKey);
    } else {
        // Check if the WebDriver is still valid (not quit)
        try {
            await students[agentKey].webdriver.getCurrentUrl();  // Attempt to get the current URL to check if it's still functional
            console.log(`Reusing existing WebDriver for ${agent}`);
        } catch (error) {
            // If the WebDriver is not functional (e.g., already quit), reinitialize it
            console.log(`WebDriver for ${agent} is no longer valid, reinitializing`);
            students[agentKey].webdriver = await utils.buildStudentDriver(agentKey);
        }
    }

    return students[agentKey].webdriver as WebDriver;
};

export const getAdminDriver = async () => {
    if (!testContext.driver || !(await testContext.driver.getSession().catch(() => null))) {
        console.log("Creating new driver for IT Admin");
        testContext.driver = await utils.buildDriverForITAdmin();
    }
    return testContext.driver;
};

/**
 * Accepts the agent text from the test steps and returns the appropriate WebDriver that matches
 * @param agent 
 * @returns WebDriver
 */
const getEnrollmentDriverForAgent = async (agent: string): Promise<WebDriver> => {
    const cleanedAgent = agent.toLowerCase().trim();
    switch (cleanedAgent) {
        case "windows 10 agent":
            return await getStudentDriver("windows 10 agent enrollment");
        case "windows 11 agent":
            return await getStudentDriver("windows 11 agent enrollment");
        // future cases for macos agent installation
        default:
            throw new Error(`Unexpected agent value detected for enrollment: ${agent}`);
    }
};

// Library of possible regexes for test steps
export const stepPatterns: RegexHandler[] = [
    {
        regex: /In School Manager, under (.*), click (.*)\.?/,
        handler: (testCaseKey, testData) => async (navigationPath: string, buttonName: string) => {
            console.log(`use path: ${navigationPath} to click on the ${buttonName} button`);
            
            const driver = await getAdminDriver();

            const normalisedNavigationPath = navigationPath.toLowerCase().trim();
            const normalisedButtonName = buttonName.toLowerCase().trim();
            // switch statements for the various navigation paths
            switch (normalisedNavigationPath) {
                case "configuration / objects":
                    await smSteps.navigateToObjectsPage(driver);
                    // switch statements for the things that can be clicked
                    switch (normalisedButtonName) {
                        case "add new pool":
                            await smSteps.clickAddNewPool(driver);
                            break;
                        default:
                            throw new Error(`Invalid button to click: ${normalisedButtonName}`);
                    }
                    break;
                case "cyber safety":
                    await smSteps.navigateToPageInSchoolManager(driver, "cybersafety/search");
                    break;
                case "filtering / content filtering":
                    await driver.get(`${schoolManagerUrl}/filtering/policies`);
                    if (buttonName === "Category Search") {
                        await smSteps.clickCategorySearchBtn(driver, buttonName);
                    } else if (buttonName === "Test Policy") {
                        await smSteps.clickTestPolicyBtn(driver, buttonName);
                    }
                    break;
                case "statistics":
                    await smSteps.navigateToPageInSchoolManager(driver, "surfwize/dashboard");
                    break;
                default:
                    throw new Error(`Invalid navigation path: ${normalisedNavigationPath}`);
            }   
        }
    },
    {
        regex: /(.*) (?:Modal|modal) opens, with (?:a field|fields) for (.*)\.?/,
        handler: (testCaseKey, testData) => async (modalName) => {

            console.log(`${modalName} modal opens`);

            const driver = await getAdminDriver();

            const modalNameNormalised = modalName.toLowerCase().trim();
            switch (modalNameNormalised) {
                case "add object pool":
                    await smSteps.assertAddObjectPoolModal(driver);
                    break;
                case "create new entry":
                    await smSteps.assertCreateNewEntryModal(driver);
                    break;
                case "add category search":
                    await smSteps.assertCategorySearchModalOpen(driver);
                    break;
                case "add test policy":
                    await smSteps.assertTestPolicyModalOpen(driver);
                    break;
                // content mods
                case "create policy":
                    await smSteps.assertCreatePolicyModalOpen(driver);
                    break;
                // bypass code
                case "add code":
                    await smSteps.assertAddCodeModalOpen(driver);
                    break;
                default:
                    throw new Error(`Unknown modal detected: ${modalNameNormalised}`);
            }
        }
    },
    {
        regex: /In School Manager, under (.*), enable the (.*) checkbox\.?/,
        handler: (testCaseKey, testData) => async (navigationPath: string, checkboxName: string) => {
            console.log(`use path: ${navigationPath} to click on the ${checkboxName} checkBox`);
            const driver = await getAdminDriver();

            if (navigationPath === "Configuration / Mobile Agent") {
                driver.get(`${schoolManagerUrl}/config/device/mobileagentconfiguration`)
            }
            await smSteps.clickMitmEnabledCheckbox(driver);
        }
    },
    {
        regex: /(.*) checkbox displays a 'tick' to show it is enabled\.?/,
        handler: (testCaseKey, testData) => async (checkboxName: string) => {
            
            // MITM enabled checkbox on the mobile agent config page
            if (checkboxName === "MITM Enabled") {
            console.log("MITM Enabled checkbox displays a 'tick' to show it is enabled.");
            const driver = await getAdminDriver();
            await smSteps.assertMitmCheckboxEnabled(driver);
            
            // safe search options on the mobile agent config page
            } else if (checkboxName.includes("Safe Search")) {
                const isOnNetwork = testData["agent"].toLowerCase().includes("on network");
                console.log(`The ${checkboxName} checkbox for ${isOnNetwork ? "on" : "off"} network displays a 'tick' to show it is enabled`);
                const driver = await getAdminDriver();
                await smSteps.assertSafeSearchCheckboxEnabled(driver, checkboxName, isOnNetwork);
            
            } else {
                console.error(`Unknown checkbox name: ${checkboxName}`);
                throw new Error;
            }
        }
    }, 
    {
        regex: /In School Manager, under (.*), add (.*) to be inspected by MITM\.?/,
        handler: (testCaseKey, testData) => async (navigationPath: string, itemToAdd: string) => {
            console.log(`use path: ${navigationPath} add item ${itemToAdd}`);
            const driver = await getAdminDriver();
            await smSteps.addInspectedItem(driver, itemToAdd);
        }
    },
    {
        regex: /(.*) is added as option to the inspected list\.?/,
        handler: (testCaseKey, testData) => async (signature) => {
            console.log(`${signature} is added as option to the inspected list`);
            const driver = await getAdminDriver();

            // The signature can come through as "Signature YouTube" or just "YouTube"
            // This ensures we are just looking at the "YouTube" part
            let inspectedSignature = signature;
            if (signature.includes("Signature")) {
                inspectedSignature = signature.replace("Signature", "").trim();
            };
            console.log(`Checking for presence of: ${inspectedSignature}`);
            await smSteps.assertInspectedItemAdded(driver, inspectedSignature);
        }
    },
    {
        regex: /In the Website field, enter (.*), then select the Search Button\.?/,
        handler: (testCaseKey, testData) => async (websiteName: string) => {
            const driver = await getAdminDriver();
            const normalisedWebsiteName = websiteName.toLowerCase().trim();
            console.log(`Enter ${normalisedWebsiteName} in website field and click search button in Test Policy modal`);
            const fieldLocator = testPolicyModal.websiteInput();
            await smSteps.addTextToInputField(driver, fieldLocator, normalisedWebsiteName);
        }
    },
    {
        regex: /In the (.*) field, enter (.*)\.?/,
        handler: (testCaseKey, testData) => async (fieldName: string, value: string) => {
            console.log(`In the ${fieldName} field, enter ${value}`);
            const driver = await getAdminDriver();
            const normalisedFieldName = fieldName.toLowerCase().trim();
            const trimmedValue = value.trim();
            if (normalisedFieldName === "website") {
                // for category search modal
                const fieldLocator = categorySearchModal.websiteInput();
                await smSteps.addTextToInputField(driver, fieldLocator, trimmedValue);
            } else if (normalisedFieldName === "name" && trimmedValue === "YouTube Short") { // specific to content mod
                await smSteps.enterNameContentMod(driver, trimmedValue, testCaseKey);
            } else {
                try {
                    console.log(`Adding "${trimmedValue}" to "${fieldName}"`);
        
                    // Define a mapping of field names to their locators
                    // Add Object Pool Modal has the same By values as the Add Entry Modal, which this regex is also used for
                    const fieldLocators: Record<string, By> = {
                        name: addObjectPoolModal.nameInput(),
                        description: addObjectPoolModal.descriptionInput(),
                        entry: createNewEntryModal.entryInput()
                    };
        
                    // Get the field locator based on normalized field name
                    const fieldLocator = fieldLocators[normalisedFieldName];
                    if (!fieldLocator) {
                        throw new Error(`Invalid field name: ${normalisedFieldName}`);
                    }
        
                    // Add text to the input field
                    await smSteps.addTextToInputField(driver, fieldLocator, trimmedValue);
                } catch (error) {
                    console.error(`Failed to enter the value "${trimmedValue}" into the "${fieldName} field"`, error);
                    throw error;
                }
            }
        }
    },
    {
       regex: /(.*) is entered in the (.*) field\.?/,
       handler: (testCaseKey, testData) => async (value: string, fieldName: string) => {
            console.log(`${value} is entered in the ${fieldName} field`);
            const driver = await getAdminDriver();
            const normalisedFieldName = fieldName.toLowerCase().trim();
            const trimmedValue = value.trim();
            
            if (normalisedFieldName === "name") {
                if (trimmedValue === "YouTube Short") {
                    const nameLocator = createPolicyModalContentMod.nameInput();
                    await smSteps.assertTextInInputField(driver, nameLocator, trimmedValue);
                } else {
                    throw new Error(`Unknown value was detected: ${trimmedValue}`);
                }
              
            } else {
                throw new Error(`Unknown field name was detected: ${fieldName}`);
            }
       }      
    },
    {
        regex: /(.*) is selected from the (.*) field\.?/,
        handler: (testCaseKey, testData) => async (value: string, fieldName: string) => {
            console.log(`${value} is selected from the ${fieldName} field`);
            const driver = await getAdminDriver();
            const normalisedFieldName = fieldName.toLowerCase().trim();
            const trimmedValue = value.trim();

            if (normalisedFieldName === "type") {
                if (trimmedValue === "Hide YouTube Shorts") {
                    await smSteps.assertContentModSelected(driver, trimmedValue);
                } else {
                    throw new Error(`Unknown value was detected: ${trimmedValue}`);
                }
            } else {
                throw new Error(`Unknown field name was detected: ${fieldName}`);
            }
        }
    },
    {
        regex: /In the (.*) field, select (.*) from the drop-down list\.?/,
        handler: (testCaseKey, testData) => async (fieldName: string, value: string) => {
            console.log(`Selecting ${value} from the ${fieldName} drop-down menu`);
            const driver = await getAdminDriver();
            const trimmedValue = value.trim();
            if (trimmedValue === "Hide YouTube Shorts") {
                await smSteps.selectTypeFromDropdownContentMod(driver, trimmedValue);
            } else if (fieldName.trim() === "Duration") {
                await smSteps.selectBypassCodeDurationAndAdd(driver, trimmedValue);
            } else {
                await smSteps.selectTypeObjectPool(driver, value);
            }
        }
    },
    {
        regex: /(.*) is displayed in the (.*?) field(?:, and invalid url entered is displayed under the Website field\.)?/,
        handler: (testCaseKey, testData) => async (value: string, fieldName: string) => {
            const normalisedValue = value.toLowerCase().trim();
            const normalisedFieldName = fieldName.toLowerCase().trim();
            console.log(`Confirm "${normalisedValue}" is displayed in the "${normalisedFieldName}" field`);
            const driver = await getAdminDriver();

            if (normalisedFieldName === "website") {
                // for category search modal
                const fieldLocator = categorySearchModal.websiteInput();
                await smSteps.assertTextInInputField(driver, fieldLocator, normalisedValue);
                if (normalisedValue === "example") {
                    await smSteps.assertInvalidUrlDisplayed(driver);
                }
            }else {                           
                // Define a mapping of field names to their locators
                // Add Object Pool Modal has the same By values as the Add Entry Modal, which this regex is also used for
                const fieldLocators: Record<string, By> = {
                    name: addObjectPoolModal.nameInput(), // entry and object modals are the same
                    description: addObjectPoolModal.descriptionInput(), // entry and object modals are the same
                    type: addObjectPoolModal.typeSelector(),
                    entry: createNewEntryModal.entryInput()
                };

                const fieldLocator = fieldLocators[normalisedFieldName];
                if (!fieldLocator) {
                    throw new Error(`Invalid field name: ${normalisedFieldName}`);
                }

                await smSteps.assertTextInInputField(driver, fieldLocator, normalisedValue);
            }
        }
    },
    {
        regex: /Click the (.*) in the (.*) modal\.?/,
        handler: (testCaseKey, testData) => async (buttonName: string, modalName: string) => {
            const normalisedButtonName = buttonName.toLowerCase().trim();
            const normalisedModalName = modalName.toLowerCase().trim();
            console.log(`click ${normalisedButtonName} in ${normalisedModalName} modal`);
            const driver = await getAdminDriver();

            switch (normalisedButtonName) {
                case "close button":
                    await smSteps.clickModalCloseBtn(driver, normalisedModalName);
                    break;
                case "search button":
                    await smSteps.clickModalSearchBtn(driver, normalisedModalName);
                    break;
                case "toggle policy switch":
                    await smSteps.clickModalTogglePolicyBtn(driver, normalisedModalName);
                    break;
                case "edit policy button":
                    await smSteps.clickModalEditPolicyBtn(driver, normalisedModalName);
                    break;
                case "clear button":
                    await smSteps.clickModalClearBtn(driver);
                    break;
                case "check button":
                    await smSteps.clickModalCheckBtn(driver);
                    break;
                default:
                    throw new Error(`Unknown object required to click: ${normalisedButtonName}`);
            }
        }
    },
    {
        regex: /Click save (.*)\.?/i,
        handler: (testCaseKey, testData) => async (item: string) => {
            const normalisedItemName = item.toLowerCase().trim();
            console.log(`click save ${normalisedItemName}`);
            const driver = await getAdminDriver();

            switch (normalisedItemName) {
                case "object pool":
                    await smSteps.clickSaveObjectPoolBtn(driver);
                    break;
                case "entry":
                    await smSteps.clickSaveEntryBtn(driver);
                    break;
                case "policy":
                    await smSteps.savePolicy(driver);
                    break;
                default:
                    throw new Error(`Unknown item: click save ${normalisedItemName}`);
            }
        }
    },
    {
        regex: /Click add (.*)\.?/i,
        handler: (testCaseKey, testData) => async (item: string) => {
            const normalisedItem = item.toLowerCase().trim();
            console.log(`click add ${normalisedItem}`);
            const driver = await getAdminDriver();

            switch (normalisedItem) {
                case "new entry":
                    await smSteps.clickAddNewEntryBtn(driver);
                    break;
                case "object pool":
                    await smSteps.clickAddNewPool(driver);
                    break;
                case "code":
                    await smSteps.clickAddCodeBtn(driver);
                    break;
                case "time period button":
                    await smSteps.clickAddTimePeriod(driver);
                    break;
                default:
                    throw new Error(`Unknown item: click add ${normalisedItem}`);
            }
        }
    },
    {
        regex: /Click create (.*)\.?/i,
        handler: (testCaseKey, testData) => async (item: string) => {
            const normalisedItem = item.toLowerCase().trim();
            console.log(`click create ${normalisedItem}`);
            const driver = await getAdminDriver();

            switch (normalisedItem) {
                case "policy":
                    await smSteps.clickCreatePolicyBtn(driver);
                    break;
                default:
                    throw new Error(`Unknown item: click create ${normalisedItem}`);
            }
        }
    },
    {
        regex: /Click the video\.?/i,
        handler: (testCaseKey, testData) => async () => {
            console.log(`click the video`);
            const driver = await getAdminDriver();
            const videoTitle = testData["Video Title"];
            await smSteps.clickYoutubeVideo(driver, videoTitle);
        }
    },
    {
        regex: /Click the (?:check box|checkbox) (.*) under (.*)/i,
        handler: (testCaseKey, testData) => async (checkboxName: string, fieldName: string) => {
            const normalisedCheckboxName = checkboxName.toLowerCase().trim();
            const normalisedFieldName = fieldName.toLowerCase().trim();
            const agent = testData["agent"].toLowerCase().trim();
            testContext.agent = agent; // store in testContext for next step
            console.log(`click the ${normalisedCheckboxName} checkbox under ${normalisedFieldName}`);
            const driver = await getAdminDriver();

            switch (normalisedFieldName) {
                case "safe search and save":
                    // the test is an on-network test if the agent test data parameter includes "on network"
                    // eg Browser Extension MV3 On Network
                    const isOnNetwork: boolean = agent.includes("on network");
                    if (isOnNetwork) {
                        console.log(`Test is on network, targeting the on-network configuration`);
                    } else {
                        console.log(`Test is off network, targeting the off-network configuration`);
                    }
                    await smSteps.clickSafeSearchCheckbox(driver, normalisedCheckboxName, isOnNetwork);
                    break;
                default:
                    throw new Error(`Unknown checkbox required to click: ${normalisedCheckboxName}`);
            }
        }
    },
    {
        regex: /Click (.*)\.?/i,
        handler: (testCaseKey, testData) => async (buttonName: string) => {
            const normalisedButtonName = buttonName.toLowerCase().trim();
            console.log(`click the ${normalisedButtonName} button`);
            const driver = await getAdminDriver();

            switch (normalisedButtonName) {
                case "save":
                    // click save in the manage time period page
                    await smSteps.clickSave(driver)
                    break;
                default:
                    throw new Error(`Unknown item required to click: ${normalisedButtonName}`);
            }
        }
    },
    {
        regex: /The (.*) modal will close\.?/, 
        handler: (testCaseKey, testData) => async (modalName: string) => {
            const normalisedModalName = modalName.toLowerCase().trim();
            const driver = await getAdminDriver();
            await smSteps.assertModalClose(driver, normalisedModalName);
        }  
    },
    {
        regex: /(.*) , (.*) and (.*) are added to the object table\.?/,
        handler: (testCaseKey, testData) => async (name: string, description: string, entry: string) => {
            console.log(`Assert ${name}, ${description} and ${entry} are present`);
            const driver = await getAdminDriver();

            const tableValuePairs = [
                { column: "name", value: name },
                { column: "description", value: description },
                { column: "entry", value: entry },
            ];

            console.log(`Asserting the following entries are present:`);
            for (const { column, value } of tableValuePairs) {
                console.log(`- ${column}: ${value}`);
                await smSteps.assertPoolPageTable(driver, column, value);
            }
        }
    },
    {
        regex: /Redirected to the (.*) page for(.*) - (.*)\.?/,
        handler: (testCaseKey, testData) => async (pageName: string, poolName: string, poolType: string) => {
            console.log(`Redirected to the ${pageName} page for ${poolName} - ${poolType}.`)
            const driver = await getAdminDriver();
            
            // regex relates to a specific pool's page
            const normalisedPageName = pageName.toLowerCase().trim();
            const trimmedName = poolName.trim();
            const trimmedPoolType = poolType.trim(); // doesn't need to be lowercased
            switch (normalisedPageName) {
                case "pools":
                    const pageHeader = `${trimmedName} - ${trimmedPoolType}`;
                    await smSteps.assertPoolPage(driver, pageHeader);
                    break;
                default:
                    console.error(`Invalid page name provided: ${pageName}`);
                    throw new Error;
            }
        }
    },
    {
        regex: /Save the configuration by clicking the Save button at the bottom of the page\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log(`Save the configuration by clicking the Save button at the bottom of the page.`);
            const driver = await getAdminDriver();
            await smSteps.saveMobileAgentConfig(driver, true);
            console.log(`Save button has been clicked`);
        }
    },
    {
        regex: /(.*)is saved successfully\.?/,
        handler: (testCaseKey, testData) => async (config: string) => {
            console.log(`${config} is saved successfully.`)
            const driver = await getAdminDriver();
            await smSteps.assertMobileAgentConfigSaved(driver);
            console.log(`${config} has been saved successfully`);
        }
    },
    {
        regex: /Create a policy in School Manager to (\w+) (.*)\.?/,
        handler: (testCaseKey, testData) => async (verdict, type) => {
            console.log(`Creating policy to ${verdict} for ${type} with test data:`, testData);
            const driver = await getAdminDriver();
        
            // certain parameters are only required if creating a rule to block
            if (verdict.toLowerCase().trim() === "block") {
                await smSteps.createPolicy(
                    testCaseKey,
                    driver,
                    testData["Name"],
                    testData["Agent"],
                    testData["Type"],
                    testData["Criteria"],
                    testData["Action"],
                    testData["Locked"],  
                    testData["Redirect"],
                    testData["Blocked Page"],
                    testData["Alert"],
                    testData["Quarantine"],
                    testData["Redirect Url"],
                );
            } else if (verdict.toLowerCase().trim() === "allow") {
                await smSteps.createPolicy(
                    testCaseKey,
                    driver,
                    testData["Name"],
                    testData["Agent"],
                    testData["Type"],
                    testData["Criteria"],
                    testData["Action"],
                    testData["Locked"],
                );
            } else {
                console.error("Invalid verdict received", verdict);
                throw new Error;
            }
        }
    },
    {
        regex: /Enable the policy\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log(`enable the policy`);
            const driver = await getAdminDriver();
            await smSteps.enablePolicy(testCaseKey, driver, testData["Name"]);
        }
    },
    {
        regex: /Enable the content mod\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log("enable the content mod");
            const driver = await getAdminDriver();
            const policyName = testData["Name"];
            await smSteps.enableContentMod(driver, policyName, testCaseKey);
        }
    },
    {
        regex: /No expected result\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log("No expected result for this step");
        }
    },
    {
        regex: /(?:On|Using) the(.*?) , attempt to access content that should be (.*?) as per the type \( ?(.*?) ?\) and the criteria \( ?(.*?) ?\)(?: for on network)?\.?/,
        handler: (testCaseKey, testData) => async (agent: string, verdict: string, type: string, criteria: string) => {
            const thisAgent = agent.toLowerCase().trim();
            const thisType = type.toLowerCase().trim();
            console.log(`using the ${thisAgent} attempt to access ${type} with criteria ${criteria}`);
            studentDriver = await getStudentDriver(thisAgent);

            testContext.agent = thisAgent;
            
            let urlToBrowseTo: string = "";
            let urlsToBrowseTo: string[] = [];

            // if this test data exists in a step, there are specific urls to be browsed to
            if (testData["Urls to check"]) {
                urlsToBrowseTo = await utils.urlsArray(testData["Urls to check"]);
                if (urlsToBrowseTo.length > 1) {
                    testContext.actualUrls = []; // reset test context urls
                    console.log(`testContext before multiple urls: ${JSON.stringify(testContext)}`)
                    const actualUrls = await utils.browseToMultipleUrls(studentDriver, urlsToBrowseTo);
                    testContext.actualUrls = actualUrls; // store in context as these need to be checked in a subsequent step
                    console.log(`testContext after multiple urls: ${JSON.stringify(testContext)}`)
                } else if (urlsToBrowseTo.length === 1) {
                    // if there's only one url in the urls to check array, use the browseToUrl function instead
                    urlToBrowseTo = urlsToBrowseTo[0];
                    console.log(`URL to browse to: ${urlToBrowseTo}`);
                    await utils.browseToUrl(studentDriver, urlToBrowseTo);

                } else {
                    console.error("Trying to browse to multiple urls, but the url array is empty");
                    throw new Error("Unable to browse to multiple urls as the url array is empty");
                }
            // otherwise, browse to the url based on the type
            } else {
                // Set url based on type
                // signature type
                if (thisType === "signature") {
                    urlToBrowseTo = "https://www.youtube.com";
                // url
                } else if (thisType === "url") {
                    urlToBrowseTo = "https://www.youtube.com";
                // http traffic via direct ip
                } else if (thisType === "http traffic via directip") {
                    urlToBrowseTo = "http://172.66.0.209";  // This is IP of www.playboy.com
                // website list object
                } else if (thisType === "custom website list - website list object") {
                    urlToBrowseTo = "https://youtube.com"; // the website list also uses youtube.com
                // search keywords object
                } else if (thisType === "custom search list - search keywords object") {
                    console.log("Searching for search keywords from an object");
                    const searchEngine = testData["Search Engine"].toLowerCase().replace(/[\u200B]|&nbsp;]/g, '').trim();
                    console.log(`Search Engine: "${searchEngine}"`)
                    urlToBrowseTo = await utils.searchKeyWordObject(searchEngine);
                // search for violence, substance abuse, depression etc
                } else if (thisType.includes("searches for")) {
                    const searchEngine = testData["Search Engine"].toLowerCase().replace(/[\u200B]|&nbsp;]/g, '').trim();
                    console.log(`Using search engine ${searchEngine}`);
                    const cleanType = thisType.replace(/\u200B/g, "");
                    urlToBrowseTo = await utils.searchesForCategory(searchEngine, cleanType);
                // the three safe search enforcements for agents all include "familyzonedns" in their urls
                // they can be seen in the cases below
                } else if (thisType.includes("familyzonedns")) {
                    switch (thisType) {
                        case "google.search.familyzonedns.com":
                            urlToBrowseTo = "https://www.google.com/search?q=pornhub";
                            break;
                        case "bing.search.familyzonedns.com":
                            urlToBrowseTo = "https://www.bing.com/search?q=pornhub";
                            break;
                        case "youtube.media.familyzonedns.com":
                            // if restricted mode is on YouTube, one of the videos that is hidden is https://www.youtube.com/watch?v=LDZX4ooRsWs, which is Nicki Minaj - Anaconda on Nicki Minaj's YouTube channel
                            // note there are similar videos that are not hidden, so ensure the one above is being checked for removal
                            urlToBrowseTo = "https://www.youtube.com/results?search_query=anaconda+nicki+minaj";
                            break;
                        default:
                            throw new Error(`Unknown search engine type for agent safe search enforcement was provided: ${thisType}`);
                    }
                } else if (thisType === "signature google search") {
                    urlToBrowseTo = "https://www.google.com/search?q=search+keyword";
                } else if (thisType === "signature bing") {
                    urlToBrowseTo = "https://www.bing.com/search?q=search+keyword"
                }
                
                // if there is a url to browse to, browse to it
                if (urlToBrowseTo) {
                    await utils.browseToUrl(studentDriver, urlToBrowseTo);
                } else {
                    throw new Error(`Unable to determine the url or urls to be browsed to.`)
                } 
            }
        }
    },
    {
        regex: /On the (.*)\s*, attempt to access the (.*) with a (.*)\s*that should not be affected by the policy as per the criteria(?: for on network)?\.?/,
        handler: (testCaseKey, testData) => async (agent, type, criteria) => {
            try {
                console.log(`criteria should not be affected`);
                console.log(`Agent: ${agent.toLowerCase().trim()}`);
                if (agent.toLowerCase().trim() === "windows 10 agent") {
                    // other is not a member of the group, or the user, that is used in the original rule
                    otherStudentDriver = await utils.buildStudentDriver("windows 10 agent other");
                    otherStudentDriverActive = true;
                } else if (agent.toLowerCase().trim() === "windows 11 agent") {
                    // other is not a member of the group, or the user, that is used in the original rule
                    otherStudentDriver = await utils.buildStudentDriver("windows 11 agent other");
                    otherStudentDriverActive = true;
                    // other is not a member of the group, or the user, that is used in the original rule
                } else if (agent.toLowerCase().trim() === "browser extension mv3") {
                    otherStudentDriver = await utils.buildStudentDriver("browser extension mv3 other");
                    otherStudentDriverActive = true;
                    // other is not a member of the group, or the user, that is used in the original rule
                } else if (agent.toLowerCase().trim() === "browser extension mv3 on network") {
                    otherStudentDriver = await utils.buildStudentDriver("browser extension mv3 other on network");
                    otherStudentDriverActive = true;
                }
                console.log(`Type is: ${type}`);
                const normalisedType = type.toLowerCase().trim();
                if (normalisedType === "signature") {
                    await otherStudentDriver.get("https://www.youtube.com");
                } else if (normalisedType === "url") {
                    await otherStudentDriver.get("https://www.youtube.com");
                } else if (normalisedType === "http traffic via directip") {
                    await otherStudentDriver.get("http://172.66.0.209");  // This is IP of www.playboy.com
                } else if (normalisedType === "custom search list - search keywords object") {
                    try {
                        const searchEngine = testData["Search Engine"].toLowerCase().replace(/[\u200B]|&nbsp;]/g, '').trim();
                        switch (searchEngine) {
                            case "google search":
                                await otherStudentDriver.get("https://www.google.com/search?q=search+keyword");
                                break;
                            case "bing":
                                await otherStudentDriver.get("https://www.bing.com/search?q=search+keyword");
                                break;
                            default:
                                if (searchEngine) {
                                    throw new Error(`Invalid searchEngine: ${searchEngine}`);
                                } else {
                                    throw new Error(`Error occurred when attempting to search for keyword`);
                                }
                        }                    
                    } catch (error) {
                        console.error(`Error occurred when using otherStudentDriver ${otherStudentDriver} to get a search engine`, error);
                        throw error;
                    }
                } else if (normalisedType === "custom website list - website list object") {
                    await otherStudentDriver.get("https://youtube.com"); // youtube.com used for website list
                } else if (normalisedType.includes("familyzonedns")) {
                    switch (normalisedType) {
                        case "google.search.familyzonedns.com":
                            // pornhub shouldn't be retricted as safe search shouldn't be applied
                            await otherStudentDriver.get("https://www.google.com/search?q=pornhub");
                            break;
                        case "bing.search.familyzonedns.com":
                            // pornhub shouldn't be retricted as safe search shouldn't be applied
                            await otherStudentDriver.get("https://www.bing.com/search?q=pornhub");
                            break;
                        case "youtube.media.familyzonedns.com":
                            // this should return the expected video as safe search shouldn't be applied
                            await otherStudentDriver.get("https://www.youtube.com/results?search_query=anaconda+nicki+minaj");
                            break;
                        default:
                            throw new Error(`Error when determining safesearch case. Type provided was: ${normalisedType}`);
                    }
                
                } else {
                    console.error(`Invalid type: ${type}`);
                    throw new Error("Type was invalid");
                }
            } catch (error) {
                console.error("Error in handler execution", error);
                otherStudentDriverActive = false;
                throw error;
            }
        }
    },
    {
        regex: /Using the (.*), attempt to access (.*)\.?/,
        handler: (testCaseKey, testData) => async (agent: string, url: string) => {
            console.log(`Using the ${agent}, attempt to access ${url}`);
            const normalisedAgent = agent.toLowerCase().trim();
            const normalisedUrl = url.toLowerCase().trim();
            studentDriver = await getStudentDriver(normalisedAgent);
            await utils.browseToUrl(studentDriver, normalisedUrl);
        }
    },
    {
        regex: /Using the (.*), search for content that should be removed by safe search\.?/,
        handler: (testCaseKey, testData) => async (agent: string) => {
            const searchEngine = testData["search_engine"].toLowerCase().trim();
            const searchTerm = testData["search_term"].toLowerCase().trim();
            console.log(`Using the ${agent}, search for content that should be removed by safe search on ${searchEngine}`);
            
            if (testContext.agent) {
                const agent = testContext.agent;
                studentDriver = await getStudentDriver(agent);
            } else {
                throw new Error("testContext.agent not yet defined, reached 'using the (.*), search for content that should be removed by safe search' step before the agent was set");
            }

            if (searchEngine === "google") {
                await studentDriver.get("https://www.google.com/search?q=" + searchTerm);
            } else if (searchEngine === "bing") {
                await studentDriver.get("https://www.bing.com/search?q=" + searchTerm);
            } else {
                console.error(`Invalid search engine provided: ${searchEngine}`);
                throw new Error;
            }


        }
    },
    {
        regex: /Content for (.*) is removed by safe search\.?/,
        handler: (testCaseKey, testData) => async (searchTerm: string) => {
            console.log(`Content for ${searchTerm} is removed by safe search`);
            const searchEngine = testData["search_engine"].toLowerCase().trim();

            if (testContext.agent) {
                const agent = testContext.agent;
                studentDriver = await getStudentDriver(agent);
            } else {
                throw new Error("testContext.agent not yet defined, reached 'Content for (.*) is removed by safe search' step before the agent was set");
            }

            if (searchEngine === "google") {
                await utils.assertGoogleSafeSearch(studentDriver, true);
            } else if (searchEngine === "bing") {
                await utils.assertBingSafeSearch(studentDriver, true);
            } else {
                console.error(`Invalid search engine provided: ${searchEngine}`);
                throw new Error;
            }
        }
    },
    {
        regex: /(.*) will load, however, no video will display on the page, but will present a blank (?:center|centre) screen\.?/,
        handler: (testCaseKey, testData) => async (url: string) => {
            console.log(`Asserting ${url} has had its content modified`);
            const agent = testData["agent"].toLowerCase().trim();
            studentDriver = await getStudentDriver(agent);
            if (url === "youtube.com/shorts") {
                await utils.assertYoutubeShortContentMod(studentDriver);
            } else {
                throw new Error(`Invalid url provided: ${url}`);
            }
        }
    },
    {
        regex: /Reorder the policy to place it above the previously created Block policy\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log(`Reorder the policy above previously created block policy`);
            const driver = await getAdminDriver();
            
            // Drag and Drop is not working in the School Manager UI.
            // To reorder the policies, the following workaround is used:
            // Step 1: Delete the existing block policy
            // Step 2: Create the same block policy again
            // Step 3: Enable the newly created block policy
            // Setp 4: Assert that the blocked policy has been succussfully enabled
            // As a result, the "Allow" policy will appear above the "Block" policy
            
            await smSteps.deletePolicy(testCaseKey, driver, testData["Name"]);

            await smSteps.createPolicy(
                testCaseKey,
                driver,
                testData["Name"],
                testData["Agent"],
                testData["Type"],
                testData["Criteria"],
                testData["Action"],
                testData["Locked"],  
                testData["Redirect"],
                testData["Blocked Page"],
                testData["Alert"],
                testData["Quarantine"],
                testData["Redirect Url"]
            );
            await smSteps.enablePolicy(testCaseKey, driver, testData["Name"]);
            await smSteps.assertPolicyCreated(testCaseKey, driver, testData["Name"]);
        }
    },
    {
        regex: /Policy displays above the previously created Block policy\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log(`Policy displays above the previously created Block policy`);
            const driver = await getAdminDriver();
            await smSteps.assertPolicyReordered(testCaseKey, driver, testData["Name"]);
        }
    },
    {
        regex: /Policy created successfully and appears in the UI\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log(`Policy created successfully and appears in the UI`);            
            const driver = await getAdminDriver();
            console.log("verifying policy has been created");
            await smSteps.assertPolicyCreated(testCaseKey, driver, testData["Name"]);
        }
    },
    {
        regex: /(.*) displays as enabled \(toggled (ON|OFF)\) in the UI\.?/,
        handler: (testCaseKey, testData) => async (policyType: string, state: string) => {
            const normalisedState = state.toLowerCase().trim();
            const normalisedPolicyType = policyType.toLowerCase().trim();
            console.log(`verifying ${normalisedPolicyType} is toggled ${normalisedState}`);
            console.log(`Name from test data: ${testData["Name"]}`);
            const driver = await getAdminDriver();
            if (normalisedPolicyType === "policy") {
                await smSteps.assertPolicyEnabled(testCaseKey, driver, testData["Name"], normalisedState);
            } else if (normalisedPolicyType === "content mod") {
                await smSteps.assertContentModEnabled(driver, testData["Name"], testCaseKey, normalisedState);
            }

        }
    },
    {
        regex: /Content is blocked by (.*)\.?/,
        handler: (testCaseKey, testData) => async (prevention) => {
            const normalisedPrevention = prevention.toLowerCase().trim();
            if(testContext.agent) {
                const agent = testContext.agent;
                studentDriver = await getStudentDriver(agent);
            } else {
                throw new Error("testContext.agent not yet defined, reached 'Content is blocked by ' step before the agent was set");
            }
            
            // Retrieve visited URLs from context if they exist
            console.log(`testContext in Content is blocked by...: ${JSON.stringify(testContext)}`)
            const actualUrls = testContext.actualUrls;

            switch (normalisedPrevention) {
                case "blocked page":
                case "block page":
                    console.log(`Confirm blocked page is displayed`);

                    // If there are multiple urls, use verifyUrls for verification
                    if (actualUrls && actualUrls.length > 0) {
                        await utils.verifyUrls(studentDriver, actualUrls, blockedPageUrl);
                    } else {
                        // For single url, use the verifyUrl
                        const isUsingBypassCode = testData["Bypass code"];
                        if (isUsingBypassCode === "true") { // pass a boolean if using a bypass code to stop the function from quitting the driver
                            await utils.verifyUrl(studentDriver, blockedPageUrl, true);
                        } else {
                            await utils.verifyUrl(studentDriver, blockedPageUrl);
                        }
                    }
                    break;
                case "google safe search":
                    console.log(`Confirming google safe search is being enforced`);
                    await utils.assertGoogleSafeSearch(studentDriver, true);
                    break;
                case "bing safesearch":
                    console.log(`Confirming bing safesearch is being enforced`);
                    await utils.assertBingSafeSearch(studentDriver, true);
                    break;
                case "youtube restricted mode":
                    console.log(`Confirming youtube restricted mode is being enforced`);
                    await utils.assertYoutubeSafeSearch(studentDriver, true);
                    break;
                default:
                    throw new Error(`Invalid prevention provided: ${normalisedPrevention}`);
            }
           
        } 
    },
    {
        regex: /Access to the (.*) is (\w+)\.?/,
        handler: (testCaseKey, testData) => async (type, verdict) => {
            console.log(`Verify access to the ${type} is ${verdict}`);
            const agent = testContext.agent;
            if (!agent) {
                throw new Error("Agent is not set in the context. Ensure the step 'Using the ...' is executed before this step.");
            }

            try {
                if (verdict.toLowerCase().trim().includes("block")) {
                    if (otherStudentDriverActive) {
                        // Check if the URL matches the expected blocked page URL
                        await utils.verifyUrl(otherStudentDriver, blockedPageUrl);
                    }
                    otherStudentDriverActive = false;   // Reset flag for other test 
                } else if (verdict.toLowerCase().trim().includes("allow")) {
                    if (otherStudentDriverActive) { // flag to inform the handler the driver should be otherStudentDriver
                        const normalisedType = type.toLowerCase().trim();
                        if (normalisedType.includes("familyzonedns")) {
                            switch (normalisedType) {
                                case "google.search.familyzonedns.com":
                                    // pornhub shouldn't be retricted as safe search shouldn't be applied
                                    await utils.assertGoogleSafeSearch(otherStudentDriver, false);
                                    break;
                                case "bing.search.familyzonedns.com":
                                    // pornhub shouldn't be retricted as safe search shouldn't be applied
                                    await utils.assertBingSafeSearch(otherStudentDriver, false);
                                    break;
                                case "youtube.media.familyzonedns.com":
                                    // this should return the expected video as safe search shouldn't be applied
                                    await utils.assertYoutubeSafeSearch(otherStudentDriver, false);
                                    break;
                                default:
                                    throw new Error(`Invalid type for agent safe search detected: ${normalisedType}`);
                            }
                        } else {
                            console.log(`Verifying verdict for the user where the policy should not apply`);
                            // use the driver where the student isn't a member of the group or user add to the policy
                            // confirms the criteria part of the policy is working properly
                            await utils.verifyUrlIsNotBlocked(otherStudentDriver, blockedPageUrl);
                            otherStudentDriverActive = false; //Reset flag for other tests
                        }
                    } else {
                        // use the driver where the student is a member of the group or user added to the policy
                        console.log(`Verifying verdict for the user where the policy should not apply`);
                        studentDriver = await getStudentDriver(agent);
                        console.log(`testContext in Access to the ... is ... : ${JSON.stringify(testContext)}`)
                        const actualUrls = testContext.actualUrls;

                        // If there are multiple urls, use verifyUrls for verification
                        if (actualUrls && actualUrls.length > 0) {
                            await utils.verifyUrlsAreNotBlocked(studentDriver, actualUrls, blockedPageUrl);
                        } else {
                            // For single url, use the verifyUrl
                            await utils.verifyUrlIsNotBlocked(studentDriver, blockedPageUrl);
                        }
                    }
                } else {
                    console.error("Invalid verdict detected, unable to run handler", verdict);
                }
            } catch (error) {
                console.error("Error when executing functions for regex", error);
                throw error;
            }
        }
    },
    {
        regex: /Run the (.*) installer\.?/,
        handler: (testCaseKey, testData) => async (agent: string) => {
            console.log(`Installing ${agent}`);
            const enrollmentDriver = await getEnrollmentDriverForAgent(agent);
            testContext.enrollmentDriver = enrollmentDriver;
            await enrollmentSteps.installAgent(enrollmentDriver);
        }
    },
    {
        regex: /(.*) installs successfully\.?/,
        handler: (testCaseKey, testData) => async (agent: string) => {
            console.log(`Asserting ${agent} installed`);
            const enrollmentDriver = await getEnrollmentDriverForAgent(agent);
            testContext.enrollmentDriver = enrollmentDriver;
            await enrollmentSteps.assertAgentInstalled(enrollmentDriver, unixTimestampInSeconds)
        }
    },
    {
        regex: /Enroll the (.*) to a user and appliance\.?/,
        handler: (testCaseKey, testData) => async (agent: string) => {
            console.log(`Enrolling the ${agent}`);
            const enrollmentDriver = await getEnrollmentDriverForAgent(agent);
            testContext.enrollmentDriver = enrollmentDriver;
            await enrollmentSteps.enrollAgent(enrollmentDriver, agent);
        }
    },
    {
        regex: /(.*) enrolls to the user and appliance\.?/,
        handler: (testCaseKey, testData) => async (agent: string) => {
            console.log(`Asserting ${agent} is enrolled`);
            const enrollmentDriver = await getEnrollmentDriverForAgent(agent);
            testContext.enrollmentDriver = enrollmentDriver;
            await enrollmentSteps.assertEnrollment(enrollmentDriver, agent);
        }
    },
    {
        regex: /Run the (.*) uninstaller\.?/,
        handler: (testCaseKey, testData) => async (agent: string) => {
            console.log(`Running the ${agent} uninstaller`);
            const enrollmentDriver = await getEnrollmentDriverForAgent(agent);
            testContext.enrollmentDriver = enrollmentDriver;
            await enrollmentSteps.uninstallAgent(enrollmentDriver);
        }
    },
    {
        regex: /(.*) uninstalls successfully\.?/,
        handler: () => async (agent: string) => {
            console.log(`Asserting the ${agent} has uninstalled`);
            const enrollmentDriver = await getEnrollmentDriverForAgent(agent);
            testContext.enrollmentDriver = enrollmentDriver;
            await enrollmentSteps.assertAgentUninstalled(enrollmentDriver);
        }
    },
    {
        regex: /(?:On|Using) the (.*?), view the agent logs\.?/,
        handler: (testCaseKey, testData) => async (agent: string) => {
            const thisAgent = agent.toLowerCase().trim();
            studentDriver = await getStudentDriver(thisAgent);

            testContext.agent = thisAgent;
            await utils.browseToUrl(studentDriver, "http://localhost:8080");

            //get the current number of messages
            const startMessages:number = parseInt(await studentDriver.findElement(By.id('messageCount')).getAttribute('value'));
            const currentDate = MD5(Date.now().toString());
            await utils.browseToUrl(studentDriver, `https://www.youtube.com?extraparameter=${currentDate}`);
            await utils.waitForAnimation(5000);

            await utils.browseToUrl(studentDriver, "http://localhost:8080");

            //get the current number of messages
            const endMessages:number = parseInt(await studentDriver.findElement(By.id('messageCount')).getAttribute('value'));
            let loggedMessages: any[] = [];

            for(let i = startMessages + 1; i <= endMessages; i++) {
                const reqUrl = await studentDriver.findElement(By.id(`uri${i}`)).getText();
                const reqBody = await studentDriver.findElement(By.id(`body${i}`)).getText();
                const respBody = await studentDriver.findElement(By.id(`responsebody${i}`)).getText();

                loggedMessages.push({url: reqUrl, req: reqBody, resp: respBody});
            }

            console.table(...loggedMessages);

        }
    },
    {
        regex: /(?:On|Using) the (.*), in (.*) enter (.*)\.?/,
        handler: (testCaseKey, testData) => async (agent: string, searchEngine: string, searchTerm: string) => {
            console.log(`Browse to ${searchEngine} and search for ${searchTerm}`);
            console.log(`Agent to use: ${agent}`);
            studentDriver = await getStudentDriver(agent);
            testContext.agent = agent; // store for subsequent step through test context
            testContext.searchEngine = searchEngine; // store for subsequent step through test context
            await utils.generateSearchTerm(studentDriver, searchEngine, searchTerm);
       }
    },
    {
        regex: /(.*) search term is generated\.?/,
        handler: (testCaseKey, testData) => async (searchTerm: string) => {
            if((testContext.agent) && (testContext.searchEngine)) {
                studentDriver = await getStudentDriver(testContext.agent); // retrieved from previous step through test context
                await utils.assertSearchTermAccessed(studentDriver, testContext.searchEngine, searchTerm);
            } else {
                throw new Error("testContext.agent or testContext.searchEngine have not yet been set... Reached (.*) search term is generated");
            }
        }
    },
    {
        regex: /Wait for (.*) minutes\.?/,
        handler: (testCaseKey, testData) => async (waitTime: string) => {
            console.log(`Waiting for ${waitTime} minutes`);
            const waitTimeNumber = Number(waitTime.trim().replace(/\u200B/g, ""));
            console.log("Wait Time Number: ", waitTimeNumber);
            await new Promise(resolve => setTimeout(resolve, waitTimeNumber * 60 * 1000)); // wait for however many minutes from the test data
            console.log(`Waited for ${waitTime} minutes`);
            if(testContext.agent) {
                studentDriver = await getStudentDriver(testContext.agent); // retrieved from previous step through test context
            } else {
                throw new Error("testContext.agent has not yet been set... Reached Wait for (.*) minutes");
            }            
            console.log("Quitting the student driver");
            await studentDriver.quit(); // Can now quit the driver after waiting the allotted time
        }
    },
    {
        regex: /(.*) page loads\.?/,
        handler: (testCaseKey, testData) => async (page: string) => {
            console.log(`Assert ${page} page loads`);
            const cleanedPage = page.toLowerCase().trim();
            const driver = await getAdminDriver();

            switch (cleanedPage) {
                case "searches":
                    await smSteps.assertOnSearchesPage(driver);
                    break;
                case "dashboard":
                    await smSteps.assertOnStatisticsDashboardPage(driver);
                    break;
                case "red flags": // both plural and non plural are the same page
                case "red flag": // some steps have plural some don't
                    await smSteps.assertOnRedFlagsPage(driver);
                    break;
                case "video":
                case "videos":
                    await smSteps.assertOnVideosPage(driver);
                    break;
                case "video detail":
                    const videoUrl = testData["Video Url"];
                    await smSteps.assertOnVideoDetailPage(driver, videoUrl);
                    break;
                // content modification is the official term but have seen plural in places
                case "content modification":
                case "content modifications": 
                    await smSteps.assertOnContentModificationPage(driver);
                    break;
                case "bypass codes":
                case "bypass code":
                    await smSteps.assertOnBypassCodePage(driver);
                    break;
                case "the time period":
                case "the time period is saved and the time period":
                    await smSteps.assertTimePeriodPage(driver);
                    break;
                case "the manage time period":
                    await smSteps.assertManageTimePeriodPage(driver);
                    break;
                case "mobile agent":
                    await smSteps.assertMobileAgentConfigPage(driver);
                    break;
                default:
                    throw new Error(`Unknown page provided to check it has loaded`);
            }
        }
    },
    {
        regex: /The (Category Search|Test Policy) modal will display the category( and the matching Policies)? for ([\w.-]+)(, and the locked icon is displayed)?\.?/,
        handler: () => async (modalName: string, matchingPolicies: string, websiteName: string, lockedIcon: string) => {
            console.log(`Asserting correct category displays for ${websiteName}`);
            const normalisedWebsiteName = websiteName.toLowerCase().trim();
            const driver = await getAdminDriver();
            if (modalName === "Category Search") {
                await smSteps.assertCategory(driver, normalisedWebsiteName);
                if (matchingPolicies) {
                    console.log(`Asserting correct matching policies for ${normalisedWebsiteName}`);
                    await smSteps.assertMatchingPolicies(driver, normalisedWebsiteName);
                }
                if (lockedIcon) {
                    console.log(`Asserting locked icon is displayed for ${normalisedWebsiteName}`);
                    await smSteps.assertLockedIcon(driver, normalisedWebsiteName);
                }
            } else if (modalName === "Test Policy") {
                await smSteps.assertPoliciesMatched(driver, normalisedWebsiteName);
            }
        }
    },
    {
        regex: /Wait for the word cloud to load\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log("checking the word cloud is populated");
            const driver = await getAdminDriver();
            await smSteps.assertWordCloudHasLoaded(driver);
        }
    },
    {
        regex: /Word cloud is filled with search terms\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log("assert the word cloud is populated with search terms");
            // these are the current types of search terms avaialable and must be present in the testData
            
            const driver = await getAdminDriver();

            const searchTerms: string[] = [
                testData["Academic Dishonesty"],
                testData["Adult Content"],
                testData["Bullying"],
                testData["Depression"],
                testData["Hate Speech"],
                testData["Substance Abuse"],
                testData["Suicide"],
                testData["Violence"],
                testData["VPN Search"]
            ];
            await smSteps.assertWordCloudIsPopulated(driver);
            await smSteps.assertWorldCloudContainsExpectedTerms(driver, searchTerms);
        }
    },
    {
        regex: /Select user under Username below the word cloud\.?/,
        handler: (testCaseKey, testData) => async () => {
            const agent = testData["Agent"];
            const cleanedAgent = agent.toLowerCase().trim().replace(/\u200B/g, "");

            if (!students.hasOwnProperty(cleanedAgent)) {
                throw new Error(`Agent key not found: '${cleanedAgent}'`);
            }

            const user = students[cleanedAgent].studentName;

            if (user) {
                console.log("User found:", user);
            } else {
                console.error(`No student found for agent: ${agent}`);
            }
            const driver = await getAdminDriver();
            console.log(`click the username of the user who generated the data ${user}`);
            await smSteps.clickUserOnSearchesPage(driver, user);
        }
    },
    {
        regex: /All search terms the user has queried for the selected DateTime should be reordered with the hits for each query counted\.?/,
        handler: (testCaseKey, testData) => async () => {
            console.log(`confirm all search terms are present`);

            const driver = await getAdminDriver();
            
            const searchTerms: string[] = [
                testData["Academic Dishonesty"],
                testData["Adult Content"],
                testData["Bullying"],
                testData["Depression"],
                testData["Hate Speech"],
                testData["Substance Abuse"],
                testData["Suicide"],
                testData["Violence"],
                testData["VPN Search"]
            ];

            await smSteps.assertSearchTermIsInTable(driver, searchTerms);
            
            if (testContext.currentTime) {
                console.log("Clearing the stored current time");
                testContext.currentTime = undefined;
            }

        }
    },
    {
        regex: /(.*) will be displayed\.?/,
        handler: (testCaseKey, testData) => async (name: string) => {
            const normalisedName = name.toLowerCase().trim();
            const driver = await getAdminDriver();
            console.log(`Asserting ${normalisedName} is displayed`);
            switch (normalisedName) {
                case "modal to name the time period":
                    await smSteps.assertNameTimePeriodModal(driver);
                    break;
                case "the edit policy modal":
                    await smSteps.assertEditPolicyDisplayed(driver);
                    break;
                default:
                    throw new Error(`Unknown modal name provided: ${normalisedName}`);
            }
        }
    },
    {
        regex: /Select the option to (.*) the policy\.?/,
        handler: (testCaseKey, testData) => async (action: string) => {
            const capitalisedAction = action.charAt(0).toUpperCase() + action.slice(1);
            const driver = await getAdminDriver();
            if (capitalisedAction === "Lock") {
                const checkBoxName = `${capitalisedAction}ed`;
                console.log(`Clicking ${checkBoxName} checkbox in Edit Policy modal`);
                await smSteps.clickLockedOptionCheckBox(driver, checkBoxName);
            }
        }
    },
    {
        regex: /Locked policy display a warning label\.?/,
        handler: (testCaseKey, testData) => async (name: string) => {
            const driver = await getAdminDriver();
            console.log(`Asserting warning label for locked policy displayed`);
            await smSteps.assertLockedPolicyWarning(driver);
        }
    },
    {
        regex: /Policy is placed at the top of the policy list and display the locked icon\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            const name = testData["Name"];
            console.log(`Asserting locked policy is displayed at the top`);
            await smSteps.assertLockedPolicyAtTop(testCaseKey, driver, name);
        }
    },
    {
        regex: /Select (.*) policy and drag it to the top of the Policy list\.?/,
        handler: (testCaseKey, testData) => async (policyName: string) => {
            const driver = await getAdminDriver();
            const lockedPolicyName = testData["Name"]
            console.log(`Reordering Policy to the top of the list`);
            await smSteps.movePolicyAboveLockedPolicy(lockedPolicyName, policyName, driver, testCaseKey);
        }
    },
    {
        regex: /Error message should display and the policy is not moved\.\"Locked filter policies have greater priority and must remain at the top\"\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            console.log('Asserting warning toast message "Locked filter policies have greater priority and must remain at the top" is displayed.');
            await smSteps.warningToastDisplayed(driver);
        }
    },
    {
        regex: /The Category Search modal will display that (.*) is uncategorised\.?/,
        handler: (testCaseKey, testData) => async (websiteName: string) => {
            const driver = await getAdminDriver();
            const normalisedWebsiteName = websiteName.toLowerCase().trim();
            console.log(`Asserting ${normalisedWebsiteName} is displayed as uncategorised`);
            await smSteps.assertUncategorisedDisplayed(driver);
        }
    },
    {
        regex: /In the (.*) section, click (.*)\.?/,
        handler: (testCaseKey, testData) => async (sectionName: string, clickName: string) => {
            const driver = await getAdminDriver();
            const normalisedSectionName = sectionName.toLowerCase().trim();
            const normalisedClickName = clickName.toLowerCase().trim();
            console.log(`Clicking the ${normalisedClickName} from the ${normalisedSectionName}`);

            switch (normalisedSectionName) {
                case "red flags":
                    if (normalisedClickName === "view all") {
                        await smSteps.clickRedFlagsViewAll(driver);
                    } else {
                        throw new Error(`Unknown element to click was provided: ${normalisedClickName}`);
                    }
            }

        }
    },
    {
        regex: /In (?:School Manager|Linewize Filter), go to (.*)\.?/,
        handler: (testCaseKey, testData) => async (pageName: string) => {
            const driver = await getAdminDriver();
            const normalisedPageName = pageName.toLowerCase().trim();

            switch (normalisedPageName) {
                case "cyber safety / red flags":
                    await smSteps.navigateToPageInSchoolManager(driver, "cybersafety/wellbeing");
                    break;
                case "cyber safety / videos":
                    await smSteps.navigateToPageInSchoolManager(driver, "cybersafety/video");
                    break;
                case "filtering / content modification":
                    await smSteps.navigateToPageInSchoolManager(driver, "filtering/modifications");
                    break;
                case "filtering / bypass codes":
                    await smSteps.navigateToPageInSchoolManager(driver, "filtering/bypass/available");
                    break;
                case "configuration / objects / time periods":
                    await smSteps.navigateToTimePeriods(driver);
                    break;
                case "configuration / mobile agent":
                    await smSteps.navigateToPageInSchoolManager(driver, "config/device/mobileagentconfiguration");
                    break;
                default:
                    console.error(`Unknown page name provided: ${normalisedPageName}`);
                    throw new Error(`Unknown page name provided: ${pageName}`);
            }

        }
    },
    {
        regex: /In (.*) Select (.*) for the (.*)\.?/,
        handler: (testCaseKey, testData) => async (section: string, option: string, agent: string) => {
            const driver = await getAdminDriver();
            const normalisedSection = section.toLowerCase().trim();
            switch (normalisedSection) {
                case "risk indicators": // the risk indicator (option) should not be lowercased
                    await smSteps.clickRedFlag(driver, option, agent);
                    break;
                default:
                    throw new Error(`Unknown section name provided ${section}`);
            }
        }
    },
    {
        regex: /Red Flags for (.*) have been flagged\.?/,
        handler: (testCaseKey, testData) => async (risk: string) => {
            const driver = await getAdminDriver();

            const trimmedRisk = risk.trim();
            const searchTerm = testData["search term"].toLowerCase().trim();
            const searchEngine = testData["search engine"].toLowerCase().trim();

            // assert that the red flag is present
            await smSteps.assertRedFlag(driver, searchTerm, trimmedRisk, searchEngine);
        }
    },
    {
        regex: /On the (.*), browse to (.*) and view the video\.?/,
        handler: (testCaseKey, testData) => async (agent: string, site: string) => {
            const thisAgent = agent.toLowerCase().trim();
            const normalisedSite = site.toLowerCase().trim();
            console.log(`This agent: ${thisAgent}`);
           
            // including a switch statement in case something like vimeo or other is added
            switch (normalisedSite) {
                case "youtube":
                    console.log("The step to view a video has already been done as a before step.")
                    break;
                default:
                    throw new Error(`Unknown video site provided: ${site}`);
            }

        }
    },
    {
        regex: /(.*) video is watched to generate data\.?/,
        handler: (testCaseKey, testData) => async (site: string) => {
            console.log("The step to wait for a video has already been done as a before step.")
        }
    },
    {
        regex: /Check that a (.*) Video (?:have|have) been recorded\.?/,
        handler: (testCaseKey, testData) => async () => {
            const videoTitle = testData["Video Title"]; // case-sensitive
            const driver = await getAdminDriver();
            await smSteps.findVideoInTable(driver, videoTitle);
        }
    },
    {
        regex: /Video shows a thumbnail, title is accurate, views are counted, users are counted\.?/,
        handler: (testCaseKey, testData) => async () => {
            const videoTitle = testData["Video Title"]; // case-sensitive
            const videoUrl = testData["Video Url"];
            const driver = await getAdminDriver();
            await smSteps.assertVideoDetails(driver, videoTitle, videoUrl);
        }
    },
    {
        regex: /Check that Video Details have been recorded\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            const videoTitle = testData["Video Title"]; // case-sensitive
            await smSteps.assertVideoTitleIsDisplayed(driver, videoTitle);
        }
    },
    {
        regex: /Timestamp is accurate, username is recorded, MAC is recorded, youtube video is embedded, youtube video description is displayed\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            const agent = testData["Agent"];
            const videoUrl = testData["Video Url"];
            const videoDescription = testData["Video Description"];
            await smSteps.assertVideoDetailDetails(driver, agent, videoUrl, videoDescription);
        }
    },
    {
        regex: /The Test Policy modal will display that (.*) is allowed and matches no policies\.?/,
        handler: (testCaseKey, testData) => async (websiteName: string) => {
            const driver = await getAdminDriver();
            const normalisedWebsiteName = websiteName.toLowerCase().trim();
            console.log(`Asserting ${normalisedWebsiteName} is displayed as allowed and matches no policies`);
            await smSteps.assertWebsiteAllowedWithNoPolicies(driver);
        }
    },
    {
        regex: /Fill out the Website and User Fields\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            const website = testData["Website"];
            const username = testData["User"];
            console.log(`input the ${website} and ${username} fields`);
            await smSteps.inputWebsiteAndUser(driver, website, username);
        }
    },
    {
        regex: /(.*) and (.*) is displayed in the Test Policy modal\.?/,
        handler: (testCaseKey, testData) => async (website:string, userName:string) => {
            const driver = await getAdminDriver();
            const normalisedWebsite = website.toLowerCase().trim();
            const normalisedUserName = userName.toLowerCase().trim();
            console.log(`Confirm "${normalisedWebsite}" and "${normalisedUserName}" is displayed in the Test Policy modal`);
            let fieldLocator = testPolicyModal.websiteInput();
            await smSteps.assertTextInInputField(driver, fieldLocator, normalisedWebsite);
            fieldLocator = testPolicyModal.userInput();
            await smSteps.assertTextInInputField(driver, fieldLocator, normalisedUserName);
        }
    },
    {
        regex: /The Website and User Fields will be cleared out\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            console.log("Assert website and user in Test Policy modal has been cleared out");
            await smSteps.assertWebsiteAndUserCleared(driver);
        }
    },
    {
        regex: /Enter in the (.*) and select (.*)\.?/,
        handler: (testCaseKey, testData) => async (name: string, action: string) => {
            const driver = await getAdminDriver();
            console.log(`Entering ${name} and select ${action}`);
            await smSteps.enterNameAndClickAdd(driver, name);
        }
    },
    {
        regex: /Determine the Current Time\.?/,
        handler: (testCaseKey, testData) => async () => {
            // The current time is determined at runtime. If this code runs on a machine set to a different time zone 
            // (e.g., Melbourne) while the testing VM uses Perth time, it can result in time period test failed.
            // To avoid discrepancies, ensure the machine running this code is set to the Perth time zone.
            // This shouldn't be an issue during scheduled runs on VMs, as both are configured to use Perth time. 
            const time = utils.getCurrentTimeVariants();
            currentTime = time.current;
            plusTime = time.plus;
            minusTime = time.minus;
            console.log(`Current Time is ${currentTime}`);
        }
    },
    {
        regex: /Current Time is selected for the automation test suite\.?/,
        handler: (testCaseKey, testData) => async () => {
            // there is nothing to assert for this step
            console.log("Current Time is selected for the automation test suite.");
        }
    },
    {
        regex: /Enter the Current Time - 2 minute and Current Time \+ 2 minute in the Time Fields\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            await smSteps.enterVariableTime(driver, minusTime, plusTime);
        }
    },
    {
        regex: /Red Error Message Start time should be less than end time, and entered in HH:MM format. For example, 08:30 to 22:00.Should disappear with a correct time period entered\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            await smSteps.assertErrorTextDisappear(driver);
        }
    },
    {
        regex: /Select the Day Fields\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            const daysToSelect: string[] = Object.values(testData);
            for (const day of daysToSelect) {
                await smSteps.selectDays(driver, day);
            }
        }
    },
    {
        regex: /Days are selected and the Date Field disappears\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            const daysToSelect: string[] = Object.values(testData);
            await smSteps.assertDaySelectEffect(driver, daysToSelect);
        }
    },
    {
        regex: /Wait for the time in Current Time \+ (\d+) minute[s]? to elapse\.?/,
        handler: (testCaseKey, testData) => async (minuteStr: string) => {
            console.log("Instead of explicitly waiting for time to elapse, it's better to delete the time period(from automation perspective)")
            const driver = await getAdminDriver();
            await smSteps.deleteAllTimePeriodEntries(driver);
        }
    },
    {
        regex: /Block filter policy should no longer apply as the time period has elapsed\.?/,
        handler: (testCaseKey, testData) => async (minuteStr: string) => {
            // there is nothing to assert for this step
            console.log("Block filter policy should no longer apply as the time period has elapsed.")
        }
    },
    {
        regex: /Validate Bypass Code\.?/,
        handler: (testCaseKey, testData) => async () => {
            const driver = await getAdminDriver();
            await smSteps.assertBypassCodeDetails(driver);
        }
    },
    {
        regex: /Bypass Code is valid and ready to use\.?/,
        handler: (testCaseKey, testData) => async () => {
            // clear test context for the bypass code values as they have been asserted in the previous step
            // however, the bypass code value is still required
            console.log("Clearing the test context for the bypass code values as assertions have been successful");
            testContext.bypassCodeCreation = undefined;
            testContext.bypassCodeExpiry = undefined;
            console.log(`Test context cleared for bypass code: ${testContext.bypassCodeValue}`);
        }
    },
    {
        regex: /On the (?:Block|Blocked) Page enter in the Generated Bypass Code\.?/,
        handler: (testCaseKey, testData) => async () => {
            if(testContext.agent) {
                const driver = await getStudentDriver(testContext.agent);
                console.log(`Entering the generated bypass code: ${testContext.bypassCodeValue}`);
                await utils.enterBypassCodeOnBlockedPage(driver);
            } else {
                throw new Error("testContext.agent has not yet been set... Reached On the Block Page enter in the Generated Bypass Code");
            }
            
        }
    },
    {
        regex: /(?:Block|Blocked) page accepts the Bypass Code and redirects user to the previously blocked website (.*)\.?/,
        handler: (testCaseKey, testData) => async (website: string) => {
            if(testContext.agent) {
                const driver = await getStudentDriver(testContext.agent);
                await utils.assertBypassCodeSuccess(driver);
                await utils.verifyUrlIsNotBlocked(driver, blockedPageUrl);
            } else {
                throw new Error("testContext.agent has not yet been set... Reached Block page accepts the Bypass Code and redirects user to the previously blocked website");
            }
        }
    }
];

const unmatchedStepsReportFile = path.join(__dirname, 'unmatched_steps_report.txt');

/**
 * Writes the provided content to the file defined in "unmatchedStepsReportFile"
 * @param content 
 */
const writeToFile = (content: string): void => {
    fs.appendFileSync(unmatchedStepsReportFile, content + '\n');
};

/**
 * Used to both check whether all the test steps have a match, and to execute the handler for each test step if that is true.
 * Test steps will only run if all the steps in the test case have a match
 * @param steps The test steps that have been extracted from a Zephyr test execution, inclusive of both a "description" and "expectedResult".
 * @param handlers The handlers (stepPatterns) used to match a step with an existing regular expression, generally followed by the execution of an associated function(s).
 * @param testCaseKey The test case key of a test case in Zephyr.
 * @param testData Any test data stored in the test execution, which typically includes parameters specific to a test execution.
 * @returns true if all the test steps having matching expressions
 */
export const matchStepsToHandlers = async (steps: string[], handlers: RegexHandler[], testCaseKey: string, testData: any): Promise<boolean> => {
    let allStepsMatched = true;
    const stepsToExecute: Function[] = []; // Store the handlers to be executed later
    for (let i = 0; i < steps.length; i++) {
        let matched = false;
        const eachStep = steps[i];
        for (const { regex, handler } of handlers) {
            const match = eachStep.match(regex);
            if (match) {
                matched = true;

                // Store the handler function and its arguments to be invoked later
                const handleStep = handler(testCaseKey, testData[i]);
                stepsToExecute.push(() => handleStep(...match.slice(1))); // Add handler to execute list
                break;
            }
        }

        if (!matched) {
            console.log(`No match for test step: ${eachStep}`);
            
            const stepHash = MD5(eachStep).toString();

            const jiraTaskExists = await utils.checkExistingJiraTasks(stepHash);
            if (jiraTaskExists) {
                console.log(`A Jira ticket already exists for: ${stepHash}`);
                writeToFile(`No match for step: "${eachStep}"\nExisting Jira ticket: ${stepHash}\n`);
            } else {
                console.log(`Create a new Jira task to implement: ${stepHash}`);
                if(config.Jira.createNewTasksForMissingSteps === true) {
                    await utils.createJiraTask(stepHash, `From ${testCaseKey} - Create a test step for: \n\n${eachStep}`);
                    writeToFile(`No match for step: "${eachStep}"\nNew Jira ticket created: ${stepHash}\n`);
                } else {
                    writeToFile(`No match for step: "${eachStep}"\nJira ticket creation skipped by config\n`);
                }
                    
            }

            allStepsMatched = false;
            // TO FIX?
        // } else { //matched
        //     const stepHash = MD5(eachStep).toString();
        //     const jiraTaskExists = await utils.checkExistingJiraTasks(stepHash);
        //     if (jiraTaskExists) {
        //         console.log(`The jira ticket named: ${stepHash} can now be closed`);
        //         writeToFile(`Step matched: "${eachStep}"\nAssociated Jira ticket can be closed: ${stepHash}\n`);
        //     }
        }
    }
    
    // If all steps matched, execute the stored handlers
    if (allStepsMatched) {
        console.log("All steps matched. Proceeding with execution.");
        for (const execute of stepsToExecute) {
            await execute(); // Execute each handler in order
        }
    } else {
        console.log("Not all steps matched. Skipping execution.");
    }
    
    return allStepsMatched;
};