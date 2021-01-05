import createClient from "./createClient";
import getConfig from './config';

// eslint-disable-next-line import/no-anonymous-default-export
export default function (p = {}) {
    return p.wapp || createClient({...getConfig(p), ...p})
};

export function createMiddleware(p = {}) {
    const wapp = p.wapp || createClient(p);
    return wapp.client.app;
}

export function run(p = {}) {
    const wapp = createClient(p);
    const globals = wapp.globals;
    const {DEV} = globals;
    wapp.client.listen();
    if (typeof DEV !== "undefined" && DEV && module.hot){
        module.hot.accept();
    }
    return wapp;
}

if (typeof RUN !== "undefined" && RUN === "wapplr") {
    run();
}
