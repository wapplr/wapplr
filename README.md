# Wapplr

Wapplr is a middleware-style web application that runs on both the server and client side.
The server works the same as [express](https://github.com/expressjs/express) (with some differences),
on the client side works similarly, but the new request starts with a change location handler.

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

## Usage

The easiest way to use it: 
```sh
// on the current folder
npx wapplr-cli create my-package
npx wapplr-cli start
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
- Render: render the content. On server side it set headers and send response. On client side change the container content. 
- Log: log some data

## Server side initialize

This example show you how can create a server what you can use as a main process or a middleware too.
If you want to start or build with wapplr-cli need to:

- Export a function what return a "wapp" object
- Export a "run" function what listening a server
- Run it if the RUN is same as your package name
- Optional export the createMiddleware, if you would like to use your package as a middleware.

```js
import wapplrServer from "wapplr";

export default async function createServer(p = {}) {
    const wapp = p.wapp || wapplrServer({...p});
    /*code here myFunction(wapp)*/
    return wapp;
}

export function createMiddleware(p = {}) {
    return async function yourMiddleware(req, res, next) {
        const wapp = req.wapp || p.wapp || await createServer(p);
        /*code here myFunction(req, res, next)*/
        next();
    }
}

export async function run(p = {}) {

    const wapp = await createServer(p);
    const globals = wapp.globals;
    const {DEV} = globals;
    
    const app = wapp.server.app;
    if (typeof DEV !== "undefined" && DEV && module.hot) {
        app.hot = module.hot;
    }
    
    app.use(createMiddleware({wapp, ...p}));

    wapp.server.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
        module.hot.accept("./index");
    }

    return wapp;

}

if (typeof RUN !== "undefined" && RUN === "my-package") {
    run({
        config: {
            globals: {
                DEV: (typeof DEV !== "undefined") ? DEV : undefined,
                WAPP: (typeof WAPP !== "undefined") ? WAPP : undefined,
                RUN: (typeof RUN !== "undefined") ? RUN : undefined,
                TYPE: (typeof TYPE !== "undefined") ? TYPE : undefined,
            }
        }
    });
}
```

### Use it as an Express middleware

If you would like to use the Wapplr, or your package what you build with Wapplr as an express middleware you can do that:

```js
import wapplrServer from "wapplr";
const express = require('express')
const app = express()
const wapp = wapplrServer();
/*...*/
app.use(wapp.server.app)
```

## Client side initialize

This example show you how can create a client what you can use as a main process or a middleware too.
If you want to start or build with wapplr-cli need to:

- Export a function what return a "wapp" object
- Export a "run" function what listening a server
- Run it if the RUN is same as your package name
- Optional export the createMiddleware, if you would like to use your package as a middleware.

(it is very similar as the server side code)

```js
import wapplrClient from "wapplr";

export default function createClient(p) {
    const wapp = p.wapp || wapplrClient({...p});
    /*code here myFunction(wapp)*/
    return wapp;
}

export function createMiddleware(p = {}) {
    return function yourMiddleware(req, res, next) {
        const wapp = req.wapp || p.wapp || createClient(p);
        /*code here myFunction(req, res, next)*/
        next();
    }
}

export function run(p = {}) {
    const wapp = createClient(p);
    const globals = wapp.globals;
    const {DEV} = globals;

    const app = wapp.client.app;
    app.use(createMiddleware({wapp, ...p}))
    wapp.client.listen();

    if (typeof DEV !== "undefined" && DEV && module.hot){
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
