import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { RootState } from "@store/index";
import { setError } from "@features/auth/slices/authSlice";
import { useAuth } from "@features/auth/hooks/useAuth";

const GlobalErrorHandler: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const error = useSelector((state: RootState) => state.auth.error);

  useEffect(() => {
    if (error) {
      // 401エラー（認証エラー）の場合
      if (error.includes("401") || error.includes("認証")) {
        toast.error("セッションが切れました。再度ログインしてください。");
        logout();
        return;
      }

      // CSRFエラーの場合
      if (error.includes("CSRF")) {
        toast.error("セッションが切れました。ページを更新してください。");
        window.location.reload();
        return;
      }

      // その他のエラーの場合
      toast.error(error);
      dispatch(setError(null));
    }
  }, [error, dispatch, logout]);

  return null;
};

export default GlobalErrorHandler;
