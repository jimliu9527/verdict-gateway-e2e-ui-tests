import { By } from 'selenium-webdriver';

export class Page_Time_Periods {

    /**
     * Returns the By object for time periods page heading
     * @returns By object
     */
    heading(): By {
        const element = By.css('#fz_table_header p');
        return element;
    }

    /**
     * Returns the By object for manage time period page heading
     * @returns By object
     */
    manageTimePeriodHeading(): By {
        const element = By.css('div.letter-panel-header');
        return element;
    }

    /**
     * Returns the By object for add time period button
     * @returns By object
     */
    addTimePeriodBtn(): By {
        const element = By.css('.heading_button');
        return element;
    }

    /**
     * Returns the By object for name the time period modal
     * @returns By object
     */
    nameTimePeriodModal(): By {
        const element = By.css('div.modal-content');
        return element;
    }

    /**
     * Returns the By object for name input of naming time period modal
     * @returns By object
     */
    inputName(): By {
        const element = By.css('input[type="text"]');
        return element;
    }

    /**
     * Returns the By object for add button of naming time period modal
     * @returns By object
     */
    addBtn(): By {
        const element = By.css('button[type="submit"]');
        return element;
    }

    /**
     * Returns the By object for input start time of manage time period page
     * @returns By object
     */
    startTimeInput(): By {
        const element = By.css('input[placeholder="08:00"]');
        return element;
    }

    /**
     * Returns the By object for input end time of manage time period page
     * @returns By object
     */
    endTimeInput(): By {
        const element = By.css('input[placeholder="18:00"]');
        return element;
    }

    /**
     * Returns the By object for error text of manage time period page
     * @returns By object
     */
    errorText(): By {
        const element = By.css('p.AlertBanner--error');
        return element;
    }

    /**
     * Returns the By object for days to be selected in manage time period page
     * @param day - options are: mon,tue,wed,thu,fri,sat,sun and any
     * @returns By object
     */
    selectDay(day: string): By {
        const element = By.css(`input[name=${day}]`);
        return element;
    }

    /**
     * Returns the By object for form group element in manage time period page
     * @returns By object
     */
    formGroup(): By {
        const element = By.css("div.formgroup-element");
        return element;
    }

    /**
     * Returns the By object for save button in manage time period page
     * @returns By object
     */
    saveBtn(): By {
        const element = By.css('button[data-testid="submitBtn"]');
        return element;
    }

    /**
     * Returns the By object for trash can icon in time period page
     * @returns By object
     */
    trashCanIcon(): By {
        const element = By.css('a:has(svg[data-icon="trash"])');
        return element;
    }

    /**
     * Returns the By object for confirm delete header in time periods page
     * @returns By object
     */
    deleteHeader(): By {
        const element = By.css('h3#categoryModalLabel');
        return element;
    }

    /**
     * Returns the By object for delete button element in time period page
     * @returns By object
     */
    deleteBtn(): By {
        const element = By.xpath('//button[text() = "Delete"]');
        return element;
    }

    /**
     * Returns the By object for time period entry row element in time period page
     * @returns By object
     */
    timePeriodRow(): By {
        const element = By.css('tbody tr');
        return element;
    }
}