/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** WhatsApp business number in international format, digits only. */
  readonly VITE_WHATSAPP_NUMBER?: string
  /** GA4 measurement ID, e.g. G-XXXXXXX. Only loaded after analytics consent. */
  readonly VITE_GA4_ID?: string
  /** Meta Pixel ID. Only loaded after analytics consent. */
  readonly VITE_META_PIXEL_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
