import { By, Key, WebDriver, until } from "selenium-webdriver";
import credentials from "../config/credentials.json";
import config from "../config/config.json";
import * as utils from "../support/utils";
import { Page_SignIn } from "../pageObjects/SchoolManager/page_signIn";
import { Page_ContentFiltering } from "../pageObjects/SchoolManager/ContentFiltering/page_contentFiltering";
import { Page_MobileAgent } from "../pageObjects/SchoolManager/Configuration/MobileAgent/page_mobileAgent";
import { Modal_CreatePolicy } from "../pageObjects/SchoolManager/ContentFiltering/modal_createPolicy";
import { Modal_TestPolicy } from "../pageObjects/SchoolManager/ContentFiltering/modal_testPolicy";
import { Modal_EditPolicy } from "../pageObjects/SchoolManager/ContentFiltering/modal_editPolicy";
import { Modal_CategorySearch } from "../pageObjects/SchoolManager/ContentFiltering/modal_categorySearch";
import { Modal_DeletePolicy } from "../pageObjects/SchoolManager/ContentFiltering/modal_deletePolicy";
import { Page_Objects } from "../pageObjects/SchoolManager/Configuration/Objects/page_objects";
import { Page_Time_Periods } from "../pageObjects/SchoolManager/Configuration/Objects/page_time_periods";
import { Modal_AddObjectPool } from "../pageObjects/SchoolManager/Configuration/Objects/modal_addObjectPool";
import { Page_Pool } from "../pageObjects/SchoolManager/Configuration/Objects/page_pool";
import { Modal_CreateNewEntry } from "../pageObjects/SchoolManager/Configuration/Objects/modal_createNewEntry";
import { Modal_DeleteObjectPool} from "../pageObjects/SchoolManager/Configuration/Objects/modal_deleteObjectPool";
import { Page_Searches } from "../pageObjects/SchoolManager/CyberSafety/page_searches";
import { Page_Dashboard } from "../pageObjects/SchoolManager/Statistics/page_dashboard";
import { Page_RedFlags} from "../pageObjects/SchoolManager/CyberSafety/page_redFlags";
import { Page_UserSearchHistory } from "../pageObjects/SchoolManager/CyberSafety/page_userSearchHistory";
import { Page_Videos } from "../pageObjects/SchoolManager/CyberSafety/page_videos";
import { Page_VideoDetail } from "../pageObjects/SchoolManager/CyberSafety/page_videoDetail";
import { Page_ContentModification } from "../pageObjects/SchoolManager/ContentModification/page_contentModification";
import { Modal_CreatePolicyContentMod } from "../pageObjects/SchoolManager/ContentModification/modal_createPolicyContentMod";
import { Modal_DeletePolicyContentMod } from "../pageObjects/SchoolManager/ContentModification/modal_deletePolicyContentMod";
import { Page_BypassCodesAvailable } from "../pageObjects/SchoolManager/BypassCodes/page_bypassCodesAvailable";
import { Modal_AddCode } from "../pageObjects/SchoolManager/BypassCodes/modal_addCode";
import assert from "assert";

type envconfig = keyof typeof config.schoolManager;
type envcredentials = keyof typeof credentials.env;

let env:        string = process.env.AGENT_ENV as string;
if(!env || !(env in config.schoolManager)|| !(env in credentials.env))  env = "stg";

const schoolManagerUrl = config.schoolManager[env as envconfig].url;
const schoolManagerAdminUsername = credentials.env[env as envcredentials].schoolManager.adminUsername;
const schoolManagerAdminPassword = credentials.env[env as envcredentials].schoolManager.adminPassword;
const schoolManagerDeviceId = credentials.env[env as envcredentials].schoolManager.deviceId;
const lwWindows10AgentUser = credentials.env[env as envcredentials].schoolManager.lwWindows10AgentUser;
const lwWindows11AgentUser = credentials.env[env as envcredentials].schoolManager.lwWindows11AgentUser;
const lwBrowserExtensionMV3User = credentials.env[env as envcredentials].schoolManager.lwBrowserExtensionMV3User;
const waitTime = config.global.waitTime;
const extendedWaitTime = waitTime * 3; // for elements requiring a longer wait time
const cleanUpTime = 3000; // time to wait for cleanup to find elements
const contentFilteringPage = new Page_ContentFiltering();
const createPolicyModal = new Modal_CreatePolicy();
const testPolicyModal = new Modal_TestPolicy();
const editPolicyModal = new Modal_EditPolicy();
const categorySearchModal = new Modal_CategorySearch();
const mobileAgentPage = new Page_MobileAgent();
const objectsPage = new Page_Objects();
const addObjectPoolModal = new Modal_AddObjectPool();
const poolPage = new Page_Pool();
const createNewEntryModal = new Modal_CreateNewEntry();
const searchesPage = new Page_Searches();
const statisticsDashboardPage = new Page_Dashboard();
const redFlagsPage = new Page_RedFlags();
const userSearchHistoryPage = new Page_UserSearchHistory();
const videosPage = new Page_Videos();
const videoDetailPage = new Page_VideoDetail();
const timePeriodsPage = new Page_Time_Periods();
const contentModPage = new Page_ContentModification();
const createPolicyModalContentMod = new Modal_CreatePolicyContentMod();
const deletePolicyModalContentMod = new Modal_DeletePolicyContentMod();
const bypassCodesAvailablePage = new Page_BypassCodesAvailable();
const addCodeModal = new Modal_AddCode();

/**
 * Uses Credentials.json
 * Contains steps to log into School Manager using the given WebDriver
 * @param driver 
 */
export const signIn = async (driver: WebDriver): Promise<void> => {
    const path: string = "/login";
    
    const signInPage = new Page_SignIn();

    console.log(`Navigating to ${schoolManagerUrl}/login...`);
    await driver.get(`${schoolManagerUrl}${path}`);
   
    console.log(`Entering username...`)
    if (schoolManagerAdminUsername !== "") {
        await utils.inputField(driver, signInPage.usernameField(), schoolManagerAdminUsername);
    } else {
        console.error("School Manager Admin Username is missing from credentials.json");
        throw new Error;
    }

    console.log(`Entering password...`)
    if (schoolManagerAdminPassword !== "") {
        await utils.inputField(driver, signInPage.passwordField(), schoolManagerAdminPassword, true);
    } else {
        console.error("School Manager Admin Password is missing from credentials.json");
        throw new Error;
    }

    // Find the device
    // Due to new qoria auth changes it can take some time for this page to load
    // Therefore, use an increase waitTime
    const deviceWaitTime = waitTime * 2;
    console.log(`Selecting device ${schoolManagerDeviceId}`);
    const selectedDevice = await driver.wait(
        until.elementLocated(signInPage.deviceLink(schoolManagerDeviceId)), 
        deviceWaitTime, 
        "Device link not found within wait time");
    await Promise.all([
        await driver.wait(
            until.elementIsVisible(selectedDevice), 
            deviceWaitTime,
            "Device link is not visible within wait time"
        ),
        await driver.wait(
            until.elementIsEnabled(selectedDevice),
            deviceWaitTime,
            "Device link is not enabled within wait time"
        ),
        await selectedDevice.click(),
        await driver.wait(until.urlIs(`${schoolManagerUrl}/surfwize/dashboard`), waitTime)
    ]);
    console.log(`Sign in process is complete!`);
};

/**
 * Creates a policy in school mananager
 * Parameters are passed to configure the rule
 * Type is currently only configured to use signatures
 * Criteria is currently only configured for "none" criteria, or "user" criteria
 * Values should be derived from testData where possible, rather than hardcoded.
 * @param driver
 * @param name
 * @param agent string: "Windows Agent" or "Browser Extension MV3"
 * @param type string: "signature", TODO: "url", TODO: "Searches for x"
 * @param criteria string: "none", "user" or TODO: "group"
 * @param action string: "block" or "allow"
 * @param redirect string: "true" or "false". Only required for a block rule.
 * @param blockedPage string: "true" or "false". Only required for a block rule.
 * @param alert string: "true" or "false". Only required for a block rule.
 * @param quarantine string: "true" or "false". Only required for a block rule.
 * @param locked string: "true or false".
 * @param redirectUrl string: any website eg "http://google.com". Only required for a block rule.
 */
