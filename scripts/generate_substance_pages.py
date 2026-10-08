#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于 substances_full.json 生成 106 个独立的物质详情 HTML 页面
"""
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT_JSON = BASE_DIR / "data" / "substances_full.json"
OUTPUT_DIR = BASE_DIR / "substance"


def extract_pinyin_from_path(path_str):
    """从 assets/images/001_ding_xiang.png 提取 ding_xiang"""
    if not path_str:
        return ""
    m = re.search(r'/\d+_(.+?)\.', path_str)
    if m:
        return m.group(1)
    return ""


def get_nature_class(nature):
    if not nature:
        return "nature-neutral"
    if "热" in nature:
        return "nature-hot"
    if "温" in nature:
        return "nature-warm"
    if "寒" in nature:
        return "nature-cold"
    if "凉" in nature:
        return "nature-cool"
    return "nature-neutral"


def build_page(s, prev_s, next_s):
    """生成单物质的 HTML 页面"""
    name = s["name"]
    sid = s["id"]
    pinyin = extract_pinyin_from_path(s.get("image", ""))
    if not pinyin:
        pinyin = f"substance_{sid}"

    latin = s.get("latin_name", "") or s.get("en_name", "")
    nature = s.get("nature", "")
    flavor = s.get("flavor", "")
    meridians = s.get("meridians", "")
    nature_class = get_nature_class(nature)

    # TCM 标签
    tcm_tags = ""
    if nature:
        tcm_tags += f'<span class="tcm-tag {nature_class}">{nature}</span>'
    if flavor:
        tcm_tags += f'<span class="tcm-tag">{flavor}</span>'
    if meridians:
        tcm_tags += f'<span class="tcm-tag">归{meridians.replace("经", "")}经</span>'

    # 产品形态
    product_forms = ""
    if s.get("product_form"):
        product_forms = '<div class="product-forms">' + "".join(
            f'<span class="product-form-tag">{f}</span>' for f in s["product_form"]
        ) + "</div>"

    # 潜在功能
    potential_funcs = ""
    if s.get("potential_functions"):
        potential_funcs = '<div class="tcm-tags" style="margin-top:8px;">' + "".join(
            f'<span class="tcm-tag">{f}</span>' for f in s["potential_functions"]
        ) + "</div>"

    # 上一味/下一味导航
    prev_link = ""
    if prev_s:
        prev_pinyin = extract_pinyin_from_path(prev_s.get("image", "")) or f"substance_{prev_s['id']}"
        prev_link = f'<a class="btn btn-light" href="{prev_pinyin}.html">← {prev_s["name"]}</a>'
    next_link = ""
    if next_s:
        next_pinyin = extract_pinyin_from_path(next_s.get("image", "")) or f"substance_{next_s['id']}"
        next_link = f'<a class="btn btn-light" href="{next_pinyin}.html">{next_s["name"]} →</a>'

    # 下载链接
    download_link = ""
    if s.get("data_file"):
        download_link = f'<a class="btn btn-light" href="../{s["data_file"]}" download>📥 下载完整数据 (.xlsx)</a>'

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{name} | 食药物质详细信息</title>
<link rel="stylesheet" href="../css/style.css">
<style>
.substance-detail-page {{ max-width: 960px; margin: 0 auto; padding: 24px 16px; }}
.detail-header {{ display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }}
.detail-image {{ flex: 0 0 300px; }}
.detail-image img {{ width: 100%; border-radius: var(--radius); box-shadow: var(--shadow); }}
.detail-meta {{ flex: 1; min-width: 280px; }}
.detail-meta h1 {{ font-size: 1.6rem; color: var(--primary-dark); margin-bottom: 4px; }}
.detail-meta .latin {{ font-size: 1rem; color: var(--text-muted); font-style: italic; margin-bottom: 14px; }}
.detail-section {{ background: var(--card-bg); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow); }}
.detail-section h3 {{ color: var(--primary-dark); margin-bottom: 12px; font-size: 1.05rem; padding-bottom: 8px; border-bottom: 1px solid var(--border); }}
.detail-row {{ margin-bottom: 10px; font-size: 0.9rem; line-height: 1.6; }}
.detail-row .label {{ font-weight: 600; color: var(--primary-dark); display: inline-block; min-width: 90px; }}
.nav-footer {{ display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }}
.tcm-tags {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }}
.tcm-tag {{ display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.78rem; background: #fff3e0; color: #e65100; border: 1px solid #ffe0b2; }}
.tcm-tag.nature-hot {{ background: #ffebee; color: #c62828; border-color: #ffcdd2; }}
.tcm-tag.nature-warm {{ background: #fff3e0; color: #e65100; border-color: #ffe0b2; }}
.tcm-tag.nature-cool {{ background: #e3f2fd; color: #1565c0; border-color: #bbdefb; }}
.tcm-tag.nature-cold {{ background: #e8f5e9; color: #2e7d32; border-color: #c8e6c9; }}
.tcm-tag.nature-neutral {{ background: #f5f5f5; color: #616161; border-color: #e0e0e0; }}
.product-forms {{ display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }}
.product-form-tag {{ padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; background: var(--primary-light); color: var(--primary-dark); }}
@media (max-width: 720px) {{ .detail-header {{ flex-direction: column; }} .detail-image {{ flex: none; }} }}
</style>
</head>
<body>

<header class="site-header">
  <div class="header-top">
    <div class="brand">
      <h1>食药物质功能食品组分结构与组方设计研发系统</h1>
      <span class="subtitle">Research and Development System for the Structural Analysis and Formulation Design of Functional Foods Derived from Food and Medicine Substances</span>
    </div>
    <div class="auth-buttons">
      <a class="btn btn-outline btn-sm" href="../index.html">🏠 返回首页</a>
    </div>
  </div>
</header>

<main class="substance-detail-page">

  <div class="detail-header">
    <div class="detail-image">
      <img src="../{s.get('image', '')}" alt="{name}" onerror="this.style.display='none'">
    </div>
    <div class="detail-meta">
      <h1>#{sid} {name}</h1>
      <div class="latin">{latin}</div>
      <div class="tcm-tags">{tcm_tags}</div>
      {product_forms}
      {potential_funcs}
      <div style="margin-top:14px;">
        <a class="btn btn-primary" href="../index.html#page-module2">前往组方设计 →</a>
        {download_link}
      </div>
    </div>
  </div>

  <div class="detail-section">
    <h3>📋 基本信息</h3>
    <div class="detail-row"><span class="label">中文名</span>{name}</div>
    <div class="detail-row"><span class="label">拉丁名</span><em>{latin}</em></div>
    <div class="detail-row"><span class="label">英文名</span>{s.get('en_name', '-')}</div>
    <div class="detail-row"><span class="label">产地</span>{s.get('producing_area', '-')}</div>
    <div class="detail-row"><span class="label">性状</span>{s.get('description', '-')}</div>
    <div class="detail-row"><span class="label">用法用量</span>{s.get('usage_dosage', '-')}</div>
    <div class="detail-row"><span class="label">贮藏</span>{s.get('storage', '-')}</div>
  </div>

  <div class="detail-section">
    <h3>☯ 传统属性</h3>
    <div class="detail-row"><span class="label">四气</span>{nature or '-'}</div>
    <div class="detail-row"><span class="label">五味</span>{flavor or '-'}</div>
    <div class="detail-row"><span class="label">归经</span>{meridians or '-'}</div>
    <div class="detail-row"><span class="label">功能主治</span>{s.get('functions', '-')}</div>
    <div class="detail-row"><span class="label">禁忌症</span>{s.get('contraindications', '-')}</div>
    <div class="detail-row"><span class="label">毒性</span>{s.get('toxicity', '无毒性记载')}</div>
    <div class="detail-row"><span class="label">适宜体质</span>{'、'.join(s.get('suitable_constitutions', [])) or '-'}</div>
    <div class="detail-row"><span class="label">适宜证型</span>{'、'.join(s.get('suitable_syndromes', [])) or '-'}</div>
  </div>

  <div class="detail-section">
    <h3>🔬 现代研究</h3>
    <div class="detail-row"><span class="label">主要成分</span>{s.get('major_components', '-')}</div>
    <div class="detail-row"><span class="label">药理作用</span>{s.get('pharmacology', '-')}</div>
    <div class="detail-row"><span class="label">食疗功效</span>{s.get('dietary_efficacy', '-')}</div>
    <div class="detail-row"><span class="label">食养禁忌</span>{s.get('dietary_taboo', '-')}</div>
  </div>

  <div class="detail-section">
    <h3>🏭 产品形态与潜在功能</h3>
    <div class="detail-row"><span class="label">推荐形态</span></div>
    {product_forms}
    <div class="detail-row" style="margin-top:10px;"><span class="label">潜在功能</span></div>
    {potential_funcs}
  </div>

  <div class="nav-footer">
    <div>{prev_link}</div>
    <div style="color:var(--text-muted); font-size:0.85rem;">#{sid} / 106</div>
    <div>{next_link}</div>
  </div>

</main>

<footer class="site-footer" style="margin-bottom:0;">
  <div class="footer-bottom">
    © 2026 食药物质功能食品组分结构与组方设计研发系统 | 中国药科大学中药学院组分结构创新中药实验室
  </div>
</footer>

</body>
</html>'''
    return html, pinyin


def main():
    with open(INPUT_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for i, s in enumerate(data):
        prev_s = data[i - 1] if i > 0 else None
        next_s = data[i + 1] if i < len(data) - 1 else None
        html, pinyin = build_page(s, prev_s, next_s)
        filename = f"{s['id']:03d}_{pinyin}.html"
        filepath = OUTPUT_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"[OK] {filename}")

    print(f"\n共生成 {len(data)} 个物质详情页面，输出到 {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
