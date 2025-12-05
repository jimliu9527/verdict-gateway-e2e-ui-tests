import { By } from 'selenium-webdriver';

export class Modal_CategorySearch {

    /**
     * Returns the Category Search header element
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[text() = "Category Search"]')
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
     * Returns the search button element
     * @returns By object
     */
    searchBtn(): By {
        const element = By.css('button[data-testid="signature-search-btn"]');
        return element;
    }

    /**
     * Returns the edit button element
     * @returns By object
     */
    editPolicyBtn(): By {
        const element = By.css('button[aria-label="small-icon-search"]');
        return element;
    }

    /**
     * Returns the search button element
     * @returns By object
     */
    closeBtn(): By {
        const element = By.css('button[data-testid="modal-close-btn"]');
        return element;
    }

    /**
     * Returns the category element for a given website
     * @param websiteName - afl.com.au, pornhub.com, familyzonedns.com, example
     * @return By object
     */
    category(websiteName: string): By {
        const category: Record<string, string> = {
            "afl.com.au": "//section//button//p[contains(text(), 'Sports')]",
            "pornhub.com": "//section//button//p[contains(text(), 'Pornography')]",
            "familyzonedns.com": "//section//p[contains(text(), 'Uncategorised Website')]",
            "example": "//section//p[contains(text(), 'Invalid url entered')]"
        };

        const categoryXpath = category[websiteName];

        if (!categoryXpath){
            throw new Error (`No category xpath found for ${websiteName}`);
        }
        const element = By.xpath(categoryXpath);
        return element;
    }

    /**
     * Returns the matching policies text element 
     * @return By object
     */
    matchingPoliciesText(): By {
        const element = By.xpath('//section//div//p[contains(text(), "Matching Policies")]');
        return element;
    }

    /**
     * Returns the matching policies name text element
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
     * Returns the locked icon element for a policy
     * @param websiteName - pornhub.com
     * @return By object
     */
    lockedIcon(websiteName: string): By {
        const lockedIcon: Record<string, string> = {
            "pornhub.com": "//section//div//span[contains(text(), 'Locked')]",
        };

        const lockedIconXpath = lockedIcon[websiteName];

        if (!lockedIconXpath){
            throw new Error ("Locked Icon can not be found");
        }
        const element = By.xpath(lockedIconXpath);
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
     * Returns the "Uncategorised Website" text element 
     * @return By object
     */
    uncategorisedText(): By {
        const element = By.xpath("//p[contains(normalize-space(), 'Uncategorised Website')]");
        return element;
    }

    /**
     * Returns the "Invalid url entered" text element 
     * @return By object
     */
    invalidUrlEnteredText(): By {
        const element = By.xpath("//div[contains(text(), 'Invalid url entered')] | //p[contains(text(), 'Invalid url entered')]");
        return element;
    }
}