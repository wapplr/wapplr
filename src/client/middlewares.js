import {mergeProperties, defaultDescriptor} from "../common/utils"
import commonMiddlewares from "../common/middlewares";
import style from "../common/template/template.css";

export function createRenderMiddleware(p = {}) {

    const {wapp} = p;

    async function defaultRenderHandle(req, res, next){

        const wappResponse = res.wappResponse;

        if (wappResponse.content && !wappResponse.content.renderType) {

            res.wappResponse.status(wappResponse.statusCode || 200);
            res.wappResponse.send(renderMiddleware.render({wapp, req, res}));
            next();

        } else {
            next();
        }
    }

    async function defaultHandle(req, res, out){

        const renderMiddlewares = Object.keys(renderMiddleware.handles).map(function (key) {return renderMiddleware.handles[key]});

        let index = 0;

        async function next(err) {

            if (renderMiddlewares[index]){
                const func = renderMiddlewares[index];
                index = index + 1;
                return await func(req, res, (err) ? async function(){await next(err)} : next)
            } else if (typeof out === "function") {
                index = 0;
                return await out(err);
            }

            return null;
        }

        return await next();

    }

    function defaultRender({wapp, req, res}) {
        const wappResponse = res.wappResponse;
        const {content = {}} = wappResponse;
        let {render = ""} = content;
        if (typeof render === "function") {
            render = render({wapp, req, res});
        }

        wapp.styles.use(style);

        return render;
    }

    function defaultAddHandle(obj) {
        if (typeof obj === "object" && !obj.length){
            Object.keys(obj).forEach(function (handleName) {
                const handle = obj[handleName];
                if (typeof handle == "function") {
                    renderMiddleware.handles[handleName] = handle
                }
            })
        }
    }

    const renderMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        handles: {
            ...defaultDescriptor,
            value: {
                render: defaultRenderHandle
            }
        },
        render: {
            ...defaultDescriptor,
            value: defaultRender
        },
        addHandle: {
            ...defaultDescriptor,
            value: defaultAddHandle
        },
    });

    function renderMiddleware(req, res, next) {
        if (typeof renderMiddleware.handle === "function"){
            renderMiddleware.handle(req, res, next);
        }
        return renderMiddleware;
    }

    mergeProperties(renderMiddleware, renderMiddlewareProperties);

    Object.defineProperty(renderMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return renderMiddleware

}

export function createUpdateTagsMiddleware(p = {}) {

    const {wapp} = p;

    function defaultHandle(req, res, next){
        if (res.wappResponse.sended){

            function updateTag(tagName, keyName, keyValue, attrName, attrValue) {
                const node = document.head.querySelector(`${tagName}[${keyName}="${keyValue}"]`);
                if (node && node.getAttribute(attrName) === attrValue) {
                    return;
                }

                if (node) {
                    node.parentNode.removeChild(node);
                }

                if (typeof attrValue === "string") {
                    const nextNode = document.createElement(tagName);
                    nextNode.setAttribute(keyName, keyValue);
                    nextNode.setAttribute(attrName, attrValue);
                    document.head.appendChild(nextNode);
                }
            }

            function updateMeta(name, content) {
                updateTag("meta", "name", name, "content", content);
            }

            const config = wapp.client.config;
            const {siteName = "Wapplr"} = config;
            const {content = {}, statusCode} = res.wappResponse;

            let {title = "", description = "", author = ""} = content;

            if (typeof title === "function") {title = title({wapp, req, res});}
            title = `${(title) ? title : (statusCode === 404) ? "Not Found | " + siteName : "Untitled Page | " + siteName }`;

            if (typeof description === "function") {description = description({wapp, req, res})}
            description = (description) ? description : (title && title.split) ? title.split(" | ")[0] : title;

            if (typeof author === "function") {author = author({wapp, req, res})}
            author = (author || siteName);

            document.title = title;

            updateMeta("description", description);
            updateMeta("author", author);

        }
        next();
    }

    const tagsMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
    });

    function tagsMiddleware(req, res, next) {
        if (typeof tagsMiddleware.handle === "function"){
            tagsMiddleware.handle(req, res, next);
        }
        return tagsMiddleware;
    }

    mergeProperties(tagsMiddleware, tagsMiddlewareProperties);

    Object.defineProperty(tagsMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return tagsMiddleware;

}

export function createAddOnClickToATagsMiddleware(p = {}) {

    const {wapp} = p;

    function defaultHandle(req, res, next){
        if (res.wappResponse.sended){

            const tags = document.querySelectorAll("a");
            Array.prototype.map.call( tags, function (tag) {
                const href = tag.getAttribute("href");
                const target = tag.getAttribute("target");
                const enable = (typeof tag.getAttribute("wapplronclicklistener") == "string");

                if (target === "_blank" || (href && href.slice(0,7) === "http://") || (href && href.slice(0,8) === "https://")) {

                } else {
                    if (!tag._onclickListener && enable) {
                        tag._onclickListener = function (e) {
                            e.preventDefault();
                            wapp.client.history.push({search:"", href:"", ...wapp.client.history.parsePath(href)});
                        };
                        tag.addEventListener("click", tag._onclickListener, false);
                        tag.removeAttribute("wapplronclicklistener");
                    }
                }
            });

        }
        next();
    }

    const onClickMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
    });

    function onClickMiddleware(req, res, next) {
        if (typeof onClickMiddleware.handle === "function"){
            onClickMiddleware.handle(req, res, next);
        }
        return onClickMiddleware;
    }

    mergeProperties(onClickMiddleware, onClickMiddlewareProperties);

    Object.defineProperty(onClickMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return onClickMiddleware;

}

export default function createMiddlewares(p) {

    const {log, ...rest} = commonMiddlewares(p);

    return {
        ...rest,
        render: createRenderMiddleware(p),
        tags: createUpdateTagsMiddleware(p),
        onClick: createAddOnClickToATagsMiddleware(p),
        log
    }
}
