import * as XMLHttpRequest from './httpHandler';

export class drive {
    constructor(private readonly apiKey: string, private readonly folderId: string) {
        this.gettingFiles = this.getFiles();
    }

    private gettingFiles: Promise<any[]>;
    private fileList: any [] = [];
    private finished: boolean = false;

    private createListQuery(pageToken: string, folderId: string) {
        if (!pageToken) {
            pageToken = "";
        }
        return `https://www.googleapis.com/drive/v3/files?pageSize=1000&q=%27${folderId}%27+in+parents&key=${this.apiKey}&pageToken=${pageToken}`;
    }

    public get files(): Promise<any[]> {
        if (this.finished) {
            console.log("finished file");
            return new Promise<any[]>(() => this.fileList);
        }
        return this.gettingFiles;
    }

    public get driveResult(): Promise<driveResult> {
        return new Promise<driveResult>(async (resolve) => resolve({files: await this.files, apiKey: this.apiKey}));
    }

    private async getFiles(): Promise<any[]> {
        return new Promise<any[]>(async (resolve, reject) => {
            try {
                let nextPageToken = "";
                let previousToken = "";
                let iteration = 0;
                console.log("downloading list-" + this.apiKey);
                do {
                    previousToken = nextPageToken;
                    iteration = iteration + 1;
                    process.stdout.write(".");
                    const url = this.createListQuery(nextPageToken, this.folderId);
                    const x = await  XMLHttpRequest.get({url});
                    const doc = JSON.parse(x);
                    nextPageToken = doc.nextPageToken;
                    for (let z of doc.files) {
                        if (z) {
                            this.fileList.push(z);
                        }
                    }
                }
                while (nextPageToken !== undefined || nextPageToken === previousToken);
                console.log(`loaded!${this.fileList.length} from ${this.apiKey}`);
                this.finished = true;
                resolve(this.fileList);
            }
            catch (E) {
                console.trace(`Error in getFiles ${E}`);
                this.finished = true;
                reject(E);
            }
        });

    }
}