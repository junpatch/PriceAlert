import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  IconButton,
  Popover,
  Stack,
  Tooltip as MuiTooltip,
  Snackbar,
  Alert,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ja } from "date-fns/locale";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import MouseIcon from "@mui/icons-material/Mouse";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { PriceHistory } from "../../types";
import { animated, useSpring } from "react-spring";

interface PriceHistoryChartProps {
  data: PriceHistory[];
  threshold?: number;
}

type PriceType = "price" | "effective_price";
type TimeRange = "7days" | "1month" | "3months" | "all" | "custom";

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  data,
  threshold,
}) => {
  const [priceType, setPriceType] = useState<PriceType>("price");
  const [timeRange, setTimeRange] = useState<TimeRange>("1month");
  const [selectedEcSite, setSelectedEcSite] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [startDatePickerOpen, setStartDatePickerOpen] =
    useState<boolean>(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState<boolean>(false);
  const [currentPickerType, setCurrentPickerType] = useState<
    "start" | "end" | null
  >(null);
  const [showZoomSnackbar, setShowZoomSnackbar] = useState<boolean>(false);
  const [showZoomGuide, setShowZoomGuide] = useState<boolean>(false);
  const [xAxisRange, setXAxisRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const chartRef = useRef<HTMLDivElement>(null);

  // アニメーション設定
  const zoomAnimation = useSpring({
    opacity: showZoomGuide ? 1 : 0,
    transform: showZoomGuide ? "scale(1)" : "scale(0.8)",
  });

  // 画面サイズに応じた設定
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // ズームガイドの表示
  useEffect(() => {
    // 初回のみズームガイド表示
    const hasShownZoomGuide = localStorage.getItem("hasShownZoomGuide");
    if (!hasShownZoomGuide) {
      setTimeout(() => {
        setShowZoomGuide(true);
        setTimeout(() => {
          setShowZoomGuide(false);
          localStorage.setItem("hasShownZoomGuide", "true");
        }, 5000);
      }, 1000);
    }
  }, []);

  // マウスホイールでX軸の範囲変更
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Ctrlキーを押しながらマウスホイール操作
      if (e.ctrlKey && chartRef.current?.contains(e.target as Node)) {
        e.preventDefault();

        // ここでchartDataを直接参照せず、現在の状態関数内でアクセス
        setXAxisRange((prevRange) => {
          const currentData = chartData;
          if (!currentData.length) return prevRange;

          const totalPoints = currentData.length;
          const currentRange = prevRange || { start: 0, end: totalPoints - 1 };
          const visiblePoints = currentRange.end - currentRange.start + 1;

          // ズームイン/アウト
          const zoomDirection = e.deltaY < 0 ? -1 : 1; // -1:ズームイン、1:ズームアウト
          const zoomFactor = 0.2;
          const pointsToAddRemove = Math.max(
            1,
            Math.floor(visiblePoints * zoomFactor)
          );

          let newStart = currentRange.start;
          let newEnd = currentRange.end;

          if (zoomDirection > 0) {
            // ズームアウト: 表示範囲を広げる
            newStart = Math.max(0, currentRange.start - pointsToAddRemove);
            newEnd = Math.min(
              totalPoints - 1,
              currentRange.end + pointsToAddRemove
            );
          } else {
            // ズームイン: 表示範囲を狭める
            // マウス位置に基づいて、どちら側をより多く縮めるか決定
            const chartRect = chartRef.current?.getBoundingClientRect() || {
              left: 0,
              width: 1,
            };
            const mouseXRatio = (e.clientX - chartRect.left) / chartRect.width;

            const startPointsToRemove = Math.floor(
              pointsToAddRemove * mouseXRatio
            );
            const endPointsToRemove = pointsToAddRemove - startPointsToRemove;

            newStart = Math.min(
              currentRange.end - 2,
              currentRange.start + startPointsToRemove
            );
            newEnd = Math.max(
              currentRange.start + 2,
              currentRange.end - endPointsToRemove
            );
          }

          // 表示期間が変わった場合のみスナックバーを表示
          if (newStart !== currentRange.start || newEnd !== currentRange.end) {
            setShowZoomSnackbar(true);

            setTimeout(() => {
              setShowZoomSnackbar(false);
            }, 1500);
          }

          return { start: newStart, end: newEnd };
        });
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
    // 依存配列からchartDataを削除
  }, []);

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          価格履歴
        </Typography>
        <Box
          sx={{
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="body1" color="text.secondary">
            価格履歴データがありません
          </Typography>
        </Box>
      </Paper>
    );
  }

  // 日付でソート
  const sortedData = [...data].sort(
    (a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );

  // 日付範囲でフィルタリング
  const filterByTimeRange = (data: PriceHistory[], range: TimeRange) => {
    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;

    switch (range) {
      case "7days":
        return data.filter(
          (item) =>
            new Date(item.captured_at).getTime() > now.getTime() - 7 * msInDay
        );
      case "1month":
        return data.filter(
          (item) =>
            new Date(item.captured_at).getTime() > now.getTime() - 30 * msInDay
        );
      case "3months":
        return data.filter(
          (item) =>
            new Date(item.captured_at).getTime() > now.getTime() - 90 * msInDay
        );
      case "custom":
        if (!customStartDate && !customEndDate) return data;
        return data.filter((item) => {
          const itemDate = new Date(item.captured_at);
          const afterStart = !customStartDate || itemDate >= customStartDate;
          const beforeEnd = !customEndDate || itemDate <= customEndDate;
          return afterStart && beforeEnd;
        });
      case "all":
      default:
        return data;
    }
  };

  const filteredData = useMemo(() => {
    return filterByTimeRange(sortedData, timeRange);
  }, [sortedData, timeRange, customStartDate, customEndDate]);

  // ECサイトでフィルタリング
  const ecSiteFilteredData = useMemo(() => {
    if (selectedEcSite === "all") return filteredData;
    return filteredData.filter(
      (item) => item.product_on_ec_site.ec_site.name === selectedEcSite
    );
  }, [filteredData, selectedEcSite]);

  // 価格がnullのデータを除外
  const validPriceData = useMemo(() => {
    return ecSiteFilteredData.filter((item) => {
      const price = priceType === "price" ? item.price : item.effective_price;
      return price !== null && price !== undefined;
    });
  }, [ecSiteFilteredData, priceType]);

  // 利用可能なECサイトのリストを取得
  const availableEcSites = useMemo(() => {
    const sites = new Set<string>();
    filteredData.forEach((item) =>
      sites.add(item.product_on_ec_site.ec_site.name)
    );
    return Array.from(sites);
  }, [filteredData]);

  // 各ECサイトごとの最新価格を取得し、価格の安い順にソート
  const sortedSites = useMemo(() => {
    const siteMap = new Map<string, PriceHistory>();

    // 各ECサイトの最新価格を取得
    validPriceData.forEach((item) => {
      const key = `${item.product_on_ec_site.ec_site.name}-${item.product_on_ec_site.seller_name}`;
      const existing = siteMap.get(key);
      if (
        !existing ||
        new Date(item.captured_at) > new Date(existing.captured_at)
      ) {
        siteMap.set(key, item);
      }
    });

    // 価格の安い順にソート
    return Array.from(siteMap.values())
      .sort((a, b) => {
        const priceA = priceType === "price" ? a.price : a.effective_price;
        const priceB = priceType === "price" ? b.price : b.effective_price;
        return priceA - priceB;
      })
      .slice(0, 5); // 上位5件のみ
  }, [validPriceData, priceType]);

  // グラフ用のデータを整形
  const chartData = useMemo(() => {
    const dateMap = new Map<string, any>();

    // 日付ごとのデータを集計
    validPriceData.forEach((item) => {
      const date = new Date(item.captured_at).toLocaleDateString("ja-JP");
      const key = `${item.product_on_ec_site.ec_site.name}-${item.product_on_ec_site.seller_name}`;
      const price = priceType === "price" ? item.price : item.effective_price;

      // 価格がnullまたはundefinedの場合は追加しない（念のための確認）
      if (price === null || price === undefined) return;

      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          timestamp: new Date(item.captured_at).getTime(),
        });
      }

      const data = dateMap.get(date);
      data[key] = price;
    });

    // 各ECサイトの最新価格点を追加（現在価格）
    if (sortedSites.length > 0) {
      sortedSites.forEach((site) => {
        const latestDate = new Date(
          site.product_on_ec_site.updated_at
        ).toLocaleDateString("ja-JP");

        if (!dateMap.has(latestDate)) {
          dateMap.set(latestDate, {
            date: latestDate,
            timestamp: new Date(site.product_on_ec_site.updated_at).getTime(),
          });
        }

        const key = `${site.product_on_ec_site.ec_site.name}-${site.product_on_ec_site.seller_name}`;
        const data = dateMap.get(latestDate);
        let price;

        if (site.product_on_ec_site.current_price) {
          price =
            priceType === "price"
              ? site.product_on_ec_site.current_price
              : site.product_on_ec_site.effective_price ||
                site.product_on_ec_site.current_price;

          // 価格がnullまたはundefinedの場合は追加しない
          if (price !== null && price !== undefined) {
            data[key] = price;
          }
        }
      });
    }

    // 日付順にソート
    return Array.from(dateMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }, [validPriceData, priceType, sortedSites]);

  // X軸の表示範囲に基づいたデータ
  const displayedChartData = useMemo(() => {
    if (!xAxisRange || !chartData.length) return chartData;

    // 範囲が有効な場合は、その範囲のデータのみを返す
    return chartData.slice(xAxisRange.start, xAxisRange.end + 1);
  }, [chartData, xAxisRange]);

  // データセットが変わったら表示範囲をリセット
  useEffect(() => {
    setXAxisRange(null);
  }, [validPriceData, timeRange, selectedEcSite]);

  // 価格範囲を計算
  const priceMin =
    sortedSites.length > 0
      ? Math.min(
          ...sortedSites.map((item) =>
            priceType === "price" ? item.price : item.effective_price
          )
        )
      : 0;
  const priceMax =
    sortedSites.length > 0
      ? Math.max(
          ...sortedSites.map((item) =>
            priceType === "price" ? item.price : item.effective_price
          )
        )
      : 0;

  // 余白を追加
  const yAxisMin = Math.max(0, Math.floor(priceMin * 0.95));
  const yAxisMax = Math.ceil(priceMax * 1.05);

  const handlePriceTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPriceType: PriceType | null
  ) => {
    if (newPriceType !== null) {
      setPriceType(newPriceType);
    }
  };

  // カスタムボタンクリック時にポップアップを表示
  const handleCustomButtonClick = () => {
    // すでにカスタムモードで、かつポップアップが表示されていない場合のみ表示
    const shouldShowPopup = timeRange === "custom" ? !anchorEl : true;

    if (shouldShowPopup) {
      // 現在日付の1ヶ月前を初期値とする
      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);

      if (!customStartDate) {
        setCustomStartDate(oneMonthAgo);
      }

      if (!customEndDate) {
        setCustomEndDate(now);
      }

      // ポップアップを表示するためのダミーイベント
      const dummyEvent = {
        currentTarget: document.querySelector(
          '[value="custom"]'
        ) as HTMLButtonElement,
      } as React.MouseEvent<HTMLButtonElement>;

      if (dummyEvent.currentTarget) {
        handleCustomDateClick(dummyEvent);
        // 開始日のカレンダーを自動的に開く
        setTimeout(() => {
          setCurrentPickerType("start");
          setStartDatePickerOpen(true);
        }, 100);
      }
    }
  };

  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeRange: TimeRange | null
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
      if (newTimeRange !== "custom") {
        setAnchorEl(null);
      } else {
        handleCustomButtonClick();
      }
    }
  };

  const handleEcSiteChange = (event: SelectChangeEvent) => {
    setSelectedEcSite(event.target.value);
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  // 日付範囲を設定するポップアップを表示
  const handleCustomDateClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setAnchorEl(event.currentTarget);
  };

  // ポップアップを閉じる
  const handleCustomDateClose = () => {
    setAnchorEl(null);
  };

  // 日付範囲を適用してグラフを更新
  const handleApplyCustomDates = () => {
    setTimeRange("custom");
    setAnchorEl(null);
  };

  // 開始日カレンダー用の入力フィールドがクリックされたときの処理
  const handleStartDateInputClick = () => {
    setCurrentPickerType("start");
    setStartDatePickerOpen(true);
    setEndDatePickerOpen(false);
  };

  // 終了日カレンダー用の入力フィールドがクリックされたときの処理
  const handleEndDateInputClick = () => {
    setCurrentPickerType("end");
    setEndDatePickerOpen(true);
    setStartDatePickerOpen(false);
  };

  // 開始日の変更処理
  const handleStartDateChange = (newValue: Date | null) => {
    setCustomStartDate(newValue);
    // 開始日が選択されたら、カレンダーを閉じ、終了日カレンダーを開く
    if (newValue) {
      setStartDatePickerOpen(false);
      setTimeout(() => {
        setCurrentPickerType("end");
        setEndDatePickerOpen(true);
      }, 100);
    }
  };

  // 終了日の変更処理
  const handleEndDateChange = (newValue: Date | null) => {
    setCustomEndDate(newValue);
    // 終了日が選択されたら、カレンダーを閉じて変更を適用
    if (newValue) {
      setEndDatePickerOpen(false);
      handleApplyCustomDates();
    }
  };

  const openCustomDate = Boolean(anchorEl);
  const customDateId = openCustomDate ? "custom-date-popover" : undefined;

  // カラーパレット
  const colors = ["#1976d2", "#f50057", "#4caf50", "#ff9800", "#9c27b0"];

  return (
    <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, mb: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2,
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 1, md: 2 },
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: { xs: "1rem", sm: "1.25rem" },
            whiteSpace: { md: "nowrap" }, // PC表示時に「価格履歴」が改行されないように
          }}
        >
          価格履歴
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: { xs: 1, md: 2 },
            flexWrap: "wrap",
            justifyContent: { xs: "flex-start", md: "flex-end" },
            width: "100%",
          }}
        >
          {/* モバイル表示では横に並べるボタンを縦に配置 */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
              width: { xs: "100%", sm: "auto" },
            }}
          >
            <FormControl
              size="small"
              sx={{ minWidth: { xs: "100%", sm: 120 } }}
            >
              <InputLabel>ECサイト</InputLabel>
              <Select
                value={selectedEcSite}
                label="ECサイト"
                onChange={handleEcSiteChange}
              >
                <MenuItem value="all">すべて</MenuItem>
                {availableEcSites.map((site) => (
                  <MenuItem key={site} value={site}>
                    {site}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <ToggleButtonGroup
              value={priceType}
              exclusive
              onChange={handlePriceTypeChange}
              size="small"
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              <ToggleButton value="price" sx={{ flex: 1 }}>
                表示価格
              </ToggleButton>
              <ToggleButton value="effective_price" sx={{ flex: 1 }}>
                実質価格
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: { xs: "100%", sm: "auto" },
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
            }}
          >
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={handleTimeRangeChange}
              size="small"
              sx={{
                width: { xs: "100%", sm: "auto" },
                flexWrap: { xs: "wrap", sm: "nowrap" },
                "& .MuiToggleButton-root": {
                  flex: { xs: 1, sm: "none" },
                  padding: { xs: "4px 8px", sm: "5px 12px" },
                  fontSize: { xs: "0.7rem", sm: "0.8rem" },
                },
              }}
            >
              <ToggleButton value="7days">1週間</ToggleButton>
              <ToggleButton value="1month">1ヶ月</ToggleButton>
              <ToggleButton value="3months">3ヶ月</ToggleButton>
              <ToggleButton value="all">全期間</ToggleButton>
              <ToggleButton
                value="custom"
                sx={{
                  backgroundColor:
                    timeRange === "custom" ? "primary.main" : undefined,
                  color: timeRange === "custom" ? "white" : undefined,
                  "&.Mui-selected": {
                    backgroundColor: "primary.main",
                    color: "white",
                  },
                }}
              >
                カスタム
              </ToggleButton>
            </ToggleButtonGroup>
            {/* モバイル時はフィルタアイコンを非表示 */}
            <IconButton
              size="small"
              onClick={handleCustomButtonClick}
              color="primary"
              aria-describedby={customDateId}
              sx={{
                alignSelf: { xs: "flex-end", sm: "center" },
                display: { xs: "none", sm: "inline-flex" }, // モバイルでは非表示
              }}
            >
              <FilterAltIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Popover
        id={customDateId}
        open={openCustomDate}
        anchorEl={anchorEl}
        onClose={handleCustomDateClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
          <Box sx={{ p: 2, width: { xs: 280, sm: 300 } }}>
            <Typography variant="subtitle1" gutterBottom>
              {currentPickerType === "start"
                ? "開始日を選択"
                : currentPickerType === "end"
                ? "終了日を選択"
                : "日付範囲を選択"}
            </Typography>
            <Stack spacing={2} mt={2}>
              <DatePicker
                label="開始日"
                value={customStartDate}
                onChange={handleStartDateChange}
                open={startDatePickerOpen}
                onClose={() => setStartDatePickerOpen(false)}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    onClick: handleStartDateInputClick,
                  },
                  field: { clearable: false },
                  actionBar: { actions: [] },
                }}
              />
              <DatePicker
                label="終了日"
                value={customEndDate}
                onChange={handleEndDateChange}
                open={endDatePickerOpen}
                onClose={() => setEndDatePickerOpen(false)}
                slotProps={{
                  textField: {
                    size: "small",
                    fullWidth: true,
                    onClick: handleEndDateInputClick,
                  },
                  field: { clearable: false },
                  actionBar: { actions: [] },
                }}
                minDate={customStartDate || undefined}
              />
            </Stack>
          </Box>
        </LocalizationProvider>
      </Popover>

      <MuiTooltip
        title="Ctrl + マウスホイールでX軸のズーム"
        arrow
        placement="top"
        open={showZoomGuide}
      >
        <Box
          ref={chartRef}
          sx={{
            height: { xs: 300, sm: 350, md: 400 },
            position: "relative",
            overflow: "hidden",
          }}
        >
          <animated.div
            style={{
              ...zoomAnimation,
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              padding: "10px",
              borderRadius: "8px",
              color: "white",
              pointerEvents: "none",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <MouseIcon sx={{ mr: 1 }} />
              <Typography variant="body2">Ctrl + スクロール</Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <ZoomInIcon />
              <ZoomOutIcon />
            </Box>
          </animated.div>

          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={displayedChartData}
              margin={{
                top: 5,
                right: 10,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickFormatter={(value) => {
                  // モバイル表示では簡略化された日付表示
                  if (isMobile) {
                    const parts = value.split("/");
                    return parts.length > 1 ? `${parts[1]}/${parts[2]}` : value;
                  }
                  return value;
                }}
              />
              <YAxis
                domain={[yAxisMin, yAxisMax]}
                tickFormatter={(value) => formatPrice(value)}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                width={50}
              />
              <Tooltip
                formatter={(value: number) => formatPrice(value)}
                labelFormatter={(label) => `日付: ${label}`}
                contentStyle={{ fontSize: isMobile ? 12 : 14 }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  fontSize: isMobile ? "10px" : "12px",
                  marginTop: "10px",
                }}
                iconSize={8}
                formatter={(value) => {
                  // モバイル向けに長いECサイト名を短くする
                  if (isMobile) {
                    // 「(販売者名)」の部分を削除
                    const parts = value.split(" (");
                    return parts[0];
                  }
                  return value;
                }}
              />
              {sortedSites.map((site, index) => {
                const key = `${site.product_on_ec_site.ec_site.name}-${site.product_on_ec_site.seller_name}`;
                const isCheapest = index === 0;
                return (
                  <Line
                    key={key}
                    name={`${site.product_on_ec_site.ec_site.name}${
                      site.product_on_ec_site.seller_name
                        ? ` (${site.product_on_ec_site.seller_name})`
                        : ""
                    }`}
                    type="stepAfter"
                    dataKey={key}
                    stroke={colors[index % colors.length]}
                    strokeWidth={isCheapest ? 2 : 1}
                    dot={false}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />
                );
              })}
              {threshold && (
                <Line
                  name="目標価格"
                  type="monotone"
                  dataKey={() => threshold}
                  stroke="#ff7300"
                  strokeDasharray="5 5"
                  dot={false}
                  strokeWidth={1}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </MuiTooltip>

      <Snackbar
        open={showZoomSnackbar}
        autoHideDuration={1500}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" sx={{ width: "100%" }}>
          {xAxisRange
            ? `X軸ズーム: 表示期間 ${displayedChartData.length}日間`
            : "全期間表示中"}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PriceHistoryChart;
