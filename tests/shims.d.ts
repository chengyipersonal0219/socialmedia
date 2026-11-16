declare module 'jsdom' {
  export class JSDOM {
    constructor(html: string, options?: { url?: string; runScripts?: string });
    window: Window & { eval(code: string): unknown };
  }
}
