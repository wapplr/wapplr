import createWapp from "../common";
import createApp from './app';
import createHistory from './history';
import createMiddlewares from "./middlewares";
import createConfig from './config';

import {defaultDescriptor, mergeProperties} from "../common/utils";

export default function createClient(p = {}) {

    const wapp = p.wapp || createWapp(p);

    const {config} = createConfig(p)
    const clientConfig = config.client || {};

    const {disableUseDefaultMiddlewares = false, ...rest} = clientConfig;

    const defaultSettings = Object.create(Object.prototype, {
        disableUseDefaultMiddlewares: {
            ...defaultDescriptor,
            value: disableUseDefaultMiddlewares
        },
    })

    mergeProperties(defaultSettings, wapp.settings);
    mergeProperties(defaultSettings, rest);

    const app = createApp({wapp})
    const history = createHistory({wapp})

    function defaultListen () {
        wapplrClient.close();
        wapplrClient.history.listen(function ({action, location}) {
            wapplrClient.app({history: {action, location}});
        });
        wapplrClient.app({history: {action: "POP", location: history.location}});

        setTimeout(function () {

            const globals = wapp.globals;
            const { WAPP } = globals;

            const elem = document.getElementById("css_"+WAPP);
            if (elem) {
                elem.parentNode.removeChild(elem);
            }
        })

    }

    function defaultClose() {
        wapplrClient.history.close();
    }

    const defaultMiddlewares = createMiddlewares({wapp, ...p});

    const wapplrClient = Object.create(Object.prototype, {
        settings: {
            ...defaultDescriptor,
            writable: false,
            value: defaultSettings
        },
        listen: {
            ...defaultDescriptor,
            value: defaultListen
        },
        close: {
            ...defaultDescriptor,
            value: defaultClose
        },
        history: {
            ...defaultDescriptor,
            value: history
        },
        app: {
            ...defaultDescriptor,
            value: app
        },
        middlewares: {
            ...defaultDescriptor,
            value: defaultMiddlewares
        },
    });

    Object.defineProperty(wapplrClient, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});
    Object.defineProperty(wapp, "client", {...defaultDescriptor, value: wapplrClient});

    app.use(async function defaultMiddlewaresWrapper(req, res, out) {

        if (!wapplrClient.settings.disableUseDefaultMiddlewares){

            const middlewares = Object.keys(wapplrClient.middlewares).map(function (key) { return wapplrClient.middlewares[key] })
            let index = 0;

            async function next(err) {
                if (middlewares[index]){
                    const func = middlewares[index];
                    index = index + 1;
                    const defaultArgs = [req, res, (err) ? async function(){await next(err)} : next];
                    const args = (func.length === 4 && err) ? [err, ...defaultArgs] : defaultArgs;
                    try {
                        return await func(...args)
                    } catch (e) {
                        res.status(500, e);
                        return await next(e)
                    }
                } else if (typeof out === "function") {
                    index = 0;
                    return out(err);
                }
                return null;
            }

            return await next();

        }

        return await out();

    })

    return wapp;

}
