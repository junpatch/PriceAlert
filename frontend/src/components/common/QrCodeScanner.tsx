import React, { useEffect, useRef, useState } from "react";
import { Box, Alert, Typography, Button, IconButton } from "@mui/material";
import { Html5Qrcode } from "html5-qrcode";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FlipCameraAndroidIcon from "@mui/icons-material/FlipCameraAndroid";

interface QrCodeScannerProps {
  fps?: number;
  aspectRatio?: number;
  onScan: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
  height?: string | number;
}

const QrCodeScanner: React.FC<QrCodeScannerProps> = ({
  fps = 10,
  aspectRatio = 1.0,
  onScan,
  onError,
  height = 300,
}) => {
  const qrReaderRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    []
  );
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);

  // 安全にスキャナーを停止する関数
  const safelyStopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn("スキャナー停止中のエラー:", err);
      }
      scannerRef.current = null;
    }
  };

  // コンテナサイズを計測する関数
  const measureContainer = () => {
    if (qrReaderRef.current) {
      const width = qrReaderRef.current.clientWidth;
      const height = qrReaderRef.current.clientHeight;
      return { width, height };
    }
    return { width: 300, height: 300 };
  };

  // リサイズイベントハンドラ
  const handleResize = () => {
    measureContainer();
  };

  // スキャン範囲を計算する関数
  const calculateScanBox = (containerWidth: number) => {
    const scanWidth = Math.min(containerWidth * 0.9, 450);
    const scanHeight = scanWidth * 0.35; // 横長バーコードに適した比率
    return { width: scanWidth, height: scanHeight };
  };

  // ビデオ要素のスタイルを適用する関数
  const applyVideoStyles = () => {
    setTimeout(() => {
      const videoElements = qrReaderRef.current?.querySelectorAll("video");
      if (videoElements && videoElements.length > 0) {
        videoElements.forEach((video) => {
          video.style.objectFit = "cover";
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.margin = "0 auto";
          video.style.display = "block";
        });
      }
    }, 500);
  };

  // スキャナーの開始処理
  const startScanner = async (
    cameraConfig: any,
    size: { width: number; height: number }
  ) => {
    if (!scannerRef.current) return;

    const scanBox = calculateScanBox(size.width);

    try {
      await scannerRef.current.start(
        cameraConfig,
        {
          fps,
          aspectRatio,
          qrbox: scanBox,
        },
        (decodedText) => {
          onScan(decodedText);
        },
        (errorMessage) => {
          console.warn("スキャン中のエラー:", errorMessage);
        }
      );

      applyVideoStyles();
    } catch (err: any) {
      throw err;
    }
  };

  // カメラを切り替える関数
  const switchCamera = async () => {
    if (cameras.length <= 1) return;

    await safelyStopScanner();
    const nextCameraIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextCameraIndex);

    // 少し待ってからカメラを再初期化
    setTimeout(() => {
      initializeScanner(nextCameraIndex);
    }, 300);
  };

  const initializeScanner = async (cameraIndexOverride?: number) => {
    if (!qrReaderRef.current) return;
    setCameraError(null);

    // 既存のスキャナーを安全に停止
    await safelyStopScanner();

    // コンテナ内の既存要素をクリア
    if (qrReaderRef.current) {
      while (qrReaderRef.current.firstChild) {
        qrReaderRef.current.removeChild(qrReaderRef.current.firstChild);
      }
    }

    // DOM要素が実際にレンダリングされるのを待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // タイミング的に要素がまだ存在しない場合は早期リターン
    if (!qrReaderRef.current) {
      console.warn("QRコードスキャナーのコンテナが見つかりません");
      return;
    }

    // コンテナサイズを測定
    const size = measureContainer();

    const qrId = "html5-qr-code-full-region";
    const qrCodeDiv = document.createElement("div");
    qrCodeDiv.id = qrId;
    qrReaderRef.current.appendChild(qrCodeDiv);

    // 適切なサイズを持つdivにする
    qrCodeDiv.style.width = "100%";
    qrCodeDiv.style.height = "100%";
    qrCodeDiv.style.minHeight = "250px";
    qrCodeDiv.style.position = "relative";
    qrCodeDiv.style.margin = "0 auto";
    qrCodeDiv.style.display = "flex";
    qrCodeDiv.style.justifyContent = "center";
    qrCodeDiv.style.alignItems = "center";

    try {
      // QRコードスキャナーを初期化
      scannerRef.current = new Html5Qrcode(qrId);

      try {
        // カメラを検出
        const devices = await Html5Qrcode.getCameras();
        setCameras(devices || []);

        if (devices && devices.length > 0) {
          // iPhoneやラベルが空のデバイスでもバックカメラを優先するロジック
          const cameraIndexToUse =
            cameraIndexOverride !== undefined ? cameraIndexOverride : 0;
          setCurrentCameraIndex(cameraIndexToUse);

          // 利用可能なカメラが1つの場合は環境向き（バックカメラ）を指定
          if (devices.length === 1) {
            try {
              await startScanner({ facingMode: "environment" }, size);
            } catch (err) {
              // 環境向きで失敗した場合は単純にデバイスIDを使用
              await startScanner({ deviceId: devices[0].id }, size);
            }
          } else {
            // 複数カメラがある場合
            // ラベルに基づくバックカメラ検出
            let backCameraIndex = 0; // デフォルトは最初のカメラ

            // バックカメラを特定（ラベルがある場合）
            const backCameraFound = devices.findIndex(
              (device) =>
                device.label.toLowerCase().includes("back") ||
                device.label.toLowerCase().includes("rear") ||
                device.label.toLowerCase().includes("環境") ||
                device.label.toLowerCase().includes("後ろ")
            );

            // ラベルからバックカメラが見つかった場合はそれを使用
            if (backCameraFound !== -1) {
              backCameraIndex = backCameraFound;
            } else if (devices.length >= 2) {
              // ラベルがない/見つからない場合で複数カメラある場合は2番目を使う
              // (多くのモバイルデバイスは最初がフロント、2番目がバックカメラの順)
              backCameraIndex = 1;
            }

            // 手動指定されたカメラがあればそれを優先
            const selectedIndex =
              cameraIndexOverride !== undefined
                ? cameraIndexOverride
                : backCameraIndex;
            setCurrentCameraIndex(selectedIndex);

            try {
              await startScanner({ deviceId: devices[selectedIndex].id }, size);
            } catch (err) {
              // 特定のデバイスIDで失敗した場合は環境向きにフォールバック
              await startScanner({ facingMode: "environment" }, size);
            }
          }
        } else {
          setCameraError("利用可能なカメラが見つかりません");
          if (onError) {
            onError("利用可能なカメラが見つかりません");
          }
        }
      } catch (err: any) {
        // カメラ検出に失敗した場合のフォールバック
        try {
          await startScanner({ facingMode: "environment" }, size);
        } catch (directErr: any) {
          setCameraError(
            `カメラの検出に失敗しました: ${directErr.message || directErr}`
          );
          if (onError) {
            onError(
              `カメラの検出に失敗しました: ${directErr.message || directErr}`
            );
          }
        }
      }
    } catch (err: any) {
      setCameraError(`スキャナーの初期化に失敗しました: ${err.message || err}`);
      if (onError) {
        onError(`スキャナーの初期化に失敗しました: ${err.message || err}`);
      }
    }
  };

  // 初期化
  useEffect(() => {
    // コンポーネントがマウントされたらスキャナーを初期化
    const timer = setTimeout(() => {
      initializeScanner();
    }, 500); // DOM要素が確実にレンダリングされるのを待つ

    // リサイズイベントリスナーを追加
    window.addEventListener("resize", handleResize);

    // クリーンアップ
    return () => {
      clearTimeout(timer);
      safelyStopScanner();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 600,
        height,
        minHeight: 300,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {cameraError ? (
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            p: 2,
          }}
        >
          <Alert severity="warning" sx={{ mb: 2, width: "100%" }}>
            {cameraError}
          </Alert>
          <Typography sx={{ mb: 2 }}>
            カメラが起動できないか、アクセスが拒否されました。
          </Typography>
          <Button
            variant="contained"
            startIcon={<CameraAltIcon />}
            onClick={() => initializeScanner()}
          >
            カメラを再起動
          </Button>
        </Box>
      ) : (
        <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
          <Box
            ref={qrReaderRef}
            sx={{
              width: "100%",
              height: "100%",
              minHeight: "250px",
              overflow: "hidden",
              position: "relative",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              margin: "0 auto",
              borderRadius: "8px",
              "& > *": {
                margin: "0 auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              },
              "& video": {
                width: "100%",
                height: "100%",
                objectFit: "cover",
                margin: "0 auto",
                display: "block",
              },
            }}
          />
          {cameras.length > 1 && (
            <IconButton
              onClick={switchCamera}
              sx={{
                position: "absolute",
                right: "16px",
                bottom: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.7)",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                },
                zIndex: 10,
              }}
              aria-label="カメラ切り替え"
            >
              <FlipCameraAndroidIcon />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  );
};

export default QrCodeScanner;