export const createPolicy = async (
    testCaseKey: string,
    driver: WebDriver,
    name: string,
    agent: string,
    type: string,
    criteria: string,
    action: string,
    locked: string,
    redirect?: string,
    blockedPage?: string,
    alert?: string,
    quarantine?: string,
    redirectUrl?: string,
): Promise<void> => {
    const path: string = "/filtering/policies"

    console.log(`Navigating to ${schoolManagerUrl}/filtering/policies`);
    await driver.get(`${schoolManagerUrl}${path}`);

    /**
     * Confirms that the given WebDriver has loaded the correct page, using the heading
     * @param driver 
     */
    const verifyPageHeading = async (driver: WebDriver): Promise<void> => {
        console.log(`Checking for Content Filtering page`);
        try {
            const headingLocator = contentFilteringPage.heading();
            const heading = await driver.wait(until.elementLocated(headingLocator), waitTime, "Heading not located within wait time");
            await driver.wait(until.elementIsVisible(heading), waitTime, "Content Filtering heading is not visible");
            console.log("Confirmed: On the Content Filtering page");
        } catch (error) {
            console.error("Error: Not on the Content Filtering page", error);
            throw error;
        }
    };

    /**
     * clicks on the Create Policy button and waits for the modal to appear
     * @param driver 
     */
    const clickCreatePolicyButton = async (driver: WebDriver): Promise<void> => {
        console.log(`Creating policy`);
        try {
            console.log(`Clicking Create Policy button`);
            const createPolicyBtnLocator = contentFilteringPage.headerButton("Create Policy");
            const createPolicyBtn = await driver.wait(until.elementLocated(createPolicyBtnLocator), waitTime, "Button not located within wait time");
            await createPolicyBtn.click();
            const createPolicyModalHeaderLocator = createPolicyModal.heading();
            const modalHeaderElement = await driver.wait(
                until.elementLocated(createPolicyModalHeaderLocator),
                waitTime,
                "Create Policy modal header not located within wait time"
            );
            await driver.wait(
                until.elementIsVisible(modalHeaderElement),
                waitTime,
                "Create Policy modal header is not visible"
            );
            await utils.waitForAnimation();
        } catch (error) {
            console.error("Error: Create Policy modal did not open", error);
            throw error;
        }
    };

    /**
     * Enters the policy name and confirms that it has been entered correctly in the UI
     * @param driver 
     */
    const enterName = async (driver: WebDriver): Promise<void> => {
        const concatName = `${await utils.getParentFolderName()}_${name}_${testCaseKey}`
            .replace(/\u200B$/, "");
        try {
            console.log(`Entering policy name`);
            const nameInputFieldLocator = createPolicyModal.inputField("Enter a policy name");
            const nameInputField = await driver.findElement(nameInputFieldLocator);
            await nameInputField.click();
            await nameInputField.sendKeys(concatName);
            const enteredText = await nameInputField.getAttribute("value");
            if (enteredText === concatName) {
                console.log(`${concatName} correctly entered`);
            } else {
                console.error(`Text entered incorrectly. Expected: ${concatName}, Found: ${enteredText}`);
                throw new Error("Entered text does not match the expected text");
            }
        } catch (error) {
            console.error("Error during entering or verifying policy name", error);
            throw error;
        }
    };

    /**
     * Selects the provided policy type from the options available
     * Will check that the correct type has been selected in the UI
     * @param driver 
     * @param type 
     */
    const selectType = async (driver: WebDriver, type: string): Promise<void> => {
        if (type.startsWith("Searches for")) {
            try {
                console.log(`Selecting type ${type}`);
                const cleanType = type.replace(/\u200B/g, ''); //type contains zero-width space https://apps.timwhitlock.info/unicode/inspect?s=searches+for+violence%E2%80%8B
                const typeDropDownLocator = createPolicyModal.inputField("Search for one or more website/signature");
                const typeDropDownField = await driver.wait(until.elementLocated(typeDropDownLocator), waitTime);
                await typeDropDownField.click();
                await utils.waitForAnimation(); //wait for the drop-down animation
                // Scroll to the bottom
                const scrollableContainer = await driver.findElement(createPolicyModal.typeScrollableContainer());
                await driver.executeScript("arguments[0].scrollTop = arguments[0].scrollHeight + 50", scrollableContainer);

                const selectType = await driver.wait(
                    until.elementLocated(By.xpath(`//span[text()="${cleanType}"]/parent::button`)),
                    waitTime,
                    `Element for type "${cleanType}" not found.`
                );
                await driver.wait(
                    until.elementIsVisible(selectType),
                    waitTime,
                    `Element for type "${cleanType}" is not visible.`
                );
                await driver.executeScript("arguments[0].scrollIntoView(true);", selectType);
                await selectType.click();

                const selectedTypeLocator = By.id("Multiple Selector-0-chip");
                await driver.wait(until.elementIsVisible(driver.findElement(selectedTypeLocator)), waitTime, "Selected type is not visible");
                // click out of the type field as the drop down remains open
                const nameInputFieldLocator = createPolicyModal.inputField("Enter a policy name");
                const nameInputField = await driver.findElement(nameInputFieldLocator);
                await nameInputField.click();
            } catch (error) {
                console.error("Error occurred when selecting type", error);
                throw error;
            }

        } else if (type.startsWith("Custom Search List") || type.startsWith("Custom Website List")) {
            try {
                console.log(`Selecting type ${type}`);
                const cleanType = type.toLowerCase().trim(); // the matcher is not case sensitive when finding the object by sending keys
                const typeDropDownLocator = createPolicyModal.inputField("Search for one or more website/signature");
                const typeDropDownField = await driver.wait(until.elementLocated(typeDropDownLocator), waitTime);
                await typeDropDownField.click();
                await utils.waitForAnimation(); //wait for the drop-down animation
                try {
                    console.log(`Searching for ${cleanType} in the input field`);
                    await typeDropDownField.sendKeys(cleanType);
                } catch (error) {
                    console.error("Error when sending keys", error);
                    throw new Error;
                }
                const selectOptionLocator = `div[aria-describedby="option list popup"]`;
                // optionListPopup will show both the object and a url entry, refining the css limits it to just the entry
                const searchListOption = `${selectOptionLocator} ul[role="listbox"] li[role="option"]`;

                console.log("Locating search list option");
                const selectType = await driver.wait(
                    until.elementLocated(By.css(searchListOption)),
                    extendedWaitTime, // this seems to take longer than other searches, increase the wait time
                    `Element for type "${cleanType}" not found.`
                );
                console.log(`Located search list option`);
                await selectType.click();

                const selectedTypeLocator = By.id("Multiple Selector-0-chip");
                await driver.wait(until.elementIsVisible(driver.findElement(selectedTypeLocator)), waitTime, "Selected type is not visible");
                // click out of the type field as the drop down remains open
                const nameInputFieldLocator = createPolicyModal.inputField("Enter a policy name");
                const nameInputField = await driver.wait(
                    until.elementLocated(nameInputFieldLocator),
                    waitTime,
                    "Name input field not located within wait time"
                )
                await nameInputField.click();
                
            } catch (error) {
                console.error("Error occurred when selecting type", error);
                throw error;
            }
        // cases for safe search for agents
        // its really a url policy, so the functionality will be the same as the url case, without a hardcoded url in this instance
        } else if (type.includes("familyzonedns")) {
            try {
                console.log(`Selecting type ${type}`);
                const typeDropDownLocator = createPolicyModal.inputField("Search for one or more website/signature");
                const typeDropDownField = await driver.wait(until.elementLocated(typeDropDownLocator), waitTime);
                await typeDropDownField.click();
                await utils.waitForAnimation(); //wait for the drop-down animation
                await typeDropDownField.sendKeys(type);
                const typeLocator = createPolicyModal.urlPolicy(type);
                const selectType = await driver.findElement(typeLocator);
                await selectType.click();
                    // the id for the selected type increases by 1 if additional types are added
                // would need to add logic to increase by 1 if this is a future requirement
                const selectedTypeLocator = By.id("Multiple Selector-0-chip");
                await driver.wait(until.elementIsVisible(driver.findElement(selectedTypeLocator)), waitTime, "Selected type is not visible");
                // click out of the type field as the drop down remains open
                const nameInputFieldLocator = createPolicyModal.inputField("Enter a policy name");
                const nameInputField = await driver.findElement(nameInputFieldLocator);
                await nameInputField.click();
            } catch (error) {
                console.error("Error occurred when selecting type", error);
                throw error;
            }
        
        } else {
            const normalisedType = type.toLowerCase().trim();
            
            switch (normalisedType) {
                // the school manager filtering page does not distinguish between theme, category or signature - it's more of an appindex thing
                // can use the same function whenever a signature/category/theme whatever is used
                case "signature": 
                    await selectSignatureType(driver, "Arts and Entertainment", true);
                    break;
                case "category pornography": 
                    await selectSignatureType(driver, "Pornography", false, "porn");
                    break;
                case "theme gaming": 
                    await selectSignatureType(driver, "Gaming", true);
                    break;
                case "signature youtube":
                    await selectSignatureType(driver, "YouTube", false, "youtube");
                    break;
                case "streaming media":
                    await selectSignatureType(driver, "Streaming Media", false, "media");
                    break;
                case "content delivery":
                    await selectSignatureType(driver, "Content Delivery", false, "cdnandcloud");
                    break;
                case "vooks":
                    await selectSignatureType(driver, "Vooks", false, "vooks");
                    break;
                case "signature google search":
                    await selectSignatureType(driver, "Google Search", false, "googlesearch");
                    break;
                case "signature bing":
                    await selectSignatureType(driver, "Bing", false, "bing");
                    break;
                case "url": {
                // block abc.net.au when a rule uses url, can be changed
                // at present, the specific url is not present in the test case it's just checking that any url type would block
                    const urlType = "youtube.com";
                    try {
                        console.log(`Selecting type ${urlType} url`);
                        const typeDropDownLocator = createPolicyModal.inputField("Search for one or more website/signature");
                        const typeDropDownField = await driver.wait(until.elementLocated(typeDropDownLocator), waitTime);
                        await typeDropDownField.click();
                        await utils.waitForAnimation(); //wait for the drop-down animation
                        console.log(`Type drop down field has been expanded, selecting type ${urlType}`);
                        await typeDropDownField.sendKeys(urlType);
                        const typeLocator = createPolicyModal.urlPolicy(urlType);
                        const selectType = await driver.wait(
                            until.elementLocated(typeLocator),
                            waitTime,
                            "Expected to find the type within the wait time"
                        );
                        await selectType.click();
                        // the id for the selected type increases by 1 if additional types are added
                        // would need to add logic to increase by 1 if this is a future requirement
                        const selectedTypeLocator = By.id("Multiple Selector-0-chip");
                        await driver.wait(until.elementIsVisible(driver.findElement(selectedTypeLocator)), waitTime, "Selected type is not visible");
                        // click out of the type field as the drop down remains open
                        const nameInputFieldLocator = createPolicyModal.inputField("Enter a policy name");
                        const nameInputField = await driver.findElement(nameInputFieldLocator);
                        await nameInputField.click();
                    } catch (error) {
                        console.error("Error occurred when selecting type", error);
                        throw error;
                    }
                    break;
                }
                case "http traffic via directip": {
                    try {
                        console.log(`Selecting type HTTP traffic via DirectIP`);
                        const typeDropDownLocator = createPolicyModal.inputField("Search for one or more website/signature");
                        const typeDropDownField = await driver.wait(until.elementLocated(typeDropDownLocator), waitTime);
                        await typeDropDownField.click();
                        await utils.waitForAnimation(); //wait for the drop-down animation
                        await typeDropDownField.sendKeys("HTTP traffic via DirectIP");
                        const typeLocator = createPolicyModal.httpTrafficViaDirectIP();
                        const selectType = await driver.findElement(typeLocator);
                        await selectType.click();
                        // the id for the selected type increases by 1 if additional types are added
                        // would need to add logic to increase by 1 if this is a future requirement
                        const selectedTypeLocator = By.id("Multiple Selector-0-chip");
                        await driver.wait(until.elementIsVisible(driver.findElement(selectedTypeLocator)), waitTime, "Selected type is not visible");
                        // click out of the type field as the drop down remains open
                        const nameInputFieldLocator = createPolicyModal.inputField("Enter a policy name");
                        const nameInputField = await driver.findElement(nameInputFieldLocator);
                        await nameInputField.click();
                    } catch (error) {
                        console.error("Error occurred when selecting type", error);
                        throw error;
                    }
                    break;
                }
                default: {
                    throw new Error(`Unsupported type: ${type}`);
                }
            }
        }
    };
    
    /**
     * Selects the given critera from the options available
     * Will ensure that the correct criteria has been selected in the UI
     * @param driver 
     * @param criteria 
     */
    const selectCriteria = async (driver: WebDriver, criteria: string): Promise<void> => {
        let username: string = "";

        try {
            if (criteria.toLowerCase() === "none" || null) {
                console.log("No criteria selected, going to next step");
            } else {
                console.log(`Selecting criteria`);
                const criteriaDropDownLocator = createPolicyModal.inputField("Select Criteria");
                const criteriaDropDownField = await driver.findElement(criteriaDropDownLocator);
                await criteriaDropDownField.click();

                const criteriaLocator = createPolicyModal.criteria(criteria);
                const selectCriteria = await driver.wait(until.elementLocated(criteriaLocator), waitTime);
                await selectCriteria.click();
                // the id for the selected criteria increases by 1 if additional criteria are added
                // would need to add logic to increase by 1 if this is a future requirement
                const selectedCriteriaLocator = By.id("criteria-selector-0-chip");
                await driver.wait(until.elementIsVisible(driver.findElement(selectedCriteriaLocator)), waitTime, "Selected criteria is not visible");
                // click out of the criteria field as the drop down remains open
                const nameInputFieldLocator = createPolicyModal.inputField("Enter a policy name");
                const nameInputField = await driver.findElement(nameInputFieldLocator);
                await nameInputField.click();
    
                // enter a value for the criteria based on previous selection
                const dropdownOptionsLocator = By.css('li[data-testid^="option-"]');
                switch(criteria.toLowerCase().trim()) {
                    // there are more possible cases (see criteria in modal_createPolicy.ts)
                    // for now, adding user and group as these have test cases
                    case "user":
                        const addUserLocator = createPolicyModal.inputField("Search Users");
                        const addUser = await driver.findElement(addUserLocator);
                        await addUser.click();
                        console.log(`Selecting the appropriate user for the ${agent}`);
                        switch(agent.toLowerCase()) {
                            case "windows 10 agent":
                                username = credentials.env[env as envcredentials].schoolManager.lwWindows10AgentUser;
                                break;
                            case "windows 11 agent":
                                username = credentials.env[env as envcredentials].schoolManager.lwWindows11AgentUser;
                                break;
                            case "browser extension mv3":
                                username = credentials.env[env as envcredentials].schoolManager.lwBrowserExtensionMV3User;
                                break;
                            case "browser extension mv3 on network":
                                username = credentials.env[env as envcredentials].schoolManager.lwBrowserExtensionMV3User;
                                break;
                        }
                        console.log(`Entering ${username} as the ${criteria} criteria`);
                        await addUser.sendKeys(username);
    
                        console.log('Waiting for dropdown options to load');
                        await driver.wait(
                            until.elementLocated(dropdownOptionsLocator),
                            waitTime,
                            'Dropdown options did not load in time'
                        );
    
                        console.log(`Finding ${username} in the drop-down list`);
                        const selectUserLocator = createPolicyModal.selectUserCriteria(username);
                        
                        // Wait for the specific user option
                        await driver.wait(
                            until.elementLocated(selectUserLocator),
                            waitTime,
                            `Expected dropdown option for ${username} to appear`
                        );
    
                        const selectUser = await driver.wait(
                            until.elementIsVisible(await driver.findElement(selectUserLocator)),
                            waitTime,
                            `Expected ${username} to be visible`
                        );
                        await selectUser.click();
    
                        // click out of the criteria field as the drop down remains open
                        await nameInputField.click();
                        console.log("Confirming correct user added as criteria");
                        // 0-chip if only one user is selected
                        // logic would need to be added if it's multiple
                        await driver.wait(
                            until.elementIsVisible(
                                driver.findElement(
                                    By.xpath(`//a[@id="user-search-selector-0-chip"]/div[text() = "${username}"]`)
                                )
                            ), 
                        waitTime, `Expected user chip for ${username} is not visible`);
                        break;
    
                    case "group":
                        const addGroupLocator = createPolicyModal.inputField("Search Groups");
                        const addGroup = await driver.findElement(addGroupLocator);
                        await addGroup.click();
                        const group = credentials.env[env as envcredentials].schoolManager.filteringGroup;
                        console.log(`Entering ${group} as the ${criteria} criteria`);
                        await addGroup.sendKeys(group);
    
                        console.log('Waiting for dropdown options to load');
                        await driver.wait(
                            until.elementLocated(dropdownOptionsLocator),
                            waitTime,
                            'Dropdown options did not load in time'
                        );
    
                        console.log(`Finding ${group} in the drop-down list`);
                        const selectGroupLocator = createPolicyModal.optionListPopup();
                        
                        // Wait for the option list to be displayed
                        await driver.wait(
                            until.elementLocated(selectGroupLocator),
                            waitTime,
                            `Expected dropdown list for group criteria to be located`
                        );
    
                        const selectGroup = await driver.wait(
                            until.elementIsVisible(await driver.findElement(selectGroupLocator)),
                            waitTime,
                            `Expected dropdown list for group criteria to be visible`
                        );
                        await selectGroup.click();
    
                        // click out of the criteria field as the drop down remains open
                        await nameInputField.click();
                        console.log("Confirming correct group added as criteria");
                        // 0-chip if only one user is selected
                        // logic would need to be added if it's multiple
                        await driver.wait(
                            until.elementIsVisible(
                                driver.findElement(
                                    // group name shows as groupname (groupname@domain.com)
                                    By.xpath(`//a[@id="group-search-selector-0-chip"]/div[text()="${group} / ${group}@fztestschool100k.com (${group}@fztestschool100k.com)"]`)
                                )
                            ), 
                        waitTime, `Expected group chip for ${group} is not visible`);
                        break;

                    case "time periods":
                        const addTimePeriodLocator = createPolicyModal.inputField("Select Time Periods");
                        const addTimePeriod = await driver.findElement(addTimePeriodLocator);
                        await addTimePeriod.click();
                        const timePeriod = "School Hours";

                        console.log(`Entering ${timePeriod} as the ${criteria} criteria`);

                        // await addTimePeriod.sendKeys(timePeriod);

                        console.log(`Finding ${timePeriod} in the drop-down list`);
                        const selectTimePeriodLocator = createPolicyModal.optionListPopup();

                        // Wait for the option list to be displayed
                        await driver.wait(
                            until.elementLocated(selectTimePeriodLocator),
                            waitTime,
                            `Expected dropdown list for time period criteria to be located`
                        );

                        const selectTimePeriod = await driver.wait(
                            until.elementIsVisible(await driver.findElement(selectTimePeriodLocator)),
                            waitTime,
                            `Expected dropdown list for time period criteria to be visible`
                        );
                        await selectTimePeriod.click();

                        // click out of the criteria field as the drop down remains open
                        await nameInputField.click();
                        console.log("Confirming correct time period added as criteria");

                        await driver.wait(
                            until.elementIsVisible(
                                driver.findElement(
                                    By.xpath(`//a[@id="time period selector-0-chip"]/div[text()="${timePeriod}"]`)
                                )
                            ), 
                        waitTime, `Expected group chip for ${timePeriod} is not visible`);
                        break;
                }
            }
        } catch (error) {
            console.error("Error occurred when selecting criteria", error)
            throw error;
        }
    };

    /**
     * Selects the given action for the policy
     * Will ensure the action is correctly selected in the UI
     * @param driver 
     * @param action 
     */
    const selectAction = async (driver: WebDriver, action: string): Promise<void> => {
        if (action.toLowerCase() === "block") {
            console.log("Chosen action is Block, and Block is enabled by default, moving to next step")
        } else {
            try {
                console.log(`Selecting action`);
                const actionLocator = createPolicyModal.action(action);
                const actionIsCheckedLocator = createPolicyModal.actionIsChecked(action);
                const actionBtn = await driver.findElement(actionLocator);
                await driver.executeScript("arguments[0].click();", actionBtn);

                // Wait for the "actionIsChecked" element to be located
                await driver.wait(
                    until.elementLocated(actionIsCheckedLocator),
                    waitTime,
                    `Timeout waiting for the action checkbox for ${action}`
                );

                const actionIsChecked = await driver.findElement(actionIsCheckedLocator);
                const isSelected = await actionIsChecked.getAttribute("data-checked");
                if (isSelected !== null) {
                    console.log(`Action ${action} is selected`);
                } else {
                    console.error(`Action ${action} is not correctly selected`);
                    throw new Error(`Action ${action} was not able to be selected`);
                }
            } catch (error) {
                console.error("Error occurred when selecting action", error);
                throw error;
            }
        }
    };

    /**
     * If provided redirect variable is "true" then the redirect option is selected
     * Will ensure that redirect has been enabled attempt was made
     * @param driver 
     * @param redirect 
     */
    const enableRedirect = async (driver: WebDriver, redirect: string): Promise<void> => {

        if (redirect.toLowerCase() === "true") {
            try {
                console.log(`Enabling redirect checkbox`);
                const redirectCheckboxLocator = createPolicyModal.checkbox("Redirect");
                const redirectCheckbox = await driver.findElement(redirectCheckboxLocator);
    
                // Scroll the checkbox into view
                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", redirectCheckbox);
    
                // Wait for the checkbox to be visible and interactable
                await driver.wait(
                    until.elementIsVisible(redirectCheckbox),
                    waitTime,
                    "Redirect checkbox is not visible after scrolling"
                );
    
                await redirectCheckbox.click();
                // data-checked attribute is in the preceding label
                const redirectLabel = await driver.findElement(By.xpath(`//p[text()="Redirect"]/preceding::label[@data-checked]`));
                const isEnabled = await redirectLabel.getAttribute("data-checked");
                if (isEnabled !== null) {
                    console.log("Redirect is enabled");
                } else {
                    console.error("Redirect was not able to be enabled");
                    throw new Error("Redirect was not enabled.");
                }
            } catch (error) {
                console.error("Error occurred enabling redirect", error);
                throw error;
            }
        } else {
            console.log("Redirect is false, moving to next step");
        }
    };

    /**
     * Enters the provided redirect URL
     * Ensures the URL is entered correctly in the UI
     * @param driver 
     * @param redirectUrl 
     */
    const enterRedirectUrl = async (driver: WebDriver, redirectUrl?: string): Promise<void> => {
        if (redirectUrl === "none" || redirectUrl === null || redirectUrl === undefined) {
            console.log("No redirect url specified, moving to next step");
        } else {
            try {
                const redirectUrlFieldLocator = createPolicyModal.inputField("Enter url");
                const redirectUrlField = await driver.findElement(redirectUrlFieldLocator);
                await redirectUrlField.click();
                await redirectUrlField.sendKeys(redirectUrl);
                const isUrlEntered = await redirectUrlField.getAttribute("value");
                if (isUrlEntered === redirectUrl) {
                    console.log(`Redirect URL entered as ${redirectUrl}`);
                } else {
                    console.error(`Redirect URL has not been correctly entered. Expected: ${redirectUrl}, Found: ${isUrlEntered}`);
                    throw new Error("Redirect URL was not entered correctly.");
                }
            } catch (error) {
                console.error("Error occurred entering redirect url", error);
                throw error;
            }
        }
    }
    
    /**
     * If blockedPage is not "true", will untick the blocked page checkbox
     * Will ensure that the checkbox is unticked correctly in the UI
     * @param driver 
     * @param blockedPage 
     */
    const disableBlockedPage = async (driver: WebDriver, blockedPage: string): Promise<void> => {
        if (blockedPage.toLowerCase() === "true") {
            // the blocked page checkbox is enabled by default, don't need to do anything
            console.log("Blocked page is enabled by default, moving to next step");
        } else {
            try {
                console.log("Disabling Blocked Page checkbox");
                const blockedPageCheckboxLocator = createPolicyModal.checkbox("Blocked Page");
                const blockedPageCheckbox = await driver.findElement(blockedPageCheckboxLocator);
                await driver.executeScript("arguments[0].checked = false;", blockedPageCheckbox); //.click() is not working
                // the data-checked attribute is available in the following span, rather than in the blocked page checkbox
                console.log(`Checking the Blocked Page checkbox has been unticked`);
                const blockedPageCheckboxDataChecked = await driver.findElement(By.xpath(
                    `//p[text()="Blocked Page"]/ancestor::tr//input[@type="checkbox"]/following-sibling::span[1]`
                ));
                const isBlockedPageCheckboxDataChecked = await blockedPageCheckboxDataChecked.getAttribute("data-checked");
                if (isBlockedPageCheckboxDataChecked === null || isBlockedPageCheckboxDataChecked === "") {
                    console.log("Blocked Page checkbox has been correctly unchecked")
                } else {
                    console.error("Blocked Page checkbox is still checked when it should be unchecked");
                    throw new Error("Blocked Page checkbox was unable to be unchecked correctly");
                }
            } catch (error) {
               console.error("Error occurred when unchecking the Blocked Page checkbox", error)
            }
        }
    };

    /**
     * If provided alert variable is "true", will tick the alert checkbox
     * Will ensure that the alert checkbox is correctly ticked in the UI
     * @param driver 
     * @param alert 
     */
    const enableAlert = async (driver: WebDriver, alert: string): Promise<void> => {
        if (alert.toLowerCase() === "true") {
            try {
                console.log("Enabling Alert checkbox");
                const alertCheckboxLocator = createPolicyModal.checkbox("Alert");
                const alertCheckbox = await driver.findElement(alertCheckboxLocator);
                await alertCheckbox.click();
                // the data-checked attribute is available in the following span, rather than in the alert checkbox
                const alertCheckboxDataChecked = await driver.findElement(By.xpath(
                    `//p[text()="Alert"]/ancestor::tr//input[@type="checkbox"]/following-sibling::span[1]`
                ));
                const isAlertCheckboxDataChecked = await alertCheckboxDataChecked.getAttribute("data-checked");
                if (isAlertCheckboxDataChecked !== null) {
                    console.log("Alert checkbox has been correctly checked");
                } else {
                    console.error("Alert checkbox has not been correctly checked");
                    throw new Error("Alert checkbox was unable to be checked correctly");            }
            } catch (error) {
                console.error("Error occurred when checking the Alert checkbox");
                throw error;
            }
        } else {
            console.log("Alert is false, moving to next step")
        }
    };

    /**
     * If provided quarantine variable is "true", will tick the quarantine checkbox
     * Will ensure that the quarantine checkbox is correctly ticked in the UI
     * @param driver 
     * @param quarantine 
     */
    const enableQuarantine = async (driver: WebDriver, quarantine: string): Promise<void> => {
        if (quarantine.toLowerCase() === "true") {
            try {
                console.log("Enabling Quarantine checkbox");
                const quarantineCheckboxLocator = createPolicyModal.checkbox("Quarantine");
                const quarantineCheckbox = await driver.findElement(quarantineCheckboxLocator);
                await quarantineCheckbox.click();
                // the data-checked attribute is available in the following span, rather than in the Quarantine checkbox
                const quarantineCheckboxDataChecked = await driver.findElement(By.xpath(
                    `//p[text()="Quarantine"]/ancestor::tr//input[@type="checkbox"]/following-sibling::span[1]`
                ));
                const isQuarantineCheckboxDataChecked = await quarantineCheckboxDataChecked.getAttribute("data-checked");
                if (isQuarantineCheckboxDataChecked !== null) {
                    console.log("Quarantine checkbox has been correctly checked");
                } else {
                    console.error("Quarantine checkbox has not been correctly checked");
                    throw new Error("Quarantine checkbox was unable to be checked correctly");            }
            } catch (error) {
                console.error("Error occurred when checking the Quarantine checkbox");
                throw error;
            }
        } else {
            console.log("Quarantine is false, moving to next step");
        }
    };

    /**
     * If provided locked variable is "true", will tick the locked checkbox
     * Will ensure that the locked checkbox is correctly ticked in the UI
     * @param driver 
     * @param locked 
     */
    const enableLocked = async (driver: WebDriver, locked: string): Promise<void> => {
        if (locked.toLowerCase() === "true") {
            try {
                console.log("Enabling Locked checkbox");
                const lockedCheckboxLocator = createPolicyModal.checkbox("Locked");
                const lockedCheckbox = await driver.findElement(lockedCheckboxLocator);
                await lockedCheckbox.click();
                // the data-checked attribute is available in the following span, rather than in the Locked checkbox
                const lockedCheckboxDataChecked = await driver.findElement(By.xpath(
                    `//p[text()="Locked"]/ancestor::tr//input[@type="checkbox"]/following-sibling::span[1]`
                ));
                const isLockedCheckboxDataChecked = await lockedCheckboxDataChecked.getAttribute("data-checked");
                if (isLockedCheckboxDataChecked !== null) {
                    console.log("Locked checkbox has been correctly checked");
                } else {
                    console.error("Locked checkbox has not been correctly checked");
                    throw new Error("Locked checkbox was unable to be checked correctly");            }
            } catch (error) {
                console.error("Error occurred when checking the Locked checkbox");
            }
        } else {
            console.log("Locked is false, moving to next step");
        }
    };

    /**
     * clicks the save button and waits for the policy modal to close
     * @param driver 
     */
    const savePolicy = async (driver: WebDriver): Promise<void> => {
        try {
            await driver.findElements(By.className('userflowjs-resource-center-popout-frame'))
            .then(async (framesFound) => {
                if(framesFound.length > 0) {
                    await driver.switchTo().frame(framesFound[0]);
                    await driver.findElement(By.css('button[aria-label="Dismiss announcement"]')).click();
                    await driver.switchTo().defaultContent();
                }
            });

            console.log(`Saving policy`);
            const saveBtnLocator = createPolicyModal.button("save-policy-button");
            const createPolicyModalHeaderLocator = createPolicyModal.heading();
            const createPolicyModalHeader = await driver.findElement(createPolicyModalHeaderLocator);
            const saveBtn = await driver.findElement(saveBtnLocator);
            await saveBtn.click();
            // modal should close
            await driver.wait(until.stalenessOf(createPolicyModalHeader), waitTime, "Modal did not close in time");
            console.log("Policy saved successfully");
        } catch (error) {
            console.error("Error occurred when saving policy", error);
            throw error;
        }
    };

    // call all functions in order
    await verifyPageHeading(driver);
    await clickCreatePolicyButton(driver);
    await enterName(driver);
    await selectType(driver, type);
    await selectCriteria(driver, criteria);
    await selectAction(driver, action);
    if (action.toLowerCase() === "block") {
        await enableRedirect(driver, redirect!);
        await enterRedirectUrl(driver, redirectUrl);
        await disableBlockedPage(driver, blockedPage!);
        await enableAlert(driver, alert!);
        await enableQuarantine(driver, quarantine!);
    }
    await enableLocked(driver, locked);
    await savePolicy(driver);
};

/**
 * Asserts the created policy is present in the UI
 * Intended to be run before the policy is toggled on, but does not change behaviour
 * @param driver
 * @param name 
 */
export const assertPolicyCreated = async (testCaseKey: string, driver: WebDriver, name: string): Promise<void> => {
    const cleanName = name.replace(/\u200B$/, "")
    const extendedName = `${await utils.getParentFolderName()}_${cleanName}_${testCaseKey}`;
    const createdPolicyBtnLocator = contentFilteringPage.policyButton(extendedName);
    try {
        const createdPolicyBtn = await driver.findElement(createdPolicyBtnLocator);
        assert.ok(createdPolicyBtn, `Policy button with name "${extendedName}" should be present in the UI.`);
        console.log(`Policy "${extendedName}" found successfully in the UI.`);
    } catch (error) {
        console.error(`Policy "${extendedName}" not found in the UI.`);
        throw new Error(`Policy "${extendedName}" not found in the UI.`);
    }
};

/**
 * Toggles on a policy in the School Manager content filtering page.
 * Assumed the policy has been successfully created.
 * Requires the name of the policy to be passed as a "string".
 * @param driver 
 * @param name 
 */
export const enablePolicy = async (testCaseKey: string, driver: WebDriver, name: string): Promise<void> => {
    const extendedName = `${await utils.getParentFolderName()}_${name}_${testCaseKey}`
    console.log(`Enabling policy ${extendedName}`);
    try {
        await utils.waitForAnimation(2000);
        const policyToggleLocator = contentFilteringPage.tableElement(extendedName, "enable");
        const policyToggle = await driver.wait(until.elementLocated(policyToggleLocator), waitTime);
        await driver.executeScript("arguments[0].click();", policyToggle); // click doesn't work
    } catch (error) {
        console.error("Error when toggling on the policy", error);
    }
};

/**
 * Asserts the previously created policy is toggled on.
 * @param driver
 * @param name
 * @param expectedState - "on" or "off" 
 */
export const assertPolicyEnabled = async (testCaseKey: string, driver: WebDriver, name: string, expectedState: string): Promise<void> => {
    const cleanName = name.replace(/\u200B$/, ""); // Remove the trailing zero-width space (U+200B) from name, if present
    const extendedName = `${await utils.getParentFolderName()}_${cleanName}_${testCaseKey}`;

    const createdPolicyBtnLocator = contentFilteringPage.policyButton(extendedName);
    try {
        await utils.waitForAnimation(1000);
        const createdPolicyBtn = await driver.findElement(createdPolicyBtnLocator);
        const createdPolicyDataTestId = await createdPolicyBtn.getAttribute("data-testid");

        // Use the data-testid to find the toggle label
        const toggleLabelLocator = By.css(`label[data-testid='${createdPolicyDataTestId}-toggle']`);
        const toggleLabel = await driver.findElement(toggleLabelLocator);

        // Get the data-checked attribute to verify the toggle status
        let isToggledOn = await toggleLabel.getAttribute("data-checked");

        // Determine the actual state
        // If attribute exits, it's on; otherwise, it's off
        const isCurrentlyOn = isToggledOn !== null;

        // Determin the expected state
        const shouldBeOn = expectedState === "on";

        // Check if actual toggle state matches the expected state
        assert.strictEqual(
            isCurrentlyOn,
            shouldBeOn,
            `Policy "${extendedName}" should be toggled ${expectedState}, but it is actually ${isCurrentlyOn ? "on" : "off"}.`
        )
        console.log(`Policy "${extendedName}" has been correctly toggled ${expectedState}.`);
    } catch (error) {
        console.error(`Failed to assert that policy "${extendedName}" is enabled:`, error);
        throw new Error(`Policy "${extendedName}" was not toggled on correctly.`);
    }
};

