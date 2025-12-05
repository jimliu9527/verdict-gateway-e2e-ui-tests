import { By } from 'selenium-webdriver';

export class Modal_CreatePolicyContentMod {

    /**
     * Returns the By object for the Create Policy modal heading
     * @returns By object
     */
    heading(): By {
        const element = By.xpath('//header[text() = "Create Policy"]');
        return element;
    }

    /**
     * Returns By object for the name input field in the Create Policy modal
     * @returns By object
     */
    nameInput(): By {
        const element = By.css('input[placeholder="Enter a policy name"]');
        return element;
    }

    /**
     * Returns By object for the type dropdown in the Create Policy modal
     * @returns By object
     */
    typeDropdown(): By {
        const element = By.name("content-modification-selector")
        return element;
    }

    /**
     * Returns By object for the criteria dropdown in the Create Policy modal
     * @returns By object
     */
    criteriaDropdown(): By {
        const element = By.name("criteria-selector")
        return element;
    }

    /**
     * Returns By object for the content modification types in the dropdown
     * @param type 
     * @returns By object
     */
    typeOption(type: string): By {
        const name = type.toLowerCase().trim();
        const testIds: { [key: string]: string } = {
            "block embedded games":             "connect.contentmod.blogging-games",
            "block google doodles":             "connect.contentmod.google-doodles",
            "hide reddit login":                "connect.contentmod.reddit-login",
            "hide youtube comments":            "connect.contentmod.yt-comments",
            "hide youtube description":         "connect.contentmod.yt-description",
            "hide youtube menu":                "connect.contentmod.yt-menu",
            "hide youtube playables":           "connect.contentmod.yt-playables",
            "hide youtube recommended videos":  "connect.contentmod.yt-recommended",
            "hide youtube search":              "connect.contentmod.yt-search",
            "hide youtube shorts":              "connect.contentmod.yt-shorts"
        };

        if (!(name in testIds)) {
            throw new Error(`Type ${type} not found`);
        }
        const element = By.css(`li[data-testid^="option-"][data-testid*="${testIds[name]}"]`);
        return element;
    }

    /**
     * Returns the by object for a content mod that has been added to the type field
     * @param type - case sensitive
     * @returns By object
     */
    typeOptionChip(type: string): By {
        const element = By.xpath(`//div[contains(text(),"${type}")]//ancestor::a`);
        return element;
    }
};