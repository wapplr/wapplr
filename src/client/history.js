import {defaultDescriptor, mergeProperties} from "../common/utils";

function parsePath(path) {
    let partialPath = {};

    if (path) {
        let hashIndex = path.indexOf("#");
        if (hashIndex >= 0) {
            partialPath.hash = path.substr(hashIndex);
            path = path.substr(0, hashIndex);
        }

        let searchIndex = path.indexOf("?");
        if (searchIndex >= 0) {
            partialPath.search = path.substr(searchIndex);
            path = path.substr(0, searchIndex);
        }

        if (path) {
            partialPath.pathname = path;
        }
    }

    return partialPath;
}

function createPath({pathname = "/", search = "", hash = ""}) {
    return pathname + search + hash;
}

function createHref(to) {
    return typeof to === "string" ? to : createPath(to);
}

function createKey() {
    return Math.random()
        .toString(36)
        .substr(2, 8);
}

function createHistoryManager() {

    const globalHistory = window.history;

    function defaultAddListener(obj) {
        if (typeof obj === "object" && !obj.length){
            Object.keys(obj).forEach(function (handleName) {
                const handle = obj[handleName];
                if (typeof handle == "function") {
                    history.listeners[handleName] = handle
                }
            })
        }
    }

    function defaultRunListeners(args) {
        const listeners = history.listeners;
        Object.keys(listeners).forEach(function (key) {
            const fn = listeners[key];
            if (typeof fn == "function"){
                fn(args);
            }
        })
    }

    function defaultHandlePop(e) {

        let { pathname, search, hash } = window.location;
        let state = globalHistory.state || {};

        const newLocation = {
            pathname,
            search,
            hash,
        }

        state.key = state.key || createKey();

        history.location = newLocation;
        history.state = state;

        defaultRunListeners({action:"POP", location: {...history.location, key: history.state.key}})
    }

    function defaultInit() {
        if (!history.initialized) {
            window.addEventListener("popstate", history.handlePop);
            history.initialized = true;
        }
        return history;
    }

    function defaultClose()  {
        if (history.initialized) {
            window.removeEventListener("popstate", history.handlePop);
            history.initialized = false;
        }
        return history;
    }

    function defaultPush(to, state = {}){

        let { pathname, search, hash } = window.location;
        const newLocation = {
            pathname,
            search,
            hash,
            ...(typeof to === "string" ? parsePath(to) : to),
        }

        const url = createHref(newLocation)
        state.key = state.key || createKey();

        history.location = newLocation;
        history.state = state;

        globalHistory.pushState(state, "", url);

        history.runListeners({action:"PUSH", location: {...history.location, key: history.state.key}});
    }

    function defaultListen(...attributes) {
        const fn = (attributes[0]) ? attributes[0] : null;
        history.init();
        if (fn){
            const nI = Object.keys(history.listeners).length
            history.addListener({[nI.toString()]: fn});
        }
    }

    const history = Object.create(Object.prototype, {
        globalHistory: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: globalHistory
        },
        location: {
            ...defaultDescriptor,
            value: {
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
            },
        },
        key: {
            ...defaultDescriptor,
            value: "initial",
        },
        listeners: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: []
        },
        runListeners: {
            ...defaultDescriptor,
            value: defaultRunListeners
        },
        addListener: {
            ...defaultDescriptor,
            value: defaultAddListener,
        },
        listen: {
            ...defaultDescriptor,
            value: defaultListen,
        },
        handlePop: {
            ...defaultDescriptor,
            enumerable: false,
            value: defaultHandlePop
        },
        init: {
            ...defaultDescriptor,
            value: defaultInit
        },
        close: {
            ...defaultDescriptor,
            value: defaultClose
        },
        initialized: {
            ...defaultDescriptor,
            value: false
        },
        push: {
            ...defaultDescriptor,
            value: defaultPush
        }
    })

    return history;

}

export default function createHistory(p = {}) {

    const {wapp, history = createHistoryManager()} = p;

    const historyProperties = Object.create(Object.prototype, {})

    mergeProperties(history, historyProperties);

    Object.defineProperty(history, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return history;

}
