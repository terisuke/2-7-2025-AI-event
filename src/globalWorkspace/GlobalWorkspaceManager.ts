// src/globalWorkspace/GlobalWorkspaceManager.ts

export interface GWTEvent {
  type: string;             // イベント種別 (USER_INPUT, SYSTEM_RESPONSE, EMOTION_UPDATE, etc.)
  payload: any;            // イベントに付随するデータ本体
  timestamp: number;       // 発生時刻（ミリ秒）
  sourceModule?: string;   // このイベントを発行したモジュール名（任意）
}

type GWTSubscriber = (event: GWTEvent) => void;

export class GlobalWorkspaceManager {
  private subscribers: GWTSubscriber[] = [];
  private foregroundEvent: GWTEvent | null = null;

  /**
   * イベントを購読するための登録
   */
  subscribe(subscriber: GWTSubscriber) {
    this.subscribers.push(subscriber);
  }

  /**
   * イベントをパブリッシュして、全サブスクライバに通知
   */
  publish(event: GWTEvent) {
    // フォアグラウンド（意識の舞台）に上げる簡単な例: イベントが "USER_INPUT" なら必ず最優先とする等
    // ここでは単純に常に最新のイベントをforegroundとする。
    this.foregroundEvent = event;

    // 全モジュールに通知
    for (const sub of this.subscribers) {
      sub(event);
    }
  }

  /**
   * 現在のフォアグラウンドイベントを返す（必要に応じて利用）
   */
  getForegroundEvent(): GWTEvent | null {
    return this.foregroundEvent;
  }
}