#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于 substances_extracted.json，补充拉丁名、产品形态、证型/体质映射、潜在功能，生成 substances_full.json
"""
import json
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
INPUT = BASE_DIR / "data" / "substances_extracted.json"
OUTPUT = BASE_DIR / "data" / "substances_full.json"
DOSAGE_OUTPUT = BASE_DIR / "data" / "dosage_by_form.json"

# 需要手工修正的拉丁名映射（仅针对提取失败或不准确的）
LATIN_FIX = {
    "姜黄": "Curcuma longa L.",
    "丁香": "Syzygium aromaticum (L.) Merr. et Perry",  # 修正 xlsx 中的错误
}

# 产品形态规则：基于部位/名称关键词
PRODUCT_FORM_RULES = [
    # 花类
    (r"花$|花（|花蕾|花瓣|代代花|菊花|金银花|槐花|槐米|红花|玫瑰花|桂花|厚朴花|玳玳花|白扁豆花|荷叶|紫苏|薄荷|淡竹叶|桑叶|杜仲叶|鱼腥草|马齿苋|蒲公英|藿香|香薷|荆芥|茵陈|紫苏籽$", ["袋泡茶", "代茶饮", "提取物"]),
    # 根茎类
    (r"根$|根茎$|根及根茎$|根茎及根$|黄芪|党参|当归|甘草|白术|白芍|地黄|麦冬|天冬|玉竹|黄精|山药|姜黄|莪术|郁金|高良姜|山柰|生姜|干姜|百合|贝母|知母|泽泻|三棱|天麻|川芎|丹参|柴胡|前胡|防风|独活|羌活|白芷|藁本|葛根|甘草", ["饮片", "粉末", "膏方", "胶囊"]),
    # 皮类
    (r"皮$|树皮$|根皮$|肉桂|杜仲|黄柏|秦皮|厚朴|牡丹皮|白鲜皮|香加皮|地骨皮|五加皮|合欢皮|海桐皮|梓白皮", ["饮片", "粉末", "提取物", "胶囊"]),
    # 果实/种子类
    (r"子$|仁$|实$|果$|籽$|核$|山楂|枸杞|酸枣仁|决明子|桃仁|杏仁|郁李仁|火麻仁|白果|榧子|芡实|莲子|薏苡仁|白扁豆|赤小豆|刀豆|沙棘|余甘子|覆盆子|桑葚|乌梅|木瓜|五味子|金樱子|山茱萸|吴茱萸|豆蔻|草果|肉豆蔻|砂仁|益智|荜茇|八角茴香|小茴香|胡椒|花椒|丁香|连翘|栀子|牛蒡子|蔓荆子|菟丝子|蒺藜|韭菜子|冬葵果|鹤虱|鹤草芽|谷芽|麦芽|稻芽|莱菔子|紫苏子|白芥子|黄芥子|胖大海|罗汉果|青果|枳椇子|佛手|香橼|陈皮|橘皮|化橘红|桔红|橘核|丝瓜络|橘络|路路通", ["干果", "粉末", "丸剂", "袋泡茶"]),
    # 动物类
    (r"蛇$|蛤蚧|鹿茸|阿胶|麝香|牛黄|熊胆粉|蟾酥|蝉蜕|僵蚕|蜂蜜|蜂蜡|阿胶|龟甲|鳖甲|牡蛎|珍珠|珍珠母|石决明|紫河车|鸡内金|蝮蛇|乌梢蛇|地龙|水蛭|全蝎|蜈蚣|斑蝥|穿山甲", ["粉末", "胶囊", "提取物"]),
    # 矿物/树脂类
    (r"矾$|石膏|滑石|磁石|赭石|禹余粮|赤石脂|炉甘石|硫磺|雄黄|朱砂|琥珀|乳香|没药|血竭|松香|儿茶|芦荟|冰片|樟脑", ["粉末", "胶囊"]),
    # 菌藻类
    (r"芝$|苓$|芝$|耳$|菇$|蘑$|藻$|海带|昆布|灵芝|茯苓|猪苓|雷丸|冬虫夏草|海藻|昆布|紫菜", ["饮片", "粉末", "提取物", "胶囊"]),
]

# 默认产品形态
DEFAULT_PRODUCT_FORM = ["饮片", "粉末", "提取物"]


def infer_product_form(name, part=""):
    """根据物质名称和部位推测产品形态"""
    text = name + " " + str(part)
    forms = set()
    for pattern, form_list in PRODUCT_FORM_RULES:
        if re.search(pattern, text):
            forms.update(form_list)
    if forms:
        return list(forms)[:3]
    return DEFAULT_PRODUCT_FORM


def infer_constitution_syndrome(record):
    """基于性味归经和功能主治推断适宜体质和证型"""
    nature = record.get("nature", "")
    flavor = record.get("flavor", "")
    meridians = record.get("meridians", "")
    functions = record.get("functions", "")
    dietary = record.get("dietary_efficacy", "")
    usage = record.get("usage_advice", "")
    text = f"{nature}{flavor}{meridians}{functions}{dietary}{usage}"
    text = str(text)

    constitutions = []
    syndromes = []

    # 规则映射
    has_warm = "温" in nature or "热" in nature
    has_cool = "寒" in nature or "凉" in nature
    has_neutral = "平" in nature
    has_sweet = "甘" in flavor
    has_bitter = "苦" in flavor
    has_pungent = "辛" in flavor
    has_sour = "酸" in flavor or "涩" in flavor

    # 补气/健脾类
    if any(k in text for k in ["补气", "健脾", "益气", "和胃", "补中", "升阳", "固表", "止汗", "托毒", "生肌"]):
        constitutions.extend(["气虚质", "平和质"])
        syndromes.extend(["气虚证", "脾胃气虚证"])
    # 补阳类
    if any(k in text for k in ["补肾阳", "壮阳", "温肾", "助阳", "散寒", "温中", "回阳", "通脉", "祛寒", "温经"]):
        constitutions.extend(["阳虚质"])
        syndromes.extend(["阳虚证", "肾阳虚证", "脾胃虚寒证"])
    # 滋阴类
    if any(k in text for k in ["滋阴", "养阴", "润燥", "生津", "润肺", "养胃阴", "清心", "除烦", "明目", "凉血"]):
        constitutions.extend(["阴虚质"])
        syndromes.extend(["阴虚证", "肺阴虚证", "胃阴虚证"])
    # 清热类
    if any(k in text for k in ["清热", "解毒", "凉血", "泻火", "消暑", "除烦", "利尿", "通淋", "消肿", "散结"]):
        constitutions.extend(["湿热质", "阴虚质"])
        syndromes.extend(["热证", "湿热证", "实热证", "火毒证"])
    # 祛湿/化痰类
    if any(k in text for k in ["祛湿", "利水", "渗湿", "化痰", "止咳", "平喘", "宽胸", "消痞", "除胀", "降脂"]):
        constitutions.extend(["痰湿质", "湿热质"])
        syndromes.extend(["痰湿证", "湿热证", "脾虚湿盛证"])
    # 活血化瘀类
    if any(k in text for k in ["活血", "化瘀", "通经", "止痛", "消肿", "疗伤", "破血", "消癥", "通络"]):
        constitutions.extend(["血瘀质"])
        syndromes.extend(["血瘀证", "气滞血瘀证"])
    # 行气解郁类
    if any(k in text for k in ["行气", "疏肝", "解郁", "理气", "宽中", "消食", "导滞", "和胃", "止痛", "散结"]):
        constitutions.extend(["气郁质"])
        syndromes.extend(["气滞证", "肝郁气滞证", "脾胃气滞证"])
    # 收敛固涩类
    if has_sour and any(k in text for k in ["收敛", "固涩", "止泻", "止带", "固精", "缩尿", "止血", "敛汗", "敛肺"]):
        constitutions.extend(["平和质"])
        syndromes.extend(["久泻证", "遗精证", "自汗证"])
    # 安神类
    if any(k in text for k in ["安神", "养心", "定志", "助眠", "益智", "健忘", "怔忡", "失眠", "多梦"]):
        constitutions.extend(["平和质", "气虚质", "阴虚质"])
        syndromes.extend(["心脾两虚证", "阴虚火旺证", "失眠证"])
    # 通便类
    if any(k in text for k in ["通便", "润肠", "泻下", "消积", "导滞", "攻积", "逐水"]):
        constitutions.extend(["痰湿质", "湿热质"])
        syndromes.extend(["肠燥便秘证", "积滞证", "实热便秘证"])

    # 默认兜底
    if not constitutions:
        constitutions = ["平和质"]
    if not syndromes:
        if has_warm:
            syndromes = ["虚寒证"]
        elif has_cool:
            syndromes = ["热证"]
        else:
            syndromes = ["平和证"]

    # 去重并限制数量
    constitutions = list(dict.fromkeys(constitutions))[:4]
    syndromes = list(dict.fromkeys(syndromes))[:4]

    # 禁忌反向推导
    contraindicated_constitutions = []
    contraindicated_syndromes = []
    if has_warm:
        contraindicated_constitutions.extend(["阴虚质", "湿热质"])
        contraindicated_syndromes.extend(["阴虚证", "实热证", "湿热证"])
    if has_cool:
        contraindicated_constitutions.extend(["阳虚质", "气虚质"])
        contraindicated_syndromes.extend(["阳虚证", "脾胃虚寒证", "气虚证"])
    if has_pungent and "温" not in nature:
        contraindicated_constitutions.extend(["阴虚质"])
        contraindicated_syndromes.extend(["阴虚证", "血热证"])

    contraindicated_constitutions = list(dict.fromkeys(contraindicated_constitutions))[:3]
    contraindicated_syndromes = list(dict.fromkeys(contraindicated_syndromes))[:3]

    return {
        "suitable_constitutions": constitutions,
        "suitable_syndromes": syndromes,
        "contraindicated_constitutions": contraindicated_constitutions,
        "contraindicated_syndromes": contraindicated_syndromes,
    }


def summarize_potential_functions(record):
    """从功能主治和食疗功效提取潜在功能标签"""
    text = str(record.get("functions", "")) + " " + str(record.get("dietary_efficacy", ""))
    tags = []
    keywords = [
        ("免疫调节", ["免疫", "扶正", "固本", "抗病", "强身"]),
        ("抗氧化", ["抗氧化", "抗衰老", "延年", "益寿", "清除自由基"]),
        ("血糖调节", ["降糖", "血糖", "消渴", "糖尿病", "胰岛素"]),
        ("血脂调节", ["降脂", "血脂", "胆固醇", "甘油三酯", "动脉粥样硬化"]),
        ("血压调节", ["降压", "血压", "高血压", "血管", "心血管"]),
        ("睡眠改善", ["安神", "助眠", "失眠", "多梦", "宁心", "安眠"]),
        ("消化促进", ["消食", "健脾", "和胃", "开胃", "助消化", "脘腹胀满"]),
        ("肝脏保护", ["护肝", "养肝", "肝损伤", "解酒", "利胆"]),
        ("肠道健康", ["通便", "润肠", "便秘", "腹泻", "止泻", "肠道", "益生菌"]),
        ("抗炎", ["抗炎", "消炎", "解毒", "清热", "消肿", "痈肿"]),
        ("抗肿瘤辅助", ["抗肿瘤", "抗癌", "抑瘤", "防癌", "化疗辅助"]),
        ("美容养颜", ["美容", "养颜", "祛斑", "美白", "润肤", "气色"]),
        ("体重管理", ["减肥", "瘦身", "降脂", "轻身", "肥胖"]),
        ("骨骼健康", ["壮骨", "骨质疏松", "骨折", "骨密度", "钙"]),
        ("记忆认知", ["益智", "健脑", "记忆", "认知", "老年痴呆", "健忘"]),
        ("眼部健康", ["明目", "护眼", "视力", "白内障", "黄斑"]),
        ("呼吸道健康", ["止咳", "平喘", "化痰", "润肺", "咽痛", "鼻炎"]),
        ("女性健康", ["调经", "活血", "痛经", "更年期", "乳腺", "产后"]),
        ("男性健康", ["壮阳", "补肾", "前列腺", "精力", "阳痿", "早泄"]),
        ("抗疲劳", ["抗疲劳", "提神", "精力", "体力", "耐力", "运动"]),
    ]
    for tag, kws in keywords:
        if any(kw in text for kw in kws):
            tags.append(tag)
    if not tags:
        tags = ["养生保健", "体质调理"]
    return tags[:6]


def main():
    with open(INPUT, "r", encoding="utf-8") as f:
        data = json.load(f)

    for record in data:
        name = record["name"]

        # 1. 修正拉丁名
        if name in LATIN_FIX:
            record["latin_name"] = LATIN_FIX[name]
        if not record.get("latin_name"):
            record["latin_name"] = record.get("en_name", "")

        # 2. 产品形态
        record["product_form"] = infer_product_form(name, record.get("part", ""))

        # 3. 证型/体质
        tcm_info = infer_constitution_syndrome(record)
        record.update(tcm_info)

        # 4. 潜在功能
        record["potential_functions"] = summarize_potential_functions(record)

        # 5. 数据文件路径（后续会重命名为英文）
        record["data_file"] = f"data/substances/{name}.xlsx"

    # 输出 substances_full.json
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"生成 substances_full.json: {len(data)} 条")

    # 输出 dosage_by_form.json
    dosage_form = {
        "汤剂": {"factor": 1.0, "desc": "水煎煮，每日1剂，分2次服"},
        "丸剂": {"factor": 0.6, "desc": "制丸，每日2~3次"},
        "散剂": {"factor": 0.5, "desc": "研末冲服，每日2~3次"},
        "膏方": {"factor": 0.8, "desc": "熬膏，每日1~2次，温水冲服"},
        "袋泡茶": {"factor": 1.0, "desc": "沸水冲泡，代茶频饮"},
        "胶囊": {"factor": 0.4, "desc": "装胶囊，每日2~3次"},
        "颗粒剂": {"factor": 0.7, "desc": "冲调服用，每日2~3次"},
    }
    with open(DOSAGE_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(dosage_form, f, ensure_ascii=False, indent=2)
    print(f"生成 dosage_by_form.json")


if __name__ == "__main__":
    main()
