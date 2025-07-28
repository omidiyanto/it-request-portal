/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TIMEZONE: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 