import {defaultDescriptor, mergeProperties} from "./utils";

export function createDefaultStateManager(p = {}) {

    const {wapp} = p;

    const defaultReducers = Object.create(Object.prototype, {
        req: {
            ...defaultDescriptor,
            value: function(state = {}, action) {
                switch (action.type) {
                    case "SET_REQ":
                        return {
                            ...state,
                            [action.payload.name]: action.payload.value,
                        };
                    default:
                        return state;
                }
            }
        },
        res: {
            ...defaultDescriptor,
            value: function(state = {}, action) {
                switch (action.type) {
                    case "SET_RES":
                        return {
                            ...state,
                            [action.payload.name]: action.payload.value,
                        };
                    case "INS_RES":
                        if (typeof action.payload.value === "object" && action.payload.value &&
                        typeof state[action.payload.name] === "object" && action.payload.value) {
                            return {
                                ...state,
                                [action.payload.name]: {
                                    ...state[action.payload.name],
                                    ...action.payload.value
                                },
                            };
                        }
                        return {
                            ...state,
                            [action.payload.name]: action.payload.value,
                        };
                    default:
                        return state;
                }
            }
        },
    })
    const defaultActions = Object.create(Object.prototype, {
        req: {
            ...defaultDescriptor,
            value: function ({name, value}) {
                return {
                    type: "SET_REQ",
                    payload: {
                        name,
                        value,
                    },
                }
            }
        },
        res: {
            ...defaultDescriptor,
            value: function ({type, name, value}) {
                return {
                    type: type || "SET_RES",
                    payload: {
                        name,
                        value,
                    },
                }
            }
        }
    })
    const defaultRootReducer = function (newState, action) {
        Object.keys(stateManager.reducers).forEach(function(key){
            newState[key] = stateManager.reducers[key](newState[key], action)
        })
        return newState;
    }

    function createStore(rootReducer = defaultRootReducer, initialState = {}) {

        let state = {};

        Object.keys(initialState).forEach(function (key) {
            state[key] = initialState[key]
        })

        return {
            getState: function() {
                try{
                    return JSON.parse(JSON.stringify(state));
                } catch (e){
                    console.log(e);
                    state = {};
                    Object.keys(initialState).forEach(function (key) {
                        state[key] = initialState[key]
                    })
                    return JSON.parse(JSON.stringify(state));
                }
            },
            dispatch: function(action) {
                let newState = this.getState();
                try {
                    newState = rootReducer(newState, action);
                } catch (e) {
                    console.log(e)
                }
                try {
                    Object.keys(newState).forEach(function (key){
                        state[key] = newState[key]
                    })
                } catch (e) {
                    console.log(e)
                }
                return state;
            }
        }
    }
    const stateManager = Object.create(Object.prototype, {
        wapp: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: wapp
        },
        reducers: {
            ...defaultDescriptor,
            writable: false,
            value: defaultReducers
        },
        rootReducer: {
            ...defaultDescriptor,
            writable: false,
            value: defaultRootReducer
        },
        actions: {
            ...defaultDescriptor,
            writable: false,
            value: defaultActions
        },
        createStore: {
            ...defaultDescriptor,
            value: createStore
        },
    })

    return stateManager;

}

