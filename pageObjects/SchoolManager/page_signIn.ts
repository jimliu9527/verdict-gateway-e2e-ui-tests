import { By } from 'selenium-webdriver';
export class Page_SignIn {

    /**
     * Returns the By object for the username field
     * @returns By object for the username field
     */
    usernameField() : By {
        const element = By.css('input#email');
        return element;
    }

    /**
     * Returns the By object for the password field
     * @returns By object for the password field
     */
    passwordField() : By {
        const element = By.css('input#password');
        return element;
    }

    /**
     * Accepts the device name as a string and returns the By object for the device link
     * @param device The device name needed as string
     * @returns By object for the device link
     */
    deviceLink(device: string): By {
        const element = By.xpath(`//a[(text()='${device}')]`);
        return element;
    }
}