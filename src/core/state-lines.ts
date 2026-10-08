// OpenUI sets a $variable's default the first time the declaration appears, even half-streamed, and
// never updates it: "$level = [" becomes an empty list for good. Holding back an unfinished
// "$name = ..." line until its newline arrives keeps every default whole; all other text still
// streams the moment it arrives.
export function createStateLineHolder() {
  let held = "";
  let midLine = false;

  return {
    push(delta: string): string {
      let text = held + delta;
      held = "";
      let out = "";
      while (text) {
        const newline = text.indexOf("\n");
        if (newline === -1) {
          if (!midLine && /^\s*(\$|$)/.test(text)) {
            held = text;
          } else {
            out += text;
            midLine = true;
          }
          break;
        }
        out += text.slice(0, newline + 1);
        text = text.slice(newline + 1);
        midLine = false;
      }
      return out;
    },
    flush(): string {
      const rest = held;
      held = "";
      return rest;
    },
  };
}
