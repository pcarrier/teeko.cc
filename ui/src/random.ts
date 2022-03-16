import { customAlphabet } from "nanoid";

export const randomID = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  8
);
