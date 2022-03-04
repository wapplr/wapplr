import {defaultDescriptor, mergeProperties} from "../common/utils";

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

    let li = 0;

    function defaultAddListener(handle) {
        if (typeof handle == "function") {
            const handleName = li.toString();
            history.listeners[handleName] = handle;
            li = li + 1;
            return function removeListener() {
                delete history.listeners[handleName];
            }
        }
        return function removeListener() {}
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

    function defaultHandlePop() {

        const { pathname, search, hash } = window.location;
        const state = globalHistory.state || {};

        const newLocation = {
            pathname,
            search,
            hash,
        };

        state.key = state.key || createKey();

        history.runListeners({action:"POP", location: {...newLocation}, state})
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
        history.listeners = {};
        return history;
    }

    function defaultParsePath(path) {
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

    function defaultPush(to, inputState){

        const { pathname, search, hash } = window.location;
        const newLocation = {
            pathname,
            search,
            hash,
            ...(typeof to === "string" ? history.parsePath(to) : to),
        };

        const url = createHref(newLocation);
        const state = inputState || {};
        state.key = state.key || createKey();

        globalHistory.pushState(state, "", url);

        history.runListeners({action:"PUSH", location: {...newLocation}, state});
    }

    function defaultGo(delta) {
        globalHistory.go(delta);
    }

    function defaultListen(...attributes) {
        const fn = (attributes[0]) ? attributes[0] : null;
        history.init();
        return history.addListener(fn);
    }

    function defaultGetState() {
        return history.globalHistory.state || {};
    }

    const history = Object.create(Object.prototype, {
        globalHistory: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: globalHistory
        },
        getState: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: defaultGetState
        },
        listeners: {
            ...defaultDescriptor,
            enumerable: false,
            value: {}
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
        },
        go: {
            ...defaultDescriptor,
            value: defaultGo
        },
        parsePath: {
            ...defaultDescriptor,
            value: defaultParsePath
        }
    });

    return history;

}

export default function createHistory(p = {}) {

    const {wapp, history = createHistoryManager()} = p;

    const historyProperties = Object.create(Object.prototype, {});

    mergeProperties(history, historyProperties);

    Object.defineProperty(history, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return history;

}
