// src/index.ts
import * as dotenv from "dotenv";
dotenv.config();

import promptSync from "prompt-sync";
import type { GWTEvent } from "./globalWorkspace/GlobalWorkspaceManager";
import { GlobalWorkspaceManager } from "./globalWorkspace/GlobalWorkspaceManager";
import { IntegrationMeter } from "./globalWorkspace/IntegrationMeter";
import { EmotionModule } from "./modules/EmotionModule";
import { LLMModule } from "./modules/LLMModule";
import { MemoryModule } from "./modules/MemoryModule";

async function main() {
  const prompt = promptSync();

  const workspace = new GlobalWorkspaceManager();
  const integrationMeter = new IntegrationMeter();

  const memoryModule = new MemoryModule(workspace);
  const emotionModule = new EmotionModule(workspace);
  const llmModule = new LLMModule(workspace, memoryModule, emotionModule);

  // GlobalWorkspaceManager の publish を軽くラップして IntegrationMeter で計測する例:
  const originalPublish = workspace.publish.bind(workspace);
  let currentEventId: number | null = null;

  workspace.publish = (event: GWTEvent) => {
    // 新しいイベントなら IntegrationMeter でIDを発行
    // (今回は毎回 "新しいイベント" と仮定)
    currentEventId = integrationMeter.onNewEvent(event);

    // 実際の publish
    originalPublish(event);

    // ここで各モジュールは async で処理する可能性があるため、
    // 全モジュールの処理が完了した"後"に finalizeEventScore する仕組みを
    // 簡易的に setTimeout などで実行する。
    setTimeout(() => {
      if (currentEventId !== null) {
        const score = integrationMeter.finalizeEventScore(currentEventId);
        console.log(`[IntegrationMeter] Event type=${event.type} => Score: ${score}`);
        console.log(`[IntegrationMeter] Current Integration Score: ${integrationMeter.getCurrentIntegrationScore()}`);
        currentEventId = null;
      }
    }, 500); // 0.5秒後にスコア確定 (LLM応答待ちの都合で少し遅らせる)
  };

  // 同様に各モジュールの「反応」で integrationMeter.onModuleReaction を呼ぶ仕組みがいる。
  // 今回は非常にシンプルに、各モジュールの handleEvent 冒頭で呼んでもらう形にしてもOK。
  // ただしMemoryModuleやEmotionModule内部を改修するのも面倒なので、ここではデコレーションで対処。
  decorateModulesWithIntegrationReaction(memoryModule, integrationMeter, () => currentEventId);
  decorateModulesWithIntegrationReaction(emotionModule, integrationMeter, () => currentEventId);
  decorateModulesWithIntegrationReaction(llmModule, integrationMeter, () => currentEventId);

  // SYSTEM_RESPONSE を表示するための購読を追加
  workspace.subscribe((event: GWTEvent) => {
    if (event.type === "SYSTEM_RESPONSE") {
      console.log("AI>", event.payload);
    }
  });

  console.log("=== Simple GWT-like AI Demo ===");
  console.log("Type your message. Type 'exit' to quit.\n");

  while (true) {
    const userInput = prompt("You> ");
    if (!userInput || userInput.toLowerCase() === "exit") {
      console.log("Exiting...");
      break;
    }

    const userEvent: GWTEvent = {
      type: "USER_INPUT",
      payload: userInput,
      timestamp: Date.now(),
    };
    workspace.publish(userEvent);
  }
}

/**
 * 各モジュールの handleEvent をラップして、イベントを受け取るたびに
 * integrationMeter.onModuleReaction(eventId) を呼ぶためのユーティリティ。
 */
function decorateModulesWithIntegrationReaction(moduleInstance: any, meter: IntegrationMeter, getEventId: () => number | null) {
  if (typeof moduleInstance.handleEvent === "function") {
    const originalHandler = moduleInstance.handleEvent.bind(moduleInstance);
    moduleInstance.handleEvent = (event: GWTEvent) => {
      // モジュールがイベントに反応しているのでカウントアップ
      const eid = getEventId();
      if (eid !== null) {
        meter.onModuleReaction(eid);
      }
      // 本来の処理
      originalHandler(event);
    };
  }
}

// 実行
main().catch((err) => {
  console.error(err);
});