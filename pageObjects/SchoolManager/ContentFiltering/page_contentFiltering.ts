import { By, until, WebDriver, Key } from 'selenium-webdriver';


export class Page_ContentFiltering {
    /**
     * Returns the By object for the Content Filtering heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//p[@role="heading" and text()="Content Filtering"]')
        return element;
    }

    /**
     * Returns the by object for the Content Filtering header button
     * No button name verification, case sensitive
     * @param buttonName - "Object Lists", "Category Search", "Test Policy", "Create Policy"
     * @returns By object
     */
    headerButton(buttonName: string): By {
        const name = buttonName.trim();
        const element = By.xpath(`//div[@id="ComponentWrapper"]//button[text() = "${name}"]`);
        return element;
    }

    /**
     * Returns the by object for the policy "button"
     * Can be used to retrieve the data-testid of the button, for inspection of attributes of other elements
     * For example, if the button data-testid = abc, then the data-testid toggle button for the policy is abc-toggle
     * The toggle includes the data-checked attribute to confirm if it's toggled on or off
     * @param policyName
     * @returns  By object
     */
    policyButton(policyName: string): By {
        const name = policyName.trim();
        const element = By.xpath(`//p[(text()='${name}')]/ancestor::tr[@role='button']`);
        return element;
    }

    /**
     * Returns element from the table using Policy Name to determine row
     * @param policyName - Name of the policy (Case sensitive)
     * @param elementName - which element are you trying to get.
     * "drag", "enable", "action", "policy name", "edit", "delete"
     */
    tableElement(policyName: string, elementName: string): By {
        const name = policyName.replace(/\u200B$/, "");  // Remove the trailing zero-width space (U+200B) from the policy name, if present
        const rowPath = `//p[text() = "${name}"]/ancestor::tr`;
        const elements: { [key: string]: string } = {
            "drag": `(${rowPath}/td/div)[1]`,
            "enable": `${rowPath}/td[2]//input[@type='checkbox']`,
            "action": `${rowPath}/td[3]/div[1]/span/span`,
            "locked": `${rowPath}/td[3]/div[3]/span/span`,
            "policy name": `${rowPath}/td[4]//p`,
            "edit": `${rowPath}/td[5]//button[@aria-label="Edit"]`,
            "delete": `${rowPath}/td[5]//button[@aria-label="Delete"]`
        }
        const element = By.xpath(elements[elementName]);
        return element;
    }

    /**
     * Returns the warning toast message attempting to place a rule above a locked rule.
     * @returns By object
     */
    warningToast(): By {
        const element = By.xpath('//p[contains(normalize-space(),"Locked filter policies have greater priority and must remain at the top")]');
        return element;
    }
}