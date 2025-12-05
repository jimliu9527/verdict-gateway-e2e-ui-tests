import { By } from 'selenium-webdriver';

export class Modal_DeletePolicyContentMod {

    /**
     * Returns the By object for the Delete Policy modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.css('[data-testid="modal-header"]');
        return element;
    }

    /**
     * Returns By object for the delete button in the Delete Policy modal
     * @returns By object
     */
    deleteBtn(): By {
        const element = By.xpath('//button[text()="Delete Policy"]');
        return element;
    }

};