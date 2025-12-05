import { By, until, WebDriver, Key } from 'selenium-webdriver';


export class Modal_AddObjectPool {
    /**
     * Returns the By object for the Add Object Pool modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[@data-testid="modal-header" and text() = "Add Object Pool"]');
        return element;
    }

    /**
     * Returns the name field BY object for the Add Object Pool modal
     * @returns By object
     */
    nameInput(): By {
        const element = By.css('input[aria-label="name"]');
        return element;
    }

    /**
     * Returns the description field BY object for the Add Object Pool modal
     * @returns By object
     */
    descriptionInput(): By {
        const element = By.css('input[aria-label="description"]');
        return element;
    }

    /**
     * Returns the type selector BY object for the Add Object Pool modal
     * @returns By object
     */
    typeSelector(): By {
        const element = By.css('input[name="Single Selector"][role="textbox"]');
        return element;
    }

    /**
     * Returns the By object for the different options available in the type selector list
     * Options are: "IP Range List", "IP Subnet List", "Website List", "MAC Address List", "Search Keywords", "Domains List".
     * Case sensitive.
     * @param name - The name of the option (case-sensitive).
     * @returns By object
     */
    type(name: string): By {
        // Handle special case for "Website List"
        // instead of being able to use text()="Website List", every individual letter has its own span, so its not possible
        if (name === "Website List") {
            const element = By.css(`li[role="option"][data-testid="option-2-2"]`)
            return element
        } else {
            const element = By.xpath(`//span[text()="${name}"]`);
            return element;
        }
    }

    /**
     * Returns the By object for the Save Object Pool button in the Add Object Pool modal
     * @returns By object
     */
    saveObjectPoolBtn(): By {
        const element = By.css('button[data-testid="save-policy-button"]');
        return element;
    }
}