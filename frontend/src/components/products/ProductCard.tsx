import React from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  IconButton,
  CardActions,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ShoppingCart as ShoppingCartIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { UserProduct, ProductOnECSite } from "../../types";

interface ProductCardProps {
  userProduct: UserProduct;
  onDelete: (id: number) => void;
  onToggleNotification: (id: number, enabled: boolean) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  userProduct,
  onDelete,
  onToggleNotification,
}) => {
  const { id, product, notification_enabled } = userProduct;

  if (!product) return null;

  // デバッグ用
  if (import.meta.env.DEV) {
    console.log("ProductCard - 商品データ:", product);
    console.log("ProductCard - EC情報(ec_sites):", product.ec_sites);
  }

  const ecSites = product.ec_sites || [];

  // 型引数を使わずに明示的な型定義
  const lowestPrice = ecSites.reduce(
    (min: number | null, site: ProductOnECSite) => {
      return site.current_price &&
        (min === null || parseFloat(site.current_price.toString()) < min)
        ? parseFloat(site.current_price.toString())
        : min;
    },
    null
  );

  if (import.meta.env.DEV) {
    console.log("ProductCard - 最安値:", lowestPrice);
  }

  const getBestEcSite = () => {
    if (ecSites.length === 0) return null;

    // 型引数を使わずに明示的な型定義
    return ecSites.reduce(
      (best: ProductOnECSite | null, site: ProductOnECSite) => {
        if (!site.current_price) return best;
        if (!best || !best.current_price) return site;
        return parseFloat(site.current_price.toString()) <
          parseFloat(best.current_price.toString())
          ? site
          : best;
      },
      null
    );
  };

  const bestSite = getBestEcSite();

  if (import.meta.env.DEV) {
    console.log("ProductCard - 最安値サイト:", bestSite);
  }

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia
        component="img"
        sx={{
          height: 140,
          objectFit: "contain",
          backgroundColor: "#f5f5f5",
          p: 1,
        }}
        image={product.image_url || "/placeholder.png"}
        alt={product.name}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography
          gutterBottom
          variant="h6"
          component="div"
          noWrap
          title={product.name}
        >
          {product.name}
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            最安値:
          </Typography>
          {lowestPrice ? (
            <Typography variant="h6" color="primary">
              ¥{lowestPrice.toLocaleString()}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              情報なし
            </Typography>
          )}
        </Box>

        {bestSite && (
          <Box sx={{ mt: 1 }}>
            <Chip
              size="small"
              label={bestSite.ec_site?.name || "ECサイト"}
              color="primary"
              variant="outlined"
            />
          </Box>
        )}

        {userProduct.price_threshold && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">
              目標価格: ¥{userProduct.price_threshold.toLocaleString()}
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", p: 2, pt: 0 }}>
        <Box>
          <Tooltip title="編集">
            <IconButton
              component={Link}
              to={`/products/${id}`}
              aria-label="編集"
              size="small"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={notification_enabled ? "通知を無効化" : "通知を有効化"}
          >
            <IconButton
              onClick={() => onToggleNotification(id, !notification_enabled)}
              aria-label={
                notification_enabled ? "通知を無効化" : "通知を有効化"
              }
              color={notification_enabled ? "primary" : "default"}
              size="small"
            >
              {notification_enabled ? (
                <NotificationsIcon fontSize="small" />
              ) : (
                <NotificationsOffIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="削除">
            <IconButton
              onClick={() => onDelete(id)}
              aria-label="削除"
              color="error"
              size="small"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {bestSite && bestSite.affiliate_url && (
          <Button
            size="small"
            variant="contained"
            color="primary"
            endIcon={<ShoppingCartIcon />}
            component="a"
            href={bestSite.affiliate_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            購入
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default ProductCard;
