
export interface User {
    userId: number;
    preferedModes: string[];
    autoSend: boolean;
}
export class UserService {
    constructor() {

        this.dataStore = new DataStore({
            autoload: true,
            onload: () => this.createLock(),
            beforeSerialization: () => this.createLock(),
            afterSerialization: () => this.unlock(),
            beforeDeserialization: () => this.createLock(),
            afterDeserialization: () => this.unlock()
        });
    }
    private createLock() {
        this.unlock = () => { throw new Error('should not happen'); };
        this.lock = new Promise((resolve) => {
            this.unlock = () => resolve();
        });
        return this.unlock;
    }
    private unlock: () => void;
    private lock: Promise<any>;
    private dataStore: any;
    private users: User[];
    getUser(userId: number): Promise<User> {
        const user = this.lock.then((() => <User>(this.users.filter(user => user.userId === userId)[0]) ||
            new Promise((resolve) => resolve(<User>{
                preferedModes: ['msa', 'therm'],
                userId,
                autoSend: true
            }))));
        return user.then(userObj => {
            if (!Array.isArray(userObj.preferedModes)) {
                userObj.preferedModes = ['msa', 'therm'];
            }
            return userObj;
        })
    }
    updateUser(changedUser: User): Promise<void> {
        return this.lock.then(() => {
            const idx = this.users.findIndex(user => user.userId === changedUser.userId);
            this.users[idx] = changedUser;
        });
    }
}
