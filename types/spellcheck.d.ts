declare module "nspell" {
  interface Dictionary {
    aff: Uint8Array;
    dic: Uint8Array;
  }

  interface Nspell {
    correct(word: string): boolean;
    suggest(word: string): string[];
  }

  function nspell(dictionary: Dictionary): Nspell;
  export default nspell;
}

declare module "dictionary-en-gb" {
  interface Dictionary {
    aff: Uint8Array;
    dic: Uint8Array;
  }

  const dictionary: Dictionary;
  export default dictionary;
}
