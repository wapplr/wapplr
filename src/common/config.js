export default function getConfig(p = {}){

    const {config = {}} = p;

    const commonConfig = config.common || {};
    const globalsConfig = config.globals || {};

    const globals = {
        ...globalsConfig,
        DEV: (typeof DEV !== "undefined") ? DEV : (typeof globalsConfig.DEV !== "undefined") ? globalsConfig.DEV : false,
        WAPP: (typeof WAPP !== "undefined") ? WAPP : (typeof globalsConfig.WAPP !== "undefined") ? globalsConfig.WAPP : "buildHash",
        RUN: (typeof RUN !== "undefined") ? RUN : (typeof globalsConfig.RUN !== "undefined") ? globalsConfig.RUN : "",
        TYPE: (typeof TYPE !== "undefined") ? TYPE : (typeof globalsConfig.TYPE !== "undefined") ? globalsConfig.TYPE : "",
        ROOT: (typeof ROOT !== "undefined") ? ROOT : (typeof globalsConfig.ROOT !== "undefined") ? globalsConfig.ROOT : (typeof __dirname !== "undefined") ? __dirname : "/",
    }

    const common = {
        ...commonConfig,
        containerElementId: (typeof globals.WAPP !== "undefined" && globals.WAPP) ? (typeof globals.DEV !== "undefined" && globals.DEV) ? "wapplr-container-element-id-"+ globals.WAPP : globals.WAPP : "app",
        appStateName: (typeof globals.WAPP !== "undefined" && globals.WAPP) ? (typeof globals.DEV !== "undefined" && globals.DEV) ? "WAPPLR_APP_STATE_" + globals.WAPP : globals.WAPP : "APP_STATE",
        siteName: commonConfig.siteName || "Wapplr",
        lang: commonConfig.lang || "en"
    };

    return {
        config: {
            ...config,
            globals: globals,
            common: common
        },
    }
}
