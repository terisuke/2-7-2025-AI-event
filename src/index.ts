// src/index.ts
import * as dotenv from "dotenv";
dotenv.config();

import { createInterface } from "readline";
import type { GWTEvent } from "./globalWorkspace/GlobalWorkspaceManager";
import { GlobalWorkspaceManager } from "./globalWorkspace/GlobalWorkspaceManager";
import { IntegrationMeter } from "./globalWorkspace/IntegrationMeter";
import { EmotionModule } from "./modules/EmotionModule";
import { LLMModule } from "./modules/LLMModule";
import { MemoryModule } from "./modules/MemoryModule";

async function main() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log("AIとの対話を開始します。終了するには \"exit\" と入力してください。");

  // --- GWTマネージャと各モジュールの初期化 ---
  const workspace = new GlobalWorkspaceManager();
  const integrationMeter = new IntegrationMeter();

  const memoryModule = new MemoryModule(workspace);
  const emotionModule = new EmotionModule(workspace);
  const llmModule = new LLMModule(workspace, memoryModule, emotionModule);

  // publish をラップし、毎イベントごとに IntegrationMeter を計測
  const originalPublish = workspace.publish.bind(workspace);
  let currentEventId: number | null = null;

  workspace.publish = (event: GWTEvent) => {
    // 毎回新しいイベントIDを発行
    currentEventId = integrationMeter.onNewEvent(event);

    // 本来の publish
    originalPublish(event);

    // モジュールの非同期応答を少し待ってからスコア確定 (適当な遅延 500ms)
    setTimeout(() => {
      if (currentEventId !== null) {
        const score = integrationMeter.finalizeEventScore(currentEventId);
        console.log(`[IntegrationMeter] Event type=${event.type} => Score: ${score}`);
        console.log(`[IntegrationMeter] Current Integration Score: ${integrationMeter.getCurrentIntegrationScore()}`);
        currentEventId = null;
      }
    }, 500);
  };

  // 各モジュールの handleEvent をデコレートして onModuleReaction を呼ぶ
  decorateModulesWithIntegrationReaction(memoryModule, integrationMeter, () => currentEventId);
  decorateModulesWithIntegrationReaction(emotionModule, integrationMeter, () => currentEventId);
  decorateModulesWithIntegrationReaction(llmModule, integrationMeter, () => currentEventId);

  // SYSTEM_RESPONSE イベントをコンソール表示
  workspace.subscribe((event: GWTEvent) => {
    if (event.type === "SYSTEM_RESPONSE") {
      console.log("AI>", event.payload);
    }
    // EMOTION_OUTPUT もコンソール表示
    if (event.type === "EMOTION_OUTPUT") {
      console.log("AI-EmotionReport>", event.payload);
    }
  });

  // --- ユーザー入力ループ ---
  const askUser = (): void => {
    rl.question("あなた: ", async (input) => {
      if (!input || input.toLowerCase() === "exit") {
        console.log("対話を終了します。");
        rl.close();
        return;
      }

      // USER_INPUTイベントを発行
      const userEvent: GWTEvent = {
        type: "USER_INPUT",
        payload: input,
        timestamp: Date.now(),
      };
      workspace.publish(userEvent);

      // 再帰的に呼び出し
      askUser();
    });
  };

  askUser();

  // --- 感情を定期的に減衰させる例 ---
  setInterval(() => {
    emotionModule.decayEmotion();
  }, 10000); // 10秒ごとに感情を少し冷ます
}

/**
 * 各モジュールの handleEvent をラップし、
 * 反応があったことを IntegrationMeter に通知するユーティリティ
 */
function decorateModulesWithIntegrationReaction(
  moduleInstance: any,
  meter: IntegrationMeter,
  getEventId: () => number | null
) {
  if (typeof moduleInstance.handleEvent === "function") {
    const originalHandler = moduleInstance.handleEvent.bind(moduleInstance);

    moduleInstance.handleEvent = (event: GWTEvent) => {
      const eid = getEventId();
      if (eid !== null) {
        meter.onModuleReaction(eid);
      }
      originalHandler(event);
    };
  }
}

// 実行
main().catch((err) => {
  console.error(err);
});