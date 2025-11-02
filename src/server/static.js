import { promises as fs } from "node:fs";
import { createReadStream } from "node:fs";
import path from "node:path";

export function endStream(req, res, stream) {
    if (!stream) {
        return;
    }

    if (stream.__destroyed) {
        return;
    }

    stream.__destroyed = true;

    const cleanup = stream.__cleanup;
    if (cleanup) {
        try {
            req?.off?.("aborted", cleanup);
            req?.off?.("close", cleanup);
            res?.off?.("close", cleanup);
            stream?.off?.("error", cleanup);
            stream?.off?.("close", cleanup);
        } catch {}
        stream.__cleanup = null;
    }

    try {
        stream.destroy?.();
    } catch {}

    try {
        if (typeof stream.close === "function") {
            stream.once?.("open", function onOpenClose() {
                if (typeof this.fd === "number") {
                    this.close();
                }
            });
        }
    } catch {}
}

export function addCloseEventsForReadableStream(req, res, stream) {
    if (!req || !res || !stream) {
        return;
    }

    let finished = false;
    const cleanup = (err) => {
        if (finished) {
            return;
        }
        finished = true;
        try {
            stream.destroy?.(err);
        } catch {}
    };

    stream.__cleanup = cleanup;

    req.on?.("aborted", cleanup);
    req.on?.("close", cleanup);
    res.on?.("close", cleanup);
    stream.on?.("error", cleanup);
    stream.on?.("close", cleanup);
}

function safeJoin(root, reqPathname) {
    let decoded;
    try {
        decoded = decodeURIComponent(reqPathname || "/");
    } catch {
        return null;
    }

    if (decoded.includes("\0")) {
        return null;
    }

    const absRoot = path.resolve(root);
    const absPath = path.resolve(absRoot, "." + decoded);
    const rel = path.relative(absRoot, absPath);

    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        return null;
    }

    return absPath;
}

export default function serveStatic(publicPath, opts = {}) {
    const root = path.resolve(publicPath);
    const { allowDotfiles = false } = opts;

    return async function staticMiddleware(req, res, next) {
        const method = (req.wappRequest.method || req.method || "GET").toUpperCase();
        if (method !== "GET" && method !== "HEAD") {
            return await next();
        }

        let urlObj;
        try {
            urlObj = new URL(req.wappRequest.url || req.url, "http://localhost");
        } catch {
            return await next();
        }

        const joined = safeJoin(root, urlObj.pathname);
        if (!joined) {
            return await next();
        }

        const parsed = path.parse(joined);
        if (!parsed.ext) {
            return await next();
        }

        if (!allowDotfiles && parsed.base.startsWith(".")) {
            return await next();
        }

        let stats;
        try {
            stats = await fs.stat(joined);
            if (!stats.isFile()) {
                return await next();
            }
        } catch (err) {
            if (err?.code === "ENOENT") {
                return await next();
            }
            res.wappResponse.status(500, err);
            res.wapp.log(err, req, res);
            return await next(err);
        }

        const size = stats.size;
        let start = 0;
        let end = size > 0 ? size - 1 : 0;
        let statusCode = 200;
        const range = req.headers?.range;

        if (range && /^bytes=/.test(range)) {
            const m = /bytes=(\d*)-(\d*)/.exec(range);
            if (m) {
                const hasStart = m[1] !== "";
                const hasEnd = m[2] !== "";

                if (hasStart) {
                    start = parseInt(m[1], 10);
                }
                if (hasEnd) {
                    end = parseInt(m[2], 10);
                }

                if (!hasStart && hasEnd) {
                    const suffixLength = end;
                    if (Number.isFinite(suffixLength)) {
                        if (suffixLength > size) {
                            start = 0;
                        } else {
                            start = size - suffixLength;
                        }
                        end = size > 0 ? size - 1 : 0;
                    }
                }

                if (hasStart && !hasEnd) {
                    end = size > 0 ? size - 1 : 0;
                }

                if (
                    Number.isNaN(start) ||
                    Number.isNaN(end) ||
                    start > end ||
                    start < 0 ||
                    end >= size
                ) {
                    res.setHeader?.("Content-Range", `bytes */${size}`);
                    res.wappResponse.status(416);
                    res.wappResponse.sendData = { stats, parsedPath: parsed, dontSetContentLength: true };
                    return res.wapp.middleware.runSendMiddlewares(req, res, () => {
                        res.end();
                    });
                }

                statusCode = 206;
            }
        }

        const contentLength = statusCode === 206 ? end - start + 1 : size;

        res.wappResponse.status(statusCode);
        res.wappResponse.sendData = { stats, parsedPath: parsed, dontSetContentLength: true };

        if (statusCode === 206) {
            res.setHeader?.("Content-Range", `bytes ${start}-${end}/${size}`);
        }

        res.setHeader?.("Accept-Ranges", "bytes");
        res.setHeader?.("Content-Length", String(contentLength));

        const runSend = () =>
            new Promise((resolve) => {
                if (res.wapp?.middleware?.runSendMiddlewares) {
                    res.wapp.middleware.runSendMiddlewares(req, res, () => resolve());
                } else {
                    resolve();
                }
            });

        try {
            await runSend();

            if (res.writableEnded) {
                return;
            }

            if (method === "HEAD") {
                res.end();
                return;
            }

            const stream =
                statusCode === 206
                    ? createReadStream(joined, { start, end })
                    : createReadStream(joined);

            addCloseEventsForReadableStream(req, res, stream);

            stream.on("error", (err) => {
                endStream(req, res, stream);
                res.wapp?.log?.(err, req, res);
                if (!res.headersSent) {
                    res.wappResponse.status(err.statusCode || 500, err);
                }
                if (!res.writableEnded) {
                    try {
                        res.end();
                    } catch {}
                }
                if (typeof next === "function") {
                    next(err);
                }
            });

            if (res.writableEnded) {
                endStream(req, res, stream);
                return;
            }

            res.wapp.log(req, res);

            stream.pipe(res);

        } catch (err) {
            res.wapp.log(err, req, res);
            if (!res.writableEnded) {
                res.wappResponse.status(err.statusCode || 500, err);
                res.end();
            }
            if (typeof next === "function") {
                await next(err);
            }
        }
    };
}
