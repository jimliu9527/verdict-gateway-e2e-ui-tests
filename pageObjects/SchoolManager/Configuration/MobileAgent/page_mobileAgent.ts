import { By } from 'selenium-webdriver';

export class Page_MobileAgent {
    
    /**
     * Returns By object for the Mobile Agent Config page heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath(`//div[@class="letter-panel-header" and text()="Mobile Agent"]`);
        return element;
    }

    /**
     * Returns By object for the Inspected header
     * Can be used to make sure that the inspected list has loaded
     * @returns By object
     */
    inspectedHeader(): By {
        const element = By.css(`[data-cy="inspectedSelector"]`);
        return element;
    }

    /**
     * @param name 
     * Options for name are: "Vimeo", "Bing", "YouTube", "Google Search " (note the space after search), 
     * "Encrypted Client Hello".
     * Can also add a url, or the name of an object list.
     * @returns By object of an element added to the inspected list on the Mobile Agent Config page
     */
    inspectedItem(name: string): By {
        const element = By.xpath(`//div[@class="signature_item"]/span[text()="${name}"]`);
        return element;
    }

    /**
     * Returns the By object for the delete icons
     * To be used to retrieve an array
     * @returns By object
     */
    inspectedItemDeleteIcons(): By {
        const deleteIcons = By.css("a.signature_item_remove");
        return deleteIcons;
    }

    /**
     * Returns the By object for the inspected item input field element
     * @returns By object
     */
    inspectedItemInputField(): By {
        const element = By.css("input.mui--is-empty");
        return element; 
    }
    
    /**
     * Returns the mitm enabled checkbox element
     * @returns By object
     */
    mitmEnabledCheckbox(): By {
        const element = By.xpath(`//input[@data-cy="MITM_off_network"]`);
        return element;
    }

    /**
     * Returns the google safe search checkbox element for on or off network
     * @param searchEngine The search engine name (e.g., "bing", "google")
     * @param isOnNetwork Boolean indicating if the checkbox is for on-network
     * @returns By object
     */
    safeSearchCheckbox(searchEngine: string, isOnNetwork: boolean): By {
        
        // Lowercase and remove the "safe search" part from the search engine name, eg. Google Safe Search => google
        const normalizedSearchEngine = searchEngine.toLowerCase().replace(" safe search", "");
        // If the search engine is Bing, we need to add an underscore to the name, otherwise do nothing
        const adjustedSearchEngine = normalizedSearchEngine === "bing" ? "bing_" : normalizedSearchEngine;
        // if isOnNetwork is true, we add "on_network" to the name, otherwise we add "off_network"
        const networkSuffix = isOnNetwork ? 'on_network' : 'off_network';

        // Construct the XPath dynamically
        return By.xpath(`//input[@data-cy="${adjustedSearchEngine}_${networkSuffix}"]`);
    }

    /**
     * Returns the submit button element
     * @returns By object
     */
    saveButton(): By {
        const element = By.xpath(`//button[@data-testid="submitBtn"]`);
        return element;
    }
}