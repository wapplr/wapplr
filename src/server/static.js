const fs = require("fs");
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

function endStream(req, res, stream) {
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

function onFinished(req, res, callback) {

    function isFinishedResponse() {
        let socket = res.socket;
        if (typeof res.finished === "boolean") {
            return Boolean(res.finished || (socket && !socket.writable))
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
            console.log("remove listener", req.path);
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

export default function serveStatic (publicPath) {

    return function staticMiddleware(req, res, next) {

        let parsedUrl = {pathname: req.wappRequest.path};
        try {
            parsedUrl = new URL(req.wappRequest.url);
        } catch (e){}

        const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, "");
        const pathname = path.join(publicPath, sanitizePath);

        const paredSanitizePath = path.parse(pathname);
        const ext = paredSanitizePath.ext;

        if(!fs.existsSync(pathname) || !ext) {
            return next();
        }

        let stream;

        try {
            const data = fs.readFileSync(pathname);
            const stats = fs.statSync(pathname);
            res.wappResponse.status(200);

            res.wappResponse.sendData = {
                data,
                stats,
                parsedPath: paredSanitizePath
            };

            stream = fs.createReadStream(pathname);

            onFinished(req, res, ()=>{
                endStream(req, res, stream);
            });

            stream.on("close", function onopen () {
                endStream(req, res, stream);
            });

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
