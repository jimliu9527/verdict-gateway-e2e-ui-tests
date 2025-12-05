import { By } from 'selenium-webdriver';

export class Page_ContentModification {

    /**
     * Returns the By object for the Content Modification heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//p[@role="heading" and text()="Content Modification"]')
        return element;
    }

    /**
     * Returns the By object for the Create Policy button
     * @returns 
     */
    createPolicyBtn(): By {
        const element = By.xpath('//button[text()="Create Policy"]')
        return element;
    }

    /**
     * Returns the By object for the trash can icons on the Content Modification page
     * @returns By object
     */
    trashCanIcon(): By {
        const element = By.xpath('//button[@aria-label="Delete"]')
        return element;
    }

    /**
     * @param policyName - name of the policy - case sensitive.
     * @returns By object
     */
    toggleBtn(policyName: string): By {
        const element = By.xpath(`//p[text() = "${policyName}"]/ancestor::tr//input[@type='checkbox']`);
        return element;
    }

    /**
     * Returns the by object for the policy "row"
     * Can be used to retrieve the data-testid of the row, for inspection of attributes of other elements
     * For example, if the row data-testid = abc, then the data-testid toggle button for the policy is abc-toggle
     * The toggle includes the data-checked attribute to confirm if it's toggled on or off
     * @param policyName
     * @returns  By object
     */
    policyRow(policyName: string): By {
        const name = policyName.trim();
        const element = By.xpath(`//p[(text()='${name}')]/ancestor::tr[@role='row']`);
        return element;
    }

};
