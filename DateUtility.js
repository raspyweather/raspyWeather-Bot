class DateUtility {
    GetLastDayOfMonth(year, month) {
        let date = new Date();
        date.setUTCMonth(month);
        date.setUTCFullYear(year);
        date.setUTCDate(0);
        return date;//.getUTCDate();
    }
    GetDaysOfMonth(year, month) {
        console.log("GetdaysofMonth", year, month);
        return createRangeArray(1, this.GetLastDayOfMonth(year, month).getUTCDate());
    }
    GetDINNotation(date) {
        if (date == undefined) {
            return "DATE WAS NULL";
        }
        return (date.getUTCHours().toString()).padStart(2, '0') + ":"
            + (date.getUTCMinutes().toString()).padStart(2, '0') + " "
            + (date.getUTCDate().toString()).padStart(2, '0') + "."
            + ((1 + date.getUTCMonth()).toString()).padStart(2, '0') + "."
            + (date.getUTCFullYear().toString()).padStart(2, '0');
    }
    GetWeeksOfMonth(year, month) {
        let date = this.GetLastDayOfMonth(year, month);
        let previousWeek = 0;
        let weeks = [];
        let recentWeek = [];
        for (let z = 1; z < date.getUTCDay(); z++) {
            recentWeek.push(undefined);
        }
        while (date.getUTCMonth() == month) {
            if (date.getUTCDay() == 1 && recentWeek.length > 0) {
                weeks.push(recentWeek);
                recentWeek = [];
            }
            previousDayOfWeek = date.getUTCDay();
            recentWeek.push(new Date(date));
            date.setUTCDate(date.getUTCDate() + 1);
        }
        weeks.push(recentWeek);
        return weeks;
    }
    GetDateFromHumanNotation(year, month, day) {
        if (day == undefined) { day = 1; }
        if (month == undefined) { month = 1; }
        let date = new Date();
        date.setUTCFullYear(year);
        date.setUTCMonth(month - 1);
        date.setUTCDate(day);
        return date;
    }
}
module.exports = DateUtility;