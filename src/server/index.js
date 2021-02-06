import createServer from "./createServer";
import getConfig from './config';

// eslint-disable-next-line import/no-anonymous-default-export
export default function(p = {}) {
    return p.wapp || createServer({...getConfig(p), ...p})
}

export function createMiddleware(p = {}) {
    const wapp = p.wapp || createServer(p);
    return wapp.server.app;
}

export function run(p = {}) {

    const {env} = process;
    env.NODE_ENV = process.env.NODE_ENV;

    const wapp = createServer(p);
    const globals = wapp.globals;
    const {DEV} = globals;

    const app = wapp.server.app;
    wapp.server.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
        app.hot = module.hot;
        module.hot.accept("./index");
    }

    return wapp;
}

if (typeof RUN !== "undefined" && RUN === "wapplr") {
    run();
}
