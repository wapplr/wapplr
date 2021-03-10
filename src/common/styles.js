import {defaultDescriptor, mergeProperties} from "./utils";

export function createDefaultStyleManager(p = {}) {

    const {wapp} = p;

    let lastStyleElemId = null;

    function defaultInsertCss(css, moduleId) {

        const id = `s${moduleId}`;

        let elem = document.getElementById(id);
        let create = false;

        if (!elem) {
            create = true;
            elem = document.createElement("style");
            elem.setAttribute("type", "text/css");
            elem.id = id;
        }

        let cssText = css;

        if ("textContent" in elem) {
            elem.textContent = cssText
        } else {
            elem.styleSheet.cssText = cssText
        }

        if (create) {
            if (lastStyleElemId && document.getElementById(lastStyleElemId)){
                document.head.insertBefore(elem, document.getElementById(lastStyleElemId));
            } else {
                document.head.appendChild(elem);
            }
            lastStyleElemId = id;
        }

        return function remove(){
            const elem = document.getElementById(id);
            if (elem) {
                elem.parentNode.removeChild(elem)
            }
        }
    }

    function defaultAdd(style) {

        let cssText = style._getCss();
        style._insertCss = function _insertCss() {
            const {insertCss} = styleManager;
            const moduleId = (style._module && style._module.id) ? style._module.id : "";
            return insertCss(cssText, moduleId);
        };
        if (style._module && style._module.hot && wapp.getTargetObject().hot){
            wapp.getTargetObject().hot.accept(style._module.id);
        }

        let css = styleManager.css;
        let tempLength = css.size;
        let duplicates = false;

        css.add(style);

        if (tempLength === css.size){
            duplicates = true;
        }

        if (!duplicates) {

            if (typeof window !== "undefined") {

                let removeCssFunction = style._insertCss();

                style._remove = function _remove() {
                    removeCssFunction();
                    css.delete(style);
                    styleManager.removeCss.delete(style._remove);
                };

                styleManager.removeCss.add(style._remove);
                return style._remove;

            } else {

                style._remove = function _remove() {
                    css.delete(style);
                    styleManager.removeCss.delete(style._remove);
                };

                styleManager.removeCss.add(style._remove);
                return style._remove;

            }
        } else {

            style._remove = function () {/*fake remove*/};
            return style._remove;

        }
    }

    function defaultGetCssText() {
        const globals = wapp.globals || {};
        const { WAPP = "buildHash", DEV } = globals;
        let cssText = [...styleManager.css].map(function(style){ return style._getCss()}).join("");
        if (!DEV) {
            cssText = cssText.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/gm, " ")
        }
        return [{id:"css_"+WAPP, cssText}]
    }

    function defaultClear() {
        [...styleManager.removeCss].forEach(function (remove){
            remove();
        });
        styleManager.removeCss = new Set();
        styleManager.css = new Set();
    }

    function defaultUse(styles) {
        const {add} = styleManager;
        return add(styles)
    }

    const defaultCss = new Set();
    const defaultRemoveCss = new Set();

    const styleManager = Object.create(Object.prototype, {
        wapp: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: wapp
        },
        insertCss: {
            ...defaultDescriptor,
            value: defaultInsertCss,
        },
        css: {
            ...defaultDescriptor,
            value: defaultCss
        },
        removeCss: {
            ...defaultDescriptor,
            value: defaultRemoveCss
        },
        add: {
            ...defaultDescriptor,
            value: defaultAdd
        },
        clear: {
            ...defaultDescriptor,
            value: defaultClear
        },
        use: {
            ...defaultDescriptor,
            value: defaultUse
        },
        getCssText: {
            ...defaultDescriptor,
            value: defaultGetCssText
        }
    });

    return styleManager;

}

export default function createStyleManager(p = {}) {

    const {wapp, styleManager = createDefaultStyleManager(p)} = p;

    function defaultHandle(req, res, next){
        const targetObject = (wapp.getTargetObject) ? wapp.getTargetObject() : wapp;
        if (!targetObject.config ||
            (targetObject.config && !targetObject.config.styles) ||
            (targetObject.config && targetObject.config.styles && !targetObject.config.styles.disableClearStyles)){
            stylesMiddleware.styleManager.clear();
        }
        next();
    }

    function defaultAdd(p) {
        return stylesMiddleware.styleManager.add(p)
    }

    function defaultUse(p) {
        return stylesMiddleware.styleManager.use(p)
    }

    function defaultGetCssText() {
        return stylesMiddleware.styleManager.getCssText(p)
    }

    const stylesMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        styleManager: {
            ...defaultDescriptor,
            value: styleManager
        },
        add: {
            ...defaultDescriptor,
            value: defaultAdd
        },
        use: {
            ...defaultDescriptor,
            value: defaultUse
        },
        getCssText: {
            ...defaultDescriptor,
            value: defaultGetCssText
        }
    });

    function stylesMiddleware(req, res, next) {
        if (typeof stylesMiddleware.handle === "function"){
            stylesMiddleware.handle(req, res, next);
        }
        return stylesMiddleware;
    }

    mergeProperties(stylesMiddleware, stylesMiddlewareProperties);

    Object.defineProperty(stylesMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "styles", {...defaultDescriptor, writable: false, value: stylesMiddleware});

    return stylesMiddleware;

}
