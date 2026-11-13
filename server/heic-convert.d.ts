declare module "heic-convert" {
  interface ConvertOptions {
    buffer: ArrayBufferLike | Buffer | Uint8Array;
    format: "JPEG" | "PNG";
    quality?: number;
  }
  function heicConvert(options: ConvertOptions): Promise<ArrayBuffer>;
  export default heicConvert;
}
