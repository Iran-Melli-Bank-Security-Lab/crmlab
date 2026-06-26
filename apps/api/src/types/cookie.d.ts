declare module "cookie" {
  export function parse(cookieHeader: string): Record<string, string>;
}
