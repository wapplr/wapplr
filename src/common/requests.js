import {defaultDescriptor, mergeProperties} from "./utils";

function createDefaultRequestManager(p = {}) {

    const {wapp} = p;

    const defaultRequests = Object.create(Object.prototype, {})

    function defaultGetHTTPOptions(p = {}) {
        const {bodyJson = {}, options = {}} = p;
        return {
            method: 'post',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyJson),
            credentials: 'same-origin',
            ...options
        }
    }

    function defaultSetNewRequest(p = {}) {
        const {requestName} = p;
        if (requestName) {
            requestManager.requests[requestName] = requestManager.createRequest(p);
        }
    }

    function defaultCreateRequest(p = {}) {

        const {url} = p;

        if (url) {
            return {
                url: url,
                options: requestManager.getHTTPOptions(p)
            }
        }

        return requestManager.getHTTPOptions(p)
    }

    async function defaultSendRequest(p = {}) {

        const wapp = requestManager.wapp;

        let fetch = requestManager.fetch;
        if (!fetch && typeof window !== "undefined" && window.fetch){
            fetch = window.fetch;
        }

        const {requestName, req} = p;

        const request = (requestName && requestManager.requests[requestName]) ? requestManager.requests[requestName] : (p.request) ? p.request : null

        const {url, options = {}} = request;
        const {body, getBody} = options;

        let requestBody = (typeof getBody == "function") ? getBody({wapp, ...p}) : body;

        const cookie = (req && req.headers) ? req.headers.cookie : null;
        if (cookie) {
            options.headers.cookie = cookie;
        }

        let response = null;

        try {

            response = await fetch(url, {
                ...options,
                body: requestBody,
            });

            if (response && response.json){
                response = await response.json();
            }

            if (response && response.data) {
                response = response.data;
            }

            return response;

        } catch (e) {
            console.log(e)
        }

        return null;

    }

    const requestManager = Object.create(Object.prototype, {
        wapp: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: wapp
        },
        getHTTPOptions: {
            ...defaultDescriptor,
            value: defaultGetHTTPOptions
        },
        setNewRequest: {
            ...defaultDescriptor,
            value: defaultSetNewRequest
        },
        createRequest: {
            ...defaultDescriptor,
            value: defaultCreateRequest
        },
        sendRequest: {
            ...defaultDescriptor,
            value: defaultSendRequest
        },
        requests: {
            ...defaultDescriptor,
            writable: false,
            value: defaultRequests
        }
    })

    return requestManager;

}

export default function createRequests(p = {}) {

    const {wapp, requestManager = createDefaultRequestManager(p)} = p;

    function defaultHandle(req, res, next){
        next();
    }

    async function defaultSend(p) {
        const {res} = p;
        const response = await requestManager.sendRequest(p);
        if (res && res.wappResponse.store && response){
            res.wappResponse.store.dispatch(wapp.states.stateManager.actions.res({
                type: "INS_RES",
                name: "responses",
                value: response
            }));
            res.wappResponse.state = res.wappResponse.store.getState();
        }
        return response;
    }

    const requestsMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        send: {
            ...defaultDescriptor,
            value: defaultSend
        },
        requestManager: {
            ...defaultDescriptor,
            value: requestManager
        }
    })

    function requestsMiddleware(req, res, next) {
        if (typeof requestsMiddleware.handle === "function"){
            requestsMiddleware.handle(req, res, next);
        }
        return requestsMiddleware;
    }

    mergeProperties(requestsMiddleware, requestsMiddlewareProperties);

    Object.defineProperty(requestsMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "requests", {...defaultDescriptor, writable: false, value: requestsMiddleware});

    return requestsMiddleware

}
