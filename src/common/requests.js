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

        if (typeof p == "string") {
            p = {requestName: p};
        }
        const {requestName} = p;

        const request = (requestName && requestManager.requests[requestName]) ? requestManager.requests[requestName] : (p.request) ? p.request : null

        const {url, options = {}} = request;
        const {req = {}} = wapp.response;
        const {body, getBody} = options;

        let requestBody = (typeof getBody == "function") ? getBody({wapp, ...p}) : body;

        if (typeof requestBody == "string" && requestBody.replace) {
            requestBody = requestBody.replace(/\n/g, " ");
            requestBody = requestBody.replace(/\\n/g, " ");
            requestBody = requestBody.replace(/  +/g, ' ');
            requestBody = requestBody.replace(/":" /g, '":"');
        }

        const cookie = (req.headers) ? req.headers.cookie : null;
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

        if (wapp.response.store){

            const target = wapp.getTargetObject();

            const globalGraphqlConfig = (target.settings && target.settings.graphqlConfig) ? target.settings.graphqlConfig : {};
            const config = (p.config) ? {...globalGraphqlConfig, ...p.config} : {...globalGraphqlConfig};

            const {
                graphqlRoute = "/graphql",
            } = config;

            const state = wapp.response.store.getState();
            const {res = {}} = state;
            const {requests = {}} = res;

            function getFieldsNameFromProperties(properties = {}) {
                let t = "";
                Object.keys(properties).forEach(function (propertyName) {
                    if (typeof properties[propertyName] == "object" && properties[propertyName].properties){
                        const innerPropertiesText = getFieldsNameFromProperties(properties[propertyName].properties) || "_id";
                        t = (t) ? t + " " + propertyName + " { "+ innerPropertiesText+" }" : propertyName + " { "+innerPropertiesText+" }"
                    } else {
                        t = (t) ? t + " " + propertyName : propertyName;
                    }
                })
                return t;
            }

            function getValueString(input) {
                let t = "";
                if (typeof input == "object"){
                    t = "{ "
                    Object.keys(input).forEach(function (key, i){
                        const sep = (i) ? ", " : "";
                        const valueString = getValueString(input[key])
                        t = t + sep + key + ": " + valueString;
                    })
                    t = t + " }"
                } else {
                    if (typeof input == "string") {
                        t = '"' + input.toString() + '"'
                    } else {
                        t = input.toString()
                    }
                }
                return t;
            }

            function getArgs(args = {}, p = {}) {
                let t = "";
                Object.keys(args).forEach(function (key) {
                    if (p.args && typeof p.args[key] !== "undefined"){
                        const valueString = getValueString(p.args[key])
                        t = (t) ? t + ' ' + key + ': ' + valueString + '' : key + ': ' + valueString + ''
                    }
                })
                return t;
            }

            Object.keys(requests).forEach(function (requestName) {

                const requestData = requests[requestName];
                const schema = requestData.schema;

                const url = graphqlRoute;
                const options = {
                    getBody: function getBody(p = {}){
                        let fields = getFieldsNameFromProperties(schema.properties);
                        const args = getArgs(requestData.args, p)
                        const kind = (requestData.kind === "mutation") ? "mutation" : "query";
                        const isDefaultResolver = !!(requestData.args && requestData.args.record);
                        if (isDefaultResolver) {
                            fields = " record { " + fields + " } "
                        }
                        return JSON.stringify({
                            query: (args) ? kind + " { " + requestName + " ( "+args+" ) { "+fields+" } }" : kind + " { " + requestName + " { "+fields+" } }"
                        })
                    }
                }

                requestManager.setNewRequest({requestName, url, options})

            })

        }

        next();
    }

    async function defaultSend(p) {
        const response = await requestManager.sendRequest(p);
        if (wapp.response.store){
            Object.keys(response).forEach(function (requestName) {
                wapp.response.store.dispatch(wapp.states.stateManager.actions.res({
                    type: "INS_RES",
                    name: "responses",
                    value: response
                }));
                wapp.response.state = wapp.response.store.getState();
            })
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
