import { h as markdownLineEndingOrSpace, j as unicodeWhitespace, u as unicodePunctuation } from "./micromark-util-character-FzoMTwYT.js";
function classifyCharacter(code) {
  if (code === null || markdownLineEndingOrSpace(code) || unicodeWhitespace(code)) {
    return 1;
  }
  if (unicodePunctuation(code)) {
    return 2;
  }
}
export {
  classifyCharacter as c
};
