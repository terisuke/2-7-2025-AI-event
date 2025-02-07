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
    // USER_INPUT時に感情を更新
    if (event.type === "USER_INPUT") {
      const userText: string = event.payload;
      this.updateEmotion(userText);
    }
  }

  updateEmotion(text: string) {
    // 超単純な例:
    // "happy" を含めば joy+1, "angry" を含めば anger+1, "sad" を含めば sadness+1
    if (text.includes("happy")) {
      this.emotion.joy += 1;
    }
    if (text.includes("angry")) {
      this.emotion.anger += 1;
    }
    if (text.includes("sad")) {
      this.emotion.sadness += 1;
    }

    // 上限クリップ
    this.emotion.joy = Math.min(this.emotion.joy, 5);
    this.emotion.anger = Math.min(this.emotion.anger, 5);
    this.emotion.sadness = Math.min(this.emotion.sadness, 5);

    // 更新した感情を GWT へ通知
    const emotionUpdateEvent: GWTEvent = {
      type: "EMOTION_UPDATE",
      payload: { ...this.emotion },
      timestamp: Date.now(),
      sourceModule: this.moduleName,
    };
    this.workspace.publish(emotionUpdateEvent);

    // さらに「AIが自分の感情を言葉にして出力する」擬似イベント
    const emotionString = this.generateEmotionOutput();
    const emotionOutputEvent: GWTEvent = {
      type: "EMOTION_OUTPUT",
      payload: emotionString,
      timestamp: Date.now(),
      sourceModule: this.moduleName,
    };
    this.workspace.publish(emotionOutputEvent);
  }

  /**
   * 感情値を段階的に減らすことで「時間経過によるクールダウン」を演出
   */
  decayEmotion() {
    // すこしずつ0に近づける
    const decayRate = 1; // 減衰幅
    this.emotion.joy = Math.max(0, this.emotion.joy - decayRate);
    this.emotion.anger = Math.max(0, this.emotion.anger - decayRate);
    this.emotion.sadness = Math.max(0, this.emotion.sadness - decayRate);

    // 変化があれば EMOTION_UPDATE イベントを再度出す
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

  /**
   * 現在の感情を「AIが自己報告するとしたら」どんな文章になるか簡単に生成
   */
  private generateEmotionOutput(): string {
    const { joy, anger, sadness } = this.emotion;
    let moodText = "";
    if (joy > anger && joy > sadness) {
      moodText = "嬉しい気分かもしれません。";
    } else if (anger > joy && anger > sadness) {
      moodText = "少し怒りを感じています。";
    } else if (sadness > joy && sadness > anger) {
      moodText = "少し悲しい気分です。";
    } else {
      moodText = "特に強い感情はないようです。";
    }
    return `今の感情状態 → Joy:${joy} / Anger:${anger} / Sadness:${sadness} → ${moodText}`;
  }
}