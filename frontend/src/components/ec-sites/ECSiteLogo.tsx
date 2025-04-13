import React from "react";
import { Box, Tooltip } from "@mui/material";

interface ECSiteLogoProps {
  ecSiteCode?: string;
  ecSiteName: string;
  size?: number;
}

/**
 * ECサイトのロゴを表示するコンポーネント
 * ECサイトのコードに基づいて対応するロゴを表示します
 */
const ECSiteLogo: React.FC<ECSiteLogoProps> = ({
  ecSiteCode,
  ecSiteName,
  size = 24,
}) => {
  // デフォルトのロゴパス
  const defaultLogoPath = "/images/ec-logos/default.png";

  // ECサイトコードに基づいてロゴのパスを決定
  const getLogoPath = (code?: string, format: string = "webp") => {
    if (!code) return defaultLogoPath;

    // 最適化されたwebpを優先的に使用
    if (format === "webp") {
      return `/images/ec-logos/optimized/${code.toLowerCase()}.webp`;
    }

    // フォールバック用の従来フォーマット (png, jpg)
    return `/images/ec-logos/${code.toLowerCase()}.png`;
  };

  // 画像が読み込めなかった場合のエラーハンドラ
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    const currentSrc = target.src;

    // webpから従来フォーマットへのフォールバック
    if (currentSrc.includes("/optimized/") && ecSiteCode) {
      target.src = getLogoPath(ecSiteCode, "png");
    } else {
      // 従来フォーマットもダメならデフォルトロゴへ
      target.src = defaultLogoPath;
    }
  };

  return (
    <Tooltip title={ecSiteName}>
      <Box
        component="img"
        src={getLogoPath(ecSiteCode, "webp")}
        alt={ecSiteName}
        onError={handleImageError}
        sx={{
          width: size,
          height: size,
          objectFit: "contain",
          mr: 1,
        }}
      />
    </Tooltip>
  );
};

export default ECSiteLogo;
