import {defaultDescriptor, mergeProperties} from "./utils";

function createDefaultContentManager(p = {}) {

    const {wapp} = p;

    function defaultResolve(p = {}) {
        const {contentName} = p;
        const contents = contentManager.contents;
        return (contentName && contents[contentName]) ? {...contents[contentName]} : null
    }

    function getTitle(wapp) {
        const {response} = wapp;
        const settings = wapp.getTargetObject().settings;
        const {siteName = "Wapplr"} = settings;
        const {state} = response;
        const res = (state && state.res) ? state.res : response;
        const {statusCode, statusMessage, errorMessage} = res;
        let title = "Home";
        if (statusCode === 404) {
            title = statusMessage || "Not found";
        }
        if (statusCode === 500) {
            title = errorMessage || statusMessage || "Internal Server Error";
        }
        return title + " | " + siteName;
    }

    const defaultContentValues = Object.create(Object.prototype, {
        render: {
            ...defaultDescriptor,
            value: function render(wapp) {
                return wapp.log.render({wapp})
            },
        },
        title: {
            ...defaultDescriptor,
            value: function title(wapp) {
                return getTitle(wapp)
            },
        },
        description: {
            ...defaultDescriptor,
            value: function description() {
                const settings = wapp.getTargetObject().settings;
                const {description} = settings;
                return (description) ? description : getTitle(wapp).split(" | ")[0];
            },
        },
        author: {
            ...defaultDescriptor,
            value: function author() {
                const settings = wapp.getTargetObject().settings;
                const {author, siteName = "Wapplr"} = settings;
                return (author) ? author : siteName;
            }
        }
    })

    const defaultContents = Object.create(Object.prototype, {
        log: {
            ...defaultDescriptor,
            value: defaultContentValues
        },
    })

    function defaultAdd(obj) {
        if (typeof obj === "object" && !obj.length){
            Object.keys(obj).forEach(function (contentName) {
                const content = obj[contentName];
                if (typeof content == "object" && content.render) {
                    const tempContent = contentManager.contents[contentName] || defaultContentValues;
                    contentManager.contents[contentName] = {
                        ...tempContent,
                        ...content
                    };
                }
            })
        }
    }

    function defaultGet(contentName) {
        return contentManager.contents[contentName]
    }

    const defaultComponents =  Object.create(Object.prototype, {})

    function defaultAddComponent(obj) {
        if (typeof obj === "object" && !obj.length){
            Object.keys(obj).forEach(function (componentName) {
                const component = obj[componentName];
                if (typeof component !== "undefined") {
                    contentManager.components[componentName] = component;
                }
            })
        }
    }

    function defaultGetComponent(componentName) {
        return contentManager.components[componentName]
    }

    const contentManager = Object.create(Object.prototype, {
        wapp: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: wapp
        },
        resolve: {
            ...defaultDescriptor,
            value: defaultResolve
        },
        contents: {
            ...defaultDescriptor,
            writable: false,
            value: defaultContents
        },
        components: {
            ...defaultDescriptor,
            writable: false,
            value: defaultComponents
        },
        add: {
            ...defaultDescriptor,
            value: defaultAdd
        },
        get: {
            ...defaultDescriptor,
            value: defaultGet
        },
        addComponent: {
            ...defaultDescriptor,
            value: defaultAddComponent
        },
        getComponent: {
            ...defaultDescriptor,
            value: defaultGetComponent
        }
    })
    return contentManager;

}

export default function createContents(p = {}) {

    const {wapp, contentManager = createDefaultContentManager(p)} = p;

    function defaultHandle(req, res, next){
        if (!wapp.response.content) {
            const contentRes = contentsMiddleware.contentManager.resolve;
            wapp.response.content = contentRes(wapp.response.route);
        }
        return next();
    }

    function defaultAdd(p) {
        return contentsMiddleware.contentManager.add(p)
    }

    function defaultGet(p) {
        if (typeof p == "undefined") {
            return wapp.response.content;
        }
        return contentsMiddleware.contentManager.get(p)
    }

    function defaultAddComponent(p) {
        return contentsMiddleware.contentManager.addComponent(p)
    }

    function defaultGetComponent(p) {
        return contentsMiddleware.contentManager.getComponent(p)
    }

    const contentsMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        contentManager: {
            ...defaultDescriptor,
            value: contentManager
        },
        add: {
            ...defaultDescriptor,
            value: defaultAdd
        },
        get: {
            ...defaultDescriptor,
            value: defaultGet
        },
        addComponent: {
            ...defaultDescriptor,
            value: defaultAddComponent
        },
        getComponent: {
            ...defaultDescriptor,
            value: defaultGetComponent
        }
    })

    function contentsMiddleware(req, res, next) {
        if (typeof contentsMiddleware.handle === "function") {
            return contentsMiddleware.handle(req, res, next);
        }
        return contentsMiddleware;
    }

    mergeProperties(contentsMiddleware, contentsMiddlewareProperties);

    Object.defineProperty(contentsMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "contents", {...defaultDescriptor, writable: false, value: contentsMiddleware});

    return contentsMiddleware

}
