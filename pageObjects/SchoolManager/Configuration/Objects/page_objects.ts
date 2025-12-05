import { By, until, WebDriver, Key } from 'selenium-webdriver';


export class Page_Objects {
    /**
     * Returns the By object for the Pools heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//p[@role="heading" and text()="Pools"]')
        return element;
    }

    /**
     * Returns the button for "Add new object pool"
     * @returns By object
     */
    addNewPoolButton(): By {
        const element = By.css('button[aria-label="Add new object pool"]');
        return element;
    }

    /**
     * Returns the button for "Delete"
     * @returns By object
     */
    trashCanIcon(): By {
        const element = By.css('button[aria-label="Delete association"]');
        return element;
    }


}
