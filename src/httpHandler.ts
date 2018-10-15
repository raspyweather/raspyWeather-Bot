const httpRequest = require('xmlhttprequest').XMLHttpRequest;

export async function get(obj: { url: string, headers?: any, body?: string }): Promise<any> {
    return handleRequest({...obj, method: "GET"});
}

export async function post(obj: { url: string, headers?: any, body?: string }): Promise<any> {
    console.log({...obj, method: "POST"});
    return handleRequest({...obj, method: "POST"});
}

export async function put(obj: { url: string, headers?: any, body?: string }): Promise<any> {
    return handleRequest({...obj, method: "PUT"});
}

async function handleRequest(obj: { method: string, url: string, headers?: any, body?: string }): Promise<any> {
    return new Promise((resolve, reject) => {
        try {
            const xhr = new httpRequest();
            xhr.open(obj.method, obj.url);
            if (obj.headers) {
                Object.keys(obj.headers).forEach(key => xhr.setRequestHeader(key, obj.headers[key]));
            }
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.responseText);
                } else {
                    reject(xhr.responseText + xhr.statusText);
                }
            };
            xhr.onerror = (err: any) => {
                console.error(`Can't ${obj.method} ${obj} because of ${err}`);
                reject(xhr.statusText);
            };
            xhr.send(obj.body);
        }
        catch (E) {
            reject(E);
        }
    });
}