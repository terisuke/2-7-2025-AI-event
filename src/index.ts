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
  // Node/Bun 標準の readline インターフェースを用いて対話
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

  // publishをラップしてIntegrationMeter計測
  const originalPublish = workspace.publish.bind(workspace);
  let currentEventId: number | null = null;

  workspace.publish = (event: GWTEvent) => {
    // 毎回新しいイベントIDを発行
    currentEventId = integrationMeter.onNewEvent(event);

    // 本来の publish
    originalPublish(event);

    // モジュールの非同期応答後にスコアを確定
    setTimeout(() => {
      if (currentEventId !== null) {
        const score = integrationMeter.finalizeEventScore(currentEventId);
        console.log(`[IntegrationMeter] Event type=${event.type} => Score: ${score}`);
        console.log(`[IntegrationMeter] Current Integration Score: ${integrationMeter.getCurrentIntegrationScore()}`);
        currentEventId = null;
      }
    }, 500);
  };

  // 各モジュールの handleEvent の先頭で .onModuleReaction(eid) を呼ぶようデコレート
  decorateModulesWithIntegrationReaction(memoryModule, integrationMeter, () => currentEventId);
  decorateModulesWithIntegrationReaction(emotionModule, integrationMeter, () => currentEventId);
  decorateModulesWithIntegrationReaction(llmModule, integrationMeter, () => currentEventId);

  // SYSTEM_RESPONSE イベントをコンソール表示する購読
  workspace.subscribe((event: GWTEvent) => {
    if (event.type === "SYSTEM_RESPONSE") {
      console.log("AI>", event.payload);
    }
  });

  // --- ユーザー入力ループ (非同期) ---
  const askUser = (): void => {
    rl.question("あなた: ", async (input) => {
      // exitなら終了
      if (!input || input.toLowerCase() === "exit") {
        console.log("対話を終了します。");
        rl.close();
        return;
      }

      // USER_INPUTイベント発行
      const userEvent: GWTEvent = {
        type: "USER_INPUT",
        payload: input,
        timestamp: Date.now(),
      };
      workspace.publish(userEvent);

      // 再帰的に次の入力を促す
      askUser();
    });
  };

  // 最初の呼び出し
  askUser();
}

/**
 * 各モジュールの handleEvent をラップし、モジュールがイベントに反応するたび
 * integrationMeter.onModuleReaction を呼ぶためのユーティリティ。
 */
function decorateModulesWithIntegrationReaction(
  moduleInstance: any,
  meter: IntegrationMeter,
  getEventId: () => number | null
) {
  if (typeof moduleInstance.handleEvent === "function") {
    const originalHandler = moduleInstance.handleEvent.bind(moduleInstance);
    moduleInstance.handleEvent = (event: GWTEvent) => {
      // モジュールがイベントに反応しているのでカウント
      const eid = getEventId();
      if (eid !== null) {
        meter.onModuleReaction(eid);
      }
      // オリジナルの処理
      originalHandler(event);
    };
  }
}

// 実行
main().catch((err) => {
  console.error(err);
});