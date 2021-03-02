import {defaultDescriptor, mergeProperties} from "./utils";

function createDefaultContentManager(p = {}) {

    const {wapp} = p;

    async function defaultResolve(p = {}) {
        const {route, wapp, req, res} = p;
        const {contentName} = route;
        const contents = contentManager.contents;
        const content = (contentName && contents[contentName]) ? {...contents[contentName]} : null;
        if (content.request){
            await content.request({wapp, req, res});
        }
        return content;
    }

    function getTitle({wapp, req, res}) {
        const config = wapp.getTargetObject().config;
        const {siteName = "Wapplr"} = config;
        const {statusCode, statusMessage, errorMessage} = res.wappResponse;
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
            value: function render({wapp, req, res}) {
                return wapp.log.render({wapp, req, res})
            },
        },
        title: {
            ...defaultDescriptor,
            value: function title({wapp, req, res}) {
                return getTitle({wapp, req, res})
            },
        },
        description: {
            ...defaultDescriptor,
            value: function description({wapp, req, res}) {
                const config = wapp.getTargetObject().config;
                const {description} = config;
                return (description) ? description : getTitle({wapp, req, res}).split(" | ")[0];
            },
        },
        author: {
            ...defaultDescriptor,
            value: function author({wapp, req, res}) {
                const config = wapp.getTargetObject().config;
                const {author, siteName = "Wapplr"} = config;
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

    async function defaultHandle(req, res, next){
        if (!res.wappResponse.content) {
            const contentRes = contentsMiddleware.contentManager.resolve;
            res.wappResponse.content = await contentRes({route: res.wappResponse.route, wapp, req, res});
        }
        return next();
    }

    function defaultAdd(p) {
        return contentsMiddleware.contentManager.add(p)
    }

    function defaultGet(p) {
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

    async function contentsMiddleware(req, res, next) {
        if (typeof contentsMiddleware.handle === "function") {
            return await contentsMiddleware.handle(req, res, next);
        }
        return contentsMiddleware;
    }

    mergeProperties(contentsMiddleware, contentsMiddlewareProperties);

    Object.defineProperty(contentsMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "contents", {...defaultDescriptor, writable: false, value: contentsMiddleware});

    return contentsMiddleware

}
