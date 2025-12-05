import { describe, it } from 'mocha';
import { stepPatterns, matchStepsToHandlers, getAdminDriver, getStudentDriver } from "../support/testStepLibrary";
import * as utils from '../support/utils';
import * as smSteps from '../support/smSteps';
import { WebDriver} from "selenium-webdriver";
import config from "../config/config.json";
import { execTestStep, testContext } from '../support/utils';


let folderName: string = "";

const getAllFolderIds = async(topLevelFolder: string): Promise<number[]> => {
    const folderId = await utils.getZephyrTestCaseFolders(topLevelFolder);
    if(!folderId) {
        console.log(`failed to get folder ID for ${topLevelFolder}`)
        return [];
    } else {
        const subFolderIds = await utils.getZephyrSubFolderIds(folderId);
        const allFolderIds: number[] = [folderId, ...subFolderIds];
        return allFolderIds
    }
};

const getAllTestCaseKeys = async(fromFolderIds: number[]): Promise<string[]> => {
    const allArguments = process.argv;
    for(const eachArg of allArguments) {
        if(eachArg.includes("testCases=")) {
            const testCaseString: string = eachArg.split("=")[1].replace(/ /g, ""); //get delimated string of test cases and strip any spaces
            const testCases: string[] = testCaseString.split(",");
            return testCases;
        }
    }


    let testCaseKeys: string[] = [];
    for (const folder of fromFolderIds) {
        const newKeys = await utils.getZephyrTestCaseKeys(folder);
        for (const newKey of newKeys) {
            if (newKey !== "" && testCaseKeys.includes(newKey) === false) {
                testCaseKeys.push(newKey);
            }
        }
    }

    return testCaseKeys;

};


// const getAllTestCaseKeys = async(fromFolderIds: number[]): Promise<string[]> => {
//     let testCaseKeys: string[] = [];
//     for (const folder of fromFolderIds) {
//         const newKeys = await utils.getZephyrTestCaseKeys(folder);
//         for (const newKey of newKeys) {
//             if (newKey !== "" && testCaseKeys.includes(newKey) === false) {
//                 testCaseKeys.push(newKey);
//             }
//         }
//     }

//     return testCaseKeys;

// };

const getExecTestSteps = async(eachTestCaseKey: string): Promise<execTestStep[]> => {
    const getTestExecutionKey = await utils.getZephyrTestExecution(eachTestCaseKey);

    let testExecutionKey: string = "";
    if (getTestExecutionKey) {
        testExecutionKey = getTestExecutionKey;
        //update the latest execution with the up to date test steps.
        await utils.syncTestExecution(testExecutionKey);
    } else {
        console.error("Failed to retrieve a test execution key.");
    }
    let steps = await utils.zephyr_getExecTestSteps(testExecutionKey);
    if (!steps) {
        console.log(`No steps found for ${eachTestCaseKey}`);
    }
    // Normalize the steps by stripping trailing periods and spaces
    return steps.map((step) => ({
        description: step.description?.replace(/[.\s]+$/, "").replace(/&lt;|&gt;|&quot;/g, "") || "No description provided",
        expectedResult: step.expectedResult?.replace(/[.\s]+$/, "").replace(/&lt;|&gt;|&quot;/g, "") || "No expected result",
        testData: step.testData || {},
    }));
};

const quitDriver = async (driver: WebDriver | undefined, driverName: string): Promise<void> => {
    try {
        if (driver) {
            const session = await driver.getSession().catch(() => null);
            if (session) {
                console.log(`${driverName} driver detected, quitting`);
                await driver.quit();
            } else {
                console.log(`${driverName} driver has no active session, doing nothing`);
            }
        } else {
            console.log(`${driverName} driver is already undefined, doing nothing`);
        }
    } catch (error) {
        console.error(`Error while checking ${driverName} driver session:`, error);
    }
};


let adminDriver: WebDriver | undefined;
let studentDriver: WebDriver | undefined;
let otherStudentDriver: WebDriver | undefined;

let isDataGenerated: Boolean;

