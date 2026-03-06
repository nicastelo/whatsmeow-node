declare module "qrcode-terminal" {
  const qrcode: {
    generate(text: string, options?: { small?: boolean }): void;
  };
  export default qrcode;
}
