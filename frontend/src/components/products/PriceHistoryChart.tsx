import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Box,
  Paper,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { PriceHistory } from '@types/index';

interface PriceHistoryChartProps {
  data: PriceHistory[];
  threshold?: number;
}

type PriceType = 'price' | 'effective_price';
type TimeRange = '7days' | '1month' | '3months' | 'all';

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  data,
  threshold,
}) => {
  const [priceType, setPriceType] = useState<PriceType>('price');
  const [timeRange, setTimeRange] = useState<TimeRange>('1month');

  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          価格履歴
        </Typography>
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            価格履歴データがありません
          </Typography>
        </Box>
      </Paper>
    );
  }

  // 日付でソート
  const sortedData = [...data].sort(
    (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );

  // 日付範囲でフィルタリング
  const filterByTimeRange = (data: PriceHistory[], range: TimeRange) => {
    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    
    switch (range) {
      case '7days':
        return data.filter(item => 
          new Date(item.captured_at).getTime() > now.getTime() - 7 * msInDay
        );
      case '1month':
        return data.filter(item => 
          new Date(item.captured_at).getTime() > now.getTime() - 30 * msInDay
        );
      case '3months':
        return data.filter(item => 
          new Date(item.captured_at).getTime() > now.getTime() - 90 * msInDay
        );
      case 'all':
      default:
        return data;
    }
  };

  const filteredData = filterByTimeRange(sortedData, timeRange);

  // グラフ用に日付フォーマット
  const formattedData = filteredData.map(item => ({
    ...item,
    date: new Date(item.captured_at).toLocaleDateString('ja-JP'),
  }));

  // 価格範囲を計算
  const priceMin = Math.min(...formattedData.map(item => 
    priceType === 'price' ? item.price : item.effective_price
  ));
  const priceMax = Math.max(...formattedData.map(item => 
    priceType === 'price' ? item.price : item.effective_price
  ));
  
  // 余白を追加
  const yAxisMin = Math.max(0, Math.floor(priceMin * 0.95));
  const yAxisMax = Math.ceil(priceMax * 1.05);

  const handlePriceTypeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newPriceType: PriceType | null,
  ) => {
    if (newPriceType !== null) {
      setPriceType(newPriceType);
    }
  };

  const handleTimeRangeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newTimeRange: TimeRange | null,
  ) => {
    if (newTimeRange !== null) {
      setTimeRange(newTimeRange);
    }
  };

  const formatPrice = (price: number) => {
    return `¥${price.toLocaleString()}`;
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          価格履歴
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ToggleButtonGroup
            value={priceType}
            exclusive
            onChange={handlePriceTypeChange}
            size="small"
          >
            <ToggleButton value="price">
              表示価格
            </ToggleButton>
            <ToggleButton value="effective_price">
              実質価格
            </ToggleButton>
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
            data={formattedData}
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
              label={{ value: '日付', position: 'insideBottomRight', offset: -10 }} 
            />
            <YAxis 
              domain={[yAxisMin, yAxisMax]} 
              tickFormatter={formatPrice}
              label={{ value: '価格 (円)', angle: -90, position: 'insideLeft' }} 
            />
            <Tooltip 
              formatter={(value: number) => formatPrice(value)} 
              labelFormatter={(label) => `日付: ${label}`} 
            />
            <Legend />
            <Line
              name={priceType === 'price' ? '表示価格' : '実質価格'}
              type="monotone"
              dataKey={priceType}
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              strokeWidth={2}
            />
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