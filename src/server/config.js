import fs from "fs";
import path from "path";
import getCommonConfig from '../common/config';

export default function getConfig(p = {}){

    const {config = {}} = p;

    const serverConfig = config.server || {};
    const commonConfig = getCommonConfig(p).config;

    const globals = {...commonConfig.globals};
    const common = {...commonConfig.common};

    let assets = serverConfig.assets;
    let credentials = serverConfig.credentials;
    const dirname = globals.ROOT;

    try {
        if (!assets && fs.existsSync(path.resolve(dirname, "./asset-manifest.json"))){
            assets = JSON.parse(fs.readFileSync(path.resolve(dirname, "./asset-manifest.json"), 'utf-8'))
        }
        if (fs.existsSync(path.resolve(dirname, "./chunk-manifest.json"))){
            const chunks = JSON.parse(fs.readFileSync(path.resolve(dirname, "./chunk-manifest.json"), 'utf-8'))
            if (chunks) {
                assets.chunks = {...chunks}
            }
        }
    } catch (e) {}

    try {
        const credentialsFolder = "secure/"
        if (!credentials && fs.existsSync(path.resolve(dirname, credentialsFolder, "localhost.key"))  && fs.existsSync(path.resolve(dirname, credentialsFolder, "localhost.crt")) ){
            credentials = {
                key: fs.readFileSync(path.resolve(dirname, credentialsFolder, "localhost.key"), 'utf8'),
                cert: fs.readFileSync(path.resolve(dirname, credentialsFolder, "localhost.crt"), 'utf8'),
            }
        }
    } catch (e) {}

    const server = {
        ...serverConfig,
        port: serverConfig.port || 80,
        portSSL: serverConfig.portSSL || 443,
        publicPath: path.resolve(dirname || __dirname, "public"),
        assets: assets,
        credentials: credentials
    }

    return {
        config: {
            ...config,
            globals: globals,
            common: common,
            server: server,
        },
    }
}
