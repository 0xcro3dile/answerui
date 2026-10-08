import { generateSystemPrompt, type LibrarySpec } from "@openuidev/lang-core";
import { openuiPromptOptions } from "@openuidev/react-ui/genui-lib/prompt-options";
import library from "@/generated/spec.json";

const answerRules = [
  'If the answer is short, factual or conversational, reply with only root = Stack([TextContent("...")]). No cards, charts or forms.',
  "Build an interactive tool when the user would adjust numbers, compare options, plan with inputs or explore data.",
  "In a tool, put the inputs first, bind each to a $variable, and compute every result from those variables so it updates live.",
  "Slider values are arrays: read a slider bound to $var as $var[0].",
  "Input values are text, so + would join them: total them with @Sum([$a, $b]) and use -, * or / for other math.",
  "Checkbox values are true or false and count as 1 or 0 in math, so $shared.ana * price is price when Ana is checked.",
  "EditableTable edits can't feed calculations. When results depend on values the user edits, use Input, Slider, Select, CheckBoxGroup or SwitchGroup bound to $variables.",
  "There is no power operator. For growth over time, chain values: y1 = start * rate, y2 = y1 * rate, and so on.",
  "Show every computed number through @Round(value, 2), in text, tables and charts alike, so no result shows long decimals.",
  // Scene rules adapt ideas from CopilotKit's OpenGenerativeUI visualization skills (MIT).
  "Use a Scene only for 3D shapes, motion or simulations that components can't show. Never for charts or tables.",
  "Put a Scene's controls next to it, pass their values in params like {speed: $speed[0]}, and read params inside onFrame so the scene follows them live.",
  "Scene code runs in a sandbox that already has a camera, lights, controls and a loop. Don't create a renderer, camera or loop, and don't use imports, network, timers or page elements.",
  "Compute numbers the answer can't (square roots, powers, trig) inside the scene, send them with report({name: value}) into the variable passed as the Scene's results, and show them like $sim.name.",
  "Create Scene objects once, then only update them inside onFrame. Keep scene code under 60 lines and never write while loops, because an endless loop freezes the page.",
  "Inside Scene code use single quotes for strings and no backslashes, because the code sits inside a double-quoted string.",
  "Write the Scene statement last, and describe what it shows in a TextContent next to it.",
];

export const sceneExample = `$distance = [1]
$sim = {period: 1}
root = Stack([intro, distanceField, period, orbit])
intro = TextContent("Planets farther from the Sun take longer to go around it. Drag the slider to move the planet.")
distanceField = FormControl("Distance from the Sun (AU)", Slider("distance", "continuous", 0.5, 3.5, 0.1, [1], "Distance", null, $distance))
period = TextContent("Years per orbit: " + @Round($sim.period, 2))
orbit = Scene("A planet orbiting the Sun", "3d", "
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 16), new THREE.MeshBasicMaterial({ color: 'gold' }));
  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 16), new THREE.MeshStandardMaterial({ color: theme.accent }));
  scene.add(sun, planet);
  label(planet, 'Planet');
  let angle = 0;
  onFrame((t, dt) => {
    const years = Math.sqrt(params.distance ** 3);
    report({ period: years });
    angle += (dt * 2 * Math.PI) / (years * 4);
    const r = params.distance * 2;
    planet.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
  });
", {distance: $distance[0]}, $sim)`;

export const systemPrompt = generateSystemPrompt({
  library: library as LibrarySpec,
  promptOptions: {
    ...openuiPromptOptions,
    bindings: true,
    examples: [...(openuiPromptOptions.examples ?? []), sceneExample],
    additionalRules: [...(openuiPromptOptions.additionalRules ?? []), ...answerRules],
  },
});
