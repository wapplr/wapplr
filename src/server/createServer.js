import http from "http";
import http2 from "http2";

import createWapp from "../common";
import createApp from "./app.js";
import createMiddlewares from "./middlewares";
import createConfig from "./config";

import {mergeProperties, defaultDescriptor} from "../common/utils.js";

export default function createServer(p = {}) {

    const wapp = createWapp(p);

    const app = createApp({wapp});

    const {config} = createConfig(p)
    const serverConfig = config.server || {};

    const {port, portSSL, publicPath, assets = {}, credentials = {}, disableUseDefaultMiddlewares = false, ...rest} = serverConfig;

    const defaultAssets = Object.create(Object.prototype, {
        client: {
            ...defaultDescriptor,
            value: assets["client.js"]
        },
        vendors: {
            ...defaultDescriptor,
            value: assets["vendors.js"]
        },
        chunks: {
            ...defaultDescriptor,
            value: assets["chunks"]
        },
        getScripts: {
            ...defaultDescriptor,
            enumerable: false,
            value: function() {
                let chunks = [];
                if (assets && assets.chunks){
                    Object.keys(assets.chunks).forEach(function (key) {
                        assets.chunks[key].forEach(function (script) {
                            if (script.match(".js") && chunks.indexOf(script) === -1){
                                chunks.push(script);
                            }
                        })
                    })
                }

                let scripts = [...chunks];
                if (assets){
                    Object.keys(assets).forEach(function (key) {
                        if (key !== "chunks" && scripts.indexOf(assets[key]) === -1) {
                            if (assets[key].match(".js")) {
                                scripts.push(assets[key])
                            }
                        }
                    })
                }

                return scripts
            }
        }
    })

    const defaultCredentials = Object.create(Object.prototype, {
        key: {
            ...defaultDescriptor,
            value: credentials.key
        },
        cert: {
            ...defaultDescriptor,
            value: credentials.cert
        }
    })

    const defaultSettings = Object.create(Object.prototype, {
        port: {
            ...defaultDescriptor,
            value: port
        },
        portSSL: {
            ...defaultDescriptor,
            value: portSSL
        },
        publicPath: {
            ...defaultDescriptor,
            value: publicPath
        },
        assets: {
            ...defaultDescriptor,
            writable: false,
            value: defaultAssets
        },
        credentials: {
            ...defaultDescriptor,
            writable: false,
            value: defaultCredentials
        },
        disableUseDefaultMiddlewares: {
            ...defaultDescriptor,
            value: disableUseDefaultMiddlewares
        },
    })

    mergeProperties(defaultSettings, wapp.settings);
    mergeProperties(defaultSettings, rest);

    const defaultServers = Object.create(Object.prototype, {
        "80": {
            ...defaultDescriptor,
            value: http.createServer(app)
        }
    })

    function defaultListen() {

        const {port, portSSL, credentials} = wapplrServer.settings;
        const {key, cert} = credentials;

        let httpServer = (port) ? wapplrServer.servers[port] : null;
        let httpsServer = (portSSL) ? wapplrServer.servers[portSSL] : null;

        if (httpServer && httpServer.listening) {
            httpServer.close();
        }

        if (httpsServer && httpsServer.listening) {
            httpsServer.close();
        }

        const app = (typeof wapplrServer.app == "function") ? wapplrServer.app : createApp({wapp});

        if (port) {
            if (!httpServer){
                httpServer = http.createServer(app);
                wapplrServer.servers[port] = httpServer;
            }
            httpServer.listen(port, function () {
                console.log(`The server is running at http://localhost:${port}/`);
            });
        }

        if (key && cert && portSSL){
            if (!httpsServer){
                httpsServer = http2.createSecureServer({key, cert, allowHTTP1: true}, app);
                wapplrServer.servers[portSSL] = httpsServer;
            }

            httpsServer.listen(portSSL, function () {
                console.log(`The server is running at https://localhost:${portSSL}/ with HTTP2 protocol`);
            });
        }

    }

    function defaultClose(callback) {

        wapplrServer.app = null;

        const servers = wapplrServer.servers;
        const shouldClose = [];

        Object.keys(servers).forEach(function (port){
            const httpServer = servers[port];
            if (httpServer && httpServer.listening) {
                shouldClose.push(httpServer);
            }
        })

        let closed = 0;

        shouldClose.forEach(function (httpServer) {
            httpServer.close(function () {
                closed = closed + 1;
                servers[port] = null;
            });
        })

        function waiting() {
            if (shouldClose.length === closed) {
                clearInterval(int)
                if (callback) {
                    callback();
                }
            }
        }

        const int = setInterval(waiting,1)
        waiting();

    }

    const defaultMiddlewares = createMiddlewares({wapp, ...p});

    const wapplrServer = Object.create(Object.prototype, {
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
        app: {
            ...defaultDescriptor,
            value: app
        },
        servers: {
            ...defaultDescriptor,
            writable: false,
            value: defaultServers
        },
        middlewares: {
            ...defaultDescriptor,
            value: {...defaultMiddlewares}
        },
    });

    Object.defineProperty(wapplrServer, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});
    Object.defineProperty(wapp, "server", {...defaultDescriptor, value: wapplrServer});

    if (wapplrServer.settings.publicPath) {
        const {wapp, ...rest} = wapplrServer.middlewares;
        wapplrServer.middlewares = {
            wapp: wapplrServer.middlewares.wapp,
            "static": app.static(wapplrServer.settings.publicPath),
            ...rest
        }
    }

    app.use(async function defaultMiddlewaresWrapper(req, res, out) {

        if (!wapplrServer.settings.disableUseDefaultMiddlewares){

            const middlewares = Object.keys(wapplrServer.middlewares).map(function (key) { return wapplrServer.middlewares[key] })
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

    if (!process._addedUnhandledExceptions) {

        function wapplrUnhandledHandler(err) {
            console.log(err)
            wapplrServer.close(function () {
                process.exit(1);
            })
        }

        process.on('uncaughtException', wapplrUnhandledHandler);
        process.on('unhandledRejection', wapplrUnhandledHandler);

        Object.defineProperty(process, "_addedUnhandledExceptions", {...defaultDescriptor, writable: false, enumerable: false, value: wapplrUnhandledHandler});

    }

    return wapp;

}
