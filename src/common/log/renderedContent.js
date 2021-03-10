import defaultTemplateStyle from "../template/template.css";
import defaultAppStyle from "../template/app.css";
import defaultLogoStyle from "../logo/logo.css";
import defaultLogStyle from "./log.css";

function getLogo(p) {
    const {logoStyle} = p;
    return `<div class="${logoStyle.logo}">
    <div class="${logoStyle.icon}">
        <svg class="${logoStyle.svg}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 252 211.72">
            <path d="M15.52,246.7c13-22.86,26-45.68,38.85-68.57Q86.31,121.39,118.19,64.6a17.15,17.15,0,0,1,5.74-5.9c11.18-6.91,22.53-13.55,33.83-20.27,1.07-.63,2.19-1.17,4.63-2.46L57.52,222.7h210v1c-6.78,3.79-13.62,7.48-20.32,11.41-7,4.08-13.8,8.38-20.68,12.59q-103.26,0-206.52,0A21.71,21.71,0,0,1,15.52,246.7Z" transform="translate(-15.52 -35.97)" />
            <path d="M225.94,198.17c-9.24,0-17.66.1-26.07-.12-1.11,0-2.57-1.41-3.21-2.53q-23.55-41.67-46.87-83.45a5.41,5.41,0,0,1-.16-4.4c3.89-7.34,8.06-14.52,12.67-22.72Z" transform="translate(-15.52 -35.97)" />
        </svg>
    </div>
</div>`

}

function getStyle(p) {
    const {type, templateStyle, appStyle, logoStyle, logStyle} = p;
    return`<style ${(type === "content" ? "scoped" : "")}>${templateStyle._getCss()} ${appStyle._getCss()} ${logoStyle._getCss()} ${logStyle._getCss()} </style>`
}

function getContent(p) {
    const {templateStyle, logStyle, text, copyright, toConsole, logo, footerMenu} = p;

    return `<div class="${templateStyle.page}">
                <div class="${templateStyle.header}">
                    <div class="${templateStyle.innerHeader}">
                        <div class="${templateStyle.logo}">
                            ${logo}
                        </div>
                    </div>
                </div>
                <div class="${templateStyle.content}">
                    <div class="${logStyle.log}">
                        <div class="${logStyle.logo}">
                            ${logo}
                        </div>
                    <div>${text}</div>
                    </div>
                </div>
                <div class="${templateStyle.footer}">
                    <div>
                        <div class="${templateStyle.menu}">
                            ${footerMenu}
                        </div>
                        <div class="${templateStyle.copyright}">${copyright}</div>
                    </div>
                </div>
                <script>
                window.addEventListener("scroll", function (e) {
                    const header = document.body.querySelector(".${templateStyle.header}");
                    if (header){
                        header.classList.toggle("${templateStyle.sticky}", window.scrollY > 0 )
                    }
                });
                if (${typeof toConsole === "string"}){
                    console.log(\`${toConsole}\`);
                }
                </script>
            </div>`
}

function getHtml(p) {

    const {title, style, content, appStyle} = p;

    return `<html lang="en">
    <head>
        <meta charSet="utf-8"/>
        <title>${title}</title>
        <meta name="description" content="${title.split(" | ")[0]}"/>
        <meta name="author" content="Wapplr"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="icon" href="data:image/png;base64,iVBORw0KGgo="/>
        ${style}
    </head>
    <body>
        <div class="${appStyle.app}" id="wapplr-container-element-id-buildHash">
            ${content}
        </div>
    </body>
</html>
`
}

export default function renderedContent(p = {}) {

    const {
        templateStyle = defaultTemplateStyle,
        appStyle = defaultAppStyle,
        logoStyle = defaultLogoStyle,
        logStyle = defaultLogStyle
    } = p;

    const {
        title = "Log | Wapplr",
        text = "["+Date.now()+" - ::1] HTTP:1.1 GET / - [200]",
        copyright = `Wapplr ${new Date().getFullYear()} ©`,
        toConsole = false,
        logo = getLogo({logoStyle, ...p}),
        footerMenu = "",
        type = "",
    } = p;

    const {
        style = getStyle({templateStyle, appStyle, logoStyle, logStyle, ...p}),
        content = getContent({templateStyle, logStyle, text, copyright, toConsole, logo, footerMenu, ...p})
    } = p;

    if (type === "content"){
        return `${content} ${style}`
    }

    const {
        html = getHtml({title, style, content, appStyle, ...p})
    } = p;

    return html;
}
