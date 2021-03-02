import {defaultDescriptor, mergeProperties} from "./utils";

export function createDefaultRouter(p = {}) {

    const {wapp, routes} = p;

    function match(p = {}) {

        const {path} = p;
        const routes = router.routes;
        let route = null;
        let params = {};

        routes.forEach(function(r) {
            if (path && r.path) {
                let match = false;
                let thisParams = {};
                try {
                    let rPath = (r.path.slice(-1) === "/") ? r.path.slice(0,-1) : r.path;
                    let sPath = (path.slice(-1) === "/") ? path.slice(0,-1) : path;
                    const rpa = rPath.split("/");
                    const pa = sPath.split("/");
                    let allPartIsMatch = true;
                    let wasAllowChar = false;
                    rpa.forEach(function (rpas, i){
                        const param = (rpas && rpas.slice(0, 1) === ":");
                        const allow = (rpas === "*");
                        if (allow){
                            wasAllowChar = true;
                        }
                        if (typeof pa[i] == "string") {
                            if (pa[i] === rpas || param || allow) {} else {
                                allPartIsMatch = false;
                            }
                            if (param) {
                                thisParams[rpas.slice(1)] = pa[i]
                            }
                        }
                    })
                    if (pa.length > rpa.length && !wasAllowChar) {
                        allPartIsMatch = false;
                    }
                    if (allPartIsMatch) {
                        match = true;
                    }
                } catch (e) {}
                if (match && !route){
                    params = thisParams;
                    route = r;
                }
            }
        });

        return (route) ? {...route, params} : route;

    }

    function getRoute(p = {}) {

        const {path} = p;

        let r = {
            requestPath: null,
            status: null
        };

        if (path) {
            const routeByPath = router.match({path});
            if (routeByPath) {
                r = {requestPath: path, status: 200, ...routeByPath}
            }
        }

        if (!r.status) {

            const notFoundPath = router.match({path: "/404"});
            let homePath = router.match({path: "/home"});
            homePath = homePath || router.match({path: "/"});

            const firstPath = (router.routes[0] && router.routes[0].path) ? router.match({path: router.routes[0].path}) : null;
            const foundPath = (notFoundPath) ? notFoundPath : (homePath) ? homePath : (firstPath) ? firstPath : {...r};

            if (foundPath) {
                r = {requestPath: path, status: 404, ...foundPath};
            }
        }

        return r;

    }

    async function defaultResolve(p = {}) {
        const {path, req, res} = p;
        const {action, ...rest} = router.getRoute({path});
        let r = {...rest};
        if (action) {
            r =  await action({wapp, req, res, ...rest});
        }
        if (router.action){
            const routerAction = router.action;
            r = await routerAction({wapp, req, res, ...rest})
        }
        return r;
    }

    async function defaultAction(p = {}) {
        const {wapp, ...rest} = p;
        return {...rest};
    }

    function defaultAdd(obj) {
        if (typeof obj === "object" && obj.length){
            obj.forEach(function (route) {
                if (typeof route == "object" && route.path) {
                    let foundRoute = false;
                    router.routes.forEach(function (aRoute) {
                        if (aRoute.path === route.path) {
                            foundRoute = true;
                        }
                    })
                    if (!foundRoute) {
                        router.routes.push(route)
                    }
                }
            })
        } else {
            if (typeof obj == "object" && obj.path) {
                let foundRoute = false;
                router.routes.forEach(function (aRoute) {
                    if (aRoute.path === obj.path) {
                        foundRoute = true;
                    }
                })
                if (!foundRoute) {
                    router.routes.push(obj)
                }
            }
        }
    }

    function defaultReplace(obj) {
        if (typeof obj === "object" && obj.length){
            obj.forEach(function (objRoute) {
                if (typeof objRoute == "object" && objRoute.path) {
                    let replaced = false;
                    router.routes.forEach(function (route, i){
                        if (route.path === objRoute.path) {
                            router.routes[i] = objRoute;
                            replaced = true
                        }
                    })
                    if (!replaced) {
                        router.routes.push(objRoute)
                    }
                }
            })
        } else {
            if (typeof obj == "object" && obj.path) {
                let replaced = false;
                router.routes.forEach(function (route, i){
                    if (route.path === obj.path) {
                        router.routes[i] = obj;
                        replaced = true;
                    }
                })
                if (!replaced) {
                    router.routes.push(obj)
                }
            }
        }
    }

    const defaultRoutes = routes || [
        {path: "/", contentName: "log"},
    ];

    const router = Object.create(Object.prototype, {
        wapp: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: wapp
        },
        match: {
            ...defaultDescriptor,
            value: match
        },
        getRoute: {
            ...defaultDescriptor,
            value: getRoute
        },
        resolve: {
            ...defaultDescriptor,
            value: defaultResolve
        },
        action: {
            ...defaultDescriptor,
            value: defaultAction
        },
        routes: {
            ...defaultDescriptor,
            writable: false,
            value: defaultRoutes
        },
        add: {
            ...defaultDescriptor,
            value: defaultAdd
        },
        replace: {
            ...defaultDescriptor,
            value: defaultReplace
        }
    })

    return router;

}

export default function createRouter(p = {}) {

    const {wapp, routeManager = createDefaultRouter(p)} = p;

    async function defaultHandle(req, res, next){

        const wappResponse = res.wappResponse;
        const wappRequest = req.wappRequest;

        const routerRes = routerMiddleware.routeManager.resolve;
        const path = wappRequest.path || wappRequest.url;

        const route = await routerRes({path, req, res});

        wappResponse.statusCode = (wappResponse.statusCode === 200 || !wappResponse.statusCode) ? route.status : wappResponse.statusCode;
        wappResponse.route = route;
        wappResponse.content = route.content;

        if (wappResponse.statusCode) {
            wappResponse.status(wappResponse.statusCode);
        }

        if (wappRequest.path === "/500" && wappResponse.statusCode === 404) {
            //test an error
            wappResponse.route.contentName = "";
            throw new Error("Internal Server Error (Test)")
        }

        return next();
    }

    function defaultAdd(p) {
        return routerMiddleware.routeManager.add(p)
    }

    function defaultReplace(p) {
        return routerMiddleware.routeManager.replace(p)
    }

    const routerMiddlewareProperties = Object.create(Object.prototype, {
        handle: {
            ...defaultDescriptor,
            value: defaultHandle
        },
        routeManager: {
            ...defaultDescriptor,
            value: routeManager
        },
        add: {
            ...defaultDescriptor,
            value: defaultAdd
        },
        replace: {
            ...defaultDescriptor,
            value: defaultReplace
        }
    })

    async function routerMiddleware(req, res, next) {
        if (typeof routerMiddleware.handle === "function"){
            return await routerMiddleware.handle(req, res, next);
        }

        return routerMiddleware;
    }

    mergeProperties(routerMiddleware, routerMiddlewareProperties);

    Object.defineProperty(routerMiddleware, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    Object.defineProperty(wapp, "router", {...defaultDescriptor, writable: false, value: routerMiddleware});

    return routerMiddleware;

}
