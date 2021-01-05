import {mergeProperties, defaultDescriptor} from '../utils';

import wapplrLogo from '../logo';
import renderedContent from './renderedContent';
import template from "../template";

const style = require('./log.css');

export default function createLog({wapp}) {

    function defaultRender(p = {}) {

        const {wapp, parent = template, logo = wapplrLogo} = p;
        const {request, response, styles} = wapp;
        const {state} = response;
        const res = (state && state.res) ? state.res : response;
        const req = (state && state.req) ? state.req : request;
        const {remoteAddress, httpVersion, method, url, timestamp} = req;
        const {statusCode = 200, statusMessage = "", errorMessage = ""} = res;

        const text = p.text || `[LOG] [${timestamp} - ${remoteAddress}] HTTP:${httpVersion} ${method} ${url || "/"} -> [${statusCode}] ${errorMessage || statusMessage}`;

        styles.use(style);

        const renderedLog = `
            <div class="${style.log}">
                <div class="${style.logo}">
                    ${logo({wapp})}
                </div>
                <div>${text}</div>
            </div>`

        if (parent) {
            return parent({...p, children: renderedLog})
        }

        return renderedLog;

    }

    function defaultHandle(a, b, c, d){

        let error = null;
        let req = a;
        let res = b;
        let next = null;

        if (arguments.length === 3){
            if (typeof c === "function"){
                next = c;
            } else {
                error = a;
                req = b;
                res = c;
            }
        } else if (arguments.length === 4){
            error = a;
            req = b;
            res = c;
            next = d;
        }

        const { httpVersion, method, url } = req;
        const remoteAddress = req.remoteAddress || ((req.headers && req.headers['x-forwarded-for']) || '').split(',').pop().trim() || (req.socket && req.socket.remoteAddress) || "::1";
        const { statusCode = ""} = res;
        let statusMessage;

        const http1 = (req.httpVersion === "1.1" || (req.httpVersion && Number(req.httpVersion.split(".")[0]) === 1))

        if (http1) {
            statusMessage = res.statusMessage || "";
        } else {
            const response = res.wapp.response || {};
            const {state = {}} = response;
            const wapplrRes = state.res || response;
            statusMessage = wapplrRes.statusMessage || "";
        }

        const timestamp = req.timestamp || Date.now();

        const errorMessage = (error && error.stack) ? error.stack : (error && error.message) ? error.message : (typeof error == "string") ? error : "";

        const text = `[LOG] [${timestamp} - ${remoteAddress}] HTTP:${httpVersion} ${method} ${url || "/"} -> [${statusCode}] ${errorMessage || statusMessage}`

        if (res._consoledResponse !== text) {
            Object.defineProperty(res, "_consoledResponse", {...defaultDescriptor, enumerable: false, value: text });
            console.log(text);
        }

        if (next) {
            return next(error)
        }

        return text;
    }

    const logProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        render: {
            ...defaultDescriptor,
            value: defaultRender
        },
        renderedContent: {
            ...defaultDescriptor,
            value: renderedContent
        }
    })

    function logMiddleware(err, req, res, next) {
        if (typeof logMiddleware.handle === "function"){
            return logMiddleware.handle(...arguments);
        }
        return logMiddleware;
    }

    mergeProperties(logMiddleware, logProperties);

    Object.defineProperty(logMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "log", {...defaultDescriptor, value: logMiddleware});

    return logMiddleware;

}
