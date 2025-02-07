// src/modules/MemoryModule.ts
import type { GWTEvent } from "../globalWorkspace/GlobalWorkspaceManager";
import { GlobalWorkspaceManager } from "../globalWorkspace/GlobalWorkspaceManager";

export class MemoryModule {
  private shortTermMemory: string[] = [];
  private maxMemorySize = 10;

  constructor(private workspace: GlobalWorkspaceManager, private moduleName: string = "MemoryModule") {
    // GlobalWorkspaceManagerに購読登録
    this.workspace.subscribe((event) => this.handleEvent(event));
  }

  handleEvent(event: GWTEvent) {
    // ユーザ入力 (type="USER_INPUT") をメモリに格納
    if (event.type === "USER_INPUT") {
      const content = event.payload;
      this.storeMemory(content);
    }
  }

  storeMemory(content: string) {
    this.shortTermMemory.push(content);
    // メモリ上限を超えたら古いものから破棄
    if (this.shortTermMemory.length > this.maxMemorySize) {
      this.shortTermMemory.shift();
    }
  }

  getAllMemory() {
    return [...this.shortTermMemory];
  }

  // 簡単な検索や要約機能を追加することも可能
}