import { f as factorySpace } from "./micromark-factory-space-DyAHBL3a.js";
import { m as markdownLineEnding, i as markdownSpace } from "./micromark-util-character-Cbf2nU-f.js";
function factoryWhitespace(effects, ok) {
  let seen;
  return start;
  function start(code) {
    if (markdownLineEnding(code)) {
      effects.enter("lineEnding");
      effects.consume(code);
      effects.exit("lineEnding");
      seen = true;
      return start;
    }
    if (markdownSpace(code)) {
      return factorySpace(effects, start, seen ? "linePrefix" : "lineSuffix")(code);
    }
    return ok(code);
  }
}
export {
  factoryWhitespace as f
};
