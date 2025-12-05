import { By } from 'selenium-webdriver';

export class Page_Dashboard {
    /**
     * Returns the By object for the Dashboard heading
     * Unlike other headings in other page objects, this one does not have the role of heading, but the className is unique
     * @returns By object
     */
    heading(): By {
        const element = By.className("personaDashboardHeader-h4");
        return element;
    }

    /**
     * Returns the By object for the View All button pertaining to Red Flags
     * There are multiple View All buttons on the page with the same class name, but the href makes it unique.
     * @returns By object
     */
    viewAllRedFlags(): By {
        const element = By.css('a.personaModule-rightLink[href="/cybersafety/wellbeing"]');
        return element;
    }

};