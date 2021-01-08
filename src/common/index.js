import {defaultDescriptor, mergeProperties} from './utils.js';
import getConfig from "./config";

export default function createWapp(p = {}) {

    const {config = {}} = getConfig(p);
    const commonConfig = config.common;
    const globalConfig = config.globals;

    const {containerElementId, appStateName, siteName, description, lang, ...rest} = commonConfig;

    const defaultSettings = Object.create(Object.prototype, {
        containerElementId: {
            ...defaultDescriptor,
            value: containerElementId
        },
        appStateName: {
            ...defaultDescriptor,
            value: appStateName
        },
        siteName: {
            ...defaultDescriptor,
            value: siteName
        },
        description: {
            ...defaultDescriptor,
            value: description
        },
        lang: {
            ...defaultDescriptor,
            value: lang
        }
    })

    mergeProperties(defaultSettings, rest);

    const defaultGlobals = Object.create(Object.prototype, {
        DEV: {
            ...defaultDescriptor,
            value: globalConfig.DEV
        },
        RUN: {
            ...defaultDescriptor,
            value: globalConfig.RUN
        },
        WAPP: {
            ...defaultDescriptor,
            value: globalConfig.WAPP
        },
        TYPE: {
            ...defaultDescriptor,
            value: globalConfig.TYPE
        },
        ROOT: {
            ...defaultDescriptor,
            value: globalConfig.ROOT
        }
    })

    const defaultTarget = ("undefined" == typeof window) ? "node" : "web"

    const defaultGetTargetObject = function (){
        const target = (wapp.target === "node") ? "server" : "client";
        return wapp[target];
    }

    const defaultRequestProperties = {
        timestamp: {
            ...defaultDescriptor,
            value: null,
        },
        path: {
            ...defaultDescriptor,
            value: null
        },
        url: {
            ...defaultDescriptor,
            value: null
        },
        method: {
            ...defaultDescriptor,
            value: null
        },
        httpVersion: {
            ...defaultDescriptor,
            value: null
        },
        hostname: {
            ...defaultDescriptor,
            value: null
        },
        protocol: {
            ...defaultDescriptor,
            value: null
        },
        secure: {
            ...defaultDescriptor,
            value: null
        },

        remoteAddress: {
            ...defaultDescriptor,
            value: null
        },
        userAgent: {
            ...defaultDescriptor,
            value: null
        },

        req: {
            ...defaultDescriptor,
            enumerable: false,
            value: null
        },
        res: {
            ...defaultDescriptor,
            enumerable: false,
            value: null
        },
    }

    const defaultResponseProperties = {
        statusCode: {
            ...defaultDescriptor,
            value: null
        },
        statusMessage: {
            ...defaultDescriptor,
            value: null
        },
        errorMessage: {
            ...defaultDescriptor,
            value: null
        },
        containerElementId: {
            ...defaultDescriptor,
            enumerable: false,
            value: null
        },
        appStateName: {
            ...defaultDescriptor,
            enumerable: false,
            value: null
        },

        req: {
            ...defaultDescriptor,
            enumerable: false,
            value: null
        },
        res: {
            ...defaultDescriptor,
            enumerable: false,
            value: null
        },
    };

    const wapp = Object.create(Object.prototype, {
        settings: {
            ...defaultDescriptor,
            writable: false,
            value: defaultSettings
        },
        globals: {
            ...defaultDescriptor,
            writable: false,
            value: defaultGlobals
        },
        target: {
            ...defaultDescriptor,
            writable: false,
            value: defaultTarget
        },
        getTargetObject: {
            ...defaultDescriptor,
            writable: false,
            value: defaultGetTargetObject
        },
        response: {
            ...defaultDescriptor,
            writable: false,
            value: Object.create(Object.prototype, defaultResponseProperties)
        },
        request: {
            ...defaultDescriptor,
            writable: false,
            value: Object.create(Object.prototype, defaultRequestProperties)
        },
        defaultResponse: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: Object.create(Object.prototype, defaultResponseProperties)
        },
        defaultRequest: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: Object.create(Object.prototype, defaultRequestProperties)
        },
        resetResponse: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: function () {
                const t = this;
                Object.keys(t.defaultResponse).forEach(function (key){
                    t.response[key] = t.defaultResponse[key];
                })
                Object.keys(t.response).forEach(function (key){
                    if (typeof t.defaultResponse[key] == "undefined") {
                        delete t.response[key]
                    }
                })
            }
        },
        resetRequest: {
            ...defaultDescriptor,
            writable: false,
            enumerable: false,
            value: function () {
                const t = this;
                Object.keys(t.defaultRequest).forEach(function (key){
                    t.request[key] = t.defaultRequest[key];
                })
                Object.keys(t.request).forEach(function (key){
                    if (typeof t.defaultRequest[key] == "undefined") {
                        delete t.request[key]
                    }
                })
            }
        }
    });

    Object.defineProperty(wapp, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});
    Object.defineProperty(wapp.response, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return wapp;

}
