import { By } from 'selenium-webdriver';

export class Modal_AddCode {
    
    /**
     * Returns the By object for the Add Code modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.css(`header[data-testid="modal-header"]`);
        return element;
    }

    /**
     * Returns the By object for the Bypass Code value element in the Add Code modal
     * This element is only visible once a bypass code has been generated
     * getText can be used to get the value of the code
     * @returns By object
     */
    bypassCodeValueElement(): By {
        const element = By.xpath('//p[text()="Bypass Code:"]//p');
        return element;
    }
    
    /**
     * Locates the dropdown element for selecting a duration.
     * @returns By object
     *
     */
    durationDropDown(): By {
        const element = By.name('Single Selector');
        return element;
    }

    /**
     * Returns the By object for the duration element in the Add Code modal given a duration value
     * @param duration - The duration value to select, 
     * @returns By object
     */
    durationElement(duration: string): By {
        // the second value in the object comes from the data-testids for each time value
        // these are static values and are the only ones availabe, can not custom set a value
        // example: data-testid="option-0-10" is the data-testid for "For 10 Minutes"
        const validDurations = {
            "For 10 Minutes": "0-10",
            "For 15 Minutes": "1-15",
            "For 20 Minutes": "2-20",
            "For 30 Minutes": "3-30",
            "For 45 Minutes": "4-45",
            "For 1 Hour": "5-60",
            "For 2 Hours": "6-120",
            "For 3 Hours": "7-180"
        };
        // Check if the provided duration is valid
        if (!validDurations.hasOwnProperty(duration)) {
            throw new Error(`Invalid duration: ${duration}. Expected one of ${Object.keys(validDurations).join(", ")}`);
        }
        // Get the duration value from the mapping
        const durationValue = validDurations[duration as keyof typeof validDurations];

        const element = By.xpath(`//li[@role="option"][@data-testid="option-${durationValue}"]//span`);
        return element;
    }

    /**
     * Returns the By object for the Add button in the Add Code modal
     * @returns By object
     */
    addBtn(): By {
        const element = By.css('button[data-testid="save-policy-button"]');
        return element;
    }
}