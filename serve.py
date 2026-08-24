#!/usr/bin/env python3
"""
范小皮网站本地服务器
- 多线程：同时处理多个请求（游戏文件多，单线程会排队卡死）
- gzip 压缩：html/js/css/json 自动压缩，传输量减少 60~80%

用法：cd 到 website 目录，运行  python3 serve.py [端口]
默认端口 8765
（2026-08-24：学习资料 API/访问统计已按皮皮要求移除，备份在
 workspace/tmp/website-backup-20260824-study/）
"""
import gzip
import io
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

# 这些类型的文件会被 gzip 压缩（图片/音频本身就是压缩格式，压了没用）
GZIP_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".webmanifest": "application/manifest+json",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def send_response(self, code, message=None):
        # 开发服务器：告诉浏览器每次都要重新验证，避免改完文件看不到更新
        super().send_response(code, message)
        self.send_header("Cache-Control", "no-cache")

    def send_head(self):
        path = self.translate_path(self.path)
        # 只给声明支持 gzip 的客户端压缩（所有浏览器都会声明）
        wants_gzip = "gzip" in self.headers.get("Accept-Encoding", "")
        if wants_gzip and os.path.isfile(path):
            ext = os.path.splitext(path)[1].lower()
            ctype = GZIP_TYPES.get(ext)
            if ctype:
                try:
                    with open(path, "rb") as f:
                        data = f.read()
                    # 超过 200 字节才压缩，小文件压缩反而更慢
                    if len(data) > 200:
                        data = gzip.compress(data, 6)
                        self.send_response(200)
                        self.send_header("Content-Type", ctype)
                        self.send_header("Content-Encoding", "gzip")
                        self.send_header("Content-Length", str(len(data)))
                        self.send_header("Last-Modified",
                                         self.date_time_string(os.path.getmtime(path)))
                        self.end_headers()
                        return io.BytesIO(data)
                except OSError:
                    pass  # 读取失败就交给默认处理
        return super().send_head()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"网站服务器已启动： http://0.0.0.0:{PORT}/  （gzip 压缩已开启，按 Ctrl+C 停止）")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止")
