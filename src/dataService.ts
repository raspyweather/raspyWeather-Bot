import {ImageCollection} from "./imageCollection";
import {get} from "./httpHandler";
import {firebaseConfig} from "./firebaseConfig";
import {FileDate} from "./FileDate";

export class DataService {

    constructor() {
        this.images = new ImageCollection();
    }
    private setLock(){
        console.log('dblocked');
        this.dbCallback = new Promise((res)=> this.releaseCall = res);
    }
    private releaseLock(){
        console.log('dbunlocked');
        this.dbCallback = this.noop;
        this.releaseCall();
    }
    private releaseCall:()=>void;
    private readonly noop = new Promise((resolve)=>resolve());
    public dbCallback:  Promise<any>= this.noop

    public async getImages():Promise<ImageCollection>{

        return await this.dbCallback.then(()=>this.images);
    }
    private images: ImageCollection;

    public async loadData() {
        try {
            this.setLock();
            const json = await get({url: firebaseConfig.url});
            const nextImages = new ImageCollection();
            const latestDate = this.images.getNewestDate() || new FileDate(2000, 11, 10, 10, 10);
            nextImages.setInitialData(JSON.parse(json));
            this.images = nextImages;
            this.releaseLock();
            return this.images.getDatesSince(latestDate);
        }
        catch (e) {
            console.log({'could not load next images': e});
            return [];
        }
    }
}
