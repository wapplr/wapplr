import {mergeProperties, defaultDescriptor} from "../common/utils"
import commonMiddlewares from "../common/middlewares";
import html from './html';

export const mimeType = {
    ".ico": "image/x-icon",
    ".html": "text/html",
    ".js": "application/javascript",
    ".json": "application/json",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".mpg": "video/mpeg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".doc": "application/msword",
    ".eot": "application/vnd.ms-fontobject",
    ".ttf": "application/x-font-ttf",
    ".xml": "application/xml"
};

export function createRenderMiddleware(p = {}) {

    const {wapp} = p;

    function defaultRenderHandle(req, res, next){

        const wappResponse = res.wappResponse;

        if (wappResponse.content && !wappResponse.content.renderType) {

            res.wappResponse.status(wappResponse.statusCode || 200);
            const render = wapp.contents.getComponent("html");
            res.wappResponse.send(render({wapp, req, res}).replace(/>\s+</g, "><"));

            next();

        } else {
            next();
        }
    }

    function defaultHandle(req, res, out){

        if (!wapp.contents.getComponent("html")) {
            wapp.contents.addComponent({
                html: defaultRender
            })
        }

        const renderMiddlewares = Object.keys(renderMiddleware.handles).map(function (key) {return renderMiddleware.handles[key]});
        renderMiddlewares.sort();

        let index = 0;

        function next(err) {

            if (renderMiddlewares[index]){
                const func = renderMiddlewares[index];
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

    const defaultRender = html;

    function defaultAddHandle(obj) {
        if (typeof obj === "object" && !obj.length){
            Object.keys(obj).forEach(function (handleName) {
                const handle = obj[handleName];
                if (typeof handle == "function") {
                    renderMiddleware.handles[handleName] = handle
                }
            })
        }
    }

    const renderMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        handles: {
            ...defaultDescriptor,
            value: {
                render: defaultRenderHandle
            }
        },
        render: {
            ...defaultDescriptor,
            value: defaultRender
        },
        addHandle: {
            ...defaultDescriptor,
            value: defaultAddHandle
        },
    });

    function renderMiddleware(req, res, next) {
        if (typeof renderMiddleware.handle === "function"){
            renderMiddleware.handle(req, res, next);
        }
        return renderMiddleware;
    }

    mergeProperties(renderMiddleware, renderMiddlewareProperties);

    Object.defineProperty(renderMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return renderMiddleware;

}

export function createNotModifiedMiddleware(p = {}) {

    const {wapp} = p;

    function defaultIsFromCache(req, res) {

        const ifMatch = req.headers["if-match"];
        const ifUnmodifiedSince = req.headers["if-unmodified-since"];
        const ifNoneMatch = req.headers["if-none-match"];
        const ifModifiedSince = req.headers["if-modified-since"];
        const cacheControl = req.headers["cache-control"];
        const etag = res.getHeader("etag");
        const lastModified = res.getHeader("last-modified");

        const conditionalGet = ifMatch || ifUnmodifiedSince || ifNoneMatch || ifModifiedSince;
        const isCacheable = ((res.wappResponse.statusCode >= 200 && res.wappResponse.statusCode < 300) || res.wappResponse.statusCode === 304);
        const noCache = (cacheControl && /(?:^|,)\s*?no-cache\s*?(?:,|$)/.test(cacheControl));
        const unconditional = (!ifUnmodifiedSince && !ifNoneMatch);

        if (unconditional || noCache || !isCacheable || !conditionalGet) {
            return false;
        }

        let fromCache = false;

        if (ifNoneMatch && ifNoneMatch !== "*" && etag) {

            function parseTokenList(str) {
                let end = 0;
                const list = [];
                let start = 0;

                for (let i = 0, len = str.length; i < len; i++) {
                    switch (str.charCodeAt(i)) {
                        case 0x20: /*   */
                            if (start === end) {
                                start = end = i + 1
                            }
                            break;
                        case 0x2c: /* , */
                            list.push(str.substring(start, end));
                            start = end = i + 1;
                            break;
                        default:
                            end = i + 1;
                            break
                    }
                }

                list.push(str.substring(start, end));

                return list

            }

            const matches = parseTokenList(ifNoneMatch);

            for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                if (match === etag || match === "W/" + etag || "W/" + match === etag) {
                    fromCache = true;
                    break
                }
            }

        }

        if (ifModifiedSince && lastModified) {

            function parseHttpDate (date) {
                const timestamp = date && Date.parse(date);
                return typeof timestamp === 'number' ? timestamp : NaN
            }

            if (parseHttpDate(lastModified) <= parseHttpDate(ifModifiedSince)) {
                fromCache = true;
            }
        }

        return fromCache;

    }

    function defaultHandle(req, res, next){

        const fromCache = notModifiedMiddleware.isFromCache(req, res);

        if (fromCache) {
            res.wappResponse.status(304);
            res.wapp.log(req, res);
            res.end()
        } else {
            return next();
        }

    }

    const notModifiedMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        isFromCache: {
            ...defaultDescriptor,
            value: defaultIsFromCache
        }
    });

    function notModifiedMiddleware(req, res, next) {
        if (typeof notModifiedMiddleware.handle === "function"){
            notModifiedMiddleware.handle(req, res, next);
        }
        return notModifiedMiddleware;
    }

    mergeProperties(notModifiedMiddleware, notModifiedMiddlewareProperties);

    Object.defineProperty(notModifiedMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return notModifiedMiddleware;

}

