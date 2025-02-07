// src/globalWorkspace/IntegrationMeter.ts
import type { GWTEvent } from "./GlobalWorkspaceManager";

/**
 * 同一イベントへの反応数をカウントして
 * "Integration Score" をシンプルに算出する。
 */
export class IntegrationMeter {
  private currentEventId: number = 0;
  private eventReactionCountMap: Map<number, number> = new Map(); 
  private lastIntegrationScore: number = 0;

  private generateEventId() {
    // 適当なID割り振り
    return ++this.currentEventId;
  }

  /**
   * 新規イベントがワークスペースに来たとき呼ばれる。
   * イベントIDを作成し、反応数カウンタを初期化。
   */
  onNewEvent(event: GWTEvent): number {
    const id = this.generateEventId();
    this.eventReactionCountMap.set(id, 0);
    return id;
  }

  /**
   * モジュールがイベントに反応したとき呼ぶことで
   * そのイベントの反応数をインクリメント。
   */
  onModuleReaction(eventId: number) {
    const count = this.eventReactionCountMap.get(eventId) ?? 0;
    this.eventReactionCountMap.set(eventId, count + 1);
  }

  /**
   * イベントが一通り処理されたら、最終的な反応数を元に
   * シンプルな統合度を更新・返却。
   */
  finalizeEventScore(eventId: number) {
    const finalCount = this.eventReactionCountMap.get(eventId) ?? 0;
    // ここでは反応したモジュール数がそのままスコア。
    this.lastIntegrationScore = finalCount;
    // マップから削除してメモリ整理
    this.eventReactionCountMap.delete(eventId);
    return finalCount;
  }

  getCurrentIntegrationScore(): number {
    return this.lastIntegrationScore;
  }
}