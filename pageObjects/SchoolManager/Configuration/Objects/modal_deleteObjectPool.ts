import { By } from 'selenium-webdriver';

export class Modal_DeleteObjectPool {

    /**
     * Returns the By object for the Delete Object Pool modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[@data-testid="modal-header" and text() = "Delete Object Pool Confirmation"]');
        return element;
    }

    /**
     * Returns the delete button element
     * @returns By object
     */
    deleteBtn(): By {
        const element = By.css('button[aria-label="delete"]');
        return element;
    }

}