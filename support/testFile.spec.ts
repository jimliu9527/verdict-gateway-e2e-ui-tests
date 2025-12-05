import * as utils from './utils';

import { WebDriver } from "selenium-webdriver";

let driver: WebDriver;

describe('Test Functions', () => {
    before(async () => {
        // build student driver
        driver = await utils.buildStudentDriver("lw extension");
    });
    it('test a particular function', async () => {
        await driver.get("https://google.com");
        const expectedBlockedUrl = /blocked.beta-1.linewize.net/;
        await utils.verifyUrlIsNotBlocked(driver, expectedBlockedUrl);
    });
});