import os
import sqlite3
import django
from django.conf import settings

# Djangoの設定を読み込む
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'PriceAlert.settings')
django.setup()

# データベースの接続
old_conn = sqlite3.connect('db.sqlite3.old')
new_conn = sqlite3.connect('db.sqlite3')
old_cursor = old_conn.cursor()
new_cursor = new_conn.cursor()

try:
    # ユーザーデータの移行
    old_cursor.execute("SELECT * FROM users_user")
    users = old_cursor.fetchall()
    
    for user in users:
        # カラムの順序を確認して適切にマッピング
        new_cursor.execute("""
            INSERT INTO accounts_user 
            (id, password, is_superuser, email, username, is_active, is_staff, 
             created_at, updated_at, last_login) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, user)

    # ユーザー権限の移行
    old_cursor.execute("SELECT * FROM users_user_groups")
    user_groups = old_cursor.fetchall()
    for group in user_groups:
        new_cursor.execute("""
            INSERT INTO accounts_user_groups 
            (id, user_id, group_id) 
            VALUES (?, ?, ?)
        """, group)

    # ユーザー権限の移行
    old_cursor.execute("SELECT * FROM users_user_user_permissions")
    user_permissions = old_cursor.fetchall()
    for permission in user_permissions:
        new_cursor.execute("""
            INSERT INTO accounts_user_user_permissions 
            (id, user_id, permission_id) 
            VALUES (?, ?, ?)
        """, permission)

    # パスワードリセットトークンの移行
    old_cursor.execute("SELECT * FROM users_passwordresettoken")
    tokens = old_cursor.fetchall()
    for token in tokens:
        new_cursor.execute("""
            INSERT INTO accounts_passwordresettoken 
            (id, token, is_used, expires_at, created_at, updated_at, user_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, token)

    # 変更を確定
    new_conn.commit()
    print("データの移行が完了しました。")

except Exception as e:
    print(f"エラーが発生しました: {e}")
    new_conn.rollback()

finally:
    # 接続を閉じる
    old_cursor.close()
    new_cursor.close()
    old_conn.close()
    new_conn.close() 