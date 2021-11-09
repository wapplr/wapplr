const fs = require("fs");
const path = require("path");

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

        try {
            const data = fs.readFileSync(pathname);
            const stats = fs.statSync(pathname);
            res.wappResponse.status(200);

            res.wappResponse.sendData = {
                data,
                stats,
                parsedPath: paredSanitizePath
            };

            const stream = fs.createReadStream(pathname);

            stream.on("error", function onerror (err) {
                res.wappResponse.status(err.statusCode || 500, err);
                res.wapp.log(err, req, res);
                next(err)
            });

            stream.on("open", function onopen () {
                res.wapp.middleware.runSendMiddlewares(req, res, function next() {
                    res.wapp.log(req, res);
                    stream.pipe(res);
                })
            });

        } catch (err) {
            res.wappResponse.status(err.statusCode || 500, err);
            res.wapp.log(err, req, res);
            next(err)
        }

    };

}
