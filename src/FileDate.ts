export class FileDate {
    public constructor(public readonly year: number,
        public readonly month: number,
        public readonly day: number,
        public readonly hour: number,
        public readonly minute: number) {
        if (year < 1000) {
            console.log("Year corrected for:" + JSON.stringify(this));
            this.year += 2000;
        }
    }
    public static now(): FileDate {
        const jsDate = new Date();
        return new FileDate(jsDate.getFullYear(), jsDate.getMonth() + 1, jsDate.getDate(), jsDate.getHours(), jsDate.getMinutes());
    }

    public static fromIdentifier(fileDateIdentifier: string): FileDate {
        return new FileDate(
            Number.parseInt(fileDateIdentifier.substr(0, 4), 10),
            Number.parseInt(fileDateIdentifier.substr(4, 2), 10),
            Number.parseInt(fileDateIdentifier.substr(6, 2), 10),
            Number.parseInt(fileDateIdentifier.substr(8, 2), 10),
            Number.parseInt(fileDateIdentifier.substr(10, 2), 10));
    }

    public getIdentifier(): string {
        return this.year.toString().padStart(4, '0') +
            this.month.toString().padStart(2, '0') +
            this.day.toString().padStart(2, '0') +
            this.hour.toString().padStart(2, '0') +
            this.minute.toString().padStart(2, '0');
    }

    public static CompareIdentifier(currentIdentifier: string, otherIdentifier: string): 'older' | 'newer' | 'equal' {
        if (currentIdentifier.length !== otherIdentifier.length) {
            throw new Error('Invalid formats: "' + currentIdentifier + '"-"' + otherIdentifier + '"');
        }
        for (let i = 0; i < otherIdentifier.length; i++) {
            const currentDigit = Number.parseInt(currentIdentifier.charAt(i), 10);
            const otherDigit = Number.parseInt(otherIdentifier.charAt(i), 10);
            if (currentDigit > otherDigit) {
                return 'older';
            }
            if (currentDigit < otherDigit) {
                return 'newer'
            }
        }
        return 'equal';
    }

    public static IsNewerAs(currentData: FileDate, otherDate: FileDate) {
        return this.CompareTo(currentData, otherDate) === 'newer';
    }

    public static IsOlderAs(currentDate: FileDate, otherDate: FileDate) {
        return this.CompareTo(currentDate, otherDate) === 'older';
    }

    public static CompareTo(currentDate: FileDate, otherDate: FileDate): 'newer' | 'equal' | 'older' {
        if (currentDate.year === otherDate.year &&
            currentDate.month === otherDate.month &&
            currentDate.day === otherDate.day &&
            currentDate.hour === otherDate.hour &&
            currentDate.minute === otherDate.minute
        ) {
            return 'equal';
        }
        if (currentDate.year < otherDate.year ||
            currentDate.month < otherDate.month ||
            currentDate.day < otherDate.day ||
            currentDate.hour < otherDate.hour ||
            currentDate.minute < otherDate.minute) {
            return 'newer';
        }

        return 'older';
    }
}

export class NoaaFileParser {
    public static parse(filename: string) {
        const noaaRegex1 = new RegExp(/noaa-\d{2}-\d{12}-\w{1,13}\.jpg/);
        const noaaRegex2 = new RegExp(/noaa-\d{12}-\w{1,13}\.jpg/);
        if (noaaRegex1.test(filename)) {
            const satelliteName = filename.substr(0, 7);
            const noaaDate = filename.substr(8, 12);
            const date = this.parseNoaaDate(noaaDate);
            const mode = filename.substring(21, filename.indexOf(".jpg"));
            return <NoaaFileInfo>{ date, satelliteName, mode };
        }
        if (noaaRegex2.test(filename)) {
            const noaaDate = filename.substr(5, 12);
            const date = this.parseNoaaDate(noaaDate);
            const mode = filename.substring(18, filename.indexOf(".jpg"));
            return <NoaaFileInfo>{ date, satelliteName: '', mode };
        }
        console.log('not supported: ' + filename);
        throw new Error();
    }

    private static parseNoaaDate(noaaDate: string): FileDate {
        return new FileDate(
            parseInt(noaaDate.substr(0, 4)),
            parseInt(noaaDate.substr(4, 2)),
            parseInt(noaaDate.substr(6, 2)),
            parseInt(noaaDate.substr(8, 2)),
            parseInt(noaaDate.substr(10, 2))
        );
    }
}

export interface NoaaFileInfo {
    readonly date: FileDate;
    readonly satelliteName: string;
    readonly mode: string;
}