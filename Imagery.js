const gdrive = require('./gdrive.js');
const DateUtility = require('./DateUtility.js');
class Imagery {
    constructor(jsonStr) {
        if (jsonStr == undefined||jsonStr=="") {
            this.Dates = [];
            this.ImageModes = [];
            this.Data = {};
            this.ImagesCount = 0;
            this.LogFileId = "";
            this.Satellites = [];
        }
        else {
            let obj = JSON.parse(jsonStr);
            this.Dates = obj.Dates.map(x => new Date(x));
            this.ImageModes = obj.ImageModes;
            this.Data = {};
            this.Dates.forEach(x => {
                if (obj.Data["" + x] != undefined)
                    this.Data[x] = obj.Data[x];
            });
            this.ImagesCount = obj.ImagesCount;
            this.LogFileId = obj.LogFileId;
            this.Satellites = obj.Satellites;
            this.Dates = this.Dates.sort((x, y) => { return y.getTime() - x.getTime(); });
        }
        this.DateUtility = new DateUtility();

    }
    processData(files) {
        for (let file of files) {
            if (file == undefined) { continue; }
            let name = file.name;
            if (name.endsWith(".log")) {
                Imagery.LogFileId = file.id;
                continue;
            }
            let id = file.id;
            let sat = parseInt(name.substring(5, 7));
            let mode = name.substring(21, name.length - 4);
            let dat = new Date(name.substring(8, 12) + "/" +
                name.substring(12, 14) + "/" +
                name.substring(14, 16) + "/" +
                name.substring(16, 18) + ":" +
                name.substring(18, 20));
            if (dat == undefined || mode == undefined || sat == undefined || isNaN(sat) || isNaN(dat)) { console.log(file); console.log({ dat: dat, nam: name, id: id, mode: mode }); continue; }
            if (this.ImageModes.indexOf(mode) == -1) { this.ImageModes.push(mode); }
            if (this.Satellites.indexOf(sat) == -1) { this.Satellites.push(sat); }
            if (this.Data[dat] == undefined) {
                //NEW IMAGES            
                this.Dates.push(dat);
                this.Data[dat] = {
                    Sat: sat,
                    ModeIds: [this.ImageModes.indexOf(mode)],
                    IDs: {},
                    APIKey: file.APIKey
                };
                this.Data[dat].IDs[this.ImageModes.indexOf(mode)] = id;
            }
            else {
                if (this.Data[dat].ModeIds.indexOf(this.ImageModes.indexOf(mode)) > -1 && file.APIKey == this.Data[dat].APIKey) {
                    continue;
                }
                this.Data[dat].ModeIds.push(this.ImageModes.indexOf(mode));
                this.Data[dat].IDs[this.ImageModes.indexOf(mode)] = id;
            }
            this.ImagesCount++;
        }
        //this.Dates = this.Dates.sort();

        this.Dates = this.Dates.sort((x, y) => { return y.getTime() - x.getTime(); });
    }
    DateToString(dat) {
        return dat.getUTCFullYear().toString().padLeft(4, "0")
            + (dat.getUTCMonth() + 1).toString().padLeft(2, "0")
            + dat.getUTCDate().toString().padLeft(2, "0")
            + dat.getUTCHours().toString().padLeft(2, "0")
            + dat.getUTCMinutes().toString().padLeft(2, "0");
    }
    GetNewestDate(year, month, day) {
        if (day == undefined && month == undefined && year == undefined) {
            return this.Dates[0];
        }
        let compDate = Imagery.DateUtility.GetDateFromHumanNotation(year, month, day);
        compDate.setUTCHours(23);
        compDate.setUTCMinutes(59);
        compDate.setUTCSeconds(59);
        return new Date(Math.min(...this.Dates.filter(x =>
            x.getTime() > compDate.getTime())));
    };
    GetOldestDate(year, month, day) {
        if (day == undefined && month == undefined && year == undefined) {
            return this.Dates[this.Dates.length - 1];
        }
        let compDate = Imagery.DateUtility.GetDateFromHumanNotation(year, month, day);
        compDate.setUTCHours(0);
        compDate.setUTCMinutes(0);
        compDate.setUTCSeconds(0);
        return new Date(Math.max(...this.Dates.filter(x =>
            x < compDate)));

    }
    GetAllImageLinks() {
        var ls = [];
        this.Dates.forEach(x => {
            for (var z in this.Data[this.Dates[0]].IDs) { ls.push(this.GetImageLinkFromId(this.Data[this.Dates[0]].IDs[z])); }
        });
        return ls;
    };
    GetImageLinkFromId(id) { return gdrive.gdriveConfig.FileURL + id; };
    GetImageLinkFromExactDate(dat, modeStr) { return gdrive.gdriveConfig.FileURL + this.Data[dat].IDs[this.ImageModes.indexOf(modeStr)]; };
    GetImageLinkAndDateNewestMode(dat, modeStr) {
        let modeIdx = this.ImageModes.indexOf(modeStr);
        let dateIdx = this.Dates.indexOf(dat);
        if (dateIdx > 0) {
            // date 
            return this.GetImageLinkFromId(this.Data[this.Dates[dateIdx - 1]].IDs[modeIdx]);
        }
        else {
            dateIdx = 0;
        }

        while (dateIdx > -1) {
            if (this.Data[this.Dates[dateIdx]].IDs[modeIdx] != undefined) {
                return { link: this.GetImageLinkFromId(this.Data[this.Dates[dateIdx]].IDs[modeIdx]), sat: this.Data[this.Dates[dateIdx]].Sat, date: this.Dates[dateIdx] };
            }
            dateIdx++;
        }
        return null;

    }
    GetImageLinksFromDay(year, month, day) { return this.Dates.filter(x => x.getUTCFullYear() == year && (x.getUTCMonth() + 1) == month && (x.getUTCDate() == day)).map(x => { return this.GetImageLinkFromId(x); }); };
    GetDataFromDay(year, month, day) {
        return this.Dates.filter(x => x.getUTCFullYear() == year && (x.getUTCMonth() + 1) == month && (x.getUTCDate() == day)).map(x => Imagery.Data[x]);
    };
    getUTCDatesFromDay(year, month, day) { return this.Dates.filter(x => x.getUTCFullYear() == year && (x.getUTCMonth() + 1) == month && (x.getUTCDate() == day)); };
    getUTCDatesFromMonth(year, month) { return this.Dates.filter(x => x.getUTCFullYear() == year && (x.getUTCMonth() + 1) == month); };

    GetModeIndexFromString(modeStr) { return this.ImageModes.indexOf(modeStr); };
    //GetImagesFromMode(modeStr) { return; }// this.Data.filter(x => x.ModeIds.contains(this.ImageModes.indexOf(modeStr))) };
    GetYears() {
        return findUniqueELements(this.Dates.map(x => x.getUTCFullYear())).Dates.sort((x, y) => { return y.getTime() - x.getTime(); });
    };
    getUTCMonths(year) {
        return findUniqueELements(this.Dates.filter(x => x.getUTCFullYear() == year).map(x => x.getUTCMonth()));
    }
    GetDays(year, month) {
        return findUniqueELements(this.Dates.filter(x => x.getUTCFullYear() == year && x.getUTCMonth() == month).map(x => x.getUTCDate()));
    };
}
module.exports = {
    Imagery
}