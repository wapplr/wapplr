import {mergeProperties, defaultDescriptor} from '../common/utils'
import commonMiddlewares from '../common/middlewares';
import style from '../common/template/template.css';

export function createRenderMiddleware(p = {}) {

    const {wapp} = p;

    async function defaultRenderHandle(req, res, next){

        const wapp = renderMiddleware.wapp;

        if (wapp.response.content && !wapp.response.content.renderType) {

            res.status(wapp.response.statusCode || 200);
            res.send(renderMiddleware.render());
            next();

        } else {
            next();
        }
    }

    async function defaultHandle(req, res, out){

        const statesMiddlewares = Object.keys(renderMiddleware.handles).map(function (key) {return renderMiddleware.handles[key]})

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

    function defaultRender() {
        const {content = {}} = wapp.response;
        let {render = ""} = content;
        if (typeof render === "function") {
            render = render(wapp);
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
    })

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

        if (res.headersSent){

            function updateTag(tagName, keyName, keyValue, attrName, attrValue) {
                const node = document.head.querySelector(`${tagName}[${keyName}="${keyValue}"]`);
                if (node && node.getAttribute(attrName) === attrValue) {
                    return;
                }

                if (node) {
                    node.parentNode.removeChild(node);
                }

                if (typeof attrValue === 'string') {
                    const nextNode = document.createElement(tagName);
                    nextNode.setAttribute(keyName, keyValue);
                    nextNode.setAttribute(attrName, attrValue);
                    document.head.appendChild(nextNode);
                }
            }

            function updateMeta(name, content) {
                updateTag('meta', 'name', name, 'content', content);
            }

            function addClickToATags() {
                const tags = document.querySelectorAll("a");
                Array.prototype.map.call( tags, function (tag) {
                    const href = tag.getAttribute("href");
                    const target = tag.getAttribute("target");

                    if (target === "_blank" || (href && href.slice(0,7) === "http://") || (href && href.slice(0,8) === "https://")) {

                    } else {
                        tag.onclick = function (e) {
                            e.preventDefault();
                            tagsMiddleware.wapp.client.history.push(href);
                        }
                    }
                });
            }

            const wapp = tagsMiddleware.wapp;
            const settings = wapp.client.settings;
            const {siteName = "Wapplr"} = settings;
            const {state, content = {}} = wapp.response;
            const res = (state && state.res) ? state.res : wapp.response;
            const {statusCode} = res;

            let {title = "", description = "", author = ""} = content;

            if (typeof title === "function") {title = title(wapp);}
            title = `${(title) ? title : (statusCode === 404) ? "Not Found | " + siteName : "Untitled Page | " + siteName }`;

            if (typeof description === "function") {description = description(wapp)}
            description = (description) ? description : (title && title.split) ? title.split(" | ")[0] : title;

            if (typeof author === "function") {author = author(wapp)}
            author = (author || siteName)

            document.title = title;

            updateMeta('description', description);
            updateMeta('author', author);
            addClickToATags();

        }

        next();

    }

    const tagsMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
    })

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

export default function createMiddlewares(p) {

    const {log, ...rest} = commonMiddlewares(p);

    return {
        ...rest,
        render: createRenderMiddleware(p),
        tags: createUpdateTagsMiddleware(p),
        log
    }
}
