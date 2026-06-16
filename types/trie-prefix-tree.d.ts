declare module "trie-prefix-tree" {
  interface TrieApi {
    getAnagrams(letters: string): string[];
    getSubAnagrams(letters: string): string[];
    hasWord(word: string): boolean;
    getWords(sorted?: boolean): string[];
  }

  function trie(words: string[]): TrieApi;
  export = trie;
}