/**
 * Deletes a policy in the School Manager content filtering page.
 * Assumes the policy to be deleted exists.
 * Requires the name of the policy to be passed as a "string".
 * @param driver 
 * @param name 
 */
export const deletePolicy = async (testCaseKey: string, driver: WebDriver, name: string): Promise<void> => {
    const cleanName = name.replace(/\u200B$/, "")
    const extendedName = `${await utils.getParentFolderName()}_${cleanName}_${testCaseKey}`;
    const contentFilteringPage = new Page_ContentFiltering();
    const deletePolicyModal = new Modal_DeletePolicy()

    try {
        const createdPolicyBtnLocator = contentFilteringPage.policyButton(extendedName);
        const createdPolicyBtn = await driver.findElement(createdPolicyBtnLocator);
        console.log("Clicking trash can icon");
        // use the data-testid to locate the appropriate delete icon
        await utils.waitForAnimation(1000);
        const trashCanIconLocator = contentFilteringPage.tableElement(extendedName, "delete");
        const trashCanIcon = await driver.wait(until.elementLocated(trashCanIconLocator), waitTime);
        await trashCanIcon.click();
        console.log("Waiting for delete policy modal to open");
        const modalDeleteHeaderLocator = deletePolicyModal.heading();
        const modalDeleteHeader = await driver.wait(until.elementLocated(modalDeleteHeaderLocator), waitTime, "Modal did not open in time");
        console.log("Clicking the Delete Policy button in the modal");
        const modalDeletePolicyBtnLocator = deletePolicyModal.button("Delete Policy");
        const modalDeletePolicyBtn = await driver.findElement(modalDeletePolicyBtnLocator);
        await modalDeletePolicyBtn.click();

        console.log(`Waiting for the Delete Policy modal to be closed`);
        await utils.waitForAnimation();
        await driver.wait(until.stalenessOf(modalDeleteHeader), waitTime, "Modal did not close in time");
        await driver.wait(until.stalenessOf(createdPolicyBtn), waitTime, "Rule is still showing in the UI");
        console.log(`Policy ${extendedName} successfully deleted!`);
        
    } catch (error) {
        console.error("Error deleting the policy", error)
    }
};

/**
 * Deletes all policies listed in the School Manager content filtering page.
 * Useful for cleanup after tests.
 * @param driver 
 */
export const deleteAllPolicies = async (driver: WebDriver): Promise<void> => {
    const deletePolicyModal = new Modal_DeletePolicy();
    const folderName: string = await utils.getParentFolderName();
    console.log(`folderName = ${folderName}`)

    try {
        console.log("Fetching all policies for cleanup.");
        await driver.get(`${schoolManagerUrl}/filtering/policies`);

        // Locate all policy rows using a generic locator for the table rows
        const policyRowsLocator = By.xpath("//tr[@role='button']");
        try {
            // allow some time for element to be located
            // this seemed to be required when running on a fast machine due to the timings of elements rendering
            await driver.wait(until.elementsLocated(policyRowsLocator), cleanUpTime);
        } catch (error) {
            // if it times out it will mean there's no policies to delete which is fine
            if (error instanceof Error && error.name === "TimeoutError") {  
                console.log("No policies found to delete (timeout reached).");
                return;
            }
            throw error;
        }        
        const policyRows = await driver.findElements(policyRowsLocator);

        if (policyRows.length === 0) {
            console.log("No policies found to delete.");
            return;
        }

        console.log(`Found ${policyRows.length} policies to delete.`);

        // Loop through all policies and delete them one by one
        for (let i = 0; i < policyRows.length; i++) {
            console.log(`Deleting policy ${i + 1} of ${policyRows.length}`);

            // Locate the delete icon within the current row
            // BUT ONLY if the policy name contains the parentFolderName
            const matchingPolicyNames = await policyRows[i].findElements(By.xpath(`//p[contains(text(), "${folderName}")]`));
            
            if(matchingPolicyNames.length > 0) {
                const trashCanIcon = await policyRows[i].findElement(By.xpath(".//button[@aria-label='Delete']"));
                await trashCanIcon.click();
                console.log("Waiting for delete policy modal to open.");
                const modalDeleteHeaderLocator = deletePolicyModal.heading();
                const modalDeleteHeader = await driver.wait(until.elementLocated(modalDeleteHeaderLocator), waitTime, "Modal did not open in time");
    
                const modalDeletePolicyBtnLocator = deletePolicyModal.button("Delete Policy");
                const modalDeletePolicyBtn = await driver.findElement(modalDeletePolicyBtnLocator);
                await modalDeletePolicyBtn.click();
    
                console.log(`Waiting for the Delete Policy modal to be closed.`);
                await utils.waitForAnimation();
                await driver.wait(until.stalenessOf(modalDeleteHeader), waitTime, "Modal did not close in time");
                await driver.wait(until.stalenessOf(policyRows[i]), waitTime, "Policy row is still showing in the UI");
            }

        }

        console.log("All policies deleted successfully.");

    } catch (error) {
        console.error("Error deleting leftover policies", error);
    }
};

/**
 * Deletes all objects listed in the School Manager object pools page.
 * Useful for cleanup after tests.
 * @param driver 
 */
export const deleteAllObjects = async (driver: WebDriver): Promise<void> => {
    const deleteObjectPoolModal = new Modal_DeleteObjectPool();

    try {
        console.log("Fetching all objects for cleanup.");
        await driver.get(`${schoolManagerUrl}/config/device/objects/pools`);

        // Locate all delete icons
        const deleteIconLocator = objectsPage.trashCanIcon();

        try {
            // Wait for at least one delete icon to be located
            await driver.wait(until.elementLocated(deleteIconLocator), cleanUpTime, "Delete icons not located within wait time");
        } catch (error) {
            // if it times out it will mean there's no content mods to delete which is fine
            if (error instanceof Error && error.name === "TimeoutError") {  
                console.log("No content mods found to delete (timeout reached).");
                return;
            }
            throw error;
        }

        let deleteIcons = await driver.findElements(deleteIconLocator);

        if (deleteIcons.length === 0) {
            console.log("No objects found to delete.");
            return;
        }

        const totalObjects = deleteIcons.length; // Store the original total count
        console.log(`Found ${totalObjects} objects to delete.`);

        for (let objectIndex = 0; objectIndex < totalObjects; objectIndex++) {
            console.log(`Deleting object ${objectIndex + 1} of ${totalObjects}`);

            // Click on the first delete icon
            const trashCanIcon = deleteIcons[0];
            await trashCanIcon.click();

            console.log("Waiting for delete object modal to open.");
            const modalDeleteHeaderLocator = deleteObjectPoolModal.heading();
            const modalDeleteHeader = await driver.wait(until.elementLocated(modalDeleteHeaderLocator), waitTime, "Modal did not open in time");

            const modalDeleteObjectBtnLocator = deleteObjectPoolModal.deleteBtn();
            const modalDeleteObjectBtn = await driver.findElement(modalDeleteObjectBtnLocator);
            await modalDeleteObjectBtn.click();

            console.log(`Waiting for the Delete Object modal to be closed.`);
            await utils.waitForAnimation();
            await driver.wait(until.stalenessOf(modalDeleteHeader), waitTime, "Modal did not close in time");

            // Re-fetch delete icons after each deletion
            deleteIcons = await driver.findElements(deleteIconLocator);
        }

        console.log("All objects deleted successfully.");

    } catch (error) {
        console.error("Error deleting leftover objects", error);
    }
};

/**
 * Deletes all time period entries listed in the School Manager time periods page.
 * Useful for cleanup after tests.
 * @param driver 
 */
export const deleteAllTimePeriodEntries = async (driver: WebDriver): Promise<void> => {

    try {
        console.log("Fetching all time period entries for cleanup.");
        await driver.get(`${schoolManagerUrl}/config/device/objects/timeperiods`);

        // Locate all delete icons
        const deleteIconLocator = timePeriodsPage.trashCanIcon();
        let deleteIcons = await driver.findElements(deleteIconLocator);
    
        if (deleteIcons.length === 0) {
            console.log("No time periods found to delete.");
            return;
        }

        const totalTimePeriodEntries = deleteIcons.length; // Store the original total count
  
        console.log(`Found ${totalTimePeriodEntries} time period entries to delete.`);

        for (let i = 0; i < totalTimePeriodEntries; i++) {
            console.log(`Deleting time period entry ${i + 1} of ${totalTimePeriodEntries}`);

            // Click on the first delete icon
            const trashCanIcon = deleteIcons[0];
            await trashCanIcon.click();

            console.log("Waiting for delete time period modal to open.");
            const modalDeleteHeaderLocator = timePeriodsPage.deleteHeader();
            const modalDeleteHeader = await driver.wait(until.elementLocated(modalDeleteHeaderLocator), waitTime, "Modal did not open in time");
            console.log("Clicking the delete button");
            const deleteBtnElement = await driver.findElement(timePeriodsPage.deleteBtn());
            await deleteBtnElement.click();
            console.log(`Waiting for the Delete Policy modal to be closed.`);
            await utils.waitForAnimation();
            await driver.wait(until.stalenessOf(modalDeleteHeader), waitTime, "Modal did not close in time");

            // Re-fetch delete icons after each deletion
            deleteIcons = await driver.findElements(deleteIconLocator);
        }

        console.log("All time period entries deleted successfully.");

    } catch (error) {
        console.error("Error deleting leftover time period entries", error);
    }
};

/**
 * Used as a clean up step to delete all content mods after tests have completed or there has been some interruption.
 * @param driver 
 */
export const deleteAllContentMods = async (driver: WebDriver): Promise<void> => {

    try {
        console.log("Fetching all content modifications for cleanup.");
        await driver.get(`${schoolManagerUrl}/filtering/modifications`);

        // Locate all delete icons
        const deleteIconLocator = contentModPage.trashCanIcon();
        let deleteIcons = await driver.findElements(deleteIconLocator);
    
        if (deleteIcons.length === 0) {
            console.log("No content modifications found to delete.");
            return;
        }

        const totalContentMods = deleteIcons.length; // Store the original total count
        console.log(`Found ${totalContentMods} content modifications to delete.`);

        for (let contentModIndex = 0; contentModIndex < totalContentMods; contentModIndex++) {
            console.log(`Deleting content modification ${contentModIndex + 1} of ${totalContentMods}`);

            // Click on the first delete icon
            const trashCanIcon = deleteIcons[0];
            await trashCanIcon.click();

            console.log("Waiting for delete content modification modal to open.");
            const modalDeleteHeaderLocator = deletePolicyModalContentMod.heading();
            const modalDeleteHeader = await driver.wait(until.elementLocated(modalDeleteHeaderLocator), waitTime, "Modal did not open in time");

            const modalDeleteContentModBtnLocator = deletePolicyModalContentMod.deleteBtn();
            const modalDeleteContentModBtn = await driver.findElement(modalDeleteContentModBtnLocator);
            await modalDeleteContentModBtn.click();

            console.log(`Waiting for the Delete Content Modification modal to be closed.`);
            await utils.waitForAnimation();
            await driver.wait(until.stalenessOf(modalDeleteHeader), waitTime, "Modal did not close in time");

            // Re-fetch delete icons after each deletion
            deleteIcons = await driver.findElements(deleteIconLocator);
        }

        console.log("All content modifications deleted successfully.");

    } catch (error) {
        console.error("Error deleting leftover content modifications", error);
        throw error;
    }

};

/**
 * Expire all active bypass codes in the Bypass Code table.
 * This function will iterate through the rows of the table and click on the "Expire Now" button for each active bypass code.
 * @param driver - The WebDriver instance.
 */
export const expireAllBypassCodes = async (driver: WebDriver): Promise<void> => {
    try {
        if (await driver.getCurrentUrl() !== `${schoolManagerUrl}/filtering/bypass/available`) {
            await driver.get(`${schoolManagerUrl}/filtering/bypass/available`);
        }

        // Wait for a cell to load to ensure the page is loaded
        const anyCell = await driver.wait(
            until.elementLocated(By.xpath("//table//tbody//td//p")),
            waitTime,
            "Timeout waiting for any cell to be located"
        );

        let codesToExpire = await driver.findElements(By.xpath("//td//div//span//span[text()='Expire Now']"));
        if (codesToExpire.length === 0) {
            console.log("No active bypass codes to expire");
            return;
        }
        const initialCount = codesToExpire.length;
        console.log(`Found ${codesToExpire.length} active bypass codes to expire`);

        let index = 0;
        while (codesToExpire.length > 0) {
            const codeToExpire = codesToExpire[0]; // Always work with the first element in the updated list
            try {
                // Scroll the code into view
                await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", codeToExpire);

                // Wait for the code to be visible and interactable
                await driver.wait(
                    until.elementIsVisible(codeToExpire),
                    waitTime,
                    "Expire Now button is not visible after scrolling"
                );

                console.log(`Expiring code ${index + 1}/${initialCount}`);
                // Click the "Expire Now" button
                await codeToExpire.click();

                // Wait until the "Expire Now" button is no longer visible
                await driver.wait(
                    until.stalenessOf(codeToExpire),
                    waitTime,
                    "Expire Now button is still visible after clicking"
                );

                console.log(`Bypass code ${index + 1}/${initialCount} expired successfully`);
            } catch (error) {
                if (error instanceof Error && error.name === "StaleElementReferenceError") {
                    console.log("The bypass code expired on its own or the element became stale. Continuing...");
                } else {
                    console.error("Unexpected error occurred while processing a bypass code:", error);
                    throw error;
                }
            }

            // Re-fetch the list of "Expire Now" elements after each iteration
            // Need to again wait for the table to load first
            await driver.wait(
                until.elementLocated(By.xpath("//table//tbody//td//p")),
                waitTime,
                "Timeout waiting for any cell to be located"
            );
            codesToExpire = await driver.findElements(By.xpath("//td//div//span//span[text()='Expire Now']"));
            console.log(`Found ${codesToExpire.length} remaining bypass codes to expire`);
            index++;
        }

        console.log("All active bypass codes have been expired");
    } catch (error) {
        console.error("Error occurred when expiring bypass codes", error);
        throw error;
    }
};

/**
 * Check if inspected item signature is not added in the School Manager mobile agent page.
 * If not, adds it.
 * @param driver
 * @param signature: options are "Vimeo", "Bing", "YouTube", "Google Search "
 */
export const addInspectedItem = async (driver: WebDriver, signature: string): Promise<void> => {
    let trimmedSig = signature.replace("Signature ", "");
  
    if (trimmedSig == "Google Search") {
        trimmedSig += " ";
    } // UI displayed as "Google Search " so need to add a trailing space
    try {
        // using wait until as due to a timinig issue, the element for the signature was not being found
        await driver.wait(until.elementLocated(mobileAgentPage.inspectedHeader()), waitTime, "The inspected section did not load in time.");
        const inspectedItemLocator = mobileAgentPage.inspectedItem(trimmedSig)
        await driver.wait(until.elementLocated(inspectedItemLocator), waitTime, `Inspected item ${trimmedSig} not found in time.`);
        const inspectedItem = await driver.findElement(inspectedItemLocator);
        await driver.wait(until.elementIsVisible(inspectedItem), waitTime, `Inspected item ${trimmedSig} is not visible in time.`);
        if (await inspectedItem.isDisplayed()) {
            console.log(`Inspected item ${trimmedSig} has already been added.`);
        }
        
        return;
    } catch (error) {
        console.log("Inspected item not found. Proceeding to add it.")
        const inspectedInputField = await driver.wait (
            until.elementLocated(mobileAgentPage.inspectedItemInputField()),
            waitTime
        );
        await inspectedInputField.sendKeys(trimmedSig);
        const trimmedSigOptionElement = await driver.wait(
            until.elementLocated(By.xpath(`//div[@class="category__name" and text()="${trimmedSig}"]`)),
            waitTime
        );
        await trimmedSigOptionElement.click();
        console.log(`${signature} option is clicked`);
    }
};

/**
 * Asserts that a signature has been added correctly to the MITM inspection list.
 * @param driver - The WebDriver Instance.
 * @param signature - The signature to be inspected.
 */
export const assertInspectedItemAdded = async (driver: WebDriver, signature: string): Promise<void> => {
        if (signature == "Google Search") {
            signature += " ";
        } // UI displayed as "Google Search " so need to add a trailing space

        const inspectedItem = await driver.findElement(mobileAgentPage.inspectedItem(signature));
        
        // Assert the presence of the inspected item
        assert.ok(await inspectedItem.isDisplayed(), `Inspected item "${signature}" was not found in the inspected item list.`);
        console.log(`Successfully found inspected item "${signature}" in the list.`);
};

/**
 * Check if MITM enabled checkbox has been checked on Mobile Agent page.
 * If not, checks it.
 * @param driver 
 */
export const clickMitmEnabledCheckbox = async (driver: WebDriver): Promise<void> => {
    try {
        await dismissAnnouncement(driver);
         // Checking if "MITM Enabled" checkbox is checked
        const inspectedItemInputField = await driver.wait(
            until.elementLocated(mobileAgentPage.inspectedItemInputField()),
            waitTime
        );
        if ((await inspectedItemInputField.isDisplayed())) {
            console.log('"MITM Enabled" checkbox has already been checked');
            return;
        }
    } catch (error) {
        console.log('"MITM Enabled" checkbox is not currently enabled. Proceeding to enable it.')
        const mitmEnabledCheckboxLocator = await driver.wait(
            until.elementLocated(mobileAgentPage.mitmEnabledCheckbox()),
            waitTime
        );
        await mitmEnabledCheckboxLocator.click();
    }
}; 

/**
 * Assert that MITM enabled checkbox has been checked on Mobile Agent page.
 * @param driver 
 */
export const assertMitmCheckboxEnabled = async (driver: WebDriver): Promise<void> => {
    const isInspectedSelectorDisplayed = await driver.findElement(mobileAgentPage.inspectedItemInputField()).isDisplayed();
    assert.ok(isInspectedSelectorDisplayed, "MITM Enabled checkbox has not been checked");
};

/**
 * Click Save Button on Mobile Agent page.
 * @param driver 
 */
export const saveMobileAgentConfig = async (driver: WebDriver, waitForAgents: boolean): Promise<void> => {
    const saveButton = await driver.findElement(mobileAgentPage.saveButton());
    if ((await saveButton.getText() === "SAVE")) {
        try {
            await saveButton.click();
            // wait for the agents to receive config if the waitForAgent boolean value is true
            if (waitForAgents) {
                console.log("Mobile Agent Page Save button clicked and waiting is required.");
                console.log("Waiting for the agents to receive the config change before proceeding.");
                await driver.sleep(waitTime*30);
            } else {
                console.log("Mobile Agent Page Save button clicked and waiting is not required.");
            }
        } catch (error) {
            console.error("Error occurred when saving mobile agent configuration", error);
            throw new Error;
        }
    } else if ((await saveButton.getText() === "SAVED")) {
        console.log("No Mobile Agent Config change and waiting is not required");
    }
};

/**
 * Assert that configration has been saved on Mobile Agent page.
 * @param driver 
 */
export const assertMobileAgentConfigSaved = async (driver: WebDriver): Promise<void> => {
    const saveButtonText = await driver.findElement(mobileAgentPage.saveButton()).getText();
    if (saveButtonText === "SAVED") {
        console.log("Mobile Agent Configuration has been saved successfully");
    }else {
        console.error("Mobile Agent Configuration has not been saved ");
        throw new Error ("Save operation failed: The button text is not 'SAVED'.");
    }
};

/**
 * Used to navigate to a page in school manager where there are no asserts required
 * @param driver 
 * @param path 
 */
export const navigateToPageInSchoolManager = async (driver: WebDriver, page: string): Promise<void> => {
    try {
        const targetUrl = `${schoolManagerUrl}/${page}`;
        console.log(`Navigating to ${targetUrl}`);
        await driver.get(targetUrl);
    } catch (error) {
        console.error(`Error navigating to page ${page}: ${error}`);
        throw error;
    }
};

/**
 * Navigates to the time periods in school manager
 * @param driver
 */
export const navigateToTimePeriods = async (driver: WebDriver): Promise<void> => {
    try {
        await driver.get(`${schoolManagerUrl}/config/device/objects/timeperiods`);
    } catch (error) {
        console.error("Error when navigating to the time periods page: ", error);
        throw error;
    }
};

/**
 * Navigates to the Object Pools page, and asserts the page has been navigated to correctly
 * @param driver
 */
export const navigateToObjectsPage = async (driver: WebDriver): Promise<void> => {
    const targetUrl = `${schoolManagerUrl}/config/device/objects/pools`;

    try {
        console.log(`Navigating to ${targetUrl}`);
        await driver.get(targetUrl);

        const poolsHeaderLocator = objectsPage.heading();
        const poolsHeaderElement = await driver.wait(
            until.elementLocated(poolsHeaderLocator),
            waitTime,
            "Pools header not located within wait time"
        );

        await driver.wait(
            until.elementIsVisible(poolsHeaderElement),
            waitTime,
            "Pools header not visible within wait time"
        );

        const currentUrl = await driver.getCurrentUrl();
        assert.match(currentUrl, new RegExp(`${schoolManagerUrl}/config/device/objects/pools`),
            `Expected URL to be ${targetUrl}, but got ${currentUrl}`
        );

        const isHeaderDisplayed = await poolsHeaderElement.isDisplayed();
        assert.ok(isHeaderDisplayed,
            "Pools header is not displayed as expected after navigation."
        );

        console.log("Successfully navigated to the Objects Pools page.");
    } catch (error) {
        console.error("Error navigating to the Objects Pools page:", error);
        throw error;
    }
};

