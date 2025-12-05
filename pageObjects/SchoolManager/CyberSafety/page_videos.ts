import { By } from 'selenium-webdriver';

export class Page_Videos {

    /**
     * Returns the By object for the Videos heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath(`//p[@role="heading" and text()="Videos"]`);
        return element;
    }

    /**
     * Returns the by object for the video title element in the videos table
     * @param title - case-sensitive video title friom YouTube or other streaming site
     * @returns By object
     */
    videoTitle(title: string): By {
        const element = By.xpath(`//p[text()="${title}"]`);
        return element;
    }

    /**
     * Returns the by object for the thumbnail for a given video title
     * @param title
     * @returns By object
     */
    thumbnail(title: string): By {
        const element = By.xpath(`//tr[td//a//p[text()="${title}"]]//img[@alt="thumbnail_image"]`);
        return element;
    }

    /**
     * Returns the by object for the view count for a given video title
     * @param title 
     * @returns By object
     */
    views(title: string): By {
        const element = By.xpath(`//tr[td//a//p[text()="${title}"]]//td[3]//p`);
        return element;
    }

    /**
     * Returns the by object for the user count for a given video title
     * @param title 
     * @returns By object
     */
    users(title: string): By {
        const element = By.xpath(`//tr[td//a//p[text()="${title}"]]//td[4]//p`);
        return element;
    }
    
}