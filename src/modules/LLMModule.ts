// src/modules/LLMModule.ts
import OpenAI from "openai";
import type { GWTEvent } from "../globalWorkspace/GlobalWorkspaceManager";
import { GlobalWorkspaceManager } from "../globalWorkspace/GlobalWorkspaceManager";
import { EmotionModule } from "./EmotionModule";
import { MemoryModule } from "./MemoryModule";

export class LLMModule {
  private openai: OpenAI;

  constructor(
    private workspace: GlobalWorkspaceManager,
    private memoryModule: MemoryModule,
    private emotionModule: EmotionModule,
    private moduleName: string = "LLMModule"
  ) {
    // OpenAI公式の新バージョン (v4+) での使い方
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });

    // グローバルワークスペースのイベントに購読
    this.workspace.subscribe((event) => this.handleEvent(event));
  }

  async handleEvent(event: GWTEvent) {
    // ユーザ入力が来たら応答を生成
    if (event.type === "USER_INPUT") {
      const userText: string = event.payload;
      const response = await this.generateResponse(userText);

      // 応答をワークスペースへ投稿
      const systemResponseEvent: GWTEvent = {
        type: "SYSTEM_RESPONSE",
        payload: response,
        timestamp: Date.now(),
        sourceModule: this.moduleName,
      };
      this.workspace.publish(systemResponseEvent);
    }
  }

  async generateResponse(userText: string): Promise<string> {
    // 感情状態を取得
    const currentEmotion = this.emotionModule.getEmotion();
    // 短期メモリから過去のやり取りを取得（簡易的に連結するだけ）
    const memoryContents = this.memoryModule.getAllMemory().join("\n");

    // プロンプト（text-davinci-003 向けの例）
    const prompt = `
You are a helpful AI assistant with some emotional states.
Your current emotion levels are: 
 - Joy: ${currentEmotion.joy}
 - Anger: ${currentEmotion.anger}
 - Sadness: ${currentEmotion.sadness}

Recent conversation memory:
${memoryContents}

Now respond to the user's latest input below with a short message:
User Input: ${userText}
    `.trim();

    try {
      // 公式Docs準拠: `openai.completions.create(...)`
      const completion = await this.openai.completions.create({
        model: "text-davinci-003",
        prompt: prompt,
        max_tokens: 100,
        temperature: 0.7,
      });

      // completion.choices[0].text に生成結果が格納される
      return completion.choices[0].text?.trim() || "(No output)";
    } catch (err) {
      console.error("OpenAI API Error:", err);
      return "I'm sorry, but something went wrong.";
    }
  }
}