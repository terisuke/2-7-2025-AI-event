// src/modules/MemoryModule.ts
import type { GWTEvent } from "../globalWorkspace/GlobalWorkspaceManager";
import { GlobalWorkspaceManager } from "../globalWorkspace/GlobalWorkspaceManager";

export class MemoryModule {
  private shortTermMemory: string[] = [];
  private maxMemorySize = 10; // 短期メモリに保持する最大数

  constructor(private workspace: GlobalWorkspaceManager, private moduleName: string = "MemoryModule") {
    this.workspace.subscribe((event) => this.handleEvent(event));
  }

  handleEvent(event: GWTEvent) {
    // ユーザ入力をメモリに格納
    if (event.type === "USER_INPUT") {
      const content = event.payload;
      this.storeMemory("User入力: " + content);
    }
  }

  storeMemory(content: string) {
    this.shortTermMemory.push(content);
    // 上限を超えたら古いものから破棄
    if (this.shortTermMemory.length > this.maxMemorySize) {
      this.shortTermMemory.shift();
    }
  }

  getAllMemory() {
    return [...this.shortTermMemory];
  }
}