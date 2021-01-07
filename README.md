# Wapplr

Wapplr is a middleware-style web application that runs on both the server and client side.
The server works same as the [express](https://github.com/expressjs/express) (with some differences),
on the client side works similarly, but the new request starts with a change location handler.

```js
//server.js
import setMyContents from "./common.js";
import wapplrServer from "wapplr";
const wapp = wapplrServer({config: {
        globals: {
            WAPP: "yourBuildHash",
            ROOT: __dirname
        }
    }
});
setMyContents({wapp});
wapp.server.listen();
```

```js
//client.js
import setMyContents from "./common.js";
import wapplrClient from "wapplr";
const wapp = wapplrClient({config: {
        globals: {
            WAPP: "yourBuildHash"
        }
    }
});
setMyContents({wapp});
wapp.client.listen();
```

```js
//common.js
import style from "./style.css";
export default function setMyContents(p = {}) {

    const {wapp} = p;

    wapp.contents.add({
        home: {
            render: function (p = {}) {
                const {wapp} = p;
                const {request, response, styles} = wapp;
                styles.use(style);
                
                return `
                <div class="${style.home}">
                    HOME
                </div>
                `
            },
            description: "My first app",
        }
    })

    wapp.router.replace([
        {path: "/", contentName: "home"}
    ])

    wapp.router.add([
        {path: "/about", contentName: "home"},
        {path: "/contact", contentName: "home"},
    ])

}
```

```css
/*style.css*/
.home{
    color: black;
}
```

### Use it as an Express middleware

If you would like to use the Wapplr, or your package what you build with Wapplr as an express middleware you can do that:

```js
//server.js
import wapplrServer from "wapplr";
import express from "express";
const app = express();
const wapp = wapplrServer();
setMyContents({wapp});
/*...*/
app.use(wapp.server.app);
app.listen(3000);
```

## Why

It was made to minimize dependencies and because we like to work in a known structure for us. 
We are happy to recommend this package to everyone.

## Inspiration

These wonderful packages have inspired us, so there are many similarities with them:

- [express](https://github.com/expressjs/express)
- [history](https://github.com/ReactTraining/history)
- [redux](https://github.com/reduxjs/redux)
- [isomorphic-style-loader](https://www.npmjs.com/package/isomorphic-style-loader)

## Installation

```sh
npm install wapplr
```

## Usage with [wapplr-cli](https://github.com/wapplr/wapplr-cli)

The easiest way to use, it will create a new package to the current folder with "my-package" name then start it.
```sh
npm install -g wapplr-cli
// on the current folder
npx wapplr-cli start my-package
```

## Wapplr lifecycle

The Wapplr app get the request from Node.js on server side, or from history on client side. 
Then start run the bullet in middlewares:

- Wapp: set and populate some property and function to the request and response.
- Static: if the request is an exists file it return that (works just server side).
- Router: find the route and properties. It is similar what do express router, but it does not use "pathtoregexp" package
instead use few line code what can parse routes from this type: "/your/route/:param1/:param2"
- States: bullet-in state manager, what set initial state from request and response object of wapp on the server side. 
This state what the server side render will put to the html body, and the client side states-middleware can read and parse it.
- Requests: this middleware build half-ready http requests and helpers functions for http requests from database schema.
- Contents: this middleware find the content by the route data. The content contain a render function, that will run at the end.
- Styles: collects the styles what are used on the content. On the server side generate a text from styles. 
  On the client side remove the collected styles, and put per components.
- Render: it renders the content if that is exists: on server side it set headers and send response. On client side change the container content. 
- Log: log some data

## HOC - Server side initialize

This example show you how can create a reusable module with a server what you can use as a main process or a middleware too.
If you want to start or build with wapplr-cli need to:

- Export a function what return a "wapp" object
- Export a middleware function, if you would like to reuse your package as a middleware.
- Export a "run" function what listening the server
- Run it if the RUN global variable is same as your package name. Need to set "globals" from here.

Same file is created when you create the package with wapplr-cli:

```js
//server/index.js
import wapplrServer from "wapplr";

export default async function createServer(p = {}) {
    // noinspection UnnecessaryLocalVariableJS
    const wapp = p.wapp || wapplrServer({...p});
    /*code here myFunction(wapp)*/
    return wapp;
}

export function createMiddleware(p = {}) {
    // noinspection JSUnusedAssignment,JSUnusedLocalSymbols
    return async function middleware(req, res, next) {
        // eslint-disable-next-line no-unused-vars
        const wapp = req.wapp || p.wapp || await createServer(p);
        /*code here myFunction(req, res, next)*/
        next();
    }
}

const defaultConfig = {
    config: {
        globals: {
            DEV: (typeof DEV !== "undefined") ? DEV : undefined,
            WAPP: (typeof WAPP !== "undefined") ? WAPP : undefined,
            RUN: (typeof RUN !== "undefined") ? RUN : undefined,
            TYPE: (typeof TYPE !== "undefined") ? TYPE : undefined,
            ROOT: (typeof ROOT !== "undefined") ? ROOT : __dirname
        }
    }
}

export async function run(p = defaultConfig) {
    const wapp = await createServer(p);
    const globals = wapp.globals;
    const {DEV} = globals;

    const app = wapp.server.app;
    app.use(createMiddleware({wapp, ...p}));
    wapp.server.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
        app.hot = module.hot;
        module.hot.accept("./index");
    }

    return wapp;
}

if (typeof RUN !== "undefined" && RUN === "my-package") {
    run();
}
```

## HOC - Client side initialize

This example show you how can create a reusable module with a client what you can use as a main process or a middleware too.
If you want to start or build with wapplr-cli need to:

- Export a function what return a "wapp" object
- Export a middleware function, if you would like to reuse your package as a middleware.
- Export a "run" function what listening the client
- Run it if the RUN global variable is same as your package name. Need to set "globals" from here.

Same file is created when you create the package with wapplr-cli:

```js
//client/index.js
import wapplrClient from "wapplr";

export default function createClient(p) {
    // noinspection UnnecessaryLocalVariableJS
    const wapp = p.wapp || wapplrClient({...p});
    /*code here myFunction(wapp)*/
    return wapp;
}

export function createMiddleware(p = {}) {
    // noinspection JSUnusedAssignment,JSUnusedLocalSymbols
    return function middleware(req, res, next) {
        // eslint-disable-next-line no-unused-vars
        const wapp = req.wapp || p.wapp || createClient(p);
        /*code here myFunction(req, res, next)*/
        next();
    }
}

const defaultConfig = {
    config: {
        globals: {
            DEV: (typeof DEV !== "undefined") ? DEV : undefined,
            WAPP: (typeof WAPP !== "undefined") ? WAPP : undefined,
            RUN: (typeof RUN !== "undefined") ? RUN : undefined,
            TYPE: (typeof TYPE !== "undefined") ? TYPE : undefined,
            ROOT: (typeof ROOT !== "undefined") ? ROOT : "/"
        }
    }
}

export function run(p = defaultConfig) {
    const wapp = createClient(p);
    const globals = wapp.globals;
    const {DEV} = globals;

    const app = wapp.client.app;
    app.use(createMiddleware({wapp, ...p}));
    wapp.client.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
        app.hot = module.hot;
        module.hot.accept();
    }

    return wapp;
}

if (typeof RUN !== "undefined" && RUN === "my-package") {
    run();
}

```

## Documentation

This is a brand-new package, more documentation is expected as soon as possible.

## License

MIT
