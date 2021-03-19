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
    });

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
        },
        NAME: {
            ...defaultDescriptor,
            value: globalConfig.NAME
        }
    });

    const defaultTarget = ("undefined" == typeof window) ? "node" : "web";

    const defaultGetTargetObject = function (){
        const target = (wapp.target === "node") ? "server" : "client";
        return wapp[target];
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
    });

    Object.defineProperty(wapp, "wapp", {...defaultDescriptor, writable: false, enumerable: false, value: wapp});

    return wapp;

}
