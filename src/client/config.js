import getCommonConfig from '../common/config';

export default function getConfig(p = {}){

    const {config = {}} = p;

    const clientConfig = config.client || {};
    const commonConfig = getCommonConfig(p).config;

    const globals = {...commonConfig.globals};
    const common = {...commonConfig.common};

    const client = {
        ...clientConfig,
    };

    return {
        config: {
            ...config,
            globals: globals,
            common: common,
            client: client,
        },
    }
}
