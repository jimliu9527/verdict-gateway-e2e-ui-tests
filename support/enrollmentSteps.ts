import { By, WebDriver } from "selenium-webdriver";
import credentials from "../config/credentials.json";
import config from "../config/config.json";
import assert from "assert";
import { testContext } from "./utils";

const installationPageAddress = "127.0.0.1:8081";

type envcredentials = keyof typeof credentials.env;

let env: string = process.env.AGENT_ENV as string;
if(!env || !(env in config.schoolManager)|| !(env in credentials.env))  env = "stg";

const schoolManagerDeviceId = credentials.env[env as envcredentials].schoolManager.deviceId;
const lwWindows10AgentEnrollUser = credentials.env[env as envcredentials].schoolManager.lwWindows10AgentEnrollUser;
const lwWindows11AgentEnrollUser = credentials.env[env as envcredentials].schoolManager.lwWindows11AgentEnrollUser;

/**
 * Enters the installer location and filename and clicks the install button
 * Use of this function requires the Java server to be running at the provided WebDriver's location
 * @param driver 
 */
export const installAgent = async (driver: WebDriver): Promise<void> => {
    testContext.enrollmentDriver = driver;
    console.log("Navigating to installation UI page");

    try {
        await driver.get(`http://${installationPageAddress}/`);

        // add the installer location
        console.log("Adding installer file location");
        const installerLocationField = await driver.findElement(By.id("installerLocation"));
        await installerLocationField.click();
        const installerLocation = config.WindowsAgent.installerLocation;
        await installerLocationField.sendKeys(installerLocation);

        // add the installer file name
        console.log("Adding installer file name");
        const installerFileNameField = await driver.findElement(By.id("installerFile"));
        await installerFileNameField.click();
        const installerFileName = config.WindowsAgent.installerFileName;
        await installerFileNameField.sendKeys(installerFileName);

        // click the install button
        console.log("Clicking the install button");
        const installBtn = await driver.findElement(By.id("installBtn"));
        await installBtn.click();

    } catch (error) {
        console.error(`Error occurred when installing the agent: ${error}`);
        throw error;
    }
};

/**
 * Waits for feedback that the agent is installed
 * Handles case where installation is blocked - uninstall then install again
 * @param driver 
 * @param expectedTimestamp 
 */
export const assertAgentInstalled = async (driver: WebDriver, expectedTimestamp: string): Promise<void> => {
    testContext.enrollmentDriver = driver;
    const currentPage = await driver.getCurrentUrl();
    if (currentPage.includes(installationPageAddress)) {
        
        const outputField = await driver.findElement(By.id("output"));
        const timeToInstall: number = 60000;
        const maxRetries: number = 3;
        let retryCount: number = 0;
    
        try {
            // Wait for either "Preparing to install" or "Install blocked" to appear
            await driver.wait(
                async () => {
                    const text = await outputField.getText();
                    return text.includes("Preparing to Install") || text.includes("Install blocked");
                },
                timeToInstall,
                `Neither 'Preparing to install' nor 'Install blocked' appeared within ${timeToInstall / 1000}s`
            );
    
            // Get text from the output field
            const text = await outputField.getText();
    
            // Handle case where installation is blocked
            while (text.includes("Install blocked") && retryCount < maxRetries) {
                console.log("The agent is showing as already installed, uninstalling then attempting install");
                await uninstallAgent(driver);
                await assertAgentUninstalled(driver);
                const installBtn = await driver.findElement(By.id("installBtn"));
                await installBtn.click();
                retryCount++;

                // Wait for output to update
                await driver.wait(async () => {
                    const newText = await outputField.getText();
                    return newText !== text;
                }, timeToInstall, `Waiting for output text to change after ${retryCount} retries`);
            }

            // After retries, check the installation status
            if (retryCount >= maxRetries) {
                throw new Error("Reached maximum retries for installation.");
            }

            assert(
                text.includes("Installation completed"), `Did not receive an indication installation completed\n
                Full text: ${text}`
            );
            
        } catch (error) {
            throw error;
        }
    } else {
        throw new Error(`Unable to assert the agent is installed as not on the installer UI page, but on: ${currentPage}`);
    }
};

/**
 * Uses the provided agent value to enroll the agent at the location of the provided WebDriver
 * @param driver 
 * @param agent 
 */
