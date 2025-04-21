import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Switch,
  Button,
  Divider,
  Alert,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import PageContainer from "@components/layout/PageContainer";
import ErrorAlert from "@components/common/ErrorAlert";
import LoadingSpinner from "@components/common/LoadingSpinner";
import {
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
} from "@services/api";
import { UserSettings } from "@/types";

const SettingsPage: React.FC = () => {
  const { data: userSettings, isLoading, error } = useGetUserSettingsQuery();
  const [updateSettings, { isLoading: isUpdating, error: updateError }] =
    useUpdateUserSettingsMutation();

  const [settings, setSettings] = useState<Partial<UserSettings>>({
    email_frequency: "daily",
    email_notifications: true,
  });

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 設定データがロードされたら状態を更新
  useEffect(() => {
    if (userSettings) {
      setSettings({
        email_frequency: userSettings.email_frequency,
        email_notifications: userSettings.email_notifications,
      });
      setHasChanges(false);
    }
  }, [userSettings]);

  const handleFrequencyChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value as "immediately" | "daily" | "weekly";
    setSettings({ ...settings, email_frequency: value });
    setHasChanges(true);
    setSuccessMessage(null);
  };

  const handleEmailNotificationsChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSettings({ ...settings, email_notifications: event.target.checked });
    setHasChanges(true);
    setSuccessMessage(null);
  };

  const handleSubmit = async () => {
    try {
      await updateSettings({
        email_frequency: settings.email_frequency,
        email_notifications: settings.email_notifications,
      }).unwrap();
      setSuccessMessage("設定を保存しました");
      setHasChanges(false);
    } catch (err) {
      console.error("設定の更新に失敗しました", err);
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="設定" maxWidth="md">
        <LoadingSpinner />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="設定" maxWidth="md">
      <ErrorAlert
        error={
          error || updateError
            ? "設定の取得または更新中にエラーが発生しました"
            : null
        }
      />

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            通知設定
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              メール通知頻度
            </Typography>
            <FormControl component="fieldset">
              <RadioGroup
                value={settings.email_frequency}
                onChange={handleFrequencyChange}
              >
                <FormControlLabel
                  value="immediately"
                  control={<Radio />}
                  label="即時通知（価格変動があった時点で通知）"
                />
                <FormControlLabel
                  value="daily"
                  control={<Radio />}
                  label="日次通知（1日1回まとめて通知）"
                />
                <FormControlLabel
                  value="weekly"
                  control={<Radio />}
                  label="週次通知（週1回まとめて通知）"
                />
              </RadioGroup>
            </FormControl>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              メール通知
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.email_notifications}
                  onChange={handleEmailNotificationsChange}
                />
              }
              label="メールによる通知を有効にする"
            />
          </Box>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={isUpdating || !hasChanges}
          >
            {isUpdating ? "保存中..." : "設定を保存"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            アカウント情報
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="body2" color="text.secondary">
            アカウント情報の変更やパスワードのリセットは現在MVPフェーズでは実装されていません。
            今後のアップデートで対応予定です。
          </Typography>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default SettingsPage;
