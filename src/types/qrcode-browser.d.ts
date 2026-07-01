declare module "qrcode/lib/browser.js" {
  export function toDataURL(
    text: string,
    options?: {
      width?: number;
      margin?: number;
      color?: { dark?: string; light?: string };
      type?: string;
      rendererOpts?: { quality?: number };
    },
  ): Promise<string>;
}