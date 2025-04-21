import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";

interface NotificationSettingsCardProps {
  priceThreshold: number | undefined;
  setPriceThreshold: (value: number | undefined) => void;
  notificationEnabled: boolean;
  setNotificationEnabled: (value: boolean) => void;
  memo: string;
  setMemo: (value: string) => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  isSaving: boolean;
  handleSaveSettings: () => void;
}

const NotificationSettingsCard: React.FC<NotificationSettingsCardProps> =
  React.memo(
    ({
      priceThreshold,
      setPriceThreshold,
      notificationEnabled,
      setNotificationEnabled,
      memo,
      setMemo,
      isEditing,
      setIsEditing,
      isSaving,
      handleSaveSettings,
    }) => {
      // 目標価格の TextField の onChange ハンドラ
      const handlePriceThresholdChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value;
          // 空文字の場合は undefined、それ以外は数値に変換（NaNの場合はundefined）
          const numericValue = Number(value);
          setPriceThreshold(
            value === ""
              ? undefined
              : isNaN(numericValue)
              ? undefined
              : numericValue
          );
        },
        [setPriceThreshold]
      );

      // メモの TextField の onChange ハンドラ
      const handleMemoChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          setMemo(e.target.value);
        },
        [setMemo]
      );

      // 通知有効化の Switch の onChange ハンドラ
      const handleNotificationEnabledChange = React.useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
          setNotificationEnabled(e.target.checked);
        },
        [setNotificationEnabled]
      );

      return (
        <Card>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6">通知設定</Typography>
              {isEditing ? (
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  size="small"
                >
                  {isSaving ? "保存中..." : "保存"}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => setIsEditing(true)}
                  size="small"
                >
                  編集
                </Button>
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <TextField
                label="目標価格"
                type="number"
                // value は常に文字列か空文字にする
                value={priceThreshold ?? ""}
                // onChange はメモ化されたハンドラを使用
                onChange={handlePriceThresholdChange}
                disabled={!isEditing}
                fullWidth
                margin="normal"
                size="small"
                InputProps={{
                  startAdornment: <span>¥</span>,
                }}
                helperText="この価格以下になったら通知します"
                // inputPropsを追加して、数値以外の入力をある程度制限する
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notificationEnabled}
                    // onChange はメモ化されたハンドラを使用
                    onChange={handleNotificationEnabledChange}
                    disabled={!isEditing}
                    size="small"
                  />
                }
                label="価格通知を有効にする"
              />
            </Box>

            <TextField
              label="メモ"
              multiline
              rows={3}
              value={memo} // memo は元々文字列なのでOK
              // onChange はメモ化されたハンドラを使用
              onChange={handleMemoChange}
              disabled={!isEditing}
              fullWidth
              margin="normal"
              size="small"
            />
          </CardContent>
        </Card>
      );
    }
  );

export default NotificationSettingsCard;
