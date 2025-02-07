// src/globalWorkspace/IntegrationMeter.ts
import type { GWTEvent } from "./GlobalWorkspaceManager";

/**
 * 同一イベントへの反応数をカウントし
 * "Integration Score" をシンプルに算出する例。
 */
export class IntegrationMeter {
  private currentEventId: number = 0;
  private eventReactionCountMap: Map<number, number> = new Map();
  private lastIntegrationScore: number = 0;

  private generateEventId() {
    // 適当なIDを連番で付与
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
   * モジュールがイベントに反応したとき呼び出し、
   * そのイベントの反応数をインクリメントする。
   */
  onModuleReaction(eventId: number) {
    const count = this.eventReactionCountMap.get(eventId) ?? 0;
    this.eventReactionCountMap.set(eventId, count + 1);
  }

  /**
   * イベント処理が一巡したタイミングでスコアを確定
   */
  finalizeEventScore(eventId: number) {
    const finalCount = this.eventReactionCountMap.get(eventId) ?? 0;
    // ここでは単純に「反応モジュール数」をスコアとする
    this.lastIntegrationScore = finalCount;

    // 後処理
    this.eventReactionCountMap.delete(eventId);

    return finalCount;
  }

  getCurrentIntegrationScore(): number {
    return this.lastIntegrationScore;
  }
}