import {defaultDescriptor, mergeProperties} from "../common/utils";

export default function createApp(p = {}) {

    const {wapp} = p;

    const defaultConfig = Object.create(Object.prototype, {})

    const defaultMiddlewares = [
        function next(req, res, next) {
            if (next) {
                return next();
            }
            return null;
        }
    ]

    function defaultErrorHandler(err, req, res, next) {

        const {log = function (){ return "" }} = app.wapp;
        res.status(500)
        const text = log(err, req, res);

        if (res.headersSent) {
            if (next) {
                return next(err)
            }
            return;
        }

        const config = wapp.client.config;
        const {siteName = "Wapplr"} = config;

        const renderedContent = wapp.log.renderedContent({
            title: err.message + " | " + siteName,
            text: text.split("\n")[0],
            type: "content"
        })

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

        const fns = (typeof fn === "function") ? [fn] : (typeof fn === "object"&& fn.length) ? fn : [];

        if (fns.length === 0) {
            throw new TypeError('app.use() requires a middleware function')
        }

        const middlewares = app.middlewares;

        fns.forEach(function (fn, i){
            middlewares.push(fn)
        })

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
        }
    })

    async function app(req = {}, res = {}, next) {

        if (typeof app.handle === "function") {

            // these properties what usually there are in req and res
            // req: path, url, hostname, protocol, secure, method, httpVersion,
            // res: statusCode
            // and a functions in res: status, send, end

            const pathname = window.location.pathname || "/";
            const search = window.location.search;
            const hash = window.location.hash;
            const port = (window.location.port && !isNaN(Number(window.location.port))) ? Number(window.location.port) : window.location.port;

            req.path = req.path || window.location.pathname || "/";
            req.url = req.url || pathname + hash + search;
            req.hostname = req.hostname || (port) ? window.location.hostname + ":" + port : window.location.hostname;
            req.protocol = req.protocol || window.location.protocol.slice(0, window.location.protocol.length - 1);
            req.secure = req.secure || req.protocol === "https";
            req.method = req.method || "GET";
            req.httpVersion = req.httpVersion || "1.1";

            try {
                const fullUrl = req.protocol + "://" + req.hostname + req.url;
                req.query = Object.fromEntries(new URL(fullUrl).searchParams);
            } catch (e) {}

            res.statusCode = (res.statusCode) ? res.statusCode : 200;

            res.status = res.status || function (sc){
                res.statusCode = sc;
                return res;
            }

            res.send = res.send || function (html) {
                res.end(html);
            }

            res.end = res.end || function (html) {
                if (!res.headersSent) {
                    Object.defineProperty(res, "headersSent", {...defaultDescriptor, enumerable: false, writable: false, value: true})
                    res.container.innerHTML = html;
                    const scripts = res.container.getElementsByTagName("script");
                    for (let script of scripts) {
                        const parent = script.parentElement;
                        const innerHTML = script.innerHTML;
                        parent.removeChild(script);
                        const newScript = document.createElement('script');
                        newScript.type = "text/javascript";
                        newScript.innerHTML = innerHTML;
                        parent.append(newScript)
                    }
                } else {
                    //throw Error
                }
            }

            // res.container (Html element) property are plus thing, usually there is not in the response
            // but is necessary for end render

            res.container = res.container || document.body;

            const defaultOut = function (err) {
                if (err){
                    return app.errorHandler(err, req, res);
                }
                const requestMethod = req.method;
                const requestUrl = req.url;
                if (!res.headersSent) {
                    res.send(requestMethod + " " + requestUrl);
                }
            };

            await app.handle(req, res, next || defaultOut);

        }

        return app;

    }

    mergeProperties(app, appProperties);

    Object.defineProperty(app, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return app;

}