describe("Keyword-driven Automation Framework v1.0", async function() {

    const testExecutionStepsMap = new Map<string, execTestStep[]>();

    before(async () => {
        folderName = await utils.getParentFolderName();
        //get all of the testcase folder IDs
        const allFolderIds = await getAllFolderIds(folderName);
        
        // Generate youtube data in the before step to allow more time for videos to appear in SM
        // returns a value of true if this function was used to generate youtube data
        isDataGenerated = await utils.generateYoutubeData(allFolderIds);

        //get all of the testcase keys from the folders
        const allTestCaseKeys = await getAllTestCaseKeys(allFolderIds)

        //get the latest execution steps for each testcase key
        for(const eachTestCaseKey of allTestCaseKeys) {
            const steps: execTestStep[] = await getExecTestSteps(eachTestCaseKey);
            testExecutionStepsMap.set(eachTestCaseKey, steps);
        }
    });

    it("setting up test cases", async function () {
        describe("get test data", async function () {
            // Iterate over the test cases
            testExecutionStepsMap.forEach(function (steps, testKey) {
                // Declare variables specific to each test case inside the loop
                let savedTestData: any[] = [];
                let thisTestCase: execTestStep[] = [];
    
                // Process each test step
                //for each test step:
                // if no description or expected result is present, add strings to explicitly state this
                // if no test data is present, create an empty object.

                //after adjusting the test step, push it to a testCase object (thisTestCase)
                // also, collect up the testData from each test step so it's available for all steps
                for (const eachStep of steps) {
                    const stepData: execTestStep = {
                        description: eachStep.description || "No description provided",
                        expectedResult: eachStep.expectedResult || "No expected result",
                        testData: eachStep.testData || {},
                    };
                    // The expected result shares the same test data as each step,
                    // the test data is pushed twice to ensure it is available for both
                    // the step and the expected result.
                    // So it pushed twice
                    savedTestData.push(stepData.testData);
                    savedTestData.push(stepData.testData);
                    thisTestCase.push(stepData);
                }
    
                // Combine step descriptions and expected results
                const allSteps: string[] = [];
                for (const step of thisTestCase) {
                    if (step.description.length > 0) {
                        allSteps.push(step.description);
                    } else {
                        console.log("No expected result provided, not attempting a match");
                    }
                    if (step.expectedResult.length > 0) {
                        allSteps.push(step.expectedResult);
                    } else {
                        console.log("No test step provided, not attempting a match");
                    }
                }
    
                // Create a test case-specific `it` block
                it(`Test case: ${testKey}`, async function () {

                    try {

                        // currently used to allow youtube videos to generate in time
                        // if data was generated, wait for it
                        if (isDataGenerated) {
                            await utils.waitForDataToGenerate();
                        }

                        // Run test steps if all test steps have matched
                        const allStepsMatched = await matchStepsToHandlers(
                            allSteps,
                            stepPatterns,
                            testKey,
                            savedTestData
                        );

                        adminDriver = await getAdminDriver();

                        if (allStepsMatched) {
                            if (adminDriver) {
                                console.log("Deleting policies");
                                await smSteps.deleteAllPolicies(adminDriver);
                                console.log("Deleting objects");
                                await smSteps.deleteAllObjects(adminDriver);
                                console.log("Deleting content modification policies");
                                await smSteps.deleteAllContentMods(adminDriver);
                                console.log("Expiring all bypass codes");
                                await smSteps.expireAllBypassCodes(adminDriver);
                                console.log("Ensuring safe search checkboxes are unchecked");
                                await smSteps.ensureAllSafeSearchCheckboxesUnchecked(adminDriver, ["google", "bing"]) // youtube to be added when coded in

                            }
                            if (testContext.currentTime) {
                                console.log("Clearing the stored current time as the test needing it is finished");
                                testContext.currentTime = undefined;
                            }
                        } else {
                            this.skip();
                        }
                    } catch (error) {
                        console.error(`Test case ${testKey} failed with error:`, error);
                        adminDriver = await getAdminDriver();
                        // Cleanup policies and objects for next test
                        try {
                            if (adminDriver) {
                                const session = await adminDriver.getSession();
                                if (session) {
                                    console.log("Admin Driver session detected, checking for any remaining policies, objects and bypass codes");
                                    await smSteps.deleteAllPolicies(adminDriver);
                                    await smSteps.deleteAllObjects(adminDriver);
                                    await smSteps.deleteAllContentMods(adminDriver);
                                    await smSteps.expireAllBypassCodes(adminDriver);
                                    await smSteps.deleteAllTimePeriodEntries(adminDriver);
                                    await smSteps.ensureAllSafeSearchCheckboxesUnchecked(adminDriver, ["google", "bing"]) // youtube to be added when coded in
                                } else {
                                    console.log("Admin Driver session not found, skipping remaining policy and object cleanup");
                                }
                            }
                        } catch (error) {
                            console.error("Error checking session or during cleanup:", error);
                        }
                        throw error;
                    } finally {        
                        // Quit the WebDriver instances and clear test context
                        try {

                            if (testContext.actualUrls) {
                                console.log("Clearing testContext.actualUrls as the test needing it is finished");
                                testContext.actualUrls = undefined;
                            }

                            await quitDriver(adminDriver, "adminDriver");
                            await quitDriver(studentDriver, "studentDriver");
                            await quitDriver(otherStudentDriver, "otherStudentDriver");
                            await quitDriver(testContext.enrollmentDriver, "enrollmentDriver");
                            
                        } catch (error) {
                            console.error(`Failed to quit the driver:`, error);
                            throw error;
                        }
                    }
                });
            });

            after(async function() {

                if (testContext.actualUrls) {
                    console.log("Clearing testContext.actualUrls as the test needing it is finished");
                    testContext.actualUrls = undefined;
                }

                await quitDriver(adminDriver, "adminDriver");
                await quitDriver(studentDriver, "studentDriver");
                await quitDriver(otherStudentDriver, "otherStudentDriver");
                await quitDriver(testContext.enrollmentDriver, "enrollmentDriver");
            });
            
        });
    });
});
