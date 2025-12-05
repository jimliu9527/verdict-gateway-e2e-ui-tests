import { By } from 'selenium-webdriver';

export class Page_Searches {

    /**
     * Returns the By object for the Searches heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath(`//p[@role="heading" and text()="Searches"]`);
        return element;
    }

    /**
     * Returns the By object for the Word Cloud
     * @returns By object
     */
    wordCloud(): By {
        const element = By.id("amCharts-wordcloud_searches");
        return element;
    }

    /**
     * Returns the By object for the loading icon for the Word Cloud
     * @returns By object
     */
    loadingIcon(): By {
        const element = By.css(`[data-testid="loadingSpinner"]`);
        return element;
    }

    /**
     * Returns the By object for a specifc search term within the Word Cloud
     * Everything in the word cloud appears to be lowerCased.
     * @param searchTerm
     * @returns By object
     */
    searchTermInCloud(searchTerm: string): By {
        const name = searchTerm.toLowerCase().trim();
        const element = By.xpath(`//div[@id="amCharts-wordcloud_searches"]//*[text()="${name}"]`);
        return element;
    }

    /**
     * Returns the By object for a user in the table at the bottom of the searches page
     * @param name - the username to be clicked
     * @returns By object
     */
    userInTable(name: string): By {
        const element = By.xpath(`//tbody//a[text()="${name}"]`);
        return element;
    }

    /**
     * Returns the By object for the User Searches header on the page that is accessed after a clicking
     * into a user on the Searches page
     * @returns By object
     */
    userSearchesHeading(): By {
        const element = By.xpath('//p[@role="heading" and text()="User Searches"]');
        return element;
    }
    
    /**
     * Returns the By object for a search term in the table
     * @param searchTerm - the search term to be asserted
     * @returns By object
     */
    searchTermInTable(searchTerm: string): By {
        const name = searchTerm.toLowerCase().trim();
        const element = By.xpath(`//tbody//p[text()="${name}"]`);
        return element;
    }

    /**
     * Returns the By object for the time configurator
     * @returns By object
     */
    timeConfigurator(): By {
        const element = By.xpath(`//p[@data-testid="displayedDate"]/ancestor::button`);
        return element;
    }

    /**
     * Returns the By object for the Today option in the time configurator
     * @returns By object
     */
    todayButton(): By {
        const element = By.xpath(`//span[text()="Today"]/ancestor::button`);
        return element;
    }

    /**
     * Returns the By object for the Custom Range option in the time configurator
     * @returns By object
     */
    customRangeButton(): By {
        const element = By.xpath(`//span[text()="Custom Range"]/ancestor::button`);
        return element;
    }

    /**
     * Returns the By object for the Hours field in the time configurator
     * @returns By object
     */
    hoursInputField(): By {
        const element = By.css(`input[placeholder="HH"]`);
        return element;
    }

    /**
     * Returns the By object for the Minuntes field in the time configurator
     * @returns By object
     */
    minutesInputField(): By {
        const element = By.css(`input[placeholder="MM"]`);
        return element;
    }

    /**
     * Returns the By object for the AM/PM field in the time configurator
     * @returns By object
     */
    amPmField(): By {
        const element = By.xpath(`//span[text()="AM" or text()="PM"]/ancestor::button`);
        return element
    }

    /**
     * Returns the By object for the AM option from the AM/PM field dropdown in the time configurator
     * @returns By object
     */
    amOption(): By {
        const element = By.xpath(`//button[text()="AM"]`);
        return element;
    }
    
    /**
     * Returns the By object for the PM option from the AM/PM field dropdown in the time configurator
     * @returns By object
     */
    pmOption(): By {
        const element = By.xpath(`//button[text()="PM"]`);
        return element
    }

    /**
     * Returns the Select button from the time configurator
     * @returns By object
     */
    selectBtn(): By {
        const element = By.xpath(`//button[text()="Select"]`);
        return element;
    }

}