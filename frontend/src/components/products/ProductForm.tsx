import React from "react";
import {
  Box,
  TextField,
  Button,
  InputAdornment,
  Paper,
  Typography,
  FormControl,
  FormHelperText,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  isLoading: boolean;
}

export interface ProductFormData {
  url: string;
  price_threshold?: number;
}

const schema = yup.object().shape({
  url: yup
    .string()
    .required("URLは必須です")
    .url("有効なURLを入力してください")
    .max(1024, "URLは1024文字以内で入力してください"),
  price_threshold: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .nullable()
    .min(1, "価格は1円以上で設定してください")
    .max(10000000, "価格は1000万円以下で設定してください"),
});

const ProductForm: React.FC<ProductFormProps> = ({ onSubmit, isLoading }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: yupResolver(schema) as any,
    defaultValues: {
      url: "",
      price_threshold: undefined,
    },
  });

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        URLを入力して商品を登録
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Controller
          name="url"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              margin="normal"
              required
              fullWidth
              id="url"
              label="商品URL"
              placeholder="https://www.amazon.co.jp/dp/B0XXXX"
              autoFocus
              error={!!errors.url}
              helperText={errors.url?.message}
              disabled={isLoading}
            />
          )}
        />

        <Box sx={{ mt: 3, mb: 1 }}>
          <Typography gutterBottom>価格アラート設定（任意）</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            この価格以下になったら通知します
          </Typography>

          <FormControl fullWidth error={!!errors.price_threshold}>
            <Controller
              name="price_threshold"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  margin="normal"
                  fullWidth
                  id="price_threshold"
                  label="目標価格"
                  type="number"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">¥</InputAdornment>
                    ),
                  }}
                  error={!!errors.price_threshold}
                  disabled={isLoading}
                />
              )}
            />
            {errors.price_threshold && (
              <FormHelperText>{errors.price_threshold.message}</FormHelperText>
            )}
          </FormControl>
        </Box>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={isLoading}
        >
          {isLoading ? "登録中..." : "商品を登録"}
        </Button>
      </Box>
    </Paper>
  );
};

export default ProductForm;
