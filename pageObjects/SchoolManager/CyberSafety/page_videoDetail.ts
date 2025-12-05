import { By } from 'selenium-webdriver';

export class Page_VideoDetail {

    /**
     * Returns the by object for the heading element on the video detail page
     * @returns By object
     */
    heading(): By {
        const element = By.xpath(`//p[@role="heading" and text()="Video Detail"]`);
        return element;
    }

    /**
     * Returns the by object for the video title from the formgroup element.
     * @param title - case sensitive
     * @returns By object
     */
    videoTitle(title: string): By {
        const element = By.xpath(`//div[@class="formgroup_title_title"]//p[contains(text(), "${title}")]`);
        return element;
    }

    /**
     * Returns the user in the videos table
     * @param username
     * @returns By object
     */
    user(username: string): By {
        const element = By.xpath(`//p[text()="${username}"]`);
        return element;
    }

    /**
     * Returns the by object for the mac addresses in the table which is the 3rd column, for a specific user
     * @returns By object
     */
    macAddress(username: string): By {
        const element = By.xpath(`//tr[//p[text()="${username}"]]//td[3]//p`);
        return element;
    }

    /**
     * Returns the by object for the timestamp in the table which is the 1st column, for a specific user
     * @returns By object
     */
    timestamp(username: string): By {
        const element = By.xpath(`//tr[//p[text()="${username}"]]//td[1]//p`);
        return element;
    }

    /**
     * Returns the by object for the embedeed video player
     * @returns By object
     */
    embeddedVideo(): By {
        const element = By.className("video_player");
        return element;
    }

    /**
     * Returns the by object of the element containing the video description text
     * @returns By object
     */
    videoDescription(): By {
        const element = By.xpath(`//div[@class="video_description"]//p`);
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
    
}