import style from './logo.css';

export default function logo({wapp}) {

    const {styles} = wapp;

    styles.use(style);

    return `
        <div class="${style.logo}">
            <div class="${style.icon}">
                <svg class="${style.svg}" xmlns="http://www.w3.org/2000/svg" id="Layer_1" data-name="Layer 1" viewBox="0 0 252 211.72">
                    <path d="M15.52,246.7c13-22.86,26-45.68,38.85-68.57Q86.31,121.39,118.19,64.6a17.15,17.15,0,0,1,5.74-5.9c11.18-6.91,22.53-13.55,33.83-20.27,1.07-.63,2.19-1.17,4.63-2.46L57.52,222.7h210v1c-6.78,3.79-13.62,7.48-20.32,11.41-7,4.08-13.8,8.38-20.68,12.59q-103.26,0-206.52,0A21.71,21.71,0,0,1,15.52,246.7Z" transform="translate(-15.52 -35.97)"/>
                    <path d="M225.94,198.17c-9.24,0-17.66.1-26.07-.12-1.11,0-2.57-1.41-3.21-2.53q-23.55-41.67-46.87-83.45a5.41,5.41,0,0,1-.16-4.4c3.89-7.34,8.06-14.52,12.67-22.72Z" transform="translate(-15.52 -35.97)"/>
                </svg>
            </div>
        </div>
    `
}
