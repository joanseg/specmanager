import { f as factorySpace } from "./micromark-factory-space-DyAHBL3a.js";
import { h as markdownLineEndingOrSpace, m as markdownLineEnding, i as markdownSpace } from "./micromark-util-character-Cbf2nU-f.js";
const tasklistCheck = {
  name: "tasklistCheck",
  tokenize: tokenizeTasklistCheck
};
function gfmTaskListItem() {
  return {
    text: {
      [91]: tasklistCheck
    }
  };
}
function tokenizeTasklistCheck(effects, ok, nok) {
  const self = this;
  return open;
  function open(code) {
    if (self.previous !== null || !self._gfmTasklistFirstContentOfListItem) {
      return nok(code);
    }
    effects.enter("taskListCheck");
    effects.enter("taskListCheckMarker");
    effects.consume(code);
    effects.exit("taskListCheckMarker");
    return inside;
  }
  function inside(code) {
    if (markdownLineEndingOrSpace(code)) {
      effects.enter("taskListCheckValueUnchecked");
      effects.consume(code);
      effects.exit("taskListCheckValueUnchecked");
      return close;
    }
    if (code === 88 || code === 120) {
      effects.enter("taskListCheckValueChecked");
      effects.consume(code);
      effects.exit("taskListCheckValueChecked");
      return close;
    }
    return nok(code);
  }
  function close(code) {
    if (code === 93) {
      effects.enter("taskListCheckMarker");
      effects.consume(code);
      effects.exit("taskListCheckMarker");
      effects.exit("taskListCheck");
      return after;
    }
    return nok(code);
  }
  function after(code) {
    if (markdownLineEnding(code)) {
      return ok(code);
    }
    if (markdownSpace(code)) {
      return effects.check({
        tokenize: spaceThenNonSpace
      }, ok, nok)(code);
    }
    return nok(code);
  }
}
function spaceThenNonSpace(effects, ok, nok) {
  return factorySpace(effects, after, "whitespace");
  function after(code) {
    return code === null ? nok(code) : ok(code);
  }
}
export {
  gfmTaskListItem as g
};
