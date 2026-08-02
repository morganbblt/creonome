import { describe, expect, it } from "vitest";
import { splitScriptSegments } from "./script-segments";

describe("splitScriptSegments", () => {
  it("starts a new readable line at every timestamped beat", () => {
    expect(
      splitScriptSegments(
        "[0:00-0:08] Open on the synth. [0:08-0:15] Turn the filter. [0:15-0:35] Let the drop land.",
      ),
    ).toEqual([
      "[0:00-0:08] Open on the synth.",
      "[0:08-0:15] Turn the filter.",
      "[0:15-0:35] Let the drop land.",
    ]);
  });

  it("keeps an untimed script as one paragraph", () => {
    expect(splitScriptSegments("Hold, reveal, then cut.")).toEqual([
      "Hold, reveal, then cut.",
    ]);
  });
});
