#!/usr/bin/env python3
"""
生成 games/manifest.json —— 游戏资源清单（文件名 + 大小）。
游戏大厅的进度条靠它计算"已加载字节 / 总字节"的真实进度。

用法：在 website 目录下运行  python3 tools/gen_games_manifest.py
以后往 games/ 里加了新游戏，重新跑一遍即可。
"""
import json
import os
from datetime import datetime

GAMES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "games")

# 这些文件永远不会被页面请求，不参与进度计算（不然百分比会偏低）
SKIP_PARTS = ("LICENSE", "README", ".git", "CNAME", ".DS_Store", ".bak")

# 每个游戏的额外排除规则：adarkroom 只加载 zh_cn 语言包，其他语言不会加载
EXTRA_SKIP = {
    "adarkroom": (
        lambda rel: rel.startswith("lang/") and not rel.startswith("lang/zh_cn/") and rel.count("/") > 1,
    ),
}


def skip(rel: str) -> bool:
    if any(p in rel.upper() for p in SKIP_PARTS):
        return True
    for rule in EXTRA_SKIP.get(rel.split("/")[0], ()):
        if rule(rel):
            return True
    return False


manifest = {"generated": datetime.now().isoformat(timespec="seconds"), "games": {}}

for game in sorted(os.listdir(GAMES_DIR)):
    game_dir = os.path.join(GAMES_DIR, game)
    if not os.path.isdir(game_dir) or game.startswith("."):
        continue
    files, total = {}, 0
    for root, _, names in os.walk(game_dir):
        for name in names:
            full = os.path.join(root, name)
            rel = os.path.relpath(full, GAMES_DIR).replace(os.sep, "/")
            if skip(rel):
                continue
            size = os.path.getsize(full)
            files[rel] = size
            total += size
    manifest["games"][game] = {"total": total, "files": files}
    print(f"{game:14s} {total/1024:8.1f} KB  {len(files):4d} 个文件")

out = os.path.join(os.path.dirname(GAMES_DIR), "games", "manifest.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)
print("已写入", out)
