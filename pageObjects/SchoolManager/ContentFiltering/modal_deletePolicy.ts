import { By } from 'selenium-webdriver';


export class Modal_DeletePolicy {
    /**
     * Returns the By object for the Delete Policy modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[text() = "Delete Policy"]');
        return element;
    }

    /**
     * Returns By object for buttons in the Create Policy modal
     * No checking performed. Case sensitive.
     * Delete Policy button: "Delete Policy",
     * Cancel button: "Cancel"
     * @param buttonName
     * @returns By object
     */
    button(buttonName: string): By {
        const name = buttonName.trim();
        const element = By.xpath(`//button[text() = "${name}"]`);
        return element;
    }


}