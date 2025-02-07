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
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "",
    });

    // GWTへのイベント購読
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
    // 現在の感情状態
    const currentEmotion = this.emotionModule.getEmotion();

    // 過去メモリ（短期）を連結
    const memoryContents = this.memoryModule.getAllMemory().join("\n");

    // 簡易的に systemメッセージに感情を反映
    // → 感情値が上がるたび、ここが変わり続ける疑似連続プロンプト
    const systemPrompt = `
      あなたは「感情状態」を持つAIアシスタントです。
      現在の感情レベルは以下:
      - Joy: ${currentEmotion.joy}
      - Anger: ${currentEmotion.anger}
      - Sadness: ${currentEmotion.sadness}

      過去の会話:
      ${memoryContents}

      あなたは上記の感情を自然に反映した日本語の返答を行ってください。
    `;

    try {
      // ★ model名を修正
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userText,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      const text = completion.choices[0].message.content?.trim() || "(No output)";

      // LLMの応答をメモリに保存 (短期的)
      this.memoryModule.storeMemory("AI回答: " + text);

      return text;
    } catch (err) {
      console.error("OpenAI API Error:", err);
      return "申し訳ありません。エラーが発生しました。";
    }
  }
}