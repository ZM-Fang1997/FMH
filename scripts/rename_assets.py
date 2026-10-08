#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
复制并重命名图片和 xlsx 文件为无中文文件名，更新 substances_full.json 路径
"""
import json
import shutil
from pathlib import Path
from pypinyin import lazy_pinyin

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_JSON = BASE_DIR / "data" / "substances_full.json"
IMAGE_SRC_DIR = BASE_DIR.parent / "ysty1" / "图片信息"
XLSX_SRC_DIR = BASE_DIR / "data" / "substances"
IMAGE_DST_DIR = BASE_DIR / "assets" / "images"
XLSX_DST_DIR = BASE_DIR / "data" / "substances_en"


def to_pinyin(name):
    """将中文名转为拼音，去除括号内容，空格换下划线"""
    # 去除括号及内容
    import re
    clean = re.sub(r"[（(].*?[）)]", "", name)
    pys = lazy_pinyin(clean.strip())
    return "_".join(pys)


def main():
    with open(INPUT_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    IMAGE_DST_DIR.mkdir(parents=True, exist_ok=True)
    XLSX_DST_DIR.mkdir(parents=True, exist_ok=True)

    updated = 0
    missing_images = []
    missing_xlsx = []

    for record in data:
        sid = record["id"]
        name = record["name"]
        pinyin = to_pinyin(name)

        # 图片
        src_img = IMAGE_SRC_DIR / f"{name}.png"
        dst_img_name = f"{sid:03d}_{pinyin}.png"
        dst_img = IMAGE_DST_DIR / dst_img_name
        if src_img.exists():
            shutil.copy2(src_img, dst_img)
            record["image"] = f"assets/images/{dst_img_name}"
        else:
            # 处理名称不一致的情况（如 桑椹 vs 桑葚）
            alt_names = [name]
            if name == "桑葚":
                alt_names.append("桑椹")
            elif name == "桑椹":
                alt_names.append("桑葚")
            found = False
            for alt in alt_names:
                alt_src = IMAGE_SRC_DIR / f"{alt}.png"
                if alt_src.exists():
                    shutil.copy2(alt_src, dst_img)
                    record["image"] = f"assets/images/{dst_img_name}"
                    found = True
                    break
            if not found:
                missing_images.append(name)
                record["image"] = ""

        # xlsx
        src_xlsx = XLSX_SRC_DIR / f"{name}.xlsx"
        dst_xlsx_name = f"{sid:03d}_{pinyin}.xlsx"
        dst_xlsx = XLSX_DST_DIR / dst_xlsx_name
        if src_xlsx.exists():
            shutil.copy2(src_xlsx, dst_xlsx)
            record["data_file"] = f"data/substances_en/{dst_xlsx_name}"
        else:
            missing_xlsx.append(name)
            record["data_file"] = ""

        updated += 1
        if updated % 20 == 0:
            print(f"  已处理 {updated}/106")

    # 写回 JSON
    with open(INPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n完成！")
    print(f"  图片输出: {IMAGE_DST_DIR} ({updated - len(missing_images)} / {updated})")
    print(f"  xlsx 输出: {XLSX_DST_DIR} ({updated - len(missing_xlsx)} / {updated})")
    if missing_images:
        print(f"  缺失图片: {missing_images}")
    if missing_xlsx:
        print(f"  缺失 xlsx: {missing_xlsx}")


if __name__ == "__main__":
    main()
