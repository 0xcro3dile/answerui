import { generateSystemPrompt, type LibrarySpec } from "@openuidev/lang-core";
import { openuiPromptOptions } from "@openuidev/react-ui/genui-lib/prompt-options";
import library from "@/generated/spec.json";

const answerRules = [
  'If the answer is short, factual or conversational, reply with only root = Stack([TextContent("...")]). No cards, charts or forms.',
  "Build an interactive tool when the user would adjust numbers, compare options, plan with inputs or explore data.",
  "In a tool, put the inputs first, bind each to a $variable, and compute every result from those variables so it updates live.",
  "Slider values are arrays: read a slider bound to $var as $var[0].",
  "There is no power operator. For growth over time, chain values: y1 = start * rate, y2 = y1 * rate, and so on.",
  "Round money with @Round(value, 2).",
];

export const systemPrompt = generateSystemPrompt({
  library: library as LibrarySpec,
  promptOptions: {
    ...openuiPromptOptions,
    bindings: true,
    additionalRules: [...(openuiPromptOptions.additionalRules ?? []), ...answerRules],
  },
});
