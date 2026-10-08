import { createLibrary } from "@openuidev/react-lang";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { Scene } from "@/scene/Scene";

// OpenUI's components plus our Scene. `pnpm spec` turns this into src/generated/spec.json for the prompt.
export const library = createLibrary({
  root: openuiLibrary.root,
  components: [...Object.values(openuiLibrary.components), Scene],
  componentGroups: [
    ...(openuiLibrary.componentGroups ?? []),
    { name: "Scenes", components: ["Scene"] },
  ],
});
