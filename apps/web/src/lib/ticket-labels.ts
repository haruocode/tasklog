import type { TicketPriority, TicketStatus, TicketType } from "@tasklog/shared";

// UI labels (Japanese) for the fixed ticket enums. Internal values stay English.
export const STATUS_LABELS: Record<TicketStatus, string> = {
  TODO: "未対応",
  IN_PROGRESS: "対応中",
  IN_REVIEW: "レビュー中",
  DONE: "完了",
  CLOSED: "クローズ",
};

export const TYPE_LABELS: Record<TicketType, string> = {
  TASK: "タスク",
  BUG: "バグ",
  FEATURE: "機能追加",
  IMPROVEMENT: "改善",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "緊急",
};