/**
 * Clicks the add new pool button and asserts the modal is showing as a result.
 * Can be used for the "In School Manager, under Configuration / Objects, click Add New Pool" step.
 * @param driver - The WebDriver instance.
 */
export const clickAddNewPool = async (driver: WebDriver): Promise<void> => {
    console.log("Clicking Add New Pool button");
    const addPoolButtonLocator = objectsPage.addNewPoolButton();
    const addPoolButton = await driver.findElement(addPoolButtonLocator);
    await addPoolButton.click();
    await utils.waitForAnimation();
};

/**
 * Asserts the add object pool modal has been opened as a result of clicking it in a previous step.
 * Asserts the presence of the name, description and type fields.
 * Can be used for the "Add Object Pool modal opens, with fields for Name, Description and Type." step.
 * @param driver - The WebDriver instance.
 */
export const assertAddObjectPoolModal = async (driver: WebDriver): Promise<void> => {
    console.log("Asserting the Add Object Pool modal is displaying correctly");
    const addObjectPoolModalHeaderLocator = addObjectPoolModal.heading();
    const addObjectPoolModalHeaderElement = await driver.wait(
        until.elementLocated(addObjectPoolModalHeaderLocator),
        waitTime,
        "Add Object Pool header not located within wait time"
    );

    await driver.wait(
        until.elementIsVisible(addObjectPoolModalHeaderElement),
        waitTime,
        "Add Object Pool header not visible within wait time"
    );

    const assertFieldIsDisplayed = async (driver: WebDriver, fieldLocator: By, fieldName: string): Promise<void> => {
        // wait for the field to be located
        const field = await driver.wait(until.elementLocated(fieldLocator), 
            waitTime,
            `${fieldName} input field is not located within wait time`
        );

        // wait for the field to be visible
        await driver.wait(until.elementIsVisible(field), 
            waitTime,
            `${fieldName} input field is not visible within wait time`
        );

        const isFieldDisplayed = await field.isDisplayed();
        assert.ok(isFieldDisplayed, `${fieldName} input field is not displayed as expected after clicking the add new pool button`);
    };

    // Wait for the name input field to be located and visible
    const nameInputFieldLocator = addObjectPoolModal.nameInput();
    await assertFieldIsDisplayed(driver, nameInputFieldLocator, "Name");
 
    // Wait for the description input field to be located and visible
    const descriptionInputFieldLocator = addObjectPoolModal.descriptionInput();
    await assertFieldIsDisplayed(driver, descriptionInputFieldLocator, "Description");

    // Wait for the type selector field to be located and visible
    const typeSelectorLocator = addObjectPoolModal.typeSelector();
    await assertFieldIsDisplayed(driver, typeSelectorLocator, "Type Selector");
};

/**
 * Asserts the create new entry modal has been opened as a result of clicking it in a previous step.
 * Asserts the presence of the name, description and type fields.
 * Can be used for the "Create new entry modal opens, with fields for Name, Description and Entry." step.
 * @param driver - The WebDriver instance.
 */
export const assertCreateNewEntryModal = async (driver: WebDriver): Promise<void> => {
    console.log("Asserting the Create new entry modal is displaying correctly");
    const createNewEntryModalHeaderLocator = createNewEntryModal.heading();
    const createNewEntryModalHeaderElement = await driver.wait(
        until.elementLocated(createNewEntryModalHeaderLocator),
        waitTime,
        "Create new entry header not located within wait time"
    );

    await driver.wait(
        until.elementIsVisible(createNewEntryModalHeaderElement),
        waitTime,
        "Create new entry header not visible within wait time"
    );

    const assertFieldIsDisplayed = async (driver: WebDriver, fieldLocator: By, fieldName: string): Promise<void> => {
        // wait for the field to be located
        const field = await driver.wait(until.elementLocated(fieldLocator), 
            waitTime,
            `${fieldName} input field is not located within wait time`
        );

        // wait for the field to be visible
        await driver.wait(until.elementIsVisible(field), 
            waitTime,
            `${fieldName} input field is not visible within wait time`
        );

        const isFieldDisplayed = await field.isDisplayed();
        assert.ok(isFieldDisplayed, `${fieldName} input field is not displayed as expected after clicking the add new pool button`);
    };

    // Wait for the name input field to be located and visible
    const nameInputFieldLocator = createNewEntryModal.nameInput();
    await assertFieldIsDisplayed(driver, nameInputFieldLocator, "Name");
 
    // Wait for the description input field to be located and visible
    const descriptionInputFieldLocator = createNewEntryModal.descriptionInput();
    await assertFieldIsDisplayed(driver, descriptionInputFieldLocator, "Description");

    // Wait for the type selector field to be located and visible
    const entryInputFieldLocator = createNewEntryModal.entryInput();
    await assertFieldIsDisplayed(driver, entryInputFieldLocator, "Entry");
};

/**
 * Adds text to a specific input field.
 * The field locator is sourced dynamically from the provided locator mapping or directly passed as an argument.
 *
 * @param driver - The WebDriver instance controlling the browser.
 * @param fieldLocator - A `By` object representing the locator of the input field.
 * @param text - The text to be entered into the input field.
 *
 * @throws Error if the field cannot be located or interacted with.
 *
 * Example usage:
 * ```typescript
 * const fieldLocator = By.css('input[aria-label="name"]');
 * await addTextToInputField(driver, fieldLocator, "My Pool Name");
 * ```
 */
export const addTextToInputField = async (driver: WebDriver, fieldLocator: By, text: string): Promise<void> => {
    try {
        // Locate the input field, click it, clear its content, and send keys
        const inputField = await driver.findElement(fieldLocator);
        // clear input field for the next website search
        let value = await inputField.getAttribute('value');
        await inputField.click();
        if (value !== "") {
            await driver.executeScript("arguments[0].value = '';", inputField);
        }
        await inputField.sendKeys(text);
    } catch (error) {
        throw new Error(`Failed to add text to input field: ${error}`);
    }
};

/**
 * Selects a specific type from the "Type" selector dropdown in the Add Object Pool modal.
 * This function handles expanding the dropdown, ensuring it is open, and selecting the correct type option.
 * 
 * @param driver - The WebDriver instance controlling the browser.
 * @param type - The type to be selected from the dropdown. Possible options include:
 *   "IP Range List", "IP Subnet List", "Website List", "MAC Address List", "Search Keywords", "Domains List".
 * 
 * @throws Error if the type selector does not expand correctly or if there is an error selecting the type.
 * 
 * Example usage:
 * ```typescript
 * await selectTypeObjectPool(driver, "IP Range List");
 * ```
 * 
 * Expected behavior:
 * - The function clicks on the "Type" selector dropdown.
 * - If the dropdown is expanded, it clicks on the option corresponding to the provided `type`.
 * - If the dropdown is not expanded, an error is thrown.
 * - Any errors encountered during the process will be logged and thrown to be handled by the caller.
 */
export const selectTypeObjectPool = async (driver: WebDriver, type: string): Promise<void> => {
    // options are IP Range List, IP Subnet List, Website List, MAC Address List, Search Keywords, Domains List
    try {
        const typeSelectorLocator = addObjectPoolModal.typeSelector();
        const typeSelector = await driver.findElement(typeSelectorLocator);
        await typeSelector.click();

        await utils.waitForAnimation();
        const selectTypeLocator = addObjectPoolModal.type(type);
        const selectType = await driver.wait(until.elementLocated(selectTypeLocator), waitTime);
        await selectType.click();


    } catch (error) {
        console.error("Error when selecting a type from the drop down list", error);
        throw error;
    }
};

/**
 * Asserts that text that has been entered into an input field is present
 * @param driver 
 * @param fieldLocator 
 * @param text 
 */
export const assertTextInInputField = async (driver: WebDriver, fieldLocator: By, text: string): Promise<void> => {
    try {
        console.log(`Asserting ${text} is present in the input field`);
        const inputField = await driver.wait(
            until.elementLocated(fieldLocator),
            waitTime,
            "The input field was not located within the wait time"
        );
        const inputFieldValue = await inputField.getAttribute("value");
        const expectedValue = new RegExp(text, "i"); // case insensitive
        assert.match(inputFieldValue, expectedValue, `Expected ${expectedValue}, got ${inputFieldValue}`);
    } catch (error) {
        console.error(`Error when asserting text in input field: ${error}`);
        throw error;
    }
};

/**
 * Clicks the "Save Object Pool" button in the "Add Object Pool" modal.
 *
 * @param {WebDriver} driver - The WebDriver instance to interact with the browser.
 * 
 * @throws {Error} Throws an error if the "Save Object Pool" button is not found or not interactable.
 * 
 * @example
 * // Example usage:
 * await clickSaveObjectPoolBtn(driver);
 * 
 * @description
 * This function locates the "Save Object Pool" button in the "Add Object Pool" modal using the locator
 * defined in `addObjectPoolModal.saveObjectPoolBtn()`. It ensures that the button is interactable and
 * performs a click operation, with error handling for scenarios where the button is not found or not clickable.
 */
export const clickSaveObjectPoolBtn = async (driver: WebDriver) => {
    const saveObjectPoolBtnLocator = addObjectPoolModal.saveObjectPoolBtn();

    try {
        const saveObjectPoolBtn = await driver.findElement(saveObjectPoolBtnLocator);
        await saveObjectPoolBtn.click();
    } catch (error) {
        throw new Error(`Failed to click the "Save Object Pool" button: ${error}`);
    }
};

/**
 * Asserts that the pool header element with the specified name is present and visible on the page.
 *
 * @param {WebDriver} driver - The WebDriver instance to interact with the browser.
 * @param {string} name - The name of the pool header to locate on the page.
 * 
 * @throws {Error} Throws an error if the pool header element is not found or not visible.
 * 
 * @example
 * // Example usage:
 * await assertPoolPage(driver, 'My Pool Header');
 * 
 * @description
 * This function waits for the pool header element corresponding to the given name
 * to be present and visible on the page. It uses WebDriver's wait functionality
 * to handle asynchronous loading and ensures robust validation with meaningful error messages.
 */
export const assertPoolPage = async (driver: WebDriver, name: string): Promise<void> => {
    const poolHeaderLocator = poolPage.heading(name);
    try {
        const poolHeader = await driver.wait(until.elementLocated(poolHeaderLocator), waitTime,
            `Pool header with name "${name}" not found on the page`
        );
        const isDisplayed = await poolHeader.isDisplayed();
        assert(isDisplayed,
            `Expected pool header with name "${name}" to be visible, but it is not`
        );
        console.log(`Assertion passed: Pool header with name "${name}" is visible on the page.`);
    } catch (error) {
        console.error(`Assertion failed: ${error}`);
        throw error;
    }
};

/**
 * Clicks the "Add New Entry" button on the pool page.
 *
 * @param {WebDriver} driver - The WebDriver instance to interact with the browser.
 * 
 * @throws {Error} Throws an error if the "Add New Entry" button is not found or interactable.
 * 
 * @example
 * // Example usage:
 * await clickAddNewEntryBtn(driver);
 * 
 * @description
 * This function locates the "Add New Entry" button on the pool page using the locator
 * defined in `poolPage.addNewEntryBtn()`. It ensures that the button is interactable and
 * performs a click operation, with error handling for unexpected issues.
 */
export const clickAddNewEntryBtn = async (driver: WebDriver): Promise<void> => {
    const addNewEntryBtnLocator = poolPage.addNewEntryBtn();
    try {
        const addNewEntryBtn = await driver.findElement(addNewEntryBtnLocator);
        await addNewEntryBtn.click();
    } catch (error) {
        throw new Error(`Failed to click the "Add New Entry" button: ${error}`);
    }
};

/**
 * Clicks the "Save Entry" button on the specific pool's page.
 *
 * @param {WebDriver} driver - The WebDriver instance to interact with the browser.
 * 
 * @throws {Error} Throws an error if the "Save Entry" button is not found or interactable.
 * 
 * @example
 * // Example usage:
 * await clickSaveEntryBtn(driver);
 * 
 * @description
 * This function locates the "Save Entry" button on the pool page using the locator
 * defined in `createNewEntryModal.saveEntryBtn()`. It ensures that the button is interactable and
 * performs a click operation, with error handling for unexpected issues.
 */
export const clickSaveEntryBtn = async (driver: WebDriver): Promise<void> => {
    const saveEntryBtnLocator = createNewEntryModal.saveEntryBtn();
    try {
        const saveEntryBtn = await driver.findElement(saveEntryBtnLocator);
        await saveEntryBtn.click();
    } catch (error) {
        throw new Error(`Failed to click the "Save Entry" button: ${error}`);
    }
};

/**
 * Asserts that a specific entry in a table is visible based on the provided column and value.
 *
 * @param {WebDriver} driver - The WebDriver instance used to interact with the browser.
 * @param {string} column - The column name to search in (e.g., "name", "description", "entry").
 * @param {string} value - The expected value in the specified column to verify visibility.
 * @throws {Error} Throws an error if the column is invalid, the value is not visible, or other issues occur during execution.
 * @example
 * await assertPoolPageTable(driver, "name", "exampleName");
 * await assertPoolPageTable(driver, "description", "exampleDescription");
 */
export const assertPoolPageTable = async (driver: WebDriver, column: string, value: string): Promise<void> => {
    if (!value || value.trim() === "") {
        throw new Error("The value parameter cannot be empty or null.");
    }

    const columnNormalised = column.toLowerCase().trim();
    const valueNormalised = value.trim();
    let cellLocator: By;

    switch (columnNormalised) {
        case "name":
            cellLocator = poolPage.nameCell(valueNormalised);
            break;
        case "description":
            cellLocator = poolPage.descriptionCell(valueNormalised);
            break;
        case "entry":
            cellLocator = poolPage.entryCell(valueNormalised);
            break;
        default:
            throw new Error(`Unknown column value provided: "${columnNormalised}"`);
    }

    try {
        const cell = await driver.wait(
            until.elementLocated(cellLocator),
            waitTime,
            `Cell with value "${valueNormalised}" not found in column "${columnNormalised}"`
        );
        const isDisplayed = await cell.isDisplayed();
        assert(
            isDisplayed,
            `Expected "${columnNormalised}" entry with value "${valueNormalised}" to be visible, but it is not.`
        );
        console.log(`Assertion passed: "${columnNormalised}" entry with value "${valueNormalised}" is visible in the table.`);
    } catch (error) {
        console.error(`Assertion failed: ${error}`);
        throw error;
    }
};


/**
 * Asserts that "Allow" Policy is above "Blocked" Policy 
 * Assumes there are only two policies: "Allow" and "Block"
 * @param driver - The WebDriver instance
 * @param name - Policy Name (eg "Block Signature")
 */
export const assertPolicyReordered = async (testCaseKey: string, driver: WebDriver, name:string): Promise<void> => {
    const concatName = `${await utils.getParentFolderName()}_${name}_${testCaseKey}`;
    
    // Find policy rows containing the testCaseKey
    // Can't use concatName as the policies will have different names
    const policyRowsLocator = By.xpath(`//tr[@role='button' and contains(.,'${testCaseKey}')]`);
    const policyRows = await driver.findElements(policyRowsLocator);
    if (policyRows.length != 2) {
        throw new Error ("Expected exactly two policy rows, but found: " + policyRows.length);
    }

    // Extract and verify the first policy row text in "Policy Name" column
    const firstRowPolicyName = await policyRows[0].findElement(By.xpath("./td//p")).getText();
    console.log(`First row Policy Name: ${firstRowPolicyName}`)
    assert.ok(firstRowPolicyName.includes("Allow"));

    // Extract and verify the second policy row text in "Policy Name" column
    const secondRowPolicyName = await policyRows[1].findElement(By.xpath("./td//p")).getText();
    console.log(`Second row Policy Name: ${secondRowPolicyName}`)
    assert.equal(secondRowPolicyName, `${concatName}`);

    // Extract and verify the first policy row text in "Action" column
    const firstRowActionName = await policyRows[0].findElement(By.xpath("./td[3]/div[2]/span/span")).getText();
    console.log(`First row Action Name: ${firstRowActionName}`)
    assert.equal(firstRowActionName, "Allow");

    // Extract and verify the second policy row text in "Action" column
    const secondRowActionName = await policyRows[1].findElement(By.xpath("./td[3]/div[1]/span/span")).getText();
    console.log(`Second row Action Name: ${secondRowActionName}`)
    assert.equal(secondRowActionName, "Block");

    console.log("Policy reordered successfully.");
}

/**
 * Selects a signature type from the dropdown in the policy creation modal.
 * Created due to repetitive code during switch cases for selecting a signature.
 * @param {WebDriver} driver - The Selenium WebDriver instance.
 * @param {string} signatureType - The name of the signature type to select (e.g., "Arts and Entertainment", "Pornography").
 * @param {boolean} isTopLevelPolicy - If the selected type is a top level policy (Arts and Entertaiment, Business and Government, Gaming...), the way the type is selected is different. 
 *                                     Top level policies display in the UI without having to type anything. Should be true if it is a top level policy, otherwise false.
 * @throws {Error} If the dropdown does not expand or the selection fails.
 */
const selectSignatureType = async (driver: WebDriver, signatureType: string, isTopLevelPolicy: boolean, nonFriendlyName?: string): Promise<void> => {
    try {
        console.log(`Selecting type ${signatureType} signature`);
        const typeDropDownLocator = createPolicyModal.inputField("Search for one or more website/signature");
        const typeDropDownField = await driver.wait(
            until.elementLocated(typeDropDownLocator),
            waitTime,
            "Expected type drop down field to be located within wait time"
        );
        console.log("Clicking type drop down field");
        await typeDropDownField.click();
        await utils.waitForAnimation(); //wait for the drop-down animation
        if (isTopLevelPolicy) {
            const typeLocator = createPolicyModal.topLevelPolicy(signatureType); // use topLevelPolicy if it is one
            // allow some time for element to be located
            // this seemed to be required when running on a fast machine due to the timings of elements rendering
            const selectType = await driver.wait(
                until.elementLocated(typeLocator), 
                waitTime,
                "Expected type to be located within wait time"
            );
            await driver.wait(
                until.elementIsVisible(selectType),
                waitTime,
                "Expected type to be visible within wait time"
            );
            console.log(`Clicking type ${signatureType}`);
            await selectType.click();
        } else {
            await typeDropDownField.sendKeys(signatureType); // need to send keys first for this type
            if (nonFriendlyName) { // requires the name from the data-testid eg. "porn" from option-sphirewall.application.porn     
                const typeLocator = createPolicyModal.signatureFromButton(nonFriendlyName); // use signatureFromButton if it is not a top level policy
                // allow some time for element to be located
                // this seemed to be required when running on a fast machine due to the timings of elements rendering
                const selectType = await driver.wait(
                    until.elementLocated(typeLocator), 
                    waitTime,
                    `Expected type ${signatureType} to be located within wait time`);
                await driver.wait(
                    until.elementIsVisible(selectType), 
                    waitTime,
                    `Expected type ${signatureType} to be visible within wait time`);
                console.log(`Clicking type ${signatureType}`);
                await selectType.click();
            } else {
                console.error("This signature requires the name for sphirewall.application.name to be provided");
                throw new Error(`sphirewall.application.${signatureType} is invalid`);
            }

        }

        // The id for the selected type increases by 1 if additional types are added
        const selectedTypeLocator = By.id("Multiple Selector-0-chip");
        await driver.wait(until.elementIsVisible(driver.findElement(selectedTypeLocator)), waitTime, "Selected type is not visible");

        // Click out of the type field as the drop-down remains open
        const nameInputFieldLocator = createPolicyModal.inputField("Enter a policy name");
        const nameInputField = await driver.findElement(nameInputFieldLocator);
        await nameInputField.click();
    } catch (error) {
        console.error("Error occurred when selecting type", error);
        throw error;
    }
};

/**
 * clicks on the Category Search button
 * @param driver 
 * @param buttonName - "Category Search"
 */
export const clickCategorySearchBtn = async (driver: WebDriver, buttonName: string): Promise<void> => {
    try {
        console.log(`Clicking Category Search button`);
        const categorySearchBtnLocator = contentFilteringPage.headerButton(buttonName);
        const categorySearchBtn = await driver.wait(until.elementLocated(categorySearchBtnLocator), waitTime, "Button not located within wait time");
        await categorySearchBtn.click();
    } catch (error) {
        console.error("Error: category search modal did not open", error);
        throw error;
    }
};

/**
 * Asserts that the WebDriver has navigated to the correct searches page and that the header is displayed.
 * 
 * This function performs the following steps:
 * 1. Waits for the searches page header element to be located and visible.
 * 2. Asserts that the current URL matches the expected searches page URL.
 * 3. Asserts that the searches page header is displayed.
 * 
 * @param driver - The WebDriver instance used for browser automation.
 * @throws {Error} - If the header is not located or displayed within the specified wait time,
 *                   or if the current URL does not match the expected URL, an error is thrown.
 */
export const assertOnSearchesPage = async (driver: WebDriver): Promise<void> => {
    try {
        const searchesHeaderLocator = searchesPage.heading();

        const searchesHeaderElement = await driver.wait(
            until.elementLocated(searchesHeaderLocator),
            waitTime,
            "Searches header not located within wait time"
        );
    
        await driver.wait(
            until.elementIsVisible(searchesHeaderElement),
            waitTime,
            "Searches header not visible within wait time"
        );
    
        const targetUrl = `${schoolManagerUrl}/cybersafety/search`;
        const currentUrl = await driver.getCurrentUrl();
        assert.match(currentUrl, new RegExp(`${targetUrl}`),
            `Expected URL to be ${targetUrl}, but got ${currentUrl}`
        );
    
        const isHeaderDisplayed = await searchesHeaderElement.isDisplayed();
        assert.ok(isHeaderDisplayed,
            "Pools header is not displayed as expected after navigation."
        );
    } catch (error) {
        console.error(`Error occurred when asserting the driver was on the searches page: ${error}`);
        throw error;
    } 
};

