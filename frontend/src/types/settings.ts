/**
 * ユーザー設定関連の型定義
 */

export interface UserSettings {
  notification_frequency: 'immediately' | 'daily' | 'weekly';
  email_notifications: boolean;
}

export interface SettingsState {
  userSettings: UserSettings | null;
  loading: boolean;
  error: string | null;
} 