export default function createMiddlewares(p) {
    const {log, ...rest} = commonMiddlewares(p);

    const {wapp} = p;
    const wappMiddleware = wapp.middleware;
    const notModifiedMiddleware = createNotModifiedMiddleware(p);

    wappMiddleware.addSendMiddleware({
        headers: function (req, res, next) {
            const {sendData = {}} = res.wappResponse;
            if (res.setHeader) {
                const {data, stats = {}, parsedPath = {}, dontSetContentLength} = sendData;
                let html = data;
                const {ext = ".html"} = parsedPath;
                const charSet = sendData.charSet ? sendData.charSet : ext === '.html' ? 'utf-8' : '';
                const {mtime} = stats;

                if (!res.getHeader("Accept-Ranges")) {
                    res.setHeader("Accept-Ranges", "bytes")
                }
                if (!res.getHeader("Content-Type")) {
                    res.setHeader(
                        "Content-Type",
                        [
                            mimeType[ext] || "text/plain",
                            charSet ? 'charset='+charSet : ''
                        ].filter((t)=>t).join('; ')
                    );
                }
                if (!res.getHeader("Content-Length") && !dontSetContentLength) {
                    res.setHeader("Content-Length", Buffer.byteLength(html));
                }
                if (!res.getHeader("Last-Modified") && mtime) {
                    res.setHeader("Last-Modified", mtime.toUTCString());
                }
                if (!res.getHeader("Cache-Control")) {
                    res.setHeader("Cache-Control", "public, max-age=0");
                }
                if (!res.getHeader("X-Powered-By")) {
                    res.setHeader("X-Powered-By", "Wapplr");
                }
            }
            return next();
        },
        etag: function (req, res, next) {
            const {sendData = {}} = res.wappResponse;
            if (res.setHeader) {
                const {stats = {}} = sendData;
                const {mtime, size} = stats;
                if (!res.getHeader("ETag") && mtime && size){
                    const etag = `W/"${size.toString(16)}-${mtime.getTime().toString(16)}"`;
                    res.setHeader("ETag", etag)
                }
            }
            return next();
        },
        notModified: function (req, res, next) {
            if (res.setHeader) {
                const fromCache = notModifiedMiddleware.isFromCache(req, res);
                if (fromCache) {
                    res.wappResponse.status(304);
                    res.wapp.log(req, res);
                    res.end();
                    return;
                }
            }
            return next();
        }
    });

    return {
        ...rest,
        render: createRenderMiddleware(p),
        log
    }
}

