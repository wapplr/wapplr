import style from "../common/template/app.css";

export default function html({wapp, req, res}) {

    const config = wapp.server.config;
    const {
        siteName = "Wapplr",
        assets = {},
        lang = "en_US",
        viewport="width=device-width, initial-scale=1",
        themeColor="#ffffff",
        manifest="/manifest.json",
        icon="data:image/png;base64,iVBORw0KGgo=",
        appleTouchIcon,
        appStyle = style
    } = config;

    const {store, content = {}, statusCode = 200, containerElementId = "app", appStateName = "APP_STATE"} = res.wappResponse;
    const state = (store) ? store.getState() : {};

    let {render = "", title = "", description = "", author = ""} = content;

    if (typeof title === "function") {title = title({wapp, req, res});}
    title = `${(title) ? title : (statusCode === 404) ? "Not Found | " + siteName : "Untitled Page | " + siteName }`;

    if (typeof description === "function") {description = description({wapp, req, res})}
    description = (description) ? description : (title && title.split) ? title.split(" | ")[0] : title;

    if (typeof author === "function") {author = author({wapp, req, res})}
    author = (author || siteName);

    if (typeof render === "function") {render = render({wapp, req, res})}

    wapp.styles.use(appStyle);

    const styles = wapp.styles.getCssText();
    const styleText = styles.map(function(style) {return `<style id="${style.id}">${style.cssText}</style>`}).join("");

    const csStyles = assets.getCsStyles();
    const cssText = csStyles.map(function(css) {
        return `<link rel="stylesheet" type="text/css" href="${css}" />`
    }).join("");

    const stateText = `<script>window["${appStateName}"] = ${JSON.stringify(state || {})}</script>`;

    const scripts = assets.getScripts();

    const scriptText = scripts.map(function (script) {
        if (script) {
            return `<script src="${script}" ></script>`;
        }
        return "";
    }).join(" ");

    const headComponent = wapp.contents.getComponent("head");
    const headText = (headComponent) ? headComponent.render(wapp) : "";
    const htmlLang = lang.split("_")[0];

    return`<!DOCTYPE html>
<html lang="${htmlLang}">
    <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <meta name="description" content="${description}">
        <meta name="author" content="${author}">
        <meta name="viewport" content="${viewport}">
        <meta name="theme-color" content="${themeColor}">
        <link rel="manifest" href="${manifest}" />
        <link rel="icon" href=${icon}>
        <link rel="apple-touch-icon" href="${appleTouchIcon || icon}">
        ${headText}
        ${styleText}
        ${cssText}
    </head>
    <body>
        <div class="${appStyle.app}" id="${containerElementId}">${render}</div>
        ${stateText}
        ${scriptText}
    </body>
</html>
`
}
