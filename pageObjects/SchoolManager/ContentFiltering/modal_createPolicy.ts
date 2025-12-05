import { By, until, WebDriver, Key } from 'selenium-webdriver';


export class Modal_CreatePolicy {
    /**
     * Returns the By object for the Create Policy modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[text() = "Create Policy"]');
        return element;
    }

    /**
     * Returns By object for the input fields in the Create Policy modal
     * Placeholders used due to improper ids and testids.
     * No checking performed, so only use placeholders of existing input fields:
     * Name: "Enter a policy name", 
     * Type (dropdown): "Search for one or more website/signature",
     * Criteria (dropdown): "Select Criteria"
     * Redirect Url: "Enter url",
     * Add User: "Search Users",
     * 
     * Case sensitive.
     * @param placeholder 
     * @returns By object
     */
    inputField(placeholder: string): By {
        const name = placeholder.trim();
        const element = By.css(`input[placeholder="${name}"]`);
        return element;
    }

    /**
     * Returns the By object for the top-level policies
     * No policy name verification - By object is always returned
     * 
     * @param policy  - Name of the top-level policy, case sensitive
     * @returns By object
     */
    topLevelPolicy(policy: string): By {
        const element = By.xpath(`//li[starts-with(@data-testid, "option-sphirewall.application.")]//span[text() = "${policy}"]`);
        return element;
    }

    /**
     * Returns by object for a signature (or other) from the option list popup (drop down menu selector).
     * @param policy - Name of the lower-level policy, case sensitive
     * @returns By object
     */
    signatureFromOptionList(policy: string): By {
        const element = By.xpath(`//div[@aria-describedby="option list popup"]//p[text()="${policy}"]`);
        return element;
    }

    /**
     * Returns by object for a signature (or other) from the option list popup (drop down menu selector).
     * The name will typically be non-friendly, eg "porn" for Pornography, according to the test-id
     * @param name - Name of the lower-level policy, case sensitive
     * @returns By object
     */
    signatureFromButton(name: string): By {
        const element = By.xpath(`//li[@data-testid="option-sphirewall.application.${name}"]/a/button`);
        return element;
    }

    /**
     * Returns the http via direct ip policy object
     * The text for this is spread out over multiple spans, so the above topLevelPolicy object is not useable here
     * @returns By Object
     */

    httpTrafficViaDirectIP(): By {
        const element = By.xpath(`//li[@data-testid="option-application.http.directip"]`);
        return element;
    }

    /**
     * Returns the By object of a url item in the drop down field of the type section of the create policy modal
     * Only available if the text for the url has been first entered into the type field
     * No policy name verification - By object is always returned
     * 
     * @param url - the url to be entered as a policy, eg google.com
     * @returns By object
     */
    urlPolicy(url: string): By {
        const element = By.xpath(`//p[text() = "${url}"]`);
        return element;
    }

    /**
     * Return the By object for list options in the criteria drop-down
     * Use criteria name as it is displayed in drop-down.
     * @param criteriaName 
     * @returns By object
     */
    criteria(criteriaName: string): By {
        const name = criteriaName.toLowerCase().trim();
        const testIds: { [key: string]: string } = {
            "network range":        "ipv4.range",
            "mac address":          "source.mac",
            "network":              "ipv4",
            "ip address":           "ipv4.address",
            "device type":          "fingerprint",
            "ip address object":    "ipv4.address",
            "mac address object":   "mac.pool",
            "time periods":         "timeperiod",
            "content type":         "application.http.contenttype.regex",
            "user agent":           "application.http.useragent.regex",
            "http request path":    "application.http.request.regex",
            "user":                 "source.user",
            "group":                "group",
            "exclude group":        "exclude.group",
            "security group":       "securitygroup",
        };

        if (!(name in testIds)) {
            throw new Error(`Invalid criteria name: ${criteriaName}`);
        }
        const element = By.css(`li[data-testid^="option-"][data-testid$="-${testIds[name]}"]`);
        return element;
    }

    /**
     * Returns by object after typing in the expected name into the criteria input field
     * The first option is prefixed with option-0.
     * Input string e.g. "username@email.com"
     * @param username
     * @returns By object
     */
    selectUserCriteria(username: string): By {
        const name = username.toLowerCase().trim();
        const element = By.css(`li[data-testid="option-0-${name}"]`);
        return element;
    }

    /**
     * Returns by object for a option list popup (drop down menu selector).
     * Can you be used for varuious drop down menus.
     * @returns By object
     */
    optionListPopup(): By {
        const element = By.css(`div[aria-describedby="option list popup"]`);
        return element;
    }

    /**
     * Returns By object for Action radio button
     * Input must be either "Allow" or "Block"
     * @param actionName 
     * @returns By object
     */
    action(actionName: string): By {
        const name = actionName.toLowerCase().trim();
        const element = By.xpath(`//label[@for="${name}"]/ancestor::label//input`);
        return element;
    }

    /**
     * Returns by object for the span immediately after the Action radio button.
     * This span has the data-checked attribute which can be used to check if the button is enabled.
     * @param actionName 
     * @returns By object
     */
    actionIsChecked(actionName: string): By {
        const name = actionName.toLowerCase().trim();
        const element = By.xpath(`//label[@for="${name}"]/ancestor::label//input/following-sibling::span[1]`);
        return element;
    }

    /**
     * Returns By object for the checkboxes in Create Policy modal
     * No checking performed, so only use names of existing checkboxes:
     * "Blocked Page", "Alert", "Quarantine", "Locked", "Redirect"
     * @param checkboxName 
     * @returns By object
     */
    checkbox(checkboxName: string): By {
        const name = checkboxName.trim();
        const element = By.xpath(`//p[text()="${name}"]/ancestor::tr//span[starts-with(@class, "chakra-checkbox__control")]`);
        return element;
    }

    /**
     * Returns By object for buttons in the Create Policy modal
     * No checking performed, uses data-testids. Case sensitive.
     * Save Button: "save-policy-button"
     * Close button: "modal-close-btn"
     * @param buttonName
     * @returns By object
     */
    button(buttonName: string): By {
        const name = buttonName.trim();
        const element = By.css(`button[data-testid="${name}"]`)
        return element;
    }

    typeScrollableContainer() : By {
        const element = By.css('div[aria-describedby="option list popup"]');
        return element;
    }
}