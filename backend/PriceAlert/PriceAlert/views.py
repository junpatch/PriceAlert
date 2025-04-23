from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings

def home(request):
    """
    トップページを表示するビュー
    Accept ヘッダーが application/json の場合はJSON形式で応答
    それ以外の場合はHTML形式で応答
    """
    # リクエストがJSONを要求している場合（APIクライアント向け）
    if request.headers.get('Accept') == 'application/json':
        api_info = {
            'status': 'OK',
            'message': 'PriceAlert API is running',
            'version': '1.0',
            'endpoints': {
                'auth': '/api/v1/auth/',
                'users': '/api/v1/users/',
                'products': '/api/v1/',
                'notifications': '/api/v1/notifications/',
            },
            'documentation': '/swagger/',
            'admin': '/admin/'
        }
        return JsonResponse(api_info)
    
    # それ以外の場合（ブラウザからのアクセス向け）
    return render(request, 'index.html') 