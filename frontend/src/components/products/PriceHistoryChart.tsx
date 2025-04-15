import React, { useState, useMemo } from "react";
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
} from "@mui/material";
import { PriceHistory } from "../../types";

interface PriceHistoryChartProps {
  data: PriceHistory[];
  threshold?: number;
}

type PriceType = "price" | "effective_price";
type TimeRange = "7days" | "1month" | "3months" | "all";

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  data,
  threshold,
}) => {
  const [priceType, setPriceType] = useState<PriceType>("price");
  const [timeRange, setTimeRange] = useState<TimeRange>("1month");
  const [selectedEcSite, setSelectedEcSite] = useState<string>("all");

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
      case "all":
      default:
        return data;
    }
  };

  const filteredData = useMemo(() => {
    return filterByTimeRange(sortedData, timeRange);
  }, [sortedData, timeRange]);

  // ECサイトでフィルタリング
  const ecSiteFilteredData = useMemo(() => {
    if (selectedEcSite === "all") return filteredData;
    return filteredData.filter(
      (item) => item.product_on_ec_site.ec_site.name === selectedEcSite
    );
  }, [filteredData, selectedEcSite]);

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
    ecSiteFilteredData.forEach((item) => {
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
  }, [ecSiteFilteredData, priceType]);

  // グラフ用のデータを整形
  const chartData = useMemo(() => {
    const dateMap = new Map<string, any>();

    // 日付ごとのデータを集計
    ecSiteFilteredData.forEach((item) => {
      const date = new Date(item.captured_at).toLocaleDateString("ja-JP");
      const key = `${item.product_on_ec_site.ec_site.name}-${item.product_on_ec_site.seller_name}`;

      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }

      const data = dateMap.get(date);
      data[key] = priceType === "price" ? item.price : item.effective_price;
    });

    return Array.from(dateMap.values());
  }, [ecSiteFilteredData, priceType]);

  // 価格範囲を計算
  const priceMin = Math.min(
    ...sortedSites.map((item) =>
      priceType === "price" ? item.price : item.effective_price
    )
  );
  const priceMax = Math.max(
    ...sortedSites.map((item) =>
      priceType === "price" ? item.price : item.effective_price
    )
  );

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

  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeRange: TimeRange | null
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  const handleEcSiteChange = (event: SelectChangeEvent) => {
    setSelectedEcSite(event.target.value);
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  // カラーパレット
  const colors = ["#1976d2", "#f50057", "#4caf50", "#ff9800", "#9c27b0"];

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">価格履歴</Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
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
          >
            <ToggleButton value="price">表示価格</ToggleButton>
            <ToggleButton value="effective_price">実質価格</ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            size="small"
          >
            <ToggleButton value="7days">1週間</ToggleButton>
            <ToggleButton value="1month">1ヶ月</ToggleButton>
            <ToggleButton value="3months">3ヶ月</ToggleButton>
            <ToggleButton value="all">全期間</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              label={{
                value: "日付",
                position: "insideBottomRight",
                offset: -10,
              }}
            />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              tickFormatter={formatPrice}
              label={{ value: "価格 (円)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              formatter={(value: number) => formatPrice(value)}
              labelFormatter={(label) => `日付: ${label}`}
            />
            <Legend />
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
                  strokeWidth={isCheapest ? 3 : 2}
                  dot={false}
                  activeDot={{ r: 8 }}
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
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};

export default PriceHistoryChart;