export default function createStates(p = {}) {

    const {wapp, stateManager = createDefaultStateManager(p)} = p;

    function addSomePropertyToClientAppFromInitialState(req, res, next) {

        // the client can't set this properties from the window location,
        // so if the server sent these data, then these are setting here to app.req and wapp.request:
        // method, httpVersion, remoteAddress

        // req.timestamp, res.statusCode, statusMessage, errorMessage will update in every client side update,
        // but the first render need this data from the server

        const init = (!wapp.response.store);

        if (typeof window !== "undefined"){
            const appStateName = (wapp.response && wapp.response.appStateName) ? wapp.response.appStateName : res.appStateName;
            const initialState = window[appStateName];

            if (initialState) {

                const reqFromState = initialState.req || {};
                const resFromState = initialState.res || {};

                req.httpVersion = reqFromState.httpVersion || "1.1";
                const http1 = (req.httpVersion === "1.1" || (req.httpVersion && Number(req.httpVersion.split(".")[0]) === 1))
                req.method = reqFromState.method || req.method;
                req.remoteAddress = reqFromState.remoteAddress || req.remoteAddress;

                wapp.request.method = req.method;
                wapp.request.httpVersion = req.httpVersion;
                wapp.request.remoteAddress = req.remoteAddress;

                if (init){

                    req.timestamp = reqFromState.timestamp || req.timestamp;
                    wapp.request.timestamp = req.timestamp;

                    res.statusCode = resFromState.statusCode || res.statusCode;
                    wapp.response.statusCode = res.statusCode;

                    wapp.response.statusMessage = resFromState.statusMessage;
                    if (http1 && !resFromState.statusMessage){
                        wapp.response.statusMessage = res.statusMessage;
                    }
                    if (http1) {
                        res.statusMessage = wapp.response.statusMessage;
                    }

                    res.errorMessage = resFromState.errorMessage || res.errorMessage;
                    wapp.response.errorMessage = res.errorMessage;

                }

            }

        }

        next();

    }

    function defaultStatesForReqRes(req, res, next){

        const http1 = (req.httpVersion === "1.1" || (req.httpVersion && Number(req.httpVersion.split(".")[0]) === 1))

        const timestamp = (wapp.request && wapp.request.timestamp) ? wapp.request.timestamp : req.timestamp;
        const path = (wapp.request && wapp.request.path) ? wapp.request.path : req.path;
        const url = (wapp.request && wapp.request.url) ? wapp.request.url : req.url;
        const method = (wapp.request && wapp.request.method) ? wapp.request.method : req.method;
        const httpVersion = (wapp.request && wapp.request.httpVersion) ? wapp.request.httpVersion : req.httpVersion;
        const hostname = (wapp.request && wapp.request.hostname) ? wapp.request.hostname : req.hostname;
        const protocol = (wapp.request && wapp.request.protocol) ? wapp.request.protocol : req.protocol;
        const secure = (wapp.request && wapp.request.secure) ? wapp.request.secure : req.secure;
        const remoteAddress = (wapp.request && wapp.request.remoteAddress) ? wapp.request.remoteAddress : req.remoteAddress;
        const userAgent = (wapp.request && wapp.request.userAgent) ? wapp.request.userAgent : (req.headers && req.headers["user-agent"]) ? req.headers["user-agent"] : ""

        const statusCode = (wapp.response && wapp.response.statusCode) ? wapp.response.statusCode : res.statusCode;
        let statusMessage = (wapp.response && wapp.response.statusMessage) ? wapp.response.statusMessage : null;
        if ((http1 && !wapp.response) || (http1 && wapp.response && !wapp.response.statusMessage)) {
            statusMessage = req.statusMessage;
        }
        const errorMessage = (wapp.response && wapp.response.errorMessage) ? wapp.response.errorMessage : res.errorMessage;
        const containerElementId = (wapp.response && wapp.response.containerElementId) ? wapp.response.containerElementId : res.containerElementId;
        const appStateName = (wapp.response && wapp.response.appStateName) ? wapp.response.appStateName : res.appStateName;

        const initState = (typeof window !== "undefined" && window[appStateName]) ? window[appStateName] : {
            req: {
                timestamp: timestamp,
                path: path,
                url: url,
                method: method,
                httpVersion: httpVersion,
                hostname: hostname,
                protocol: protocol,
                secure: secure,
                remoteAddress: remoteAddress,
                userAgent: userAgent
            },
            res: {
                statusCode: statusCode,
                statusMessage: statusMessage,
                errorMessage: errorMessage,
                containerElementId: containerElementId,
                appStateName: appStateName
            }
        }

        const init = (!wapp.response.store);

        const store = wapp.response.store || wapp.states.stateManager.createStore(wapp.states.stateManager.rootReducer, initState);
        if (init){
            Object.defineProperty(wapp.response, 'store', {
                writable: true,
                enumerable: false,
                configurable: false,
                value: store,
            });
        }

        if (!init || (init && initState.req.timestamp !== timestamp)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "timestamp", value: timestamp}))
        }
        if (!init || (init && initState.req.path !== path)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "path", value: path}))
        }
        if (!init || (init && initState.req.url !== url)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "url", value: url}))
        }
        if (!init || (init && initState.req.method !== method)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "method", value: method}))
        }
        if (!init || (init && initState.req.httpVersion !== httpVersion)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "httpVersion", value: httpVersion}))
        }
        if (!init || (init && initState.req.hostname !== hostname)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "hostname", value: hostname}))
        }
        if (!init || (init && initState.req.protocol !== protocol)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "protocol", value: protocol}))
        }
        if (!init || (init && initState.req.secure !== secure)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "secure", value: secure}))
        }
        if (!init || (init && initState.req.remoteAddress !== remoteAddress)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "remoteAddress", value: remoteAddress}))
        }
        if (!init || (init && initState.req.userAgent !== userAgent)) {
            wapp.response.store.dispatch(wapp.states.runAction("req", {name: "userAgent", value: userAgent}))
        }


        if (!init || (init && initState.res.statusCode !== statusCode)) {
            wapp.response.store.dispatch(wapp.states.runAction("res", {name: "statusCode", value: statusCode}))
        }
        if (!init || (init && initState.res.statusMessage !== statusMessage)) {
            wapp.response.store.dispatch(wapp.states.runAction("res", {name: "statusMessage", value: statusMessage}))
        }
        if (!init || (init && initState.res.errorMessage !== errorMessage)) {
            wapp.response.store.dispatch(wapp.states.runAction("res", {name: "errorMessage", value: errorMessage}))
        }
        if (!init || (init && initState.res.appStateName !== appStateName)) {
            wapp.response.store.dispatch(wapp.states.runAction("res", {name: "appStateName", value: appStateName}))
        }
        if (!init || (init && initState.res.containerElementId !== containerElementId)) {
            wapp.response.store.dispatch(wapp.states.runAction("res", {name: "containerElementId", value: containerElementId}))
        }

        wapp.response.state = wapp.response.store.getState();

        next();

    }

    function defaultHandle(req, res, out){

        const statesMiddlewares = Object.keys(statesMiddleware.handles).map(function (key) {return statesMiddleware.handles[key]})

        let index = 0;

        function next(err) {

            if (statesMiddlewares[index]){
                const func = statesMiddlewares[index];
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

    function defaultAddHandle(obj) {
        if (typeof obj === "object" && !obj.length){
            Object.keys(obj).forEach(function (handleName) {
                const handle = obj[handleName];
                if (typeof handle == "function") {
                    statesMiddleware.handles[handleName] = handle
                }
            })
        }
    }

    function defaultRunAction(actionName, props) {
        return statesMiddleware.stateManager.actions[actionName](props)
    }

    const statesMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        handles: {
            ...defaultDescriptor,
            value: {
                clientapp: addSomePropertyToClientAppFromInitialState,
                reqres: defaultStatesForReqRes,
            }
        },
        stateManager: {
            ...defaultDescriptor,
            value: stateManager
        },
        addHandle: {
            ...defaultDescriptor,
            value: defaultAddHandle
        },
        runAction: {
            ...defaultDescriptor,
            value: defaultRunAction
        }
    })

    function statesMiddleware(req, res, next) {
        if (typeof statesMiddleware.handle === "function"){
            statesMiddleware.handle(req, res, next);
        }
        return statesMiddleware;
    }

    mergeProperties(statesMiddleware, statesMiddlewareProperties);

    Object.defineProperty(statesMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "states", {...defaultDescriptor, writable: false, value: statesMiddleware});

    return statesMiddleware

}
