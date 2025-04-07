/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DJANGO_API_URL: string;
  // ここに他の環境変数を追加
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 