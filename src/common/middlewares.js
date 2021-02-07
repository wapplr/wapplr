import createLog from "./log";
import createStates from "./states";
import createRequests from "./requests";
import createRouter from "./router";
import createContents from "./contents";
import createStyles from "./styles";
import {defaultDescriptor, mergeProperties} from "./utils";

function createWappMiddleware(p = {}) {

    const {wapp} = p;

    function defaultAddHandle(obj) {
        if (typeof obj === "object" && !obj.length){
            Object.keys(obj).forEach(function (handleName) {
                const handle = obj[handleName];
                if (typeof handle == "function") {
                    wappMiddleware.handles[handleName] = handle
                }
            })
        }
    }

    function defaultWappMiddleware(req, res, next) {

        const globals = wapp.globals;
        const {DEV} = globals;
        const config = wapp.getTargetObject().config;
        const {containerElementId = "app", appStateName = "APP_STATE"} = config;

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

        if (wapp.target === "web" && container) {
            res.container = container;
        }

        const wappRequest = {};
        const wappResponse = {};

        wappRequest.timestamp = req.timestamp;
        wappRequest.path = req.path;
        wappRequest.url = req.url;
        wappRequest.method = req.method;
        wappRequest.httpVersion = req.httpVersion;
        wappRequest.hostname = (req.headers && req.headers.host) ? req.headers.host : (req.authority) ? req.authority : req.hostname;
        wappRequest.protocol = (wappRequest.httpVersion && wappRequest.httpVersion.startsWith("2")) ? "https" : req.protocol;
        wappRequest.secure = req.secure;
        wappRequest.remoteAddress = req.remoteAddress;
        wappRequest.userAgent = (req.headers && req.headers["user-agent"]) ? req.headers["user-agent"] : (typeof window !== "undefined" && window.navigator) ? window.navigator.userAgent : "";
        wappRequest.query = req.query;

        Object.defineProperty(wappRequest, "wapp", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: wapp
        })

        Object.defineProperty(wappRequest, "req", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: req
        })

        Object.defineProperty(wappRequest, "res", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: res
        })

        wappResponse.statusCode = res.statusCode;
        wappResponse.containerElementId = containerElementId;
        wappResponse.appStateName = appStateName;
        wappResponse.container = container;

        Object.defineProperty(wappResponse, "wapp", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: wapp
        })

        Object.defineProperty(wappResponse, "req", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: req
        })

        Object.defineProperty(wappResponse, "res", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: res
        })



        Object.defineProperty(req, "wapp", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: wapp
        })

        Object.defineProperty(req, "wappRequest", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: wappRequest
        })


        Object.defineProperty(res, "wapp", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: wapp
        })

        Object.defineProperty(res, "wappResponse", {
            ...defaultDescriptor,
            enumerable: false,
            writable: false,
            value: wappResponse
        })

        wappResponse.status = function status(...attributes) {

            if (!wappResponse.sended) {

                const http1 = (wappRequest.httpVersion === "1.1" || (wappRequest.httpVersion && Number(wappRequest.httpVersion.split(".")[0]) === 1))
                const tempStatusCode = wappResponse.statusCode;
                const tempStatusMessage = wappResponse.statusMessage;

                const statusCode = attributes[0];
                const error = attributes[1];
                const isError = !!(error && error.message && error.stack);

                wappResponse.statusCode = statusCode

                if (statusCode) {
                    if (statusCode === 200) {
                        wappResponse.statusMessage = (tempStatusCode === 200 && tempStatusMessage) ? tempStatusMessage : "OK";
                    }
                    if (statusCode === 304) {
                        wappResponse.statusMessage = (tempStatusCode === 304 && tempStatusMessage) ? tempStatusMessage : "Not modified";
                    }
                    if (statusCode === 404) {
                        wappResponse.statusMessage = (tempStatusCode === 404 && tempStatusMessage) ? tempStatusMessage : "Not found";
                    }
                    if (statusCode === 500) {
                        wappResponse.statusMessage = (isError && error.message) ? error.name + ": " + error.message : (tempStatusCode === 500 && tempStatusMessage) ? tempStatusMessage : "Error: Internal Server Error";
                    }
                    if (http1) {
                        res.statusMessage = wappResponse.statusMessage;
                    }
                }

                return res.status(...attributes);

            }

        }

        wappResponse.send = function send(...attributes) {
            if (!wappResponse.sended) {
                const [html, ...restAttr] = attributes;
                wappResponse.sendData = {
                    data: html
                }
                wappMiddleware.runSendMiddlewares(req, res, function next() {
                    const endHtml = wappResponse.sendData?.data || "";
                    res.send(...[endHtml, ...restAttr]);
                    wappResponse.sended = true;
                });
            }
        }

        Object.defineProperty(res, "_originalEndFunction", {
            enumerable: false,
            writable: false,
            configurable: false,
            value: res.end
        })

        res.end = function (...attributes) {
            res._originalEndFunction(...attributes);
            wappResponse.sended = true;
        }

        Object.defineProperty(res, "_originalStatusFunction", {
            enumerable: false,
            writable: false,
            configurable: false,
            value: res.status
        })

        res.status = function (...attributes) {
            if (!wappResponse.sended) {
                res._originalStatusFunction(...attributes);
            }
        }

        if (wapp.globals.DEV){
            wapp.wappResponse = wappResponse
            wapp.wappRequest = wappRequest
        }

        next()

    }

    function defaultHandle(req, res, out){

        const handles = Object.keys(wappMiddleware.handles).sort().map(function (key) {return wappMiddleware.handles[key]})

        let index = 0;

        function next(err) {

            if (handles[index]){
                const func = handles[index];
                index = index + 1;
                return func(req, res, (err) ? function(){next(err)} : next)
            } else if (typeof out === "function") {
                index = 0;
                return out(err);
            }

            return null;
        }

        return next();
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
        addHandle: {
            ...defaultDescriptor,
            value: defaultAddHandle
        },
        handles: {
            ...defaultDescriptor,
            value: {
                create: defaultWappMiddleware
            }
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

    Object.defineProperty(wapp, "middleware", {...defaultDescriptor, writable: false, value: wappMiddleware});

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
