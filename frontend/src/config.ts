const env = import.meta.env as ImportMetaEnv & { REACT_APP_API_URL?: string };
const API_URL = env.VITE_API_URL ?? env.REACT_APP_API_URL;

// En mode Docker/Nginx, REACT_APP_API_URL est instanciée comme une string vide ""
// On tombe donc dans ce cas sans utiliser le fallback
const BACKEND_URL = API_URL !== undefined 
    ? API_URL 
    : `http://${window.location.hostname}:4000`;

export default BACKEND_URL;
