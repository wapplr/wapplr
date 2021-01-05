import createLog from "./log";
import createStates from "./states";
import createRequests from "./requests";
import createRouter from "./router";
import createContents from "./contents";
import createStyles from "./styles";
import {defaultDescriptor, mergeProperties} from "./utils";

function createWappMiddleware(p = {}) {

    const {wapp} = p;

    function defaultHandle(req, res, next){

        const wapp = wappMiddleware.wapp;
        const globals = wapp.globals;
        const {DEV} = globals;
        const settings = wapp.getTargetObject().settings;
        const {containerElementId = "app", appStateName = "APP_STATE"} = settings;

        let container = null;
        if (typeof document !== "undefined"){
            container = (containerElementId && document.getElementById(containerElementId)) ? document.getElementById(containerElementId) : (res.container) ? res.container : document.body;
            if (DEV){
                window.wapp = wapp;
            }
        }

        // these properties are plus things, usually there are not in request or response
        // timestamp, remoteAddress, container (Html Element on the client side)

        if (!req.timestamp){
            req.timestamp = Date.now();
        }

        if (!req.remoteAddress) {
            req.remoteAddress = ((req.headers && req.headers['x-forwarded-for']) || '').split(',').pop().trim() || (req.socket && req.socket.remoteAddress) || "::1"
        }

        if (typeof document !== "undefined" && container) {
            res.container = container;
        }

        wapp.resetRequest();
        wapp.resetResponse();

        wapp.request.timestamp = req.timestamp;
        wapp.request.path = req.path;
        wapp.request.url = req.url;
        wapp.request.method = req.method;
        wapp.request.httpVersion = req.httpVersion;
        wapp.request.hostname = (req.headers && req.headers.host) ? req.headers.host : req.hostname;
        wapp.request.protocol = req.protocol;
        wapp.request.secure = req.secure;
        wapp.request.remoteAddress = req.remoteAddress;
        wapp.request.userAgent = (req.headers && req.headers["user-agent"]) ? req.headers["user-agent"] : (typeof window !== "undefined" && window.navigator) ? window.navigator.userAgent : ""
        wapp.request.req = req;
        wapp.request.res = res;

        wapp.response.statusCode = res.statusCode;
        wapp.response.containerElementId = containerElementId;
        wapp.response.appStateName = appStateName;
        wapp.response.container = container;
        wapp.response.req = req;
        wapp.response.res = res;

        req.wapp = wapp;
        res.wapp = wapp;

        if (res.status && !res._originalStatusFunction) {
            Object.defineProperty(res, "_originalStatusFunction", {...defaultDescriptor, writable: false, enumerable: false, value: res.status});
            res.status = function (...attributes) {

                const http1 = (req.httpVersion === "1.1" || (req.httpVersion && Number(req.httpVersion.split(".")[0]) === 1))
                const tempStatusCode = res.statusCode;
                let tempStatusMessage = wapp.response.statusMessage;
                if (http1) {
                   tempStatusMessage = res.statusMessage;
                }

                const statusCode = attributes[0];
                const error = attributes[1];
                const isError = !!(error && error.message && error.stack);
                wapp.response.statusCode = attributes[0];

                if (statusCode) {
                    if (statusCode === 200) {
                        wapp.response.statusMessage = (tempStatusCode === 200 && tempStatusMessage) ? tempStatusMessage : "OK";
                    }
                    if (statusCode === 304) {
                        wapp.response.statusMessage = (tempStatusCode === 304 && tempStatusMessage) ? tempStatusMessage : "Not modified";
                    }
                    if (statusCode === 404) {
                        wapp.response.statusMessage = (tempStatusCode === 404 && tempStatusMessage) ? tempStatusMessage : "Not found";
                    }
                    if (statusCode === 500) {
                        wapp.response.statusMessage = (isError && error.message) ? error.name + ": " + error.message : (tempStatusCode === 500 && tempStatusMessage) ? tempStatusMessage : "Error: Internal Server Error";
                    }
                    if (http1) {
                        res.statusMessage = wapp.response.statusMessage;
                    }
                }

                return res._originalStatusFunction(...attributes);
            }
        }

        if (res.send && !res._originalSendFunction) {
            Object.defineProperty(res, "_originalSendFunction", {...defaultDescriptor, writable: false, enumerable: false, value: res.send});
            res.send = function (...attributes) {
                if (!res.sendData) {
                    res.sendData = {};
                }
                if (!res.sendData.data && attributes[0]){
                    res.sendData.data = attributes[0]
                }
                wappMiddleware.runSendMiddlewares(req, res, function next() {
                    const html = (res.sendData && res.sendData.data) ? res.sendData.data : attributes[0];
                    return res._originalSendFunction(html)
                });
            }
        }

        next();

    }

    function defaultRunSendMiddlewares(req, res, out) {
        if (wappMiddleware.sendMiddlewares) {
            const sendMiddlewares = Object.keys(wappMiddleware.sendMiddlewares).map(function (key) {return wappMiddleware.sendMiddlewares[key]})
            let index = 0;
            function next() {
                if (sendMiddlewares[index]){
                    const func = sendMiddlewares[index];
                    index = index + 1;
                    return func(req, res, next)
                } else if (typeof out == "function"){
                    return out()
                }
                return null;
            }
            return next();
        } else if (typeof out == "function") {
            return out();
        }
        return null;
    }

    function defaultAddSendMiddleware(obj) {
        if (typeof obj === "object" && !obj.length){
            Object.keys(obj).forEach(function (handleName) {
                const handle = obj[handleName];
                if (typeof handle == "function") {
                    wappMiddleware.sendMiddlewares[handleName] = handle
                }
            })
        }
    }

    const wappMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        addSendMiddleware: {
            ...defaultDescriptor,
            value: defaultAddSendMiddleware,
        },
        runSendMiddlewares: {
            ...defaultDescriptor,
            value: defaultRunSendMiddlewares
        },
        sendMiddlewares: {
            ...defaultDescriptor,
            value: {}
        },
    })

    function wappMiddleware(req, res, next) {
        if (typeof wappMiddleware.handle === "function"){
            wappMiddleware.handle(req, res, next);
        }
        return wappMiddleware;
    }

    mergeProperties(wappMiddleware, wappMiddlewareProperties);

    Object.defineProperty(wappMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "wappMiddleware", {...defaultDescriptor, writable: false, value: wappMiddleware});

    return wappMiddleware

}

export default function createMiddlewares(p, step) {

    return {
        wapp: createWappMiddleware(p),
        router: createRouter(p),
        states: createStates(p),
        requests: createRequests(p),
        contents: createContents(p),
        styles: createStyles(p),
        log: createLog(p)
    }

}
