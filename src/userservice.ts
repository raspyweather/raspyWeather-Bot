import Datastore = require('nedb');

export interface User {
    userId: number;
    preferedModes: string[];
    autoSend: boolean;
    showDetails:boolean;
}
// # TODO embed neDB
// # TODO check db loss failover

export class UserService {

    private unlock: () => void;
    private lock: Promise<any>;
    private dataStore: any;
    static create() {
        const service = new UserService();
        return service;
    }
    constructor() {
        this.createLock();
        this.dataStore = new Datastore({
            autoload: true,
            onload: (err) => {
                console.log({ 'loaded:': err });
                this.releaseLock();
            }
        });
        this.dataStore.loadDatabase()
    }
    private releaseLock() {
        console.log('userdb unlocked');
        this.unlock();
    }
    private createLock() {
        console.log('userdb locked');
        this.unlock = () => { throw new Error('should not happen'); };
        this.lock = new Promise((resolve) => {
            this.unlock = () => resolve();
        });
        return this.unlock;
    }
    private async  createUserInDB(user: User): Promise<User> {
        return this.lock.then(() => new Promise<User>((resolve, reject) => this.dataStore.insert(user,
            (err: Error) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(user);
            })));
    }
    private async  readUserFromDB(userId: number): Promise<User> {
        return this.lock.then(() => new Promise<User>((resolve, reject) => this.dataStore.findOne({ "userId": userId },
            (err: Error, data: User) => {
                console.log({ err, data });
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            })));
    }
    private async updateUserInDB(user: User) {
        return this.lock.then(() => new Promise((resolve, reject) => this.dataStore.update({ "userId": user.userId }, user, {},
            (err: Error, numReplaced: any) => {
                console.log({ err, numReplaced });
                if (err) {
                    reject(err);
                    return;
                }
                resolve(numReplaced);
            })));
    }
    public async  getUser(userId: number): Promise<User> {
        let user: User = await this.readUserFromDB(userId);
        if (user === undefined || user === null) {
            user = await this.createUserInDB({ userId,showDetails:false, preferedModes: ['msa', 'therm'], autoSend: true });
        }
        if (!Array.isArray(user.preferedModes)) {
            user.preferedModes = ['msa', 'therm'];
        }
        console.log(user);
        return user;
    }
    public async  updateUser(changedUser: User): Promise<void> {
        await this.updateUserInDB(changedUser);;
    }
}
