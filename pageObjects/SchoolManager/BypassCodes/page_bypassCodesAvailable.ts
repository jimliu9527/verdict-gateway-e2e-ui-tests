import { By } from 'selenium-webdriver';

export class Page_BypassCodesAvailable {

    /**
     * Returns the By object for the Bypass Codes Available heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//p[@role="heading" and text() = "Bypass Codes Available"]');
        return element;
    }

    /**
     * Returns By object for the Add Code button
     * @returns By object
     */
    addCodeBtn(): By {
        const element = By.xpath('//button[text()="Add Code"]');
        return element;
    }

};