import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import PageContainer from '@components/layout/PageContainer';
import PriceHistoryChart from '@components/products/PriceHistoryChart';
import LoadingSpinner from '@components/common/LoadingSpinner';
import ErrorAlert from '@components/common/ErrorAlert';
import { useProducts } from '@features/products/hooks/useProducts';
import { useGetProductByIdQuery, useGetPriceHistoryQuery } from '@services/api';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const navigate = useNavigate();
  
  const { error: productsError, updateProduct } = useProducts();
  const { data: product, isLoading: isProductLoading, error: productError } = useGetProductByIdQuery(productId);
  const { data: priceHistory, isLoading: isPriceHistoryLoading } = useGetPriceHistoryQuery({ productId });
  
  const [priceThreshold, setPriceThreshold] = useState<number | undefined>(undefined);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const loading = isProductLoading || isPriceHistoryLoading;
  const error = productsError || productError;
  
  // プロダクトデータから設定を取得
  useEffect(() => {
    if (product && product.userProducts && product.userProducts.length > 0) {
      const userProduct = product.userProducts[0];
      setPriceThreshold(userProduct.price_threshold);
      setNotificationEnabled(userProduct.notification_enabled);
      setMemo(userProduct.memo || '');
    }
  }, [product]);
  
  if (loading) {
    return (
      <PageContainer title="商品詳細" maxWidth="lg">
        <LoadingSpinner />
      </PageContainer>
    );
  }
  
  if (!product) {
    return (
      <PageContainer title="商品詳細" maxWidth="lg">
        <Typography color="error">商品が見つかりません</Typography>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          ダッシュボードに戻る
        </Button>
      </PageContainer>
    );
  }
  
  const userProduct = product.userProducts && product.userProducts.length > 0
    ? product.userProducts[0]
    : null;
  
  const handleSaveSettings = async () => {
    if (!userProduct) return;
    
    setIsSaving(true);
    try {
      await updateProduct(userProduct.id, {
        price_threshold: priceThreshold,
        notification_enabled: notificationEnabled,
        memo,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('設定の更新に失敗しました', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  const getBestEcSite = () => {
    if (!product.ec_sites || product.ec_sites.length === 0) return null;
    
    return product.ec_sites.reduce((best, site) => {
      if (!site.current_price) return best;
      if (!best || !best.current_price) return site;
      return site.current_price < best.current_price ? site : best;
    }, null);
  };
  
  const bestSite = getBestEcSite();
  
  return (
    <PageContainer title={product.name} maxWidth="lg">
      <Box sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
        >
          ダッシュボードに戻る
        </Button>
      </Box>
      
      <ErrorAlert error={error} />
      
      <Grid container spacing={3}>
        {/* 商品情報 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardMedia
              component="img"
              sx={{ 
                height: 300, 
                objectFit: 'contain',
                backgroundColor: '#f5f5f5', 
                p: 2
              }}
              image={product.image_url || '/placeholder.png'}
              alt={product.name}
            />
            <CardContent>
              <Typography gutterBottom variant="h5" component="div">
                {product.name}
              </Typography>
              
              {product.manufacturer && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  メーカー: {product.manufacturer}
                </Typography>
              )}
              
              {product.model_number && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  型番: {product.model_number}
                </Typography>
              )}
              
              {product.jan_code && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  JANコード: {product.jan_code}
                </Typography>
              )}
              
              {product.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {product.description}
                </Typography>
              )}
              
              {bestSite && bestSite.affiliate_url && (
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<ShoppingCartIcon />}
                  component="a"
                  href={bestSite.affiliate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {bestSite.ec_site?.name || 'ECサイト'}で購入
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* 通知設定 */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">通知設定</Typography>
                {isEditing ? (
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                  >
                    {isSaving ? '保存中...' : '保存'}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    onClick={() => setIsEditing(true)}
                  >
                    編集
                  </Button>
                )}
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <TextField
                  label="目標価格"
                  type="number"
                  value={priceThreshold || ''}
                  onChange={(e) => setPriceThreshold(Number(e.target.value) || undefined)}
                  disabled={!isEditing}
                  fullWidth
                  margin="normal"
                  InputProps={{
                    startAdornment: <span>¥</span>,
                  }}
                  helperText="この価格以下になったら通知します"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={notificationEnabled}
                      onChange={(e) => setNotificationEnabled(e.target.checked)}
                      disabled={!isEditing}
                    />
                  }
                  label="価格通知を有効にする"
                />
              </Box>
              
              <TextField
                label="メモ"
                multiline
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={!isEditing}
                fullWidth
                margin="normal"
              />
            </CardContent>
          </Card>
        </Grid>
        
        {/* 価格履歴 */}
        <Grid item xs={12} md={8}>
          <PriceHistoryChart data={priceHistory || []} threshold={priceThreshold} />
          
          {/* ECサイト比較テーブル */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ECサイト比較
            </Typography>
            
            {product.ec_sites && product.ec_sites.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ECサイト</TableCell>
                      <TableCell align="right">価格</TableCell>
                      <TableCell align="right">ポイント</TableCell>
                      <TableCell align="right">実質価格</TableCell>
                      <TableCell align="right">最終更新日</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {product.ec_sites.map((site) => (
                      <TableRow key={site.id} sx={{ 
                        backgroundColor: site === bestSite ? 'rgba(76, 175, 80, 0.08)' : 'inherit'
                      }}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {site.ec_site?.name || 'ECサイト'}
                            {site === bestSite && (
                              <Chip
                                label="最安値"
                                size="small"
                                color="success"
                                sx={{ ml: 1 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {site.current_price 
                            ? `¥${site.current_price.toLocaleString()}`
                            : '情報なし'
                          }
                        </TableCell>
                        <TableCell align="right">
                          {site.current_points 
                            ? `¥${site.current_points.toLocaleString()}`
                            : '-'
                          }
                        </TableCell>
                        <TableCell align="right">
                          {site.effective_price 
                            ? `¥${site.effective_price.toLocaleString()}`
                            : '情報なし'
                          }
                        </TableCell>
                        <TableCell align="right">
                          {site.last_updated 
                            ? new Date(site.last_updated).toLocaleDateString('ja-JP')
                            : '-'
                          }
                        </TableCell>
                        <TableCell align="right">
                          {site.product_url && (
                            <IconButton
                              component="a"
                              href={site.affiliate_url || site.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                            >
                              <ShoppingCartIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">
                ECサイト情報がありません
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default ProductDetailPage; 