export const enrollAgent = async (driver: WebDriver, agent: string): Promise<void> => {
    console.log("Enrolling agent");
    testContext.enrollmentDriver = driver;
    const cleanedAgent = agent.toLowerCase().trim();
    const samAccountField = await driver.findElement(By.id("samAccount"));
    const applianceIdField = await driver.findElement(By.id("applianceId"));
    const enrollBtn = await driver.findElement(By.id("enrollBtn"));

    try {
        await samAccountField.click();
        switch (cleanedAgent) {
            case "windows 10 agent":
                await samAccountField.sendKeys(lwWindows10AgentEnrollUser);
                break;
            case "windows 11 agent":
                await samAccountField.sendKeys(lwWindows11AgentEnrollUser);
                break;
            default:
                throw new Error(`Unknown enrollment type selected`);
        }

        await applianceIdField.click();
        await applianceIdField.sendKeys(schoolManagerDeviceId);
        await enrollBtn.click();
    } catch (error) {
        console.error(`Error occured when attempting to enroll agent: ${error}`);
        throw error;
    }
};

/**
 * Uses Assert to verify the enrollment of the provided agent at the given WebDriver's location
 * @param driver 
 * @param agent 
 */
export const assertEnrollment = async (driver: WebDriver, agent: string): Promise<void> => {
    console.log("Asserting the agent has been enrolled to the expected user and appliance");
    testContext.enrollmentDriver = driver;
    const cleanedAgent = agent.toLowerCase().trim();
    let expectedUser: string;

    switch (cleanedAgent) {
        case "windows 10 agent":
            expectedUser = lwWindows10AgentEnrollUser;
            break;
        case "windows 11 agent":
            expectedUser = lwWindows11AgentEnrollUser;
            break;
        default:
            throw new Error(`Unexpected agent type for enrollment received: ${cleanedAgent}`);
    }

    const timeToEnroll: number = 5000;
    const outputField = await driver.findElement(By.id("output"));

    try {
        // Wait for the enrollment command to appear in the output field
        await driver.wait(
            async () => {
                const text = await outputField.getText();
                return text.includes(`fc-system-service_windows-amd64.exe" --service enroll`);
            },
            timeToEnroll,
            `Enrollment command not identified in the output field`
        );

        const text = await outputField.getText();
        // the enrollment command with --sam-account and --appliance-id will show in the output
        assert(
            text.includes(expectedUser), `The expected user was not found in the output text\n
            Full text: ${text}`
        );
        assert(
            text.includes(schoolManagerDeviceId), `The expected appliance was not found in the output text\n
            Full text: ${text}`
        );
        assert(
            text.includes("Successfully enrolled this device as a 24x7 device"), `The success message was not found in the output text\n
            Full text: ${text}`
        );

    } catch (error) {
        console.error(`Error occurred when asserting enrollment: ${error}`);
        throw error;
    }
};

/**
 * Uses the uninstall button to uninstall the agent at the given WebDriver's location
 * @param driver 
 */
export const uninstallAgent = async (driver: WebDriver): Promise<void> => {
    console.log("Uninstall agent");
    testContext.enrollmentDriver = driver;
    const uninstallBtn = await driver.findElement(By.id("uninstallBtn"));

    try {
        await uninstallBtn.click();
    } catch (error) {
        console.error(`Error found when attempting to uninstall: ${error}`);
        throw error;
    }
};

/**
 * Uses Assert to verify that the agent is uninstalled at the given WebDriver's location
 * @param driver 
 */
export const assertAgentUninstalled = async (driver: WebDriver) => {
    console.log("Asserting the agent is uninstalled");
    testContext.enrollmentDriver = driver;
    const outputField = await driver.findElement(By.id("output"));
    const timeToUninstall: number = 60000;

    try {
        // Wait for the uninstall process to start by checking for output text related to uninstallation
        await driver.wait(
            async () => {
                const text = await outputField.getText();
                return text.includes("uninstall.exe"); // or other text indicating uninstall started
            },
            timeToUninstall,
            `The command sent to run uninstall.exe did not show in the output within ${timeToUninstall / 1000}s`
        );

        // Get the final output after the uninstallation process is expected to complete
        const outputText = await outputField.getText();

        // Check if uninstallation completed successfully by checking for the "Failed to read install.log" message
        assert(outputText.includes("Failed to read install.log"), "Uninstallation did not complete successfully. Check logs.");

        console.log("Agent uninstalled successfully.");
    } catch (error) {
        console.error(`Error occurred when asserting the agent was uninstalled: ${error}`);
        throw error;
    }  
};