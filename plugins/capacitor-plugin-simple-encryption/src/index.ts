import { registerPlugin } from "@capacitor/core";

import type { SimpleEncryptionPlugin } from "./definitions";

const SimpleEncryption = registerPlugin<SimpleEncryptionPlugin>(
  "SimpleEncryption",
  {
    web: () => import("./web").then((m) => new m.SimpleEncryptionWeb()),
  }
);

export * from "./definitions";
export { SimpleEncryption };
