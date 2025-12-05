import { By, until, WebDriver, Key } from 'selenium-webdriver';


export class Modal_TestPolicy {
    /**
     * Returns the Test Policy header element
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[text() = "Test Policy"]')
        return element;
    }

    /**
     * Returns the website input element
     * @returns By object
     */
    websiteInput(): By {
        const element = By.css('input[aria-label="Website"]');
        return element;
    }

    /**
     * Returns the username input element
     * @returns by object
     */
    userInput(): By {
        const element = By.css('input[name="user-selector"]');
        return element;
    }

    /**
     * Returns the username dropdown element
     * @returns by object
     */
    userDropdown(): By {
        const element = By.css('div[aria-describedby="option list popup"]');
        return element;
    }
    
    /**
     * Returns the username option element
     * @returns by object
     */
    userOption(username:string): By {
        const element = By.css(`li[data-testid="option-0-${username}"]`);
        return element;
    } 

    /**
     * Returns the close button element
     * @returns By object
     */
    closeBtn(): By {
        const element = By.css('button[data-testid="modal-close-btn"]');
        return element;
    }

    /**
     * Returns the search button element
     * @returns By object
     */
    searchBtn(): By {
        const element = By.css('button[aria-label="small-icon-search"]');
        return element;
    }

    /**
     * Returns the policy Toggle Button element 
     * @return By object
     */
    policyToggleBtn(): By {
        const element = By.xpath("//section//label[@data-testid]//following::label[2]");
        return element;
    }

    /**
     * Returns the clear button element
     * @returns By object
     */
    clearBtn(): By {
        const element = By.css('button[aria-label="clear"]');
        return element;
    }

    /**
     * Returns the check button element
     * @returns By object
     */
    checkBtn(): By {
        const element = By.css('button[aria-label="check"]');
        return element;
    }

    /**
     * Returns the allowed text element
     * @returns By object
     */
    allowedText(): By {
        const element = By.xpath('//section//div//p[contains(text(), "Allowed")]');
        return element;
    }

    /**
     * Returns the no matched policies text element
     * @returns By object
     */
    noMatchPolicies(): By {
        const element = By.xpath('//section//div//p[contains(text(), "No policies are currently blocking this request")]');
        return element;
    }

    /**
     * Returns the matching policies text element 
     * @return By object
     */
    matchingPoliciesText(): By {
        const element = By.xpath('//section//div//p[contains(text(), "Existing School Policy")]');
        return element;
    }

    /**
     * Returns the matching policeis name text element
     * @param websiteName - pornhub.com
     * @return By object
     */
    matchingPoliciesName(websiteName: string): By {
        const policiesName: Record<string, string> = {
            "pornhub.com": "//section//div//p[contains(text(), 'Block category Pornography')]",
        };

        const policiesNameXpath = policiesName[websiteName];

        if (!policiesNameXpath){
            throw new Error (`No policies name xpath found for ${websiteName}`);
        }
        const element = By.xpath(policiesNameXpath);
        return element;
    }

    /**
     * Returns the edit button element
     * @returns By object
     */
    editPolicyBtn(): By {
        const element = By.xpath('//section//div//button[@aria-label="Edit"]');
        return element;
    }
    
}