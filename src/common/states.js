import {defaultDescriptor, mergeProperties, copyObject} from "./utils";

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
                            [action.payload.name]: (action.payload.value && typeof action.payload.value == "object") ? copyObject(action.payload.value) : action.payload.value,
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
                            [action.payload.name]: (action.payload.value && typeof action.payload.value == "object") ? copyObject(action.payload.value) : action.payload.value,
                        };
                    case "INS_RES":
                        if (typeof action.payload.value === "object" && action.payload.value &&
                        typeof state[action.payload.name] === "object" && state[action.payload.name]) {
                            return {
                                ...state,
                                [action.payload.name]: {
                                    ...state[action.payload.name],
                                    ...copyObject(action.payload.value)
                                },
                            };
                        }
                        return {
                            ...state,
                            [action.payload.name]: (action.payload.value && typeof action.payload.value == "object") ? copyObject(action.payload.value) : action.payload.value,
                        };
                    default:
                        return state;
                }
            }
        },
    });
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
    });
    const defaultRootReducer = function (newState, action) {
        Object.keys(stateManager.reducers).forEach(function(key){
            newState[key] = stateManager.reducers[key](newState[key], action)
        });
        return newState;
    };

    function createStore(rootReducer = defaultRootReducer, initialState = {}) {

        let state = {};
        let cachedString = "";

        Object.keys(initialState).forEach(function (key) {
            state[key] = initialState[key]
        });

        return {
            getState: function(p) {

                const keys = p && typeof p == "string" ? p : p && typeof p == "object" && typeof p.keys == "string" ? p.keys : "";

                if (keys){
                    let found;
                    function find(keys, o, i = 0) {
                        if (keys[i+1] && keys[i] && o[keys[i]] && typeof o[keys[i]] == "object") {
                            find(keys, o[keys[i]], i+1);
                        } else if (!keys[i+1] && typeof o[keys[i]] !== "undefined"){
                            found = o[keys[i]];
                        }
                    }
                    find(keys.split("."), state);
                    return (typeof found === "object" && found) ? copyObject(found) : found;
                }

                try{
                    if (!cachedString){
                        cachedString = JSON.stringify(state);
                    }
                    return JSON.parse(cachedString);
                } catch (e){
                    console.log(e);
                    state = {};
                    Object.keys(initialState).forEach(function (key) {
                        state[key] = initialState[key]
                    });
                    cachedString = JSON.stringify(state);
                    return JSON.parse(cachedString);
                }
            },
            dispatch: function(action) {
                try {
                    rootReducer(state, action);
                } catch (e) {
                    console.log(e);
                }
                cachedString = "";
                try {
                    stateManager.runListeners(action);
                } catch (e) {
                    console.log(e)
                }
            },
            subscribe: function (listener) {
                return stateManager.addListener(listener)
            }
        };

    }

    function defaultAddListener(listener) {
        stateManager.listeners.push(listener);
        return function unsubscribe() {
            stateManager.removeListener(listener);
        }
    }

    function defaultRemoveListener(listener) {
        if (stateManager.listeners.indexOf(listener) !== -1){
            stateManager.listeners.splice(stateManager.listeners.indexOf(listener), 1)
        }
    }

    function defaultRunListeners(action) {
        const listeners = [...stateManager.listeners];
        listeners.forEach(function (listener) {
            listener(action)
        })
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
        listeners: {
            ...defaultDescriptor,
            writable: false,
            value: []
        },
        addListener: {
            ...defaultDescriptor,
            value: defaultAddListener
        },
        removeListener: {
            ...defaultDescriptor,
            value: defaultRemoveListener
        },
        runListeners: {
            ...defaultDescriptor,
            value: defaultRunListeners
        }
    });

    return stateManager;

}

