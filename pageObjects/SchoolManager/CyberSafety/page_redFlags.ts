import { By } from 'selenium-webdriver';

export class Page_RedFlags {

    /**
     * Returns the By object for the Red Flags heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath(`//p[@role="heading" and text()="Red Flags"]`);
        return element;
    }

    /**
     * Red Flag indicator button in the red flags page
     * All elements for each red flag are the same besides the text, which is the name of the red flag and is case sensitive.
     * Options are: Adult Content, VPN Search, Suicide, Depression, Substance Abuse, Violence, Hate Speech, Bullying, Academic Dishonesty.
     * @param name 
     * @returns By object
     */
    redFlag(name: string): By {
        const element = By.xpath(`//div[@class="riskStudentIndicatorText newUiRiskIndicatorButton" and text()="${name}"]`);
        return element;
    };

    /**
     * Red Flag indicator button in the red flags page for a specific user
     * All elements for each red flag are the same besides the text, which is the name of the red flag and is case sensitive.
     * Options are: Adult Content, VPN Search, Suicide, Depression, Substance Abuse, Violence, Hate Speech, Bullying, Academic Dishonesty.
     * @param user
     * @param name 
     * @returns By object
     */
    redFlagForUser(user: string, name: string): By {
        const element = By.xpath(`//tr[//a[text()="${user}"]]//div[@class="riskStudentIndicatorText newUiRiskIndicatorButton" and text()="${name}"]`);
        return element;
    };
};