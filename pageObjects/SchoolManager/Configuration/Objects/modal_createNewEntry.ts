import { By, until, WebDriver, Key } from 'selenium-webdriver';


export class Modal_CreateNewEntry {
    /**
     * Returns the By object for the Create new Entry modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[@data-testid="modal-header" and text() = "Create new Entry"]');
        return element;
    }

    /**
     * Returns the name field BY object for the Create new Entry modal
     * @returns By object
     */
    nameInput(): By {
        const element = By.css('input[aria-label="name"]');
        return element;
    }

    /**
     * Returns the description field BY object for the Create new Entry modal
     * @returns By object
     */
    descriptionInput(): By {
        const element = By.css('input[aria-label="description"]');
        return element;
    }

    /**
     * Returns the entry field BY object for the Create new Entry modal
     * @returns By object
     */
    entryInput(): By {
        const element = By.css('input[aria-label="value"]');
        return element;
    }

    /**
     * Returns the By object for the Save Object Pool button in the Create new Entry modal
     * @returns By object
     */
    saveEntryBtn(): By {
        const element = By.css('button[data-testid="save-policy-button"]');
        return element;
    }
}