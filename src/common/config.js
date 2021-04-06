export default function getConfig(p = {}){

    const {config = {}} = p;

    const commonConfig = config.common || {};
    const globalsConfig = config.globals || {};

    const globals = {
        ...globalsConfig,
        DEV: (typeof globalsConfig.DEV !== "undefined") ? globalsConfig.DEV : (typeof DEV !== "undefined") ? DEV : false,
        WAPP: (typeof globalsConfig.WAPP !== "undefined") ? globalsConfig.WAPP : (typeof WAPP !== "undefined") ? WAPP : "buildHash",
        RUN: (typeof globalsConfig.RUN !== "undefined") ? globalsConfig.RUN : (typeof RUN !== "undefined") ? RUN : "",
        TYPE: (typeof globalsConfig.TYPE !== "undefined") ? globalsConfig.TYPE : (typeof TYPE !== "undefined") ? TYPE : "",
        ROOT: (typeof globalsConfig.ROOT !== "undefined") ? globalsConfig.ROOT : (typeof ROOT !== "undefined") ? ROOT : (typeof __dirname !== "undefined") ? __dirname : "/",
        NAME: (typeof globalsConfig.NAME !== "undefined") ? globalsConfig.NAME : (typeof NAME !== "undefined") ? NAME : "",
    };

    const common = {
        ...commonConfig,
        containerElementId: (typeof globals.WAPP !== "undefined" && globals.WAPP) ? (typeof globals.DEV !== "undefined" && globals.DEV) ? "wapplr-container-element-id-"+ globals.WAPP : "app-"+globals.WAPP : "app",
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
