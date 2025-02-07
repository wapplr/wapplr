const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("path");

function destroy(stream) {
    if (!stream?.__destroyed) {
        stream.destroy();
        stream.__destroyed = true;
        if (typeof stream.close === "function") {
            stream.on("open", function onOpenClose() {
                if (typeof this.fd === "number") {
                    this.close();
                }
            })
        }
    }
    return stream;
}

function onFinished(req, res, callback) {

    function isFinishedResponse() {
        let socket = res.socket;
        if (typeof res.finished === "boolean") {
            return Boolean(res.finished || res.writableEnded || (socket && !socket.writable))
        }
    }

    function isFinishedRequest() {
        let socket = req.socket;
        if (typeof req.complete === "boolean") {
            return Boolean(req.upgrade || !socket || !socket.readable || (req.complete && !req.readable))
        }
    }

    function removeListener() {
        if (req.__onFinishedInterval) {
            clearInterval(req.__onFinishedInterval);
            req.__onFinishedInterval = 0;
        }
        if (res.__onFinishedInterval) {
            clearInterval(res.__onFinishedInterval);
            res.__onFinishedInterval = 0;
        }
    }

    function listener() {
        const result = isFinishedRequest() || isFinishedResponse();
        if (result) {
            removeListener();
            callback();
        }
    }

    req.__onFinishedInterval = res.__onFinishedInterval = setInterval(listener, 100);
    req.__onFinishedRemoveListener = res.__onFinishedRemoveListener = removeListener;

}

export function endStream(req, res, stream) {
    if (req.__onFinishedRemoveListener){
        req.__onFinishedRemoveListener();
        req.__onFinishedRemoveListener = null;
    }
    if (res.__onFinishedRemoveListener){
        res.__onFinishedRemoveListener();
        res.__onFinishedRemoveListener = null;
    }
    destroy(stream);
}

export function addCloseEventsForReadableStream(req, res, stream) {

    req.on("close", ()=>{
        endStream(req, res, stream);
    });

    req.connection.on("close", ()=>{
        endStream(req, res, stream);
    });

    onFinished(req, res, ()=>{
        endStream(req, res, stream);
    });

    stream.on("close", function onclose () {
        endStream(req, res, stream);
    });

}

export default function serveStatic (publicPath) {

    return async function staticMiddleware(req, res, next) {

        let parsedUrl = {pathname: req.wappRequest.path};
        try {
            parsedUrl = new URL(req.wappRequest.url);
        } catch (e){}

        const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, "");
        const pathname = path.join(publicPath, sanitizePath);

        const parsedSanitizePath = path.parse(pathname);
        const ext = parsedSanitizePath.ext;

        if (!ext) {
            return await next();
        }

        try {
            await fs.access(pathname)
        } catch {
            return await next();
        }

        let stream;

        try {
            const data = await fs.readFile(pathname);
            const stats = await fs.stat(pathname);
            res.wappResponse.status(200);

            res.wappResponse.sendData = {
                data,
                stats,
                parsedPath: parsedSanitizePath
            };

            stream = fsSync.createReadStream(pathname);

            addCloseEventsForReadableStream(req, res, stream);

            stream.on("error", function onerror (err) {
                endStream(req, res, stream);
                res.wappResponse.status(err.statusCode || 500, err);
                res.wapp.log(err, req, res);
                next(err);
            });

            stream.on("open", function onopen () {
                res.wapp.middleware.runSendMiddlewares(req, res, function next() {
                    res.wapp.log(req, res);
                    stream.pipe(res);
                })
            });

        } catch (err) {
            endStream(req, res, stream);
            res.wappResponse.status(err.statusCode || 500, err);
            res.wapp.log(err, req, res);
            next(err)
        }

    };

}
