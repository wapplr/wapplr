import style from './template.css';
import wapplrLogo from '../logo';

export default function template(p = {}) {

    const {wapp, children, footerMenu = [{name: "HOME", href:"/"}, {name: "404", href:"/404"}, {name: "500", href:"/500"}, {name: "EXTERNAL", href:"https://google.com", target:"_blank"}], logo = wapplrLogo} = p;
    const {styles} = wapp;
    const {siteName = "Wapplr"} = wapp.config;
    const copyright = `${siteName} ${new Date().getFullYear()} ©`;

    const serverRender = (typeof window === "undefined");

    styles.use(style);

    return `
            <div class="${style.page}">
                <header class="${style.header}">
                    <div class="${style.innerHeader}">
                        <div class="${style.logo}">
                            ${logo({wapp})}
                        </div>
                    </div>
                </header>
                <main class="${style.content}">${children}</main>
                <footer class="${style.footer}">
                    <div>
                        <div class="${style.menu}">
                            ${footerMenu.map(function (menu) {
                                const target = menu.target || "self";
                                const noreferrer = (target === "_blank") ? ' rel="noreferrer"' : "";
                                return '<div><a class="'+style.button+'"  target="'+target+'" href="'+menu.href+'" wapplronclicklistener=""'+noreferrer+'>'+menu.name+'</a></div>'
                            }).join("")}
                        </div>
                        <div class="${style.copyright}">
                            ${copyright}
                        </div>
                    </div>
                </footer>
                <script>
if (${!serverRender}){
    window.addEventListener("scroll", function (e) {
        const header = document.querySelector(".${style.header}");
        if (header){
            header.classList.toggle("${style.sticky}", window.scrollY > 0 )
        }
    })
}
                </script>
            </div>`

}
