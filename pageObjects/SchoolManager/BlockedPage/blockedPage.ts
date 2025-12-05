import { By } from 'selenium-webdriver';

export class Page_BlockedPage {

    /**
     * Returns the By object for the "See why it's blocked" button
     * Clicking this button reveals a page with extra details, including fields for:
     * Website, Path, Policy Name, Rule Type, Application/Category, Your IP
     * Additionally, the Bypass Code input field is displayed
     * @returns By object
     */
    seeWhyItsBlockedBtn(): By {
        const element = By.xpath(`//div[text()="See why it's blocked"]`);
        return element;
    }

    /**
     * Returns the By object for the bypass code input field
     * This field is displayed when the "See why it's blocked" button is clicked
     * @returns By object
     */
    bypassCodeInputField(): By {
        const element = By.className('bypassInput');
        return element;
    }

    /**
     * Returns the By object for the "Unblock" button
     * This button is displayed when the "See why it's blocked" button is clicked
     * @returns By object
     */
    unblockBtn(): By {
        const element = By.className('button unblock');
        return element;
    }

    /**
     * Returns the by object for the success message that displays only after a bypass code has succeeded
     * The message is: "Succeeded, redirecting..."
     * @returns By object
     */
    success(): By {
        const element = By.xpath(`//div[@class="infoText successText" and text()="Succeeded, redirecting..."]`);    
        return element;
    }

};