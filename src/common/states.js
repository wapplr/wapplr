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
                stateManager.runListeners(newState, action);
                return state;
            },
            subscribe: function (listener) {
                return stateManager.addListener(listener)
            }
        }
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

    function defaultRunListeners(newState, action) {
        stateManager.listeners.forEach(function (listener) {
            listener(newState, action)
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

        if (wapp.target === "web"){
            const appStateName = wapp.response.appStateName;
            const initialState = window[appStateName];

            if (initialState) {

                const reqFromState = initialState.req || {};
                const resFromState = initialState.res || {};

                req.httpVersion = reqFromState.httpVersion || "1.1";
                req.method = reqFromState.method || req.method;
                req.remoteAddress = reqFromState.remoteAddress || req.remoteAddress;

                wapp.request.method = req.method;
                wapp.request.httpVersion = req.httpVersion;
                wapp.request.remoteAddress = req.remoteAddress;

                if (!statesMiddleware.initialized){

                    req.timestamp = reqFromState.timestamp || req.timestamp;
                    wapp.request.timestamp = req.timestamp;

                    res.statusCode = resFromState.statusCode || res.statusCode;
                    wapp.response.statusCode = res.statusCode;

                    res.statusMessage = resFromState.statusMessage || res.statusMessage;
                    wapp.response.statusMessage = res.statusMessage;

                    res.errorMessage = resFromState.errorMessage || res.errorMessage;
                    wapp.response.errorMessage = res.errorMessage;

                }

            }

        }

        next();

    }

    function defaultStatesForReqRes(req, res, next){

        const timestamp = wapp.request.timestamp;
        const path = wapp.request.path;
        const url = wapp.request.url;
        const method = wapp.request.method;
        const httpVersion = wapp.request.httpVersion;
        const hostname = wapp.request.hostname;
        const protocol = wapp.request.protocol;
        const secure = wapp.request.secure;
        const remoteAddress = wapp.request.remoteAddress;
        const userAgent = wapp.request.userAgent;

        const statusCode = wapp.response.statusCode;
        const statusMessage = wapp.response.statusMessage;
        const errorMessage = wapp.response.errorMessage;
        const containerElementId = wapp.response.containerElementId;
        const appStateName = wapp.response.appStateName;

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

        const init = !(statesMiddleware.initialized);

        const store = (init) ? wapp.states.stateManager.createStore(wapp.states.stateManager.rootReducer, initState) : wapp.states.store;

        if (init){
            Object.defineProperty(statesMiddleware, "store", {
                writable: true,
                enumerable: true,
                configurable: false,
                value: store,
            });
        }

        const stateBefore = store.getState();

        if (!init || (init && initState.req.timestamp !== timestamp)) {
            if (stateBefore.req.timestamp !== timestamp) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "timestamp", value: timestamp}))
            }
        }
        if (!init || (init && initState.req.path !== path)) {
            if (stateBefore.req.path !== path) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "path", value: path}))
            }
        }
        if (!init || (init && initState.req.url !== url)) {
            if (stateBefore.req.url !== url) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "url", value: url}))
            }
        }
        if (!init || (init && initState.req.method !== method)) {
            if (stateBefore.req.method !== method) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "method", value: method}))
            }
        }
        if (!init || (init && initState.req.httpVersion !== httpVersion)) {
            if (stateBefore.req.httpVersion !== httpVersion) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "httpVersion", value: httpVersion}))
            }
        }
        if (!init || (init && initState.req.hostname !== hostname)) {
            if (stateBefore.req.hostname !== hostname) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "hostname", value: hostname}))
            }
        }
        if (!init || (init && initState.req.protocol !== protocol)) {
            if (stateBefore.req.protocol !== protocol) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "protocol", value: protocol}))
            }
        }
        if (!init || (init && initState.req.secure !== secure)) {
            if (stateBefore.req.secure !== secure) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "secure", value: secure}))
            }
        }
        if (!init || (init && initState.req.remoteAddress !== remoteAddress)) {
            if (stateBefore.req.remoteAddress !== remoteAddress) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "remoteAddress", value: remoteAddress}))
            }
        }
        if (!init || (init && initState.req.userAgent !== userAgent)) {
            if (stateBefore.req.userAgent !== userAgent) {
                wapp.states.store.dispatch(wapp.states.runAction("req", {name: "userAgent", value: userAgent}))
            }
        }


        if (!init || (init && initState.res.statusCode !== statusCode)) {
            if (stateBefore.res.statusCode !== statusCode) {
                wapp.states.store.dispatch(wapp.states.runAction("res", {name: "statusCode", value: statusCode}))
            }
        }
        if (!init || (init && initState.res.statusMessage !== statusMessage)) {
            if (stateBefore.res.statusMessage !== statusMessage) {
                wapp.states.store.dispatch(wapp.states.runAction("res", {name: "statusMessage", value: statusMessage}))
            }
        }
        if (!init || (init && initState.res.errorMessage !== errorMessage)) {
            if (stateBefore.res.errorMessage !== errorMessage) {
                wapp.states.store.dispatch(wapp.states.runAction("res", {name: "errorMessage", value: errorMessage}))
            }
        }
        if (!init || (init && initState.res.appStateName !== appStateName)) {
            if (stateBefore.res.appStateName !== appStateName) {
                wapp.states.store.dispatch(wapp.states.runAction("res", {name: "appStateName", value: appStateName}))
            }
        }
        if (!init || (init && initState.res.containerElementId !== containerElementId)) {
            if (stateBefore.res.containerElementId !== containerElementId) {
                wapp.states.store.dispatch(wapp.states.runAction("res", {name: "containerElementId", value: containerElementId}))
            }
        }

        wapp.response.state = wapp.states.store.getState();

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
        },
        initialized: {
            ...defaultDescriptor,
            value: false
        },
        store: {
            ...defaultDescriptor,
            value: null
        }
    })

    function statesMiddleware(req, res, next) {
        statesMiddleware.initialized = !(wapp.target === "node" || !statesMiddleware.store);
        if (typeof statesMiddleware.handle === "function"){
            statesMiddleware.handle(req, res, next);
        }
        statesMiddleware.initialized = !(wapp.target === "node" || !statesMiddleware.store);
        return statesMiddleware;
    }

    mergeProperties(statesMiddleware, statesMiddlewareProperties);

    Object.defineProperty(statesMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "states", {...defaultDescriptor, writable: false, value: statesMiddleware});

    return statesMiddleware;

}
