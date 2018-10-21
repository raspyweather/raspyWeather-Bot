import { FileDate, NoaaFileParser } from "./FileDate";
import { ImageInfo } from "./ImageInfo";

export class ImageCollection {
    public addImages(files: { id: string, name: string }[], apiKey: string) {
        const apiKeyIdx = ImageCollection.addIfNotExist(this.apiKeys, apiKey);
        files.forEach(file => this.addImage(file, apiKeyIdx));
    }


    private addImage(file: { id: string, name: string }, apiKeyIdx: number) {
        const { id } = file;
        try {
            const noaaData = NoaaFileParser.parse(file.name);

            const satelliteIdx = ImageCollection.addIfNotExist(this.satellites, noaaData.satelliteName);
            const modeIdx = ImageCollection.addIfNotExist(this.imageModes, noaaData.mode);

            const node = this.getOrCreateDataNode(noaaData.date);

            if (node.some(item => item.modeIdx === modeIdx &&
                item.satelliteIdx === satelliteIdx &&
                item.apiKeyIdx === apiKeyIdx
            )) {
                ImageCollection.notAddedCtr++;
                return;
            }
            node.push({
                modeIdx,
                satelliteIdx,
                apiKeyIdx,
                id
            });
            return;

        } catch (e) {
            console.log({ e: JSON.stringify(e), file });
        }

    }

    private getOrCreateDataNode(date: FileDate) {
        if (!this.data) {
            console.log("this.data undefined!" + this.data);
            throw new Error();
        }
        if (!date) {
            console.log(`date is undef:${date}`);
        }
        if (Object.prototype.hasOwnProperty.call(this.data, date.getIdentifier())) {
            return this.data[date.getIdentifier()];
        }
        return this.data[date.getIdentifier()] = [];
    }

    private static addIfNotExist(collection: any[], element: any): number {
        const idx = collection.indexOf(element);
        if (idx !== -1) {
            this.notAddedCtr++;
            return idx;
        }
        collection.push(element);
        return collection.indexOf(element);
    }

    public getNewestDate() {
        let dates = Object.keys(this.data);
        if (dates.length === 0) { return undefined; }
        let newestDate = dates[0];
        for (let date of dates) {
            if (FileDate.CompareIdentifier(date, newestDate) === 'older') {
                newestDate = date;
            }
        }
        return FileDate.fromIdentifier(newestDate);
    }


    private matchDates(searchStr: string, digits: number) {
        let dates = Object.keys(this.data);
        let shortenedSearchString = searchStr.substr(0, digits);
        return dates.filter(date => date.startsWith(shortenedSearchString));
    }

    public getImageForFlight(fileDate: FileDate, modePrios: string[] = []): ImageInfo[] {
        const flightData = this.data[fileDate.getIdentifier()];
        if (fileDate === undefined) { return []; }
        const modeIndexes = modePrios.map(mode => this.imageModes.indexOf(mode)).filter(x => x != -1);
        const preferedItems = flightData.filter(x => modeIndexes.indexOf(x.modeIdx) > -1);

        if (preferedItems.length > 0) {
            return preferedItems.map(item => this.makeImageInfo(item, fileDate));
        }
        return flightData.slice(0, modePrios.length || flightData.length).map(item => this.makeImageInfo(item, fileDate));
    }
    private makeImageInfo(item: any, date: FileDate) {
        const driveUrl = "https://docs.google.com/uc?id=";
        return <ImageInfo>{
            imageUrl: driveUrl + item.id,
            date,
            imageMode: this.imageModes[item.modeIdx],
            satelliteName: this.satellites[item.satelliteIdx]
        }
    }
    public getDatesSameDay(fileDate: FileDate) {
        return this.matchDates(fileDate.getIdentifier(), 8);
    }
    public getDatesSameMonth(fileDate: FileDate) {
        return this.matchDates(fileDate.getIdentifier(), 6);
    }


    public setInitialData(data: { apiKeys: string[], data: any, imageModes: string[], satellites: string[] }) {
        if (this.apiKeys === undefined || this.apiKeys.length > 0) {
            throw "Cannot set initial to a dirty ImageCollection";
        }
        this.apiKeys = data.apiKeys;
        this.data = data.data;
        this.imageModes = data.imageModes;
        this.satellites = data.satellites;
    }

    public getDatesSince(comparisonDate: FileDate): FileDate[] {
        const compDate = comparisonDate.getIdentifier();
        return Object.keys(this.data)
            .filter(dateStr => 'newer' === FileDate.CompareIdentifier(compDate, dateStr))
            .map(dateStr => FileDate.fromIdentifier(dateStr));
    }

    private static notAddedCtr: number = 0;


    public static get notAddedCounter(): number {
        return ImageCollection.notAddedCtr;
    }
    public getImageModes():string[]{
        return this.imageModes;
    }

    private apiKeys: string[] = [];
    private data: ImageCollectionItem = Object.create(null);
    private imageModes: string[] = [];
    private satellites: string[] = [];
}