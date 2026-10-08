"use client";
import "@openuidev/react-ui/styles/index.css";

import {
  AgentInterface,
  fetchLLM,
  openAIMessageFormat,
  openAIReadableStreamAdapter,
  useSystemThemeMode,
} from "@openuidev/react-ui";
import { library } from "@/lib/library";

const llm = fetchLLM({
  url: "/api/chat",
  streamAdapter: openAIReadableStreamAdapter(),
  messageFormat: openAIMessageFormat,
});

export default function Home() {
  const mode = useSystemThemeMode();

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <AgentInterface llm={llm} componentLibrary={library} agentName="AnswerUI" theme={{ mode }} />
    </div>
  );
}
