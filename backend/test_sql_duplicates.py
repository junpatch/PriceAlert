#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
商品登録APIの呼び出しテスト - SQLの重複クエリを分析する

使用方法:
1. Djangoサーバーを起動: python manage.py runserver
2. 新しいターミナルでこのスクリプトを実行: python test_sql_duplicates.py
"""

import sys
import os
import json
import requests
from pprint import pprint

# ローカルサーバーのベースURL
BASE_URL = "http://localhost:8000/api/v1"

# 認証トークン（実際のトークンに置き換える必要があります）
AUTH_TOKEN = "your_auth_token"

def test_user_products_post():
    """商品登録APIをテストする - 重複SQLの主要ポイント"""
    url = f"{BASE_URL}/user-products/"
    
    # リクエストヘッダー
    headers = {
        'Authorization': f'Token {AUTH_TOKEN}',
        'Content-Type': 'application/json'
    }
    
    # テスト用のJANコード (実在する商品のJANコードに変更してください)
    test_jan_code = "4909411055115"  # ビスコ
    
    # リクエストボディ
    data = {
        "jan_code": test_jan_code,
        "price_threshold": 100
    }
    
    print(f"商品登録APIをテスト: JAN={test_jan_code}")
    print("リクエスト送信中...")
    
    try:
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 200 or response.status_code == 201:
            print(f"APIレスポンス成功: ステータスコード={response.status_code}")
            # レスポンスの最初の部分のみ表示（大きすぎる場合）
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                print(f"取得した商品数: {len(data)}")
                sample_item = data[0]
                print("最初の商品情報:")
                if "ec_sites" in sample_item and len(sample_item["ec_sites"]) > 0:
                    print(f"商品名: {sample_item.get('name')}")
                    print(f"EC数: {len(sample_item['ec_sites'])}")
                    ec_site_sample = sample_item["ec_sites"][0]
                    print(f"EC例: {ec_site_sample.get('ec_site', {}).get('name')} - {ec_site_sample.get('current_price')}円")
            else:
                pprint(data)
        else:
            print(f"APIエラー: ステータスコード={response.status_code}")
            print("エラーレスポンス:")
            pprint(response.json())
    except Exception as e:
        print(f"エラー発生: {e}")

if __name__ == "__main__":
    print("商品登録API - 重複SQLクエリテスト開始")
    test_user_products_post()
    print("テスト完了") 