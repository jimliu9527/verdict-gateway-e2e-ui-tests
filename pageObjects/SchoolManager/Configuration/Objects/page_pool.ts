import { By, until, WebDriver, Key } from 'selenium-webdriver';


export class Page_Pool {
    /**
     * Returns the By object for the the Pool's heading
     * @returns By object
     */
    heading(name: string): By {
        const element = By.xpath(`//p[@role="heading" and text()="${name}"]`)
        return element;
    }

    /**
     * Returns the By object for the Add New Entry button
     * @returns - By object
     */
    addNewEntryBtn(): By {
        const element = By.css('button[data-testid="Add-new-entry"]');
        return element;
    }

    nameCell(name: string): By {
        const element = By.xpath(`//td[@role="gridcell"][1]/p[text()="${name}"]`);
        return element;
    }

    descriptionCell(text: string): By {
        const name = text.toLowerCase().trim();
        const element = By.xpath(`//td[@role="gridcell"][2]/p[text()="${name}"]`);
        return element;
    }

    entryCell(text: string): By {
        const name = text.toLowerCase().trim();
        const element = By.xpath(`//td[@role="gridcell"][3]//p[text()="${name}"]`);
        return element;
    }

}