export default function createStates(p = {}) {

    const {wapp, stateManager = createDefaultStateManager(p)} = p;

    function addSomePropertyToClientAppFromInitialState(req, res, next) {

        // the client can't set this properties from the window location,
        // so if the server sent these data, then these are setting here to app.req and wappRequest:
        // method, httpVersion, remoteAddress

        // req.timestamp, res.statusCode, statusMessage, errorMessage will update in every client side update,
        // but the first render need this data from the server

        if (wapp.target === "web"){

            const wappResponse = res.wappResponse;
            const wappRequest = req.wappRequest;

            const appStateName = wappResponse.appStateName;
            const initialState = window[appStateName];

            if (initialState) {

                const reqFromState = initialState.req || {};
                const resFromState = initialState.res || {};

                req.httpVersion = reqFromState.httpVersion || "1.1";
                req.method = reqFromState.method || req.method;
                req.remoteAddress = reqFromState.remoteAddress || req.remoteAddress;

                wappRequest.method = req.method;
                wappRequest.httpVersion = req.httpVersion;
                wappRequest.remoteAddress = req.remoteAddress;

                if (statesMiddleware.shouldInitializedStore){

                    req.timestamp = reqFromState.timestamp || req.timestamp;
                    wappRequest.timestamp = req.timestamp;

                    res.statusCode = resFromState.statusCode || res.statusCode;
                    wappResponse.statusCode = res.statusCode;

                    res.statusMessage = resFromState.statusMessage || res.statusMessage;
                    wappResponse.statusMessage = res.statusMessage;

                    res.errorMessage = resFromState.errorMessage || res.errorMessage;
                    wappResponse.errorMessage = res.errorMessage;

                }

            }

        }

        next();

    }

    let lastStoreForClient = null;

    function defaultStatesForReqRes(req, res, next){

        const wappRequest = req.wappRequest;
        const wappResponse = res.wappResponse;

        const timestamp = wappRequest.timestamp;
        const path = wappRequest.path;
        const url = wappRequest.url;
        const method = wappRequest.method;
        const httpVersion = wappRequest.httpVersion;
        const hostname = wappRequest.hostname;
        const protocol = wappRequest.protocol;
        const secure = wappRequest.secure;
        const remoteAddress = wappRequest.remoteAddress;
        const userAgent = wappRequest.userAgent;
        const query = wappRequest.query;

        const statusCode = wappResponse.statusCode;
        const statusMessage = wappResponse.statusMessage;
        const errorMessage = wappResponse.errorMessage;
        const containerElementId = wappResponse.containerElementId;
        const appStateName = wappResponse.appStateName;

        const initState = (wapp.target === "web" && window[appStateName]) ? window[appStateName] : {
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
                userAgent: userAgent,
                query: query
            },
            res: {
                statusCode: statusCode,
                statusMessage: statusMessage,
                errorMessage: errorMessage,
                containerElementId: containerElementId,
                appStateName: appStateName
            }
        };

        const init = statesMiddleware.shouldInitializedStore;

        const store = (init) ? wapp.states.stateManager.createStore(wapp.states.stateManager.rootReducer, initState) : wappResponse.store;

        if (init){
            Object.defineProperty(wappResponse, "store", {
                writable: true,
                enumerable: true,
                configurable: false,
                value: store,
            });

            if (wapp.target === "web"){
                lastStoreForClient = wappResponse.store;
            }
        }

        if (!init || (init && initState.req.timestamp !== timestamp)) {
            if (store.getState("req.timestamp") !== timestamp) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "timestamp", value: timestamp}))
            }
        }
        if (!init || (init && initState.req.path !== path)) {
            if (store.getState("req.path") !== path) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "path", value: path}))
            }
        }
        if (!init || (init && initState.req.url !== url)) {
            if (store.getState("req.url") !== url) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "url", value: url}))
            }
        }
        if (!init || (init && initState.req.method !== method)) {
            if (store.getState("req.method") !== method) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "method", value: method}))
            }
        }
        if (!init || (init && initState.req.httpVersion !== httpVersion)) {
            if (store.getState("req.httpVersion") !== httpVersion) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "httpVersion", value: httpVersion}))
            }
        }
        if (!init || (init && initState.req.hostname !== hostname)) {
            if (store.getState("req.hostname") !== hostname) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "hostname", value: hostname}))
            }
        }
        if (!init || (init && initState.req.protocol !== protocol)) {
            if (store.getState("req.protocol") !== protocol) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "protocol", value: protocol}))
            }
        }
        if (!init || (init && initState.req.secure !== secure)) {
            if (store.getState("req.secure") !== secure) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "secure", value: secure}))
            }
        }
        if (!init || (init && initState.req.remoteAddress !== remoteAddress)) {
            if (store.getState("req.remoteAddress") !== remoteAddress) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "remoteAddress", value: remoteAddress}))
            }
        }
        if (!init || (init && initState.req.userAgent !== userAgent)) {
            if (store.getState("req.userAgent") !== userAgent) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "userAgent", value: userAgent}))
            }
        }
        if (!init || (init && initState.req.query !== query)) {
            if (store.getState("req.query") !== query) {
                wappResponse.store.dispatch(wapp.states.runAction("req", {name: "query", value: query}))
            }
        }


        if (!init || (init && initState.res.statusCode !== statusCode)) {
            if (store.getState("res.statusCode") !== statusCode) {
                wappResponse.store.dispatch(wapp.states.runAction("res", {name: "statusCode", value: statusCode}))
            }
        }
        if (!init || (init && initState.res.statusMessage !== statusMessage)) {
            if (store.getState("res.statusMessage") !== statusMessage) {
                wappResponse.store.dispatch(wapp.states.runAction("res", {name: "statusMessage", value: statusMessage}))
            }
        }
        if (!init || (init && initState.res.errorMessage !== errorMessage)) {
            if (store.getState("res.errorMessage") !== errorMessage) {
                wappResponse.store.dispatch(wapp.states.runAction("res", {name: "errorMessage", value: errorMessage}))
            }
        }
        if (!init || (init && initState.res.appStateName !== appStateName)) {
            if (store.getState("res.appStateName") !== appStateName) {
                wappResponse.store.dispatch(wapp.states.runAction("res", {name: "appStateName", value: appStateName}))
            }
        }
        if (!init || (init && initState.res.containerElementId !== containerElementId)) {
            if (store.getState("res.containerElementId") !== containerElementId) {
                wappResponse.store.dispatch(wapp.states.runAction("res", {name: "containerElementId", value: containerElementId}))
            }
        }

        next();

    }

    function defaultHandle(req, res, out){

        const statesMiddlewares = Object.keys(statesMiddleware.handles).sort().map(function (key) {return statesMiddleware.handles[key]});

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
        },
        shouldInitializedStore: {
            ...defaultDescriptor,
            value: false
        },
    });

    function statesMiddleware(req, res, out) {
        if (typeof statesMiddleware.handle === "function"){

            if (!res.wappResponse.store && wapp.target === "web" && lastStoreForClient){
                res.wappResponse.store = lastStoreForClient;
            }
            statesMiddleware.shouldInitializedStore = (wapp.target === "node" || !res.wappResponse.store);
            statesMiddleware.handle(req, res, function next() {
                statesMiddleware.shouldInitializedStore = (wapp.target === "node" || !res.wappResponse.store);
                out();
            });
        }

        return statesMiddleware;
    }

    mergeProperties(statesMiddleware, statesMiddlewareProperties);

    Object.defineProperty(statesMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "states", {...defaultDescriptor, writable: false, value: statesMiddleware});

    return statesMiddleware;

}
