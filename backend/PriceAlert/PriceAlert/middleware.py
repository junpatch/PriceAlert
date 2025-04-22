from django.utils.deprecation import MiddlewareMixin
import re

class SwaggerSchemeMiddleware(MiddlewareMixin):
    """
    Swagger UIのURLスキームをHTTPSに変更するミドルウェア
    """
    def process_response(self, request, response):
        # Swagger UI関連のパスかどうかを確認
        if '/swagger/' in request.path and response.get('Content-Type', '').startswith('text/html'):
            # レスポンスのコンテンツをHTTPSに修正
            content = response.content.decode('utf-8')
            
            # HTTP URLをHTTPSに変換するスクリプトを挿入
            script = """
            <script>
              document.addEventListener('DOMContentLoaded', function() {
                // すべてのSwagger APIリクエスト用のURLをHTTPSに変更
                const originalFetch = window.fetch;
                window.fetch = function(url, options) {
                    if (typeof url === 'string' && url.startsWith('http://pricealert-tpqq.onrender.com')) {
                        url = url.replace('http://', 'https://');
                    }
                    return originalFetch(url, options);
                };
                
                // 画面表示されるURLもHTTPSに変更
                setTimeout(function() {
                    const urlInputs = document.querySelectorAll('input.curl');
                    urlInputs.forEach(function(input) {
                        if (input.value && input.value.includes('http://pricealert-tpqq.onrender.com')) {
                            input.value = input.value.replace('http://pricealert-tpqq.onrender.com', 'https://pricealert-tpqq.onrender.com');
                        }
                    });
                }, 1000);
              });
            </script>
            """
            
            # body終了タグの前にスクリプトを挿入
            modified_content = re.sub(r'</body>', script + '</body>', content)
            response.content = modified_content.encode('utf-8')
            
            # コンテンツの長さを更新
            response['Content-Length'] = len(response.content)
        
        return response 