/**
 * Asserts that the word cloud loads after settings the appropriate time period".
 * This function performs the following steps:
 * - Retrieves the current time from the test context (which was calculated earlier when generating the search term).
 * - Interacts with the time configurator on the page to set the time according to the current time.
 * - Waits for the word cloud to load and asserts that the "No data to display" message is not present.
 * 
 * @param driver - The WebDriver instance used for browser automation.
 * @throws {Error} - If any required element is not found or if the "No data to display" message is found on the page.
 */
export const assertWordCloudHasLoaded = async (driver: WebDriver): Promise<void> => {
    try {
        // set the time configurator
        await adjustTimeConfigurator(driver);
        console.log("Making sure loading has finished");
        const loadingIconLocator = searchesPage.loadingIcon();
        await driver.wait(until.elementIsNotVisible(driver.findElement(loadingIconLocator)), 30000, "The word cloud did not load within the allotted time");
        console.log("Loading has finished.");
        } catch (error) {
            // Check if the error is related to a stale element
            if ((error as Error).message.includes('stale element reference')) {
                console.log("The loading icon became stale, but that is expected.");
            } else {
                console.error(`Error occurred when asserting the word cloud had finished loading: ${error}`);
                throw error;
            }
        }
};

/**
 * Confirms the world cloud is not empty by checking for the No data to display message
 * @param driver
 */
export const assertWordCloudIsPopulated = async (driver: WebDriver) => {
    try {
        const noDataMessageLocator = By.xpath("//div[contains(@class, 'is-centered') and text()='No data to display']");
        const elements = await driver.findElements(noDataMessageLocator);
        
        // Assert that no elements with the specified class are found
        assert.strictEqual(elements.length, 0, 'The "No data to display" message is present on the page when it should not be.');
    } catch (error) {
        console.error("Error occured when checking for presence of search terms: ", error);
        throw error;
    }

};

/**
 * Asserts that the word cloud contains the expected search terms.
 * 
 * This function waits for the loading icon to disappear, indicating the word cloud has finished loading,
 * and then checks if the provided search terms are present in the word cloud.
 * For each search term, it asserts that the term is found at least once in the word cloud.
 * 
 * @param {WebDriver} driver - The WebDriver instance used to interact with the web page.
 * @param {string[]} searchTerms - An array of strings representing the search terms to look for in the word cloud.
 * 
 * @throws {Error} Throws an error if any of the search terms are not found in the word cloud.
 */
export const assertWorldCloudContainsExpectedTerms = async (driver: WebDriver, searchTerms: string[]): Promise<void> => {
    // not currently in use
    try {
        // now that the word cloud has loaded, locate the expected search terms
        // available search terms are under the following categories and are represented as such in the testData
        // Academic Dishonesty, Adult Content, Bullying, Depression, Hate Speech, Substance Abuse, Suicide, Violence, VPN Search
        for (const searchTerm of searchTerms) {
            console.log(`Asserting ${searchTerm} is present in the word cloud`);
            const searchTermFound = await driver.findElements(searchesPage.searchTermInCloud(searchTerm));
            assert.ok(searchTermFound.length > 0, `Was unable to find ${searchTerm} in the word cloud`);
        }
    } catch (error) {
        console.error(`Error occurred when asserting the word cloud contains expected search terms: ${error}`);
    }
};

/**
 * assert that Category Search Modal is opened
 * @param driver 
 */
export const assertCategorySearchModalOpen = async (driver: WebDriver): Promise<void> => {
    
    const categorySearchHeaderElement = await driver.wait(
        until.elementLocated(categorySearchModal.heading()),
        waitTime
    );

    const websiteInputElement = await driver.wait(
        until.elementLocated(categorySearchModal.websiteInput()),   
        waitTime
    );
    assert.ok(await categorySearchHeaderElement.isDisplayed() && await websiteInputElement.isDisplayed(), "CategorySearchModal is not opened correctly");
};

/**
 * clicks on the Category Search Modal or Test Policy Modal close button
 * @param driver 
 */
export const clickModalCloseBtn = async (driver: WebDriver, modalName: string): Promise<void> => {
    try {
        let closeBtn;
        switch (modalName) {
            case "category search":
                closeBtn = await driver.findElement(categorySearchModal.closeBtn());
                break;
            case "test policy":
                closeBtn = await driver.findElement(testPolicyModal.closeBtn());
                break;
            default:
                break;
        }
        if (!closeBtn) {
            throw new Error(`Close button in ${modalName} is undefined`);
        }
        await closeBtn.click();
    } catch (error) {
        console.error(`Error: ${modalName} modal did not close`, error);
        throw error;
    }
}

/**
 * assert that Category Search Modal or Test Policy Modal or Content Mod Create Policy modal is closed
 * @param driver 
 */
export const assertModalClose = async (driver: WebDriver, modalName:string): Promise<void> => {
    console.log(`Waiting for the ${modalName} modal to be closed`);
    try {
        let modalHeaderLocator;
        switch (modalName) {
            case "category search":
                modalHeaderLocator = await driver.findElement(categorySearchModal.heading());        
                break;
            case "test policy":
                modalHeaderLocator = await driver.findElement(testPolicyModal.heading());
                break;        
            case "create policy":
                modalHeaderLocator = await driver.findElement(createPolicyModalContentMod.heading());
                break;
            case "add code":
                modalHeaderLocator = await driver.findElement(addCodeModal.heading());
                break;
            default:
                break;
        }
        if (!modalHeaderLocator) {
            throw new Error(`The header locator for ${modalName} modal is undefined`);
        }
        await driver.wait(until.stalenessOf(modalHeaderLocator), waitTime, `${modalName} modal did not close in time`);
        console.log(`${modalName} is closed`);
    } catch (err: unknown) {
        if (err instanceof Error && err.name === "NoSuchElementError") {
            // If the modal was already removed before we started, this is fine
            console.log(`${modalName} Modal was already closed.`);
            return;
        }
        throw err;
    }
};

/**
 * clicks on the search button in Category Search or Test Policy Modal
 * @param driver 
 */
export const clickModalSearchBtn = async (driver: WebDriver, modalName:string): Promise<void> => {
    try {
        let searchBtn;
        switch (modalName) {
            case "category search":
                searchBtn = await driver.wait(
                    until.elementLocated(categorySearchModal.searchBtn()),
                    waitTime
                );
                break;
            case "test policy":
                searchBtn = await driver.wait(
                    until.elementLocated(testPolicyModal.searchBtn()),
                    waitTime
                );
                break
            default:
                break;
        }
        if (!searchBtn) {
            throw new Error(`Search button in ${modalName} is undefined`);
        }
        await searchBtn.click();
        await utils.waitForAnimation();
    } catch (error) {
        console.error(`Error: search button not clicked in ${modalName} Modal`, error);
        throw error;
    }
}

/**
 * assert that Category is displayed
 * @param driver
 * @param website - afl.com.au, pornhub.com, familyzonedns.com, example 
 */
export const assertCategory = async (driver: WebDriver, websiteName: string): Promise<void> => {
    const categoryElement = await driver.wait(
        until.elementLocated(categorySearchModal.category(websiteName)),
        waitTime
    );
    assert.ok(await categoryElement.isDisplayed(), `Category for ${websiteName} is not displayed`);
};

/**
 * assert that matching policies are displayed
 * @param driver
 * @param website - afl.com.au, pornhub.com, familyzonedns.com, example 
 */
export const assertMatchingPolicies = async (driver: WebDriver, websiteName: string): Promise<void> => {
    const matchingPoliciesElement = await driver.wait(
        until.elementLocated(categorySearchModal.matchingPoliciesText()),
        waitTime
    );
    assert.ok(await matchingPoliciesElement.isDisplayed(), `matching policies text is not displayed for websit ${websiteName}`);

    const policiesNameElement = await driver.wait(
        until.elementLocated(categorySearchModal.matchingPoliciesName(websiteName)),
        waitTime
    );
    assert.ok(await policiesNameElement.isDisplayed(), `matching policies name is not displayed for websit ${websiteName}`);
};

/**
 * assert that locked icon is displayed
 * @param driver
 * @param website - afl.com.au, pornhub.com, familyzonedns.com, example 
 */
export const assertLockedIcon = async (driver: WebDriver, websiteName: string): Promise<void> => {
    const lockedIconElement = await driver.wait(
        until.elementLocated(categorySearchModal.lockedIcon(websiteName)),
        waitTime
    );
    assert.ok(await lockedIconElement.isDisplayed(), `matching policies text is not displayed for websit ${websiteName}`);
};

/**
 * clicks on the toggle policy switch button in Category Search Modal or Test Policy Modal
 * @param driver 
 */
export const clickModalTogglePolicyBtn = async (driver: WebDriver, modalName: string): Promise<void> => {
    try {
        let togglePolicyBtn;
        switch (modalName) {
            case "category search":
                togglePolicyBtn = await driver.wait(
                    until.elementLocated(categorySearchModal.policyToggleBtn()),
                    waitTime
                );
                break;
            case "test policy":
                togglePolicyBtn = await driver.wait(
                    until.elementLocated(testPolicyModal.policyToggleBtn()),
                    waitTime
                );
                break;
            default:
                break;
        }
        if (!togglePolicyBtn) {
            throw new Error(`togglePolicyBtn in ${modalName} is undefined`);
        }
        await togglePolicyBtn.click();
        await utils.waitForAnimation();
    } catch (error) {
        console.error("Error: toggle policy switch button is not clicked in Category Search Modal", error);
        throw error;
    }
}

/**
 * clicks on the edit policy button in Category Search Modal or Test Policy Modal
 * @param driver 
 */
export const clickModalEditPolicyBtn = async (driver: WebDriver, modalName:string): Promise<void> => {
    try {
        let editPolicyBtn;
        switch (modalName) {
            case "category search":
                editPolicyBtn = await driver.findElements(categorySearchModal.editPolicyBtn());
                await editPolicyBtn[1].click();        
                break;
            case "test policy":
                editPolicyBtn = await driver.findElements(testPolicyModal.editPolicyBtn());
                await editPolicyBtn[0].click()
            default:
                break;
        }       
        await utils.waitForAnimation();
    } catch (error) {
        console.error("Error: edit policy button is not clicked in Category Search Modal", error);
        throw error;
    }
}

/**
 * assert that Edit Policy Modal is displayed
 * @param driver
 */
export const assertEditPolicyDisplayed = async (driver: WebDriver): Promise<void> => {
    const editPolicyHeaderElement = await driver.wait(
        until.elementLocated(editPolicyModal.heading()),
        waitTime
    );
    assert.ok(await editPolicyHeaderElement.isDisplayed(), `Edit Policy Modal for is not displayed`);
};

/**
 * clicks on the locked option in Edit Policy Modal
 * @param checkboxName - "Blocked Page", "Alert", "Quarantine", "Locked", "Redirect"
 * @param driver 
 */
export const clickLockedOptionCheckBox = async (driver: WebDriver, checkboxName: string): Promise<void> => {
    try {
        const lockedOptionElement = await driver.findElement(editPolicyModal.checkbox(checkboxName));
        await lockedOptionElement.click();
    } catch (error) {
        console.error("Error: locked option is not checked in Edit Policy Modal", error);
        throw error;
    }
}

/**
 * assert that warning label is displayed for locked option when checked
 * @param driver
 */
export const assertLockedPolicyWarning = async (driver: WebDriver): Promise<void> => {
    const warningLabelElement = await driver.wait(
        until.elementLocated(editPolicyModal.warningLabel()),
        waitTime
    );
    assert.ok(await warningLabelElement.isDisplayed(), `Warning label for locked option is not displayed`);
};

/**
 * clicks the save button and waits for the policy modal to close
 * @param driver 
 */
export const savePolicy = async (driver: WebDriver): Promise<void> => {
    try {

        await driver.findElements(By.className('userflowjs-resource-center-popout-frame'))
        .then(async (framesFound) => {
            if(framesFound.length > 0) {
                await driver.switchTo().frame(framesFound[0]);
                await driver.findElement(By.css('button[aria-label="Dismiss announcement"]')).click();
                await driver.switchTo().defaultContent();
            }
        });

        console.log(`Saving policy`);
        const saveBtnLocator = editPolicyModal.button("save-policy-button");
        const saveBtn = await driver.findElement(saveBtnLocator);
        await saveBtn.click();
        // modal should close
        await driver.wait(until.stalenessOf(saveBtn), waitTime, "Modal did not close in time");
        console.log("Policy saved successfully");
    } catch (error) {
        console.error("Error occurred when saving policy", error);
        throw error;
    }
};

/**
 * Clicks on a user in the searches page table.
 * This function locates a user in the table using the provided username and clicks on the corresponding element.
 * 
 * @param {WebDriver} driver - The WebDriver instance used to interact with the web page.
 * @param {string} username - The username of the user to be clicked in the table.
 * 
 * @throws {Error} Throws an error if the user is not found or if an issue occurs while attempting to click.
 */
export const clickUserOnSearchesPage = async (driver: WebDriver, username: string): Promise<void> => {
    try {
        const userLocator = searchesPage.userInTable(username);
        const userElement = await driver.wait(until.elementLocated(userLocator), waitTime);
        await userElement.click();

        const userSearchesLocator = searchesPage.userSearchesHeading();
        await driver.wait(until.elementLocated(userSearchesLocator), waitTime, "User Searches header did not load in time");

    } catch (error) {
        console.error("Error occurred when clicking on a user on the searches page", error);
        throw error;
    }
};

/**
 * assert that locked policy is displayed at the top 
 * @param driver
 * @param name - policy name
 */
export const assertLockedPolicyAtTop = async (testCaseKey: string, driver: WebDriver, name: string): Promise<void> => {
    const extendedName = `${await utils.getParentFolderName()}_${name}_${testCaseKey}`;

    // Find the policy name in the first row
    const policyNameLocator = By.xpath("(//tbody/tr)[1]/td[4]//p"); 
    const policyNameElement = await driver.findElement(policyNameLocator);
    const actualPolicyName = await policyNameElement.getText();

    // Find the "Action" column in the first row
    const actionLocator = By.xpath("//tbody/tr[1]/td[3]/div[3]/span/span"); 
    const actionElement = await driver.findElement(actionLocator);
    const actualActionText = await actionElement.getText();

    assert.strictEqual(actualPolicyName.trim(), extendedName, `Expected policy "${extendedName}" at the top, but found "${actualPolicyName}".`);
    assert.strictEqual(actualActionText.trim(), "Locked", `Expected "Locked" in action column for policy "${extendedName}", but found "${actualActionText}".`);

    console.log(`Policy "${extendedName}" is correctly displayed at the top with "Locked" status.`);
};

/**
 * Moves a policy to the top, placing it above a locked policy
 * @param policyName - The policy to move
 * @param lockedPolicy - The locked policy
 * @param driver
 * @param testCaseKey
 */
export const movePolicyAboveLockedPolicy = async (lockedPolicy: string, policyName: string, driver: WebDriver, testCaseKey: string): Promise<void> => {
    
    const extendedPolicyName1 = `${await utils.getParentFolderName()}_${lockedPolicy}_${testCaseKey}`;
    const extendedPolicyName2 = `${await utils.getParentFolderName()}_Block signature ${policyName}_${testCaseKey}`;

    try {
        console.log(`Dragging ${extendedPolicyName2} above locked policy ${extendedPolicyName1}`);
        await utils.dragAndDrop(extendedPolicyName1, extendedPolicyName2, driver);
    } catch (error) {
        throw new Error(`Failed to move "${extendedPolicyName2}" above locked policy "${extendedPolicyName1}".`);
    }
};

/**
 * Asserts that each search term in the provided list is present in the table.
 *
 * This function iterates through the given search terms, checking if they are 
 * located in the table. If a term is not found, the test will fail with an 
 * assertion error.
 *
 * @param {WebDriver} driver - The Selenium WebDriver instance used to interact with the page.
 * @param {string[]} searchTerms - An array of search terms expected to be present in the table.
 * @throws Will throw an error if any of the search terms are not found in the table.
 */
export const assertSearchTermIsInTable = async (driver: WebDriver, searchTerms: string[]): Promise<void> => {
    try {
        for (const searchTerm of searchTerms) {
            console.log(`Asserting ${searchTerm} is present in the table`);
            const searchTermFound = await driver.findElements(searchesPage.searchTermInTable(searchTerm));
            assert.ok(searchTermFound.length > 0, `Was unable to find ${searchTerm} in the table`);
        }
    } catch (error) {
        console.error(`Error when asserting a search term exists`);
        throw error;
    }
};

/**
 * Asserts that the warning toast is displayed when attempting to place a policy above a locked policy.
 * @param driver
 */
export const warningToastDisplayed = async (driver: WebDriver): Promise<void> => {

    const warningToastElement = await driver.wait(until.elementLocated(
        contentFilteringPage.warningToast()),
        waitTime
    );

    await driver.wait(
        until.elementIsVisible(warningToastElement),
        waitTime
    )
    
    assert.ok(await warningToastElement.isDisplayed(), `Warning toast is not displayed when place policy on top of locked policy`);
};

/**
 * Asserts that uncategorised is displayed in the Category Search modal
 * @param driver
 */
export const assertUncategorisedDisplayed= async (driver: WebDriver): Promise<void> => {
    const uncategorisedTextElement = await driver.wait(
        until.elementLocated(categorySearchModal.uncategorisedText()),
        waitTime
    );
    assert.ok(await uncategorisedTextElement.isDisplayed(), '"Uncategorised Website" text is not displayed.' );
};

/**
 * Asserts that "invalid url entered" text is displayed in the Category Search modal
 * @param driver
 */
export const assertInvalidUrlDisplayed= async (driver: WebDriver): Promise<void> => {
    const invalidUrlTextElement = await driver.wait(
        until.elementLocated(categorySearchModal.invalidUrlEnteredText()),
        waitTime
    );
    assert.ok(await invalidUrlTextElement.isDisplayed(), '"Invalid url entered" text is not displayed.' );

    // Check "invalid url entered" text is below input search field
    const inputElement = await driver.findElement(categorySearchModal.websiteInput());
    const inputField = await inputElement.getRect();

    const invalidUrlTextField = await invalidUrlTextElement.getRect();

    assert.ok(invalidUrlTextField.y > inputField.y, '"invalid url entered" text is not below input website search field');
};

/**
 * Dismisses the new product announcement by locating and interacting with the dismiss button inside an iframe.
 * This announcement has a tendency to cover required elements.
 * 
 * @param {WebDriver} driver - The Selenium WebDriver instance.
 * @returns {Promise<void>} Resolves when the announcement is dismissed or if no iframe is found.
 */
export const dismissAnnouncement = async (driver: WebDriver): Promise<void> => {
    try {
        await driver.wait(until.elementLocated(By.className('userflowjs-resource-center-popout-frame')), 5000);

        const framesFound = await driver.findElements(By.className('userflowjs-resource-center-popout-frame'));

        if (framesFound.length > 0) {
            await driver.switchTo().frame(framesFound[0]);

            // Wait for the dismiss button to appear inside the iframe
            const dismissButton = await driver.wait(
                until.elementLocated(By.css('button[aria-label="Dismiss announcement"]')),
                5000
            );

            await dismissButton.click();
            await driver.switchTo().defaultContent();
        } else {
            console.warn("No announcement iframe found.");
        }
    } catch (error) {
        console.warn("Announcement popup did not appear within the timeout.");
    }
};

/**
 * Asserts the driver is the Statistics dashboard page in School Manager.
 * The current url is asserted as are some elements on the dashboard page.
 * @param driver 
 * @throws {Error} if there was an issue asserting the content on the page.
 */
export const assertOnStatisticsDashboardPage = async (driver: WebDriver): Promise<void> => {
    try {

        const targetUrl = `${schoolManagerUrl}/surfwize/dashboard` // dashboard is the landing page for statistics
        const currentUrl = await driver.getCurrentUrl();
        assert.match(currentUrl, new RegExp(`${targetUrl}`),
            `Expected URL to be ${targetUrl}, but got ${currentUrl}`
        );

        const dashboardHeaderLocator = statisticsDashboardPage.heading();

        const dashboardHeaderElement = await driver.wait(
            until.elementLocated(dashboardHeaderLocator),
            waitTime,
            "Dashboard header not located within wait time"
        );
    
        await driver.wait(
            until.elementIsVisible(dashboardHeaderElement),
            waitTime,
            "Dashboard header not visible within wait time"
        );        
    
        const isHeaderDisplayed = await dashboardHeaderElement.isDisplayed();
        assert.ok(isHeaderDisplayed,
            "Dashboard header is not displayed as expected after navigation."
        );
    } catch (error) {
        console.error(`Error occurred when asserting the driver was on the searches page: ${error}`);
        throw error;
    } 
};

/**
 * Finds the element for view all red flags and attempts to click it
 * @returns By object
 * @throws An error if it is unable to click the view all button successfully.
 */
export const clickRedFlagsViewAll = async (driver: WebDriver): Promise<void> => {
    try {
        const viewAllRedFlagsLocator = statisticsDashboardPage.viewAllRedFlags();
        const viewAllRedFlagsLocatorElement = await driver.wait(
            until.elementLocated(viewAllRedFlagsLocator),
            waitTime,
            "Red Flags view all button not located within wait time"
        );
        await viewAllRedFlagsLocatorElement.click();
    } catch (error) {
        console.error("Error occurred when attempting to click the View All red flags button: ", error);
        throw error;
    }
};

