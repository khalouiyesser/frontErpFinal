/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    // Ajoutez ici d'autres variables VITE_ si besoin
    // readonly VITE_OTHER_VAR: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}