/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_ARTICLE_URL: string;
    readonly VITE_PROJECT_URL: string;
    readonly VITE_SKILL_URL: string;
    [key: string]: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
