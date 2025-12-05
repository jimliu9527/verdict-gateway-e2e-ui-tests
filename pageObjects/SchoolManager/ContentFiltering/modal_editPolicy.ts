import { By} from 'selenium-webdriver';


export class Modal_EditPolicy {
    /**
     * Returns the By object for the Edit Policy modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[text() = "Edit Policy"]');
        return element;
    }

    /**
     * Returns By object for the checkboxes in Create Policy modal
     * No checking performed, so only use names of existing checkboxes:
     * "Blocked Page", "Alert", "Quarantine", "Locked", "Redirect"
     * @param checkboxName 
     * @returns By object
     */
    checkbox(checkboxName: string): By {
        const name = checkboxName.trim();
        const element = By.xpath(`//p[text()="${name}"]/ancestor::tr//span[starts-with(@class, "chakra-checkbox__control")]`);
        return element;
    }

    /**
     * Returns the locked option warning label element
     * @returns By object
     */
    warningLabel(): By {
        const element = By.xpath('//div[contains(text(), "Locking this Policy means teachers can\'t unblock or Focus on affected resources during class.")]');
        return element;
    }
    
    /**
     * Returns By object for buttons in the Create Policy modal
     * No checking performed, uses data-testids. Case sensitive.
     * Save Button: "save-policy-button"
     * Close button: "modal-close-btn"
     * @param buttonName
     * @returns By object
     */
    button(buttonName: string): By {
        const name = buttonName.trim();
        const element = By.css(`button[data-testid="${name}"]`);
        return element;
    }
}