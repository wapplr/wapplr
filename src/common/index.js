import {defaultDescriptor, mergeProperties} from './utils.js';
import getConfig from "./config";

export default function createWapp(p = {}) {

    const {config = {}} = getConfig(p);
    const commonConfig = config.common;
    const globalConfig = config.globals;

    const {containerElementId, appStateName, siteName, description, lang, ...rest} = commonConfig;

    const defaultConfig = Object.create(Object.prototype, {
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

    mergeProperties(defaultConfig, rest);

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
            value: null
        },
        appStateName: {
            ...defaultDescriptor,
            value: null
        },
        sended: {
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
    };

    const wapp = Object.create(Object.prototype, {
        config: {
            ...defaultDescriptor,
            writable: false,
            value: defaultConfig
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
            value: Object.create(Object.prototype, defaultResponseProperties)
        },
        request: {
            ...defaultDescriptor,
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
            enumerable: false,
            value: function () {
                this.response = mergeProperties({}, this.defaultResponse)
                return this.response;
            }
        },
        resetRequest: {
            ...defaultDescriptor,
            enumerable: false,
            value: function () {
                this.request = mergeProperties({}, this.defaultRequest)
                return this.request;
            }
        }
    });

    Object.defineProperty(wapp, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});
    Object.defineProperty(wapp.response, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return wapp;

}
