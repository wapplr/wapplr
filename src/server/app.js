import {mergeProperties, defaultDescriptor} from '../common/utils.js';
import serveStatic from "./static";

import {URL} from 'url';

export default function createApp(p = {}) {

    const {wapp} = p;

    const defaultConfig = Object.create(Object.prototype, {});

    const defaultMiddlewares = [
        function next(req, res, next) {
            if (next) {
                return next();
            }
            return null;
        }
    ];

    function defaultErrorHandler(err, req, res, next) {

        const {wapp} = app;
        const {log = function (){ return "" }} = wapp;

        res.status(500, err);

        const text = log(err, req, res);

        if (res.headersSent) {
            if (next) {
                return next(err)
            }
            return;
        }

        const config = wapp.server.config;
        const {siteName = "Wapplr"} = config;

        const renderedContent = wapp.log.renderedContent({
            title: err.message + " | " + siteName,
            text: text.split("\n")[0],
            toConsole: JSON.stringify(text.split("[500]")[0] + "[500] " + err.stack.replace("Error: ", ""))
        });

        res.send(renderedContent);

    }

    async function defaultHandle(req, res, out){

        const middlewares = app.middlewares;
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
            } else if (err) {
                index = 0;
                app.errorHandler(err, req, res, out);
            } else if (!res.headersSent) {
                index = 0;
                res.status(404);
                const requestMethod = req.method;
                const requestUrl = req.url;
                res.send(requestMethod + " " + requestUrl);
            }
            return null;
        }


        return await next();

    }

    function defaultUse(fn) {

        const fns = (typeof fn === "function") ? [fn] : (typeof fn === "object" && fn.length) ? fn : [];

        if (fns.length === 0) {
            throw new TypeError('app.use() requires a middleware function')
        }

        const middlewares = app.middlewares;

        fns.forEach(function (fn, i){
            middlewares.push(fn)
        });

        return this;
    }

    function defaultPost(path, fn) {
        function post(req, res, next) {
            if (req.method === "POST" && req.path === path){
                return fn(req, res, next)
            }
            next();
        }
        app.use(post);
        return this;
    }

    function defaultGet(path, fn) {
        function get(req, res, next) {
            if (req.method === "GET" && req.path === path){
                return fn(req, res, next)
            }
            next();
        }
        app.use(get);
        return this;
    }

    const appProperties = Object.create(Object.prototype, {
        config: {
            ...defaultDescriptor,
            writable: false,
            value: defaultConfig
        },
        middlewares: {
            ...defaultDescriptor,
            writable: false,
            value: defaultMiddlewares
        },
        errorHandler: {
            ...defaultDescriptor,
            value: defaultErrorHandler
        },
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        use: {
            ...defaultDescriptor,
            value: defaultUse
        },
        post: {
            ...defaultDescriptor,
            value: defaultPost
        },
        get: {
            ...defaultDescriptor,
            value: defaultGet
        },
        static: {
            ...defaultDescriptor,
            value: serveStatic
        }
    });

    async function app(req = {}, res = {}, next) {

        if (typeof app.handle === "function"){

            // these properties and functions what usually there are in req and res, but there is not in NodeJs default
            // req: path,
            // res: status, send, json

            // need some other properties, but those set in NodeJs default
            // req: url, hostname, protocol, secure, method, httpVersion,
            // res: statusCode, headersSent
            // and some function in res: end, setHeader

            const fullUrl = req.protocol + "://" + req.hostname + req.url;

            if (!req.path) {
                try {
                req.path = new URL(fullUrl).pathname;
                } catch (e) {}
            }

            if (!req.query){
                try {
                    req.query = Object.fromEntries(new URL(fullUrl).searchParams);
                } catch (e){}
            }

            if (!res.status) {
                res.status = function (sc) {
                    res.statusCode = sc;
                    return res;
                }
            }

            if (!res.send) {
                res.send = function (html) {
                    res.end(html);
                }
            }

            if (!res.json) {
                res.json = function (json) {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify(json))
                }
            }

            function defaultOut(err){
                if (err){
                    return app.errorHandler(err, req, res);
                }
                if (!res.headersSent) {
                    res.status(404);
                    const requestMethod = req.method;
                    const requestUrl = req.url;
                    return res.send(requestMethod + " " + requestUrl);
                }
                return null;
            }

            await app.handle(req, res, next || defaultOut);

        }

        return app;

    }

    mergeProperties(app, appProperties);

    Object.defineProperty(app, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return app;

}
