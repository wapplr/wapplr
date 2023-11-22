import http from "node:http";
import http2 from "node:http2";
import fs from "node:fs";
import path from "node:path";

import createWapp from "../common";
import createApp from "./app.js";
import createMiddlewares from "./middlewares";
import createConfig from "./config";

import {mergeProperties, defaultDescriptor} from "../common/utils.js";

export default function createServer(p = {}) {

    const wapp = createWapp(p);

    const app = createApp({wapp});

    const {config} = createConfig(p);
    const serverConfig = config.server || {};

    const {port, portSSL, publicPath, assets = {}, credentials = {}, disableUseDefaultMiddlewares = false, ...rest} = serverConfig;

    const defaultCssToInlineStyle = Object.create(Object.prototype, {
        loadCssToStyle: {
            ...defaultDescriptor,
            value: (a)=>{
                if (Array.isArray(a) && a.length) {

                    const intersection = a.filter(x => wapp.server.config.assets.cssToInlineStyle.css.includes(x));
                    if (intersection.length === a.length) {
                        return
                    }

                    function getThemeCss() {
                        let themeCss = [];
                        if (assets && assets.chunks) {
                            Object.keys(assets.chunks).forEach(function(key) {
                                if (key === 'client') {
                                    const files = assets.chunks[key].sort();
                                    files.forEach(function(style) {
                                        if (style && style.match(".css") && a.indexOf(style) > -1 && !(themeCss.indexOf(style) > -1)) {
                                            themeCss.push(style);
                                        }
                                    })
                                }
                            })
                        }
                        return themeCss;
                    }

                    const themeCss = getThemeCss();
                    let text = "";
                    const css = [];

                    themeCss.forEach((cssPath)=>{
                        if (fs.existsSync(path.join(publicPath, cssPath))) {
                            const cssContent = fs.readFileSync(path.join(publicPath, cssPath));
                            if (cssContent) {
                                text = [text, cssContent].filter((t)=>t).join(" ");
                                css.push(cssPath)
                            }
                        }
                    });

                    wapp.server.config.assets.cssToInlineStyle.text = text;
                    wapp.server.config.assets.cssToInlineStyle.css = css;

                }
            }
        },
        _getCss: {
            ...defaultDescriptor,
            value: ()=>{
                return wapp.server.config.assets.cssToInlineStyle.text || ""
            }
        },
        text: {
            ...defaultDescriptor,
            value: ''
        },
        css: {
            ...defaultDescriptor,
            value: []
        }
    });

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
                        if (key === 'client') {
                            assets.chunks[key].forEach(function(script) {
                                if (script && script.match(".js") && chunks.indexOf(script) === -1) {
                                    chunks.push(script);
                                }
                            })
                        }
                    })
                }

                let scripts = [...chunks];
                if (assets){
                    Object.keys(assets).forEach(function (key) {
                        if (key !== "chunks" && scripts.indexOf(assets[key]) === -1) {
                            if (assets[key] && assets[key].match(".js")) {
                                scripts.push(assets[key])
                            }
                        }
                    })
                }

                return scripts
            }
        },
        cssToInlineStyle: {
            ...defaultDescriptor,
            enumerable: false,
            value: defaultCssToInlineStyle
        },
        getCsStyles: {
            ...defaultDescriptor,
            enumerable: false,
            value: function () {
                let chunks = [];
                if (assets && assets.chunks) {
                    Object.keys(assets.chunks).forEach(function(key) {
                        if (key === 'client') {
                            const files = assets.chunks[key].sort();
                            files.forEach(function(style) {
                                if (style && style.match(".css") && chunks.indexOf(style) === -1 && !(wapp.server.config.assets.cssToInlineStyle.css?.indexOf(style) > -1)) {
                                    chunks.push(style);
                                }
                            })
                        }
                    })
                }

                let styles = [...chunks];
                if (assets) {
                    Object.keys(assets).forEach(function(key) {
                        if (key !== "chunks" && styles.indexOf(assets[key]) === -1) {
                            if (assets[key] && assets[key].match(".css") && !(wapp.server.config.assets.cssToInlineStyle.css?.indexOf(assets[key]) > -1)) {
                                styles.push(assets[key])
                            }
                        }
                    })
                }

                return styles
            }
        },
    });

    const defaultCredentials = Object.create(Object.prototype, {
        key: {
            ...defaultDescriptor,
            value: credentials.key
        },
        cert: {
            ...defaultDescriptor,
            value: credentials.cert
        }
    });

    const defaultConfig = Object.create(Object.prototype, {
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
    });

    mergeProperties(defaultConfig, wapp.config);
    mergeProperties(defaultConfig, rest);

    const defaultServers = Object.create(Object.prototype, {
        "80": {
            ...defaultDescriptor,
            value: http.createServer(app)
        }
    });

    function defaultListen() {

        const {port, portSSL, credentials} = wapplrServer.config;
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

            httpServer.__sockets = new Set();

            httpServer.on("connection", socket => {
                httpServer.__sockets.add(socket);
                socket.on("close", () => {
                    httpServer.__sockets.delete(socket);
                });
            });

            httpServer.__destroySockets = function() {
                const sockets = httpServer.__sockets;
                for (const socket of sockets.values()) {
                    socket.destroy();
                }
            };

        }

        if (key && cert && portSSL){
            if (!httpsServer){
                httpsServer = http2.createSecureServer({key, cert, allowHTTP1: true}, app);
                wapplrServer.servers[portSSL] = httpsServer;
            }

            httpsServer.listen(portSSL, function () {
                console.log(`The server is running at https://localhost:${portSSL}/ with HTTP2 protocol`);
            });

            httpsServer.__sockets = new Set();

            httpsServer.on("connection", socket => {
                httpsServer.__sockets.add(socket);
                socket.on("close", () => {
                    httpsServer.__sockets.delete(socket);
                });
            });

            httpsServer.__destroySockets = function() {
                const sockets = httpsServer.__sockets;
                for (const socket of sockets.values()) {
                    socket.destroy();
                }
            };
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
        });

        let closed = 0;

        shouldClose.forEach(function (httpServer) {
            httpServer.__destroySockets();
            httpServer.close(function () {
                closed = closed + 1;
                servers[port] = null;
            });
        });

        function waiting() {
            if (shouldClose.length === closed) {
                clearInterval(int);
                if (callback) {
                    callback();
                }
            }
        }

        const int = setInterval(waiting,1);
        waiting();

    }

    const defaultMiddlewares = createMiddlewares({wapp, ...p});

    const wapplrServer = Object.create(Object.prototype, {
        config: {
            ...defaultDescriptor,
            writable: false,
            value: defaultConfig
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

    if (wapplrServer.config.publicPath) {
        const {wapp, ...rest} = wapplrServer.middlewares;
        wapplrServer.middlewares = {
            wapp: wapplrServer.middlewares.wapp,
            "static": app.static(wapplrServer.config.publicPath),
            ...rest
        }
    }

    app.use(async function defaultMiddlewaresWrapper(req, res, out) {

        if (!wapplrServer.config.disableUseDefaultMiddlewares){

            const middlewares = Object.keys(wapplrServer.middlewares).map(function (key) { return wapplrServer.middlewares[key] });
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
                        res.wappResponse.status(500, e);
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

    });

    if (!process._addedUnhandledExceptions) {

        function wapplrUnhandledHandler(err) {
            console.log(err);
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
