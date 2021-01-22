const url = require("url");
const fs = require("fs");
const path = require("path");

export default function serveStatic (publicPath) {

    return function staticMiddleware(req, res, next) {

        // parse URL
        const parsedUrl = url.parse(req.wapp.request.url);

        // extract URL path
        // Avoid https://en.wikipedia.org/wiki/Directory_traversal_attack
        // e.g curl --path-as-is http://localhost:9000/../fileInDanger.txt
        // by limiting the path to current directory only
        const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, "");
        const pathname = path.join(publicPath, sanitizePath);

        const paredSanitizePath = path.parse(pathname);
        const ext = paredSanitizePath.ext;

        if(!fs.existsSync(pathname) || !ext) {
            return next();
        }

        // read file from file system
        try {
            const data = fs.readFileSync(pathname);
            const stats = fs.statSync(pathname);
            res.wapp.response.status(200)

            res.wapp.response.sendData = {
                data,
                stats,
                parsedPath: paredSanitizePath
            }

            const stream = fs.createReadStream(pathname)

            stream.on("error", function onerror (err) {
                res.wapp.response.status(err.statusCode || 500, err);
                res.wapp.log(err, req, res);
                next(err)
            })

            stream.on("open", function onopen () {
                res.wapp.wappMiddleware.runSendMiddlewares(req, res, function next() {
                    res.wapp.log(req, res);
                    stream.pipe(res);
                })
            });

        } catch (err) {
            res.wapp.response.status(err.statusCode || 500, err)
            res.wapp.log(err, req, res);
            next(err)
        }

    };

}
