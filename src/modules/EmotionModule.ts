// src/modules/EmotionModule.ts
import type { GWTEvent } from "../globalWorkspace/GlobalWorkspaceManager";
import { GlobalWorkspaceManager } from "../globalWorkspace/GlobalWorkspaceManager";

interface EmotionState {
  joy: number;
  anger: number;
  sadness: number;
}

export class EmotionModule {
  private emotion: EmotionState = { joy: 0, anger: 0, sadness: 0 };

  constructor(private workspace: GlobalWorkspaceManager, private moduleName: string = "EmotionModule") {
    this.workspace.subscribe((event) => this.handleEvent(event));
  }

  handleEvent(event: GWTEvent) {
    if (event.type === "USER_INPUT") {
      const userText: string = event.payload;
      this.updateEmotion(userText);
    }
  }

  updateEmotion(text: string) {
    // 超単純な例: "happy" という単語があれば joy を+1、
    // "angry" があれば anger+1、"sad" があれば sadness+1
    if (text.includes("happy")) {
      this.emotion.joy += 1;
    }
    if (text.includes("angry")) {
      this.emotion.anger += 1;
    }
    if (text.includes("sad")) {
      this.emotion.sadness += 1;
    }

    // 値が大きくなりすぎないように抑制
    this.emotion.joy = Math.min(this.emotion.joy, 5);
    this.emotion.anger = Math.min(this.emotion.anger, 5);
    this.emotion.sadness = Math.min(this.emotion.sadness, 5);

    // 更新した感情をグローバルワークスペースに投稿
    const emotionUpdateEvent: GWTEvent = {
      type: "EMOTION_UPDATE",
      payload: { ...this.emotion },
      timestamp: Date.now(),
      sourceModule: this.moduleName,
    };
    this.workspace.publish(emotionUpdateEvent);
  }

  getEmotion() {
    return { ...this.emotion };
  }
}