/**
 * Uses a heading element and current url to assert the current page is the red flags page.
 * @param driver 
 */
export const assertOnRedFlagsPage = async (driver: WebDriver): Promise<void> => {
    try {
        const headingLocator = redFlagsPage.heading();
        await driver.wait(
            until.elementLocated(headingLocator),
            waitTime,
            "The Red Flags heading element was not located within wait time"
        );

        const currentUrl = await driver.getCurrentUrl();
        const expectedPath: string = "/cybersafety/wellbeing";

        assert.ok(
            currentUrl.includes(expectedPath), 
            `Expected URL to contain: ${expectedPath}, but got: ${currentUrl}`
        );
    } catch (error) {
        console.error("Error occured when asserting on red flags page: ", error)
    }
}

/**
 * Clicks a particular red flag based on the provided user and risk.
 * @param driver - The IT Admin driver
 * @param risk - Options are: Adult Content, VPN Search, Suicide, Depression, Substance Abuse, Violence, Hate Speech, Bullying, Academic Dishonesty.
 * @param agent - Options are: Windows 10 Agent, Windows 11 Agent, Browser Extension MV3
 */
export const clickRedFlag = async (driver: WebDriver, risk: string, agent: string): Promise<void> => {
    try {

        // determine the user for whom to click a red flag
        let user: string;
        const normalisedAgent = agent.toLowerCase().trim();
        // determine the user so we make sure we click the red flag pertaining to the user
        switch (normalisedAgent) {
            case "windows 10 agent":
                user = lwWindows10AgentUser;
                break;
            case "windows 11 agent":
                user = lwWindows11AgentUser;
                break;
            case "browser extension mv3":
                user = lwBrowserExtensionMV3User;
                break;
            default:
                throw new Error(`Unable to determine the user from the provided agent: ${normalisedAgent}`);
        }

        // first, set the time configurator based on the time stored in test context
        // this will be when the search terms were generated to raise red flags
        await adjustTimeConfigurator(driver);
        await utils.waitForAnimation(5000);

        if (user != null) {
            console.log(`Attempting to click ${risk} flag for ${user}`);
            const redFlagLocator = redFlagsPage.redFlagForUser(user, risk);
            // wait until the required red flag pertaining to the user is visible in the table before attempting to click
            const redFlag = await driver.wait(
                until.elementLocated(redFlagLocator),
                waitTime,
                "Red Flag element was not located within wait time"
            );
            await redFlag.click();

            // assert now on the search history page for the correct user and red flag
            const urlEncodedRisk = encodeURI(risk); // eg. "Adult Content" -> "Adult%20Content"
            const currentUrl = await driver.getCurrentUrl();
            const expectedToContain = `cybersafety/search/user/${user}/${urlEncodedRisk}`;

            // assert the path of the url contains the path as expected above
            assert.ok(
                currentUrl.includes(expectedToContain), 
                `Expected URL to contain: ${expectedToContain}, but got: ${currentUrl}`
            );

        } else {
            throw new Error(`The user was null or not provided: ${user}`);
        }
        
    } catch (error) {
        console.error("Error when trying to click a red flag: ", error);
        throw error;
    }
};

/**
 * Sets the time configurator in School Manager to the current time as per the testContext.currentTime.
 * If `setOnlyHours` is passed as true, the minutes will be set to '00' and only the hours and AM/PM will be modified.
 * Added because youtube videos only show the hours timestamp/
 * @param driver
 * @param setOnlyHours - A flag to only modify hours and leave minutes at 00.
 */
const adjustTimeConfigurator = async (driver: WebDriver, setOnlyHours: boolean = false, customTime?: utils.timeFormat): Promise<void> => {
    try {
        const currentTime = customTime || utils.testContext.currentTime; // Use customTime if provided, otherwise fallback to testContext
        if (currentTime !== null && currentTime !== undefined) {
            const hours = currentTime.hours;
            const minutes = currentTime.minutes;
            const period = currentTime.period;
    
            // locators for changing the time configurator
            const timeConfigurator = searchesPage.timeConfigurator();
            const todayButton = searchesPage.todayButton();
            const customRangeButton = searchesPage.customRangeButton();
            const hoursInputField = searchesPage.hoursInputField();
            const minutesInputField = searchesPage.minutesInputField();
            const amPmField = searchesPage.amPmField();
            const amOption = searchesPage.amOption();
            const pmOption = searchesPage.pmOption();
            const selectButton = searchesPage.selectBtn();
    
            // dismiss the announcement message
            await dismissAnnouncement(driver);
    
            // click the time configurator
            await driver.wait(until.elementLocated(timeConfigurator), waitTime, "Time configurator was not located in time");
            console.log("Clicking time configurator");
            await driver.findElement(timeConfigurator).click();
            await utils.waitForAnimation();
    
            // click today
            await driver.wait(until.elementLocated(todayButton), waitTime, "Today button was not located in time");
            console.log("Clicking Today");
            await driver.findElement(todayButton).click();
            await utils.waitForAnimation();
    
            // reopen the time configurator as it gets closed when clicking Today
            console.log("Clicking time configurator");
            await driver.findElement(timeConfigurator).click();
            await utils.waitForAnimation();
    
            // click custom range
            await driver.wait(until.elementLocated(customRangeButton), waitTime, "Custom Range button was not located in time");
            console.log("Clicking custom range button");
            await driver.findElement(customRangeButton).click();
            await utils.waitForAnimation();
    
            // click into the hours field and enter the current hours
            await driver.wait(until.elementLocated(hoursInputField), waitTime, "Hours input field ws not located in time");
            console.log("Clicking hours input");
            await driver.findElement(hoursInputField).click();
            await utils.waitForAnimation();
            console.log(`Sending ${hours} to the hours input field`);
            await driver.findElement(hoursInputField).sendKeys(Key.BACK_SPACE);
            await driver.findElement(hoursInputField).sendKeys(Key.BACK_SPACE);
            await driver.findElement(hoursInputField).sendKeys(hours);
            const hoursValue = await driver.findElement(hoursInputField).getAttribute("value");
            assert.strictEqual(hoursValue, hours, `Expected hours value to be ${hours}, but got ${hoursValue}`);
    
            // click into the minutes field and enter the current minutes
            if (!setOnlyHours) {
                await driver.wait(until.elementLocated(minutesInputField), waitTime, "Minutes input field was not located in time");
                console.log("Clicking the minutes input field");
                await driver.findElement(minutesInputField).click();
                await utils.waitForAnimation();
                console.log(`Sending ${minutes} to the minutes input field`);
                await driver.findElement(minutesInputField).sendKeys(Key.BACK_SPACE);
                await driver.findElement(minutesInputField).sendKeys(Key.BACK_SPACE);
                await driver.findElement(minutesInputField).sendKeys(minutes);
                const minutesValue = await driver.findElement(minutesInputField).getAttribute("value");
                assert.strictEqual(minutesValue, minutes, `Expected minutes value to be ${minutes}, but got ${minutesValue}`);
            }
    
            // click the AM/PM dropdown and select the appropriate option
            await driver.wait(until.elementLocated(amPmField), waitTime, "AM/PM field was not located in time");
            console.log("Clicking the AM/PM dropdown");
            await driver.findElement(amPmField).click();
            await utils.waitForAnimation();
            await driver.wait(until.elementLocated(amOption), waitTime, "The AM option was not found in time");
            await driver.wait(until.elementLocated(pmOption), waitTime, "The PM option was not found in time");
            // select the appropriate option based on the value of period from the current time
            switch (period) {
                case "AM":
                    console.log("Clicking the AM option");
                    await driver.findElement(amOption).click();
                    break;
                case "PM":
                    console.log("Clicking the PM option");
                    await driver.findElement(pmOption).click();
                    break;
                default:
                    throw new Error(`Invalid option for am/pm period: ${period}`);
            }
    
            await utils.waitForAnimation();
            // click the select button to save
            await driver.wait(until.elementLocated(selectButton), waitTime, "Select button was not located in time");
            console.log("Saving time configuration");
            await driver.findElement(selectButton).click();
        } else {
            throw new Error(`The current time is ${currentTime}, which is invalid.`);
        }
    } catch (error) {
        console.error("Error occured when setting the time in SM: ", error);
        throw error;
    }
};

/**
 * Asserts that a red flag for a given search term and search engine is present in the table.
 * @param driver
 * @param searchTerm 
 * @param redFlag 
 * @param searchEngine 
 */
export const assertRedFlag = async (driver: WebDriver, searchTerm: string, redFlag: string, searchEngine: string): Promise<void> => {

    try {
        // Ensure we are on the correct page
        const headingLocator = userSearchHistoryPage.heading();
        await driver.wait(
            until.elementLocated(headingLocator),
            waitTime,
            "Search History heading element was not located within wait time"
        );

        const normalisedSearchEngine = searchEngine.toLowerCase().trim();
        const searchEngineUrl = `${normalisedSearchEngine}.com`; // Expected format in the table
        const redFlagRowLocator = userSearchHistoryPage.redFlagInTable(searchTerm, redFlag, searchEngineUrl);
        const defaultSortLocator = userSearchHistoryPage.defaultSort();
        const ascendingSortLocator = userSearchHistoryPage.ascendingSort();
        const descendingSortLocator = userSearchHistoryPage.descendingSort();

        // Wait for a row to load first (if one loads they all do);
        await driver.wait(
            until.elementLocated(redFlagRowLocator),
            waitTime,
            "Red Flag element was not located within wait time"
        );
        
        // Check if the list is already sorted by descending
        const isDescending = await driver.findElements(descendingSortLocator);

        if (isDescending.length === 0) {
            // Clicking the default sort sorts it by ascending
            console.log("Clicking sort to first sort by ascending");
            await driver.findElement(defaultSortLocator).click();
            await utils.waitForAnimation();

            // Clicking the ascending sort then sorts it by descending
            console.log("Clicking sort to now sort by descending");
            await driver.findElement(ascendingSortLocator).click();
            await utils.waitForAnimation();
        } else {
            console.log("Already sorted by descending, doing nothing");
        }

        // Get today's date in YYYY-MM-DD format
        const todayDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

        // Get the stored testContext time from utils (e.g., { hours: "4", minutes: "20", period: "PM" })
        const testContextTime = utils.testContext.currentTime;

        // Ensure testContextTime is an object and parse the time
        if (typeof testContextTime !== 'object' || testContextTime === undefined || !('hours' in testContextTime) || !('minutes' in testContextTime) || !('period' in testContextTime)) {
            throw new Error(`Expected testContextTime to be an object with 'hours', 'minutes', and 'period', but got ${typeof testContextTime}`);
        }

        // Construct the time string from the object (e.g., "4:20 PM")
        const formattedTime = `${testContextTime.hours}:${testContextTime.minutes} ${testContextTime.period}`;

        // Parse the time from "HH:MM AM/PM" format
        const [time, period] = formattedTime.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let testHours = hours;
        if (period === 'PM' && hours !== 12) {
            testHours += 12; // Convert PM hours to 24-hour format
        } else if (period === 'AM' && hours === 12) {
            testHours = 0; // Handle 12 AM as 00:00
        }

        const testTime = new Date();
        testTime.setHours(testHours, minutes, 0, 0); // Set today's date with provided time

        // Get all the red flag rows where the search term, search engine and red flag category are present
        const redFlagRows = await driver.findElements(redFlagRowLocator);

        if (redFlagRows.length === 0) {
            throw new Error(`No matching red flag rows found for searchTerm: ${searchTerm}, redFlag: ${redFlag}, searchEngine: ${searchEngineUrl}`);
        }

        // Iterate through rows and find the first valid timestamp
        for (const row of redFlagRows) {
            const timestampElement = await row.findElement(By.xpath("./td[1]//p")); // XPath for timestamp in first <td>
            const timestampText = await timestampElement.getText(); // Format: "2025-03-11 16:26:40"

            // Split timestamp into date and time
            const [rowDateText, rowTimeText] = timestampText.split(' '); // ["2025-03-11", "16:26:40"]

            // Only proceed if the row's date matches today's date
            if (rowDateText === todayDate) {
                // Convert row time to Date object for comparison
                const [rowHours, rowMinutes, rowSeconds] = rowTimeText.split(':').map(Number);
                const rowTime = new Date();
                rowTime.setHours(rowHours, rowMinutes, rowSeconds, 0); // Set today's date with row time

                // Assertion: Ensure the row time is later than the testContextTime
                assert.ok(rowTime > testTime, `Expected a row with timestamp later than ${formattedTime}, but found ${timestampText}`);

                console.log(`Matching row found with timestamp: ${timestampText} for searchTerm: ${searchTerm}, redFlag: ${redFlag}, searchEngine: ${searchEngineUrl}`);
                break; // Exit the loop as soon as one matching row is found
            }
        }

    } catch (error) {
        console.error(`Error when asserting red flag: ${error}`);
        throw error;
    }
};

/**
 * Asserts the driver is currently on the videos page by using the heading and current url.
 * @param driver
 */
export const assertOnVideosPage = async (driver: WebDriver): Promise<void> => {
    try {
        await driver.wait(
            until.elementLocated(videosPage.heading()),
            waitTime,
            "The Videos heading was not found in time"
        );

        const currentUrl = await driver.getCurrentUrl();

        assert.ok(
            currentUrl.includes("/cybersafety/video"),
            `The currentUrl ${currentUrl} did not contain /cybersafety/video`
        );

    } catch (error) {
        console.error(`Error occurred when asserting the driver is on the videos page: ${error}`);
        throw error;
    }
}

/**
 * Asserts the driver is currently on the time period page by using the heading and current url.
 * @param driver
 */
export const assertTimePeriodPage = async (driver: WebDriver): Promise<void> => {
    try {
        await driver.wait(
            until.elementLocated(timePeriodsPage.heading()),
            waitTime,
            "The Time Periods heading was not found in time"
        );

        const currentUrl = await driver.getCurrentUrl();

        assert.ok(
            currentUrl.includes("/config/device/objects/timeperiods"),
            `The currentUrl ${currentUrl} did not contain /config/device/objects/timeperiods`
        );

    } catch (error) {
        console.error(`Error occurred when asserting the driver is on the time periods page: ${error}`);
        throw error;
    }
}

/**
 * Asserts the driver is currently on the manage time period page by using the heading and current url.
 * @param driver
 */
export const assertManageTimePeriodPage = async (driver: WebDriver): Promise<void> => {
    try {
        await driver.wait(
            until.elementLocated(timePeriodsPage.manageTimePeriodHeading()),
            waitTime,
            "The Manage Time Periods heading was not found in time"
        );

        const currentUrl = await driver.getCurrentUrl();

        assert.ok(
            currentUrl.includes("/config/device/objects/timeperiods/"),
            `The currentUrl ${currentUrl} did not contain /config/device/objects/timeperiods`
        );

    } catch (error) {
        console.error(`Error occurred when asserting the driver is on the manage time period page: ${error}`);
        throw error;
    }
}

/**
 * Attempts to find a video in the table, retrying up to a maximum number of times.
 * If the video is not found, the page is refreshed and retried with an increasing wait time.
 *
 * @param driver - The WebDriver instance
 * @param title - The title of the video to search for
 * @throws Error if the video is not found after all retries
 */
export const findVideoInTable = async (driver: WebDriver, title: string): Promise<void> => {
    const maxRetries = 3;
    let attempts = 0;
    let sleepTime = 10000;
    while (attempts > maxRetries) {
        try {
            // set the time configurator to be from the time the video was generated
            // videos use a separate testContext.videoGenerationTime to avoid this value being overwritten by other tests
            await adjustTimeConfigurator(driver, true, utils.testContext.videoGenerationTime);
    
            await driver.wait(
                until.elementLocated(videosPage.videoTitle(title)),
                waitTime,
                `Video Title ${title} was not found in time`
            );

            console.log(`Video "${title}" found successfully.`);
            return;

        } catch (error) {
            attempts++;
            console.warn(`Attempt ${attempts} failed to find video "${title}". Retrying (${attempts}/${maxRetries})...`);

            // if the video was not found, retry
            // there is an expontential backoff starting at the sleepTime value then doubling each time, for a maxRetries value
            // the videos seem to have an inconsistent time between viewing the video and seeing it in school manager

            if (attempts < maxRetries) {
                await driver.sleep(sleepTime);
                sleepTime *= 2;
                await driver.navigate().refresh();
            } else {
                throw new Error(`Failed to find video "${title}" after ${maxRetries} attempts.`);
            }
        }
    }
};

/**
 * Asserts the video details for a video with a given title and url
 * @param driver 
 * @param title - Title of the video
 * @param url - URL of the video 
 */
export const assertVideoDetails = async (driver: WebDriver, title: string, url: string): Promise<void> => {

    try {

        // adjust the time configurator
        // videos use a separate testContext.videoGenerationTime to avoid this value being overwritten by other tests
        await adjustTimeConfigurator(driver, true, utils.testContext.videoGenerationTime);

        const thumbnail = await driver.wait(until.elementLocated(videosPage.thumbnail(title)), waitTime);
        const views = await driver.wait(until.elementLocated(videosPage.views(title)), waitTime);
        const users = await driver.wait(until.elementLocated(videosPage.users(title)), waitTime);
        const videoTitle = await driver.wait(until.elementLocated(videosPage.videoTitle(title)), waitTime);

        let videoId: string = "";

        // extract the video id part from the video url
        // eg youtu.be/fwfe847 -> fwfe847
        if (url.includes("youtu.be")) {
            videoId = url.split("/").pop() || "";
        } else if (url.includes("youtube.com/watch")) {
            videoId = url.split("watch?v=").pop() || ""
        } else {
            throw new Error(`Invalid format for url provided: ${url}`);
        }

        // assert the thumbnail is the right thumbnail by using the video id
        console.log("Asserting the thumbnail is correct based on the video is within the src attribute");
        const thumbnailSrc = await thumbnail.getAttribute("src");
        assert.ok(
            thumbnailSrc.includes(videoId), `The thumbnail did not include the video id ${videoId}`
        );

        // assert the video title is correct
        console.log("Asserting the video title is correct");
        const videoTitleText = await videoTitle.getText();
        assert.ok(
            videoTitleText.includes(title), `The found title ${videoTitleText} was not the expected value of ${title}`
        );

        // assert the views count is greater than or equal to 1
        console.log("Asserting the view count is greater than or equal to 1");
        const viewCount = await views.getText();
        const viewCountNum = Number(viewCount);
        assert.ok(
            viewCountNum >= 1, `The value for view count ${viewCount} was less than 1, which is unexpected`
        );

        // assert the users count is greater than or equal to 1
        console.log("Asserting the user count is greater than or equal to 1");
        const userCount = await users.getText();
        const userCountNum = Number(userCount);
        assert.ok(
            userCountNum >= 1, `The value for user count ${userCountNum} was less than 1, which is unexpected`
        );
    } catch (error) {
        console.error(`Error when making asserts about the video: ${error}`);
        throw error;
    }
};

/**
 * Click into a youtube video on the cybersafety videos page based on the title
 * @param driver 
 * @param title 
 */
export const clickYoutubeVideo = async (driver: WebDriver, title: string) => {
    try {
        // click the video based on the title
        console.log(`Clicking video: ${title}`);
        const video = await driver.findElement(videosPage.videoTitle(title));
        await video.click();
    } catch (error) {
        console.error(`Error occurred when clicking into youtube video": ${error}`);
        throw error;
    }
};

/**
 * Confirms the driver is currently on the correct video detail page by getting the current url and confirming it includes the video id
 * @param driver 
 * @param url 
 */
export const assertOnVideoDetailPage = async (driver: WebDriver, url: string): Promise<void> => {

    try {

        console.log("Confirming the Video Details header is present");
        await driver.wait(
            until.elementLocated(videoDetailPage.heading()),
            waitTime,
            "The video detail header was not located in time"
        );

        let videoId: string = "";

        if (url.includes("youtu.be")) {
            videoId = url.split("/").pop() || "";
        } else if (url.includes("youtube.com/watch")) {
            videoId = url.split("watch?v=").pop() || ""
        } else {
            throw new Error(`Invalid format for url provided: ${url}`);
        }
        
        console.log("Confirming on the correct video detail page by the video id being present in the url");
        const currentUrl = await driver.getCurrentUrl();
        assert.ok(
            currentUrl.includes(videoId),
            `The current url (${currentUrl}) did not include the expected videoid (${videoId})`
        );
    } catch (error) {
        console.error(`Error occurred when asserting the driver is on the correct video detail page: ${error}`);
        throw error;
    }
};

/**
 * Asserts the video title is present on the video details as a first step to confirm the details are for the expected video
 * @param driver 
 * @param title 
 */
export const assertVideoTitleIsDisplayed = async (driver: WebDriver, title: string): Promise<void> => {

    try {
        console.log("Checking the video details are for the expected video");
        const videoTitleLocator = videoDetailPage.videoTitle(title);
        const videoTitle = await driver.wait(
            until.elementLocated(videoTitleLocator),
            waitTime,
            "Video Title was not found, some details are missing"
        );

        const isDisplayed = await videoTitle.isDisplayed();
        assert.strictEqual(isDisplayed, true, "Expected video title to be displayed");

    } catch (error) {
        console.error(`Error occcurred when asserting the video title was present on the page: ${error}`);
        throw error;
    }
};

