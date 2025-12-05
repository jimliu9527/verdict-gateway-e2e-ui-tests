import { By } from 'selenium-webdriver';

export class Page_UserSearchHistory {

    /**
     * Returns the heading By object on the user search history page
     * @returns 
     */
    heading(): By {
        const element = By.xpath(`//p[@role="heading" and text()="Search History"]`);
        return element;
    }

    /**
     * Returns the By object of a row that includes the expected search term, red flag and search engine
     * @param searchTerm - the term searched for to raise a red flag
     * @param redFlag - the category of red flag
     * @param searchEngine - the search engine used to generate the red flag
     * @returns By object
     */
    redFlagInTable(searchTerm: string, redFlag: string, searchEngine: string): By {
        const element = By.xpath(`//tr[td[2]/p[text()="${searchTerm}"] and td[3]/p[text()="${redFlag}"] and td[4]/p[text()="${searchEngine}"]]`);
        return element;
    }

    /**
     * Returns the By object for the viewbox element immediately preceding the svg-inline--fa fa-sort element
     * Clicking the fa fa-sort element directly gets interecepts by the viewbox element preceding it.
     * @returns By object
     */
    defaultSort(): By {
        const element = By.xpath(`//*[@viewBox="0 0 24 24"][.//*[@class="svg-inline--fa fa-sort"]]`);
        return element;
    }

    /**
     * Returns the By object for the viewbox element immediately preceding the svg-inline--fa fa-sort-up element
     * Clicking the fa fa-sort-up element directly gets interecepts by the viewbox element preceding it.
     * @returns By object
     */
    ascendingSort(): By {
        const element = By.xpath(`//*[@viewBox="0 0 24 24"][.//*[@class="svg-inline--fa fa-sort-up"]]`);
        return element;
    }

    /**
     * Returns the By object for the viewbox element immediately preceding the svg-inline--fa fa-sort-down element
     * Clicking the fa fa-sort-down element directly gets interecepts by the viewbox element preceding it.
     * @returns By object
     */
    descendingSort(): By {
        const element = By.xpath(`//*[@viewBox="0 0 24 24"][.//*[@class="svg-inline--fa fa-sort-down"]]`);
        return element;
    }

};