/**
 * Asserts the details on the video details page, including the timestamp, username, MAC address, embedded video, and description.
 * 
 * @param driver - The WebDriver instance used to interact with the page.
 * @param agent - The agent string to determine the user.
 * @param url - The URL of the video to extract the video ID.
 * @param description - The expected description of the video to be verified.
 * 
 * @throws Error if any of the details (timestamp, username, MAC address, embedded video, or description) do not match the expected values.
 */
export const assertVideoDetailDetails = async (driver: WebDriver, agent: string, url: string, description: string): Promise<void> => {

    try {
        let user: string = "";
        const normalisedAgent = agent.toLowerCase().trim();
        switch (normalisedAgent) {
            case "windows 10 agent":
                user = lwWindows10AgentUser;
                break;
            case "windows 11 agent":
                user = lwWindows11AgentUser;
                break;
            case "browser extension mv3":
                user = lwBrowserExtensionMV3User;
                break;
            default:
                throw new Error(`Unable to determine the user from the provided agent: ${normalisedAgent}`);
        }

        let videoId: string = "";

        if (url.includes("youtu.be")) {
            videoId = url.split("/").pop() || "";
        } else if (url.includes("youtube.com/watch")) {
            videoId = url.split("watch?v=").pop() || ""
        } else {
            throw new Error(`Invalid format for url provided: ${url}`);
        }

        const defaultSortLocator = videoDetailPage.defaultSort();
        const ascendingSortLocator = videoDetailPage.ascendingSort();
        const descendingSortLocator = videoDetailPage.descendingSort();

        // Check if the list is already sorted by descending
        // If it isn't, sort by descending so we are checking the most recent entries first
        const isDescending = await driver.findElements(descendingSortLocator);

        if (isDescending.length === 0) {
            // Clicking the default sort, sorts it by ascending
            console.log("Clicking sort to first sort by ascending");
            const defaultSort = await driver.wait(
                until.elementLocated(defaultSortLocator),
                waitTime,
                "Was unable to located to default sort locator"
            )
    
            await defaultSort.click();
            await utils.waitForAnimation();
 
            // Clicking the ascending sort then sorts it by descending
            console.log("Clicking sort to now sort by descending");
            await driver.findElement(ascendingSortLocator).click();
            await utils.waitForAnimation();
        } else {
            console.log("Already sorted by descending, doing nothing");
        }

        // TIMESTAMP
        // Get today's date in YYYY-MM-DD format
        const todayDate = new Date().toISOString().split('T')[0]; // e.g., "2025-03-17"

        // Get the stored testContext time from utils
        const testContextTime = utils.testContext.videoGenerationTime;

        // Ensure testContextTime is valid
        if (typeof testContextTime !== 'object' || testContextTime === undefined || !('hours' in testContextTime) || !('minutes' in testContextTime) || !('period' in testContextTime)) {
            throw new Error(`Expected testContextTime to be an object with 'hours', 'minutes', and 'period', but got ${typeof testContextTime}`);
        }

        // Construct the time string (e.g., "4:20 PM")
        const formattedTime = `${testContextTime.hours}:${testContextTime.minutes} ${testContextTime.period}`;

        // Parse the time from "HH:MM AM/PM" format
        const [time, period] = formattedTime.split(' ');
        const [hours, minutes] = time.split(':').map(Number);

        let testHours = hours;
        if (period === 'PM' && hours !== 12) {
            testHours += 12; // Convert PM hours to 24-hour format
        } else if (period === 'AM' && hours === 12) {
            testHours = 0; // Handle 12 AM as 00:00
        }

        // Construct the expected actual time from `formattedTime`
        const expectedActualTime = `${String(testHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

        // Round timestamp to just the hours, eg, 16:00:00
        // Video time seems to only show for the hour it was generated, no more granular than that
        // But, we check for both 16:00:00 and 16:21:00 (example) just in case
        const expectedRoundedTime = `${String(testHours).padStart(2, '0')}:00:00`;

        console.log(`Checking for timestamps: ${expectedActualTime} or ${expectedRoundedTime}`);

        const timestampElements = await driver.findElements(videoDetailPage.timestamp(user));
        
        // there may be multiple entries for the user on the video
        // the table will be sorted so that the most recent is at the top
        // we only need to check the most recent rather than iterating through all of them
        if (timestampElements.length > 0) {
            console.log(`Found ${timestampElements.length} timestamp entries for the user ${user} and video ${videoId}`);
            const mostRecentTimestampElement = timestampElements[0]; // Get the first (most recent) entry
            const timestampText = await mostRecentTimestampElement.getText(); // Expected format: "2025-03-17 10:05:00"

            // Split timestamp into date and time
            const [rowDate, rowTime] = timestampText.split(' ');

            // Check if the timestamp matches
            assert.ok(
                rowDate === todayDate && (rowTime === expectedActualTime || rowTime === expectedRoundedTime),
                `Expected timestamp to be ${expectedActualTime} or ${expectedRoundedTime}, but got ${timestampText}`
            );
            console.log(`Matching timestamp found: ${timestampText}`);
        } else {
            assert.fail(`No timestamps found for user "${user}"`);
        }

        // USERNAME
        const usernameLocator = videoDetailPage.user(user);
        const usernameElements = await driver.findElements(usernameLocator);
        // there may be multiple entries for the user on the video
        // the table will be sorted so that the most recent is at the top
        // we only need to check the most recent rather than iterating through all of them
        if (usernameElements.length > 0 ) {
            console.log(`Found ${usernameElements.length} username entries for the user ${user} and the video ${videoId}`);
            console.log(`Checking the value for the most recent entry`);
            const mostRecentUsernameEntry = usernameElements[0]; // Get the first (most recent) entry
            const usernameText = await mostRecentUsernameEntry.getText();

            assert.ok(
                usernameText === user, `Expected ${user} for the username, actual username was ${usernameText}`
            )
            console.log(`Found the expected username ${user} from the element text: ${usernameText}`);
        } else {
            assert.fail(`Username ${user} was not found in the table`);
        }
       
        
        // MAC Address
        // Only the Windows Agent provides a mac address,
        // so do not do this step for Browser Extension MV3
        if (normalisedAgent === "browser extension mv3") {
            console.log("Skipping MAC address check as the browser extension does not provide one");
        } else {
            const macAddressLocator = videoDetailPage.macAddress(user);
            const macAddressRegex = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    
            const macAddressElements = await driver.findElements(macAddressLocator);
    
            if (macAddressElements.length > 0) {
                console.log(`Found ${macAddressElements.length} mac address entries for the user ${user} and the video ${videoId}`);
                console.log(`Checking the value for the most recent entry`);
                const mostRecentMacEntry = macAddressElements[0]; // Get the first (most recent) entry
                const macAddressText = await mostRecentMacEntry.getText();
    
                // Check if the extracted MAC address matches the expected format
                assert.match(macAddressText, macAddressRegex, `Expected valid MAC address, but got "${macAddressText}"`);
    
                console.log(`Found valid MAC address: ${macAddressText}`);
            } else {
                assert.fail(`No MAC addresses found for user "${user}"`);
            }
        }

        // VIDEO EMBEDDED
        const embeddedVideoLocator = videoDetailPage.embeddedVideo();
        const embeddedVideo = await driver.wait(
            until.elementLocated(embeddedVideoLocator),
            waitTime,
            "Unable to find the embedded video within the wait time"
        );

        const src = await embeddedVideo.getAttribute("src");

        assert.ok(src.includes(videoId), "Expected the embedded video to contain the video id");
        console.log(`The expected video id (${videoId}) was found in the src value of the embedded video (${src})`);

        // VIDEO DESCRIPTION
        const videoDescriptionLocator = videoDetailPage.videoDescription();
        const videoDescriptionElement = await driver.wait(
            until.elementLocated(videoDescriptionLocator),
            waitTime,
            "Did not find the video description element within the wait time"
        );

        const videoDescriptionText = await videoDescriptionElement.getText();

        assert.ok(videoDescriptionText.includes(description), `Expected the video description to contain ${description}`);
        console.log(`Found the expected video description (${description}),\nwithin the actual description (${videoDescriptionText})`);

    } catch (error) {
        console.error(`Error occurred when asserting details on the video details page: ${error}`);
        throw error;
    }

};

/**
 * Inputs website and username in the Test Policy Modal.
 * @param driver
 * @param website
 * @param username
 */
export const inputWebsiteAndUser= async (driver: WebDriver, website:string, username:string): Promise<void> => {
    const websiteInputElement = await driver.findElement(testPolicyModal.websiteInput());
    await websiteInputElement.sendKeys(website);
    const userInputElement = await driver.findElement(testPolicyModal.userInput());
    await userInputElement.click();
    await userInputElement.sendKeys(username);
    
    // Wait for dropdown list to be displayed
    const dropDownElement = await driver.wait(until.elementLocated(testPolicyModal.userDropdown()), waitTime);
    dropDownElement.click();
    await utils.waitForAnimation();

    // Locate the list item containing the username
    const userOptionElement = await driver.wait(
        until.elementLocated(testPolicyModal.userOption(username)),
        waitTime
    )
    // Click the button inside the list item
    const buttonInsideOption = await userOptionElement.findElement(By.css("button"));
    await buttonInsideOption.click();
};

/**
 * clicks on the Test Policy button
 * @param driver 
 * @param buttonName - "Test Policy"
 */
export const clickTestPolicyBtn = async (driver: WebDriver, buttonName: string): Promise<void> => {
    try {
        console.log(`Clicking Test Policy button`);
        const testPolicyBtnLocator = contentFilteringPage.headerButton(buttonName);
        const testPolicyBtn = await driver.wait(until.elementLocated(testPolicyBtnLocator), waitTime, "Button not located within wait time");
        await testPolicyBtn.click();
    } catch (error) {
        console.error("Error: test policy modal did not open", error);
        throw error;
    }
};

/**
 * assert that Test Policy Modal is opened
 * @param driver 
 */
export const assertTestPolicyModalOpen = async (driver: WebDriver): Promise<void> => {
    
    const testPolicyHeaderElement = await driver.wait(
        until.elementLocated(testPolicyModal.heading()),
        waitTime
    );

    const websiteInputElement = await driver.wait(
        until.elementLocated(testPolicyModal.websiteInput()),   
        waitTime
    );

    const userInputElement = await driver.wait(
        until.elementLocated(testPolicyModal.userInput()),
        waitTime
    )
    assert.ok(await testPolicyHeaderElement.isDisplayed() && await websiteInputElement.isDisplayed() && await userInputElement.isDisplayed(), "Test Policy modal is not opened correctly");
};

/**
 * clicks the Clear button in Test Policy modal
 * @param driver 
 */
export const clickModalClearBtn = async (driver: WebDriver): Promise<void> => {
    try {
        const clearBtn = await driver.findElement(testPolicyModal.clearBtn());
        clearBtn.click();
        await utils.waitForAnimation();
    } catch (error) {
        console.error(`Error in click clear button in Test Policy modal`, error);
        throw error;
    }
};

/**
 * clicks the Check button in Test Policy modal
 * @param driver 
 */
export const clickModalCheckBtn = async (driver: WebDriver): Promise<void> => {
    try {
        const checkBtn = await driver.findElement(testPolicyModal.checkBtn());
        checkBtn.click();
    } catch (error) {
        console.error(`Error in click check button in Test Policy modal`, error);
        throw error;
    }
};

/**
 * assert that webiste and username fields are cleared out in Test Policy modal
 * @param driver 
 */
export const assertWebsiteAndUserCleared = async (driver: WebDriver): Promise<void> => {
    const websiteInputElement = await driver.findElement(testPolicyModal.websiteInput());
    const websiteValue = await websiteInputElement.getAttribute("value");
    assert.strictEqual(websiteValue, "", `Website field is not cleared. Found value: ${websiteValue}`)

    const userInputElement = await driver.findElement(testPolicyModal.userInput());
    const userValue = await userInputElement.getAttribute("value");
    assert.strictEqual(userValue, "", `User field is not cleared. Found value: ${userValue}`)
};

/**
 * assert website is allowed with no matched policies
 * @param driver
 */
export const assertWebsiteAllowedWithNoPolicies = async (driver: WebDriver): Promise<void> => {
    const allowedTextElement = await driver.wait(
        until.elementLocated(testPolicyModal.allowedText()),
        waitTime
    );

    const noMatchPoliciesTextElement = await driver.wait(
        until.elementLocated(testPolicyModal.noMatchPolicies()),
        waitTime
    );

    assert.ok(await allowedTextElement.isDisplayed() && await noMatchPoliciesTextElement.isDisplayed(), `Allowed and no matched policies are not displayed correctly`);
};

/**
 * assert matched policies displayed
 * @param driver
 */
export const assertPoliciesMatched = async (driver: WebDriver, websiteName:string): Promise<void> => {
    const matchingPoliciesElement = await driver.wait(
        until.elementLocated(testPolicyModal.matchingPoliciesText()),
        waitTime
    );
    assert.ok(await matchingPoliciesElement.isDisplayed(), `matching policies text is not displayed for website ${websiteName}`);

    const policiesNameElement = await driver.wait(
        until.elementLocated(testPolicyModal.matchingPoliciesName(websiteName)),
        waitTime
    );
    assert.ok(await policiesNameElement.isDisplayed(), `matching policies name is not displayed for website ${websiteName}`);
};

/**
 * Enter name and click add for naming time period modal
 * @param driver 
 */
export const enterNameAndClickAdd = async (driver: WebDriver, name: string): Promise<void> => {
    try {
        const inputName = await driver.findElement(timePeriodsPage.inputName());
        await inputName.click();
        await inputName.sendKeys(name);
        const addBtn = await driver.findElement(timePeriodsPage.addBtn());
        await addBtn.click();
    } catch (error) {
        console.error(`Error in entering name and clicking add in name Time Period modal`, error);
        throw error;
    }
};

/**
 * Enters the provided start and end times into the Manage Time Period modal fields.
 * @param driver 
 * @param minusTime - The start time to enter in 24-hour HH:MM format
 * @param plusTime - The end time to enter in 24-hour HH:MM format
 */
export const enterVariableTime = async (driver: WebDriver, minusTime:string, plusTime:string): Promise<void> => {
    try {
        const inputStartTime = await driver.wait(
            until.elementLocated(timePeriodsPage.startTimeInput()),
            waitTime,
        );
        inputStartTime.click();
        inputStartTime.sendKeys(minusTime);
        const inputEndTime = await driver.wait(
            until.elementLocated(timePeriodsPage.endTimeInput()),
            waitTime
        );
        inputEndTime.click();
        inputEndTime.sendKeys(plusTime);
        console.log(`Entering current time - 2 minute ${minusTime} and current time + 2 minute ${plusTime} in the Time Fields`);
    } catch (error) {
        console.error(`Error in entering time`, error);
        throw error;
    }
};

/**
 * assert correct time period entered and Red Error Message of Start time should be less than end time disappeared
 * @param driver
 */
export const assertErrorTextDisappear = async (driver: WebDriver): Promise<void> => {

    let errorText = "";

    try {
        const errorTextElement = await driver.findElement(timePeriodsPage.errorText());
        errorText = await errorTextElement.getText();
    } catch (error:any) {
        if (error.name === 'StaleElementReferenceError') {
            const errorTextElement = await driver.findElement(timePeriodsPage.errorText());
            errorText = await errorTextElement.getText();
        } else {
            throw error; 
        }
    }
    const hasNotDisappeared = errorText.includes("Start time should be less than end time");
    assert.strictEqual(hasNotDisappeared, false, `Error text has not disappeared and text is: ${errorText}`);
};

/**
 * Select days in the manage time period page
 * @param driver 
 * @param days - the days to be selected
 */
export const selectDays = async (driver: WebDriver, day: string): Promise<void> => {
    try {
        await driver.findElements(By.className('userflowjs-resource-center-popout-frame'))
        .then(async (framesFound) => {
            if(framesFound.length > 0) {
                await driver.switchTo().frame(framesFound[0]);
                await driver.findElement(By.css('button[aria-label="Dismiss announcement"]')).click();
                await driver.switchTo().defaultContent();
            }
        });
        const dayElement = await driver.findElement(timePeriodsPage.selectDay(day));
        await dayElement.click();
    } catch (error) {
        console.error(`Error in select days`, error);
        throw error;
    }
};

/**
 * assert days are selected and date field group element disappears in manage time period page 
 * @param driver
 * @param days Array of day strings (e.g., ["mon", "tue"])
 */
export const assertDaySelectEffect = async (driver: WebDriver, days: string[]): Promise<void> => {

    for (const day of days) {
        const dayElement = await driver.findElement(timePeriodsPage.selectDay(day));
        const isSelected = await dayElement.isSelected();
        assert.strictEqual(isSelected, true, `Expected ${day} checkbox to be selected.`)
    }

    const formGroupElements = await driver.findElements(timePeriodsPage.formGroup());
    const numsOfGroup = formGroupElements.length;
    assert.strictEqual(numsOfGroup, 3, `Expected 3 form group elements after date field disappears, but found ${numsOfGroup}`);
};

/**
 * Click Save button in the manage time period page
 * @param driver 
 */
export const clickSave = async (driver: WebDriver): Promise<void> => {
    try {
        const saveBtn = await driver.findElement(timePeriodsPage.saveBtn());
        await saveBtn.click();
    } catch (error) {
        console.error(`Error in click save button in the manage time period page`, error);
        throw error;
    }
};

/**
 * clicks on the add time period button in Time Periods page
 * @param driver 
 */
export const clickAddTimePeriod = async (driver: WebDriver): Promise<void> => {
    try {
        const addTimePeriodBtn = await driver.findElement(timePeriodsPage.addTimePeriodBtn());
        await addTimePeriodBtn.click();
        await utils.waitForAnimation();
    } catch (error) {
        console.error("Error: add time period button is not clicked in Time Period Page", error);
        throw error;
    }
}

/**
 * assert that name time period Modal is displayed
 * @param driver
 */
export const assertNameTimePeriodModal = async (driver: WebDriver): Promise<void> => {
    const nameTimePeriodModalElement = await driver.wait(
        until.elementLocated(timePeriodsPage.nameTimePeriodModal()),
        waitTime
    );
    assert.ok(await nameTimePeriodModalElement.isDisplayed(), `Name Time Period Modal is not displayed`);
};

/**
 * Asserts the driver is on the content modification page in School Manager
 * @param driver 
 */
export const assertOnContentModificationPage = async (driver: WebDriver): Promise<void> => {
    try {
        console.log("Confirming the Conent Mods header is present");
        await driver.wait(
            until.elementLocated(contentModPage.heading()),
            waitTime,
            "The Content Mods heading was not found in time"
        );

    } catch (error) {
        console.error(`Error occurred when asserting the driver is on the content mods page: ${error}`);
        throw error;
    }
};

/**
 * Clicks the Create Policy button in the Content Modifications page
 * @param driver
 */
export const clickCreatePolicyBtn = async (driver: WebDriver): Promise<void> => {
    try {
        console.log("Clicking the Create Policy button");
        const createPolicyBtn = await driver.wait(
            until.elementLocated(contentModPage.createPolicyBtn()),
            waitTime,
            "The Create Policy button was not found in time"
        );

        await createPolicyBtn.click();

    } catch (error) {
        console.error(`Error occurred when clicking the Create Policy button: ${error}`);
        throw error;
    }
};

/**
 * Asserts the create policy modal is open by waiting for the elements in the modal to be located and then asserting
 * they are displayed.
 * @param driver 
 */
export const assertCreatePolicyModalOpen = async (driver: WebDriver): Promise<void> => {
    try {
        console.log("Asserting the Create Policy modal is open");
        const headingElement = await driver.wait(
            until.elementLocated(createPolicyModalContentMod.heading()),
            waitTime,
            "The Create Policy modal heading was not found in time"
        );

        const nameInputElement = await driver.wait(
            until.elementLocated(createPolicyModalContentMod.nameInput()),
            waitTime,
            "The name input element was not found in time"
        );

        const typeDropdownElement = await driver.wait(
            until.elementLocated(createPolicyModalContentMod.typeDropdown()),
            waitTime,
            "The type dropdown element was not found in time"
        );

        const criteriaDropdownElement = await driver.wait(
            until.elementLocated(createPolicyModalContentMod.criteriaDropdown()),
            waitTime,
            "The criteria dropdown element was not found in time"
        );

        assert.ok(
            await headingElement.isDisplayed() && 
            await nameInputElement.isDisplayed() && 
            await typeDropdownElement.isDisplayed() && 
            await criteriaDropdownElement.isDisplayed(), 
            "The Create Policy modal is not opened correctly"
        );
            
    } catch (error) {
        console.error(`Error occurred when asserting the Create Policy modal is open: ${error}`);
        throw error;
    }
};

/**
 * Enters the name for the content mod
 * Uses much of the same code as the enterName function used for policies
 * @param driver 
 * @param name 
 * @param testCaseKey 
 */
export const enterNameContentMod = async (driver: WebDriver, name: string, testCaseKey: string): Promise<void> => {

    const concatName = `${await utils.getParentFolderName()}_${name}_${testCaseKey}`
        .replace(/\u200B$/, "")

        try {
            console.log("Entering content mod name");
            const nameInputFieldLocator = createPolicyModalContentMod.nameInput();
            const nameInputField = await driver.wait(
                until.elementLocated(nameInputFieldLocator),
                waitTime,
                "Name Input field was not located in time"
            );

            console.log(`Found name input field, entering ${concatName}`);
            await nameInputField.click();
            await nameInputField.sendKeys(concatName);
            const enteredText = await nameInputField.getAttribute("value");
            if (enteredText === concatName) {
                console.log(`${concatName} correctly entered`);
            } else {
                console.error(`Text entered incorrectly. Expected: ${concatName}, Found: ${enteredText}`);
                throw new Error("Entered text does not match the expected text");
            }
        } catch (error) {
            console.error("Error during entering or verifying policy name", error);
            throw error;
        }
};

/**
 * Finds and clicks the type from the drop down menu in the content mod create policy modal
 * @param driver 
 * @param type 
 */
export const selectTypeFromDropdownContentMod = async (driver: WebDriver, type: string): Promise<void> => {
    try {
        console.log(`Selecting the type ${type} from the dropdown`);
        const typeDropdownElement = await driver.wait(
            until.elementLocated(createPolicyModalContentMod.typeDropdown())
        );
        await typeDropdownElement.click();

        const typeOptionElement = await driver.wait(
            until.elementLocated(createPolicyModalContentMod.typeOption(type)),
            waitTime,
            `The type option ${type} was not found in time`
        );
        await typeOptionElement.click();

        // click into the name field to close the drop down menu
        const nameField = await driver.findElement(createPolicyModalContentMod.nameInput());
        await nameField.click();

    } catch (error) {
        console.error(`Error occurred when selecting the type from the dropdown: ${error}`);
        throw error;
    }
};

/**
 * Asserts a content mod has been selected in the content modification create policy modal
 * @param driver 
 */
export const assertContentModSelected = async (driver: WebDriver, type: string): Promise<void> => {
    try {
        console.log("Asserting a content mod has been selected");
        const selectedTypeElement = await driver.wait(
            until.elementLocated(createPolicyModalContentMod.typeOptionChip(type)),
            waitTime,
            "The selected type chip element was not found in time"
        );
        assert.ok(await selectedTypeElement.isDisplayed(), "The selected type is not displayed");
        console.log(`The content mod ${type} has been selected`);
    } catch (error) {
        console.error(`Error occurred when asserting the content modification type is selected: ${error}`);
        throw error;
    }
};

/**
 * Clicks the toggle button to enable the content mod on the content mods page
 * @param driver 
 * @param name - case sensitive
 * @param testCaseKey 
 */
export const enableContentMod = async (driver: WebDriver, name: string, testCaseKey: string): Promise<void> => {
    const extendedName = `${await utils.getParentFolderName()}_${name}_${testCaseKey}`
    console.log(`Enabling content mod ${extendedName}`);
    try {
        await utils.waitForAnimation(2000);
        const policyToggleLocator = contentModPage.toggleBtn(extendedName);
        const policyToggle = await driver.wait(until.elementLocated(policyToggleLocator), waitTime);
        await driver.executeScript("arguments[0].click();", policyToggle); // click doesn't work
    } catch (error) {
        console.error("Error when toggling on the policy", error);
    }
};

/**
 * Asserts that the content mod is enabled by checking the toggle button state
 * @param driver 
 * @param name - case sensitive
 * @param testCaseKey 
 * @param expectedState 
 */
export const assertContentModEnabled = async (driver: WebDriver, name: string, testCaseKey: string, expectedState: string): Promise<void> => {
    const cleanName = name.replace(/\u200B$/, ""); // Remove the trailing zero-width space (U+200B) from name, if present
    const extendedName = `${await utils.getParentFolderName()}_${cleanName}_${testCaseKey}`;

    const createdPolicyRowLocator = contentModPage.policyRow(extendedName);
    try {
        await utils.waitForAnimation(1000);
        const createdPolicyRow = await driver.findElement(createdPolicyRowLocator);
        const createdPolicyId = await createdPolicyRow.getAttribute("id");

        // Use the data-testid to find the toggle label
        const toggleLabelLocator = By.css(`label[data-testid='${createdPolicyId}-toggle']`);
        const toggleLabel = await driver.findElement(toggleLabelLocator);

        // Get the data-checked attribute to verify the toggle status
        let isToggledOn = await toggleLabel.getAttribute("data-checked");

        // Determine the actual state
        // If attribute exits, it's on; otherwise, it's off
        const isCurrentlyOn = isToggledOn !== null;

        // Determine the expected state
        const shouldBeOn = expectedState === "on";

        // Check if actual toggle state matches the expected state
        assert.strictEqual(
            isCurrentlyOn,
            shouldBeOn,
            ` "${extendedName}" should be toggled ${expectedState}, but it is actually ${isCurrentlyOn ? "on" : "off"}.`
        )
        console.log(`Content mod "${extendedName}" has been correctly toggled ${expectedState}.`);
    } catch (error) {
        console.error(`Failed to assert that Content mod "${extendedName}" is enabled:`, error);
        throw new Error(`Policy "${extendedName}" was not toggled on correctly.`);
    }
};

/**
 * Asserts the Bypass Codes page is open by checking the heading element
 * @param driver 
 */
export const assertOnBypassCodePage = async (driver: WebDriver): Promise<void> => {

    try {
        console.log("Asserting the Bypass Code page is open");
        const headingElement = await driver.wait(
            until.elementLocated(bypassCodesAvailablePage.heading()),
            waitTime,
            "The Bypass Code page heading was not found in time"
        );

        assert.ok(await headingElement.isDisplayed(), "Expected the Bypass Codes available heading to be displayed");
        console.log("The Bypass Codes page is open");
    } catch (error) {
        console.error(`Error occurred when asserting the Bypass Code page is open: ${error}`);
        throw error;
    }

};

/**
 * Clicks the Add Code button on the Bypass Codes page
 * @param driver 
 */
export const clickAddCodeBtn = async (driver: WebDriver): Promise<void> => {
    try {
        console.log("Clicking the Add Code button");

        const addCodeBtn = await driver.wait(
            until.elementLocated(bypassCodesAvailablePage.addCodeBtn()),
            waitTime,
            "The Add Code button was not found in time"
        );

        // the Add Code button starts as being "greyed-out" and then becomes enabled
        // after a few seconds, so wait for the button to be enabled before clicking it
        await driver.wait(
            until.elementIsEnabled(addCodeBtn),
            waitTime,
            "The Add Code button was not enabled in time"
        );

        await addCodeBtn.click();
    } catch (error) {
        console.error(`Error occurred when clicking the Add Code button: ${error}`);
        throw error;
    }
};

/**
 * Asserts that the "Add Code" modal is open by checking for the presence and visibility
 * of the modal's heading element within a specified wait time.
 *
 * @param driver - The WebDriver instance used to interact with the browser.
 * @returns A promise that resolves when the assertion is complete.
 * @throws Will throw an error if the heading element is not located or not displayed within the wait time.
 */
export const assertAddCodeModalOpen = async (driver: WebDriver): Promise<void> => {

    try {
        console.log("Asserting the Add Code modal is open");
        const headingElement = await driver.wait(
            until.elementLocated(addCodeModal.heading()),
            waitTime,
            "The Add Code modal heading was not found in time"
        );
        assert.ok(await headingElement.isDisplayed(), "Expected the heading element to be displayed in the Add Code modal");
    } catch (error) {
        console.error(`Error occurred when asserting the Add Code modal is open: ${error}`);
        throw error;
    }

};

/**
 * Selects a bypass code duration from a dropdown, retrieves the bypass code value, 
 * calculates its expiry timestamp, and stores these values in the test context.
 * 
 * @param driver - The WebDriver instance used to interact with the web page.
 * @param duration - The duration to select from the dropdown. 
 *                   Must match one of the predefined options (case-sensitive):
 *                   - "For 10 Minutes"
 *                   - "For 15 Minutes"
 *                   - "For 20 Minutes"
 *                   - "For 30 Minutes"
 *                   - "For 45 Minutes"
 *                   - "For 1 Hour"
 *                   - "For 2 Hours"
 *                   - "For 3 Hours"
 * 
 * @returns A promise that resolves when the duration is selected, the bypass code is retrieved, 
 *          and the Add button is clicked.
 * 
 * @throws Will throw an error if any of the following conditions occur:
 *         - The duration dropdown element is not found within the specified wait time.
 *         - The specified duration option is not found within the dropdown.
 *         - The bypass code value element is not found within the specified wait time.
 *         - The Add button is not found within the specified wait time.
 *         - The provided duration is invalid or not in the predefined list.
 * 
 * @remarks
 * - The bypass code value and its creation timestamp are stored in `utils.testContext.bypassCodeValue` 
 * - The expiry timestamp of the bypass code is calculated based on the selected duration and stored 
 *   in `utils.testContext.bypassCodeExpiry`.
 * - The function logs key actions and timestamps for debugging purposes.
 */
export const selectBypassCodeDurationAndAdd = async (driver: WebDriver, duration: string): Promise<void> => {

    try {

        console.log("Clicking into the duration drop down");
        const durationDropdownElement = await driver.wait(
            until.elementLocated(addCodeModal.durationDropDown()),
            waitTime,
            "The duration dropdown element was not found in time"
        );
        console.log("Waiting for the drop down to be enabled");
        await driver.wait(
            until.elementIsEnabled(durationDropdownElement),
            waitTime,
            "The duration dropdown element was not enabled in time"
        );
        await durationDropdownElement.click();

        console.log(`Selecting the duration ${duration} from the dropdown`);
        const durationOptionElementLocator = addCodeModal.durationElement(duration);
        const durationOptionElement = await driver.wait(
            until.elementLocated(durationOptionElementLocator),
            waitTime,
            `The duration option ${duration} was not found in time`
        );
        await driver.wait(
            until.elementIsEnabled(durationDropdownElement),
            waitTime,
            "The duration dropdown element was not enabled in time"
        );
        await durationOptionElement.click();

        // store the bypass code value in test context for subsequent steps
        const bypassCodeValueElement = await driver.wait(
            until.elementLocated(addCodeModal.bypassCodeValueElement()),
            waitTime,
            "The bypass code value element was not found in time"
        );
        const bypassCodeValue = await bypassCodeValueElement.getText();
        utils.testContext.bypassCodeValue = bypassCodeValue;
        console.log(`The bypass code value is ${bypassCodeValue}`);

        // click the add button
        const addBtn = await driver.wait(
            until.elementLocated(addCodeModal.addBtn()),
            waitTime,
            "The Add button was not found in time"
        );
        await driver.wait(
            until.elementIsEnabled(addBtn),
            waitTime,
            "The Add button was not enabled in time"
        );
        await addBtn.click();
        console.log(`The duration ${duration} was selected and the Add button was clicked`);

        await utils.waitForAnimation(2000);

        // Get the current timestamp in the format YYYY/MM/DD HH:MM
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timestamp = `${year}/${month}/${day} ${hours}:${minutes}`;
        utils.testContext.bypassCodeCreation = timestamp;
        console.log(`The bypass code was created at ${timestamp}`);

        // Calculate the expiry timestamp based on the duration
        const durationMapping: { [key: string]: number } = {
            "For 10 Minutes": 10,
            "For 15 Minutes": 15,
            "For 20 Minutes": 20,
            "For 30 Minutes": 30,
            "For 45 Minutes": 45,
            "For 1 Hour": 60,
            "For 2 Hours": 120,
            "For 3 Hours": 180,
        };

        const durationInMinutes = durationMapping[duration];
        if (!durationInMinutes) {
            throw new Error(`Invalid duration: ${duration}`);
        }

        // Calculate the expiry date and time based on the current time and the selected duration
        const expiryDate = new Date(now.getTime() + durationInMinutes * 60000); // Add the duration (in milliseconds) to the current time

        // Extract the year, month, day, hours, and minutes from the calculated expiry date
        const expiryYear = expiryDate.getFullYear();
        const expiryMonth = String(expiryDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
        const expiryDay = String(expiryDate.getDate()).padStart(2, '0');
        const expiryHours = String(expiryDate.getHours()).padStart(2, '0');
        const expiryMinutes = String(expiryDate.getMinutes()).padStart(2, '0');

        // Format the expiry timestamp as "YYYY/MM/DD HH:MM"
        const expiry = `${expiryYear}/${expiryMonth}/${expiryDay} ${expiryHours}:${expiryMinutes}`;

        // Store the calculated expiry timestamp in the test context for later use
        utils.testContext.bypassCodeExpiry = expiry;

        console.log(`The bypass code will expire at ${expiry}`);

    } catch (error) {
        console.error(`Error occurred when selecting the duration from the dropdown: ${error}`);
        throw error;
    }

};

/**
 * Asserts the details of a bypass code in a table displayed in the UI.
 * 
 * This function verifies that a row in the bypass code table matches the expected
 * details, including the bypass code value, creation date, expiry date, creator, 
 * and status. If no matching row is found, an assertion error is thrown.
 * 
 * @param driver - The WebDriver instance used to interact with the browser.
 * @throws {Error} If no rows are found in the table or if no matching row is found.
 * @throws {Error} If an error occurs during the execution of the function.
 */
export const assertBypassCodeDetails = async (driver: WebDriver): Promise<void> => {
    try {

        // if not already on the bypass codes page, go to it
        if (await driver.getCurrentUrl() !== `${schoolManagerUrl}/filtering/bypass/available`) {
            console.log("Navigating to the Bypass Codes Available page");
            await driver.get(`${schoolManagerUrl}/filtering/bypass/available`);
        }

        console.log("Asserting the Bypass Code details in the table");

        if(!(utils.testContext.bypassCodeCreation && utils.testContext.bypassCodeExpiry && utils.testContext.bypassCodeValue)) {
            throw new Error("bypassCodeCreation bypassCodeExpiry bypassCodeValue are not set in the test context");
        }
        const creation = utils.testContext.bypassCodeCreation;
        const expiry = utils.testContext.bypassCodeExpiry;
        const code = utils.testContext.bypassCodeValue;
        const createdBy = schoolManagerAdminUsername;
        const expectedStatus = "Expire Now";

        // Wait for any cell to be located indicating it has loaded
        console.log("Waiting for table to load");
        const initialCellLocator = By.xpath("//table//tbody//td//p");
        const cellHasLoaded = await driver.wait(
            until.elementLocated(initialCellLocator),
            waitTime,
            "Timeout waiting for the table to load"
        );

        // if the cell loads and it has "No data available", there's nothing to expire, so exit the function
        if (await cellHasLoaded.getText() === "No data available") {
            console.log("No active bypass codes to expire");
            return;
        }

        // Locate all rows in the table
        const tableRowLocator = By.xpath("//table/tbody/tr");
        const tableRows = await driver.findElements(tableRowLocator);

        if (tableRows.length === 0) {
            throw new Error("No rows found in the Bypass Code table");
        }
        console.log(`Found ${tableRows.length} rows in the table`);

        let matchingRowFound = false;

        // Iterate through each row to find a matching entry
        for (const row of tableRows) {
            const codeCell = await row.findElement(By.xpath(".//td[1]/p"));
            const createdByCell = await row.findElement(By.xpath(".//td[2]/p"));
            const creationCell = await row.findElement(By.xpath(".//td[3]/p"));
            const expiryCell = await row.findElement(By.xpath(".//td[4]/div/p"));
            const statusCell = await row.findElement(By.xpath(".//td[5]/div/div/span/span"));

            // Get the text content of each cell
            const codeText = await codeCell.getText();
            const createdByText = await createdByCell.getText();
            const creationText = await creationCell.getText();
            const expiryText = await expiryCell.getText();
            const statusText = await statusCell.getText();

            // Check if the current row matches the expected values
            if (
                statusText === expectedStatus &&
                creationText === creation &&
                expiryText === expiry &&
                codeText === code &&
                createdByText === createdBy
            ) {
                console.log("Found a matching row in the Bypass Code table");
                console.log(`Code: ${codeText}, Created By: ${createdByText}, Creation: ${creationText}, Expiry: ${expiryText}, Status: ${statusText}`);
                matchingRowFound = true;
                break;
            }
        }
        
        // Assert that a matching row was found
        assert.ok(matchingRowFound, "No matching row found in the Bypass Code table");
    } catch (error) {
        console.error("Error occurred while asserting Bypass Code details:", error);
        throw error;
    }
};

/**
 * Asserts the Mobile Agent Config page is open by checking the heading element
 * @param driver
 */
export const assertMobileAgentConfigPage = async (driver: WebDriver): Promise<void> => {

    try {

        console.log("Asserting the Mobile Agent Config page is open");
        const headingElement = await driver.wait(
            until.elementLocated(mobileAgentPage.heading()),
            waitTime,
            "The Mobile Agent Config page heading was not found in time"
        );

        assert.ok(await headingElement.isDisplayed(), "Expected the Mobile Agent Config page heading to be displayed");
        console.log("The Mobile Agent Config page is open");


    } catch (error) {
        console.error("Error occurred while asserting Mobile Agent Config page has loaded:", error);
        throw error;
    }

};

/**
 * Clicks the safe search box for the given search engine and network configuration
 * @param driver - The WebDriver instance used to interact with the browser.
 * @param searchEngine - The search engine name (e.g., "bing", "google").
 * @param onNetwork - A boolean indicating whether to use the on-network (true) or off-network (false) checkbox.
 * @returns A promise that resolves when the checkbox is clicked.
 */
export const clickSafeSearchCheckbox = async (driver: WebDriver, searchEngine: string, isOnNetwork: boolean): Promise<void> => {
    try {
        console.log(`Attempting to click the ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network`);
        // find the checkbox element for the specified search engine, for the specific network configuration
        // uses the onNetwork boolean to determine whether to use the on-network (true) or off-network (false) checkbox        

        const safeSearchCheckbox = await driver.wait(
            until.elementLocated(mobileAgentPage.safeSearchCheckbox(searchEngine, isOnNetwork)),
            waitTime,
            `The ${searchEngine} checkbox for on was not found in time`
        );

        // If it's already enabled, we don't need to enable it again
        const isChecked = await safeSearchCheckbox.getAttribute("checked");
        
        if (isChecked) {
            console.log(`The ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network is already enabled`);
        } else {
            await driver.executeScript("arguments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });", safeSearchCheckbox);
            await safeSearchCheckbox.click();
            console.log(`Clicked the ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network`);
            console.log(`Saving the configuration and reloading the page`);
            await saveMobileAgentConfig(driver, false);
            await driver.navigate().refresh();
        }
    
    } catch (error) {
        console.error(`Error occurred when clicking the ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network: ${error}`);
        throw error;
    }
};

/**
 * Asserts the safe search checkbox is enabled for the given search engine and network configuration
 * The checkbox has an attribute "checked". This value strangely only changes after saving and then reloading the page.
 * So, this function will save the page, reload it, and then check the checkbox state.
 * @param driver 
 * @param searchEngine 
 * @param isOnNetwork 
 */
export const assertSafeSearchCheckboxEnabled = async (driver: WebDriver, searchEngine: string, isOnNetwork: boolean): Promise<void> => {

    try {
        console.log(`Asserting the ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network is enabled`);
        const safeSearchCheckbox = await driver.wait(
            until.elementLocated(mobileAgentPage.safeSearchCheckbox(searchEngine, isOnNetwork)),
            waitTime,
            `The ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network was not found in time`
        );

        // Check if the checkbox is selected
        const isChecked = await safeSearchCheckbox.getAttribute("checked");
        assert.strictEqual(isChecked, "true", `The ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network is not enabled`);
        console.log(`The ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network is enabled`);

    } catch (error) {
        console.error(`Error occurred when asserting the ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network is enabled: ${error}`);
        throw error;
    }

};

/**
 * Ensures that all SafeSearch checkboxes for the specified search engines are unchecked,
 * both for "on network" and "off network" configurations. If any checkbox is found to be
 * checked, it will be unchecked, and the configuration will be saved and the page reloaded.
 * 
 * @param driver - The WebDriver instance used to interact with the web page.
 * @param searchEngines - An array of search engine names for which the SafeSearch checkboxes
 *                        need to be verified and unchecked if necessary.
 * 
 * @returns A promise that resolves when the operation is complete.
 * 
 * @throws Will throw an error if any issue occurs while locating or interacting with the checkboxes,
 *         or during the save and reload process.
 */
export const ensureAllSafeSearchCheckboxesUnchecked = async (driver: WebDriver, searchEngines: string[]): Promise<void> => {
    try {
        let checkboxWasUnchecked: boolean = false; // only need to save at the end if something was actually unchecked

        // navigate to the mobile agent config page if not already there
        if (await driver.getCurrentUrl() !== `${schoolManagerUrl}/config/device/mobileagentconfiguration`) {
            await driver.get(`${schoolManagerUrl}/config/device/mobileagentconfiguration`);
        }

        for (const searchEngine of searchEngines) {
            for (const isOnNetwork of [true, false]) {                
                const safeSearchCheckbox = await driver.wait(
                    until.elementLocated(mobileAgentPage.safeSearchCheckbox(searchEngine, isOnNetwork)),
                    waitTime,
                    `The ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network was not found in time`
                );

                const isChecked = await safeSearchCheckbox.getAttribute("checked");

                if (isChecked) {
                    await safeSearchCheckbox.click();
                    console.log(`Unchecked the ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network`);
                    checkboxWasUnchecked = true;
                } else {
                    console.log(`The ${searchEngine} checkbox for ${isOnNetwork ? "on" : "off"} network is already unchecked`);
                }
            }
        }

        // only need to save configuration if something was unchecked
        if (checkboxWasUnchecked) {
            console.log("Saving the configuration and reloading the page");
            await saveMobileAgentConfig(driver, false);
            await driver.navigate().refresh();
            console.log("All SafeSearch checkboxes are now unchecked");
        } else {
            console.log("All Safe Search checkboxes were already unchecked, no need to save the configuration");
        }
       

    } catch (error) {
        console.error("Error occurred while ensuring all SafeSearch checkboxes are unchecked:", error);
        throw error;
    }
};