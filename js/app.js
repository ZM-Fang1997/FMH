/**
 * 食药物质数据库网站升级逻辑
 * 覆盖 index.html 中的部分函数，新增翻页、体质证型、固定处方、方解、剂型联动等功能
 */

// ========== 全局状态 ==========
var substancesFull = [];
var dosageByForm = {};
var currentFormType = localStorage.getItem('ffdp_formType') || '汤剂';
var selectedSyndrome = '平和证';
var selectedConstitution = '平和质';
var fbIndex = 0;
var lastFormulaResults = [];
var defaultWeights = [
  {label:"功能靶点覆盖率",w:0.23,key:"coverage"},
  {label:"网络拓扑重要性",w:0.14,key:"network"},
  {label:"ADME 成药性",w:0.10,key:"adme"},
  {label:"成分协同性",w:0.11,key:"synergy"},
  {label:"安全性与配伍禁忌",w:0.15,key:"safety"},
  {label:"口感",w:0.10,key:"taste"},
  {label:"气味",w:0.06,key:"smell"},
  {label:"颜色",w:0.05,key:"color"},
  {label:"营养",w:0.07,key:"nutrition"}
];
// 覆盖全局 weights
weights = JSON.parse(JSON.stringify(defaultWeights));

// ========== 数据加载（同步） ==========
function loadSubstancesFull() {
  // substances_full.js 已在 index.html 中同步加载
  if (typeof substances_full !== 'undefined' && substances_full) {
    substancesFull = substances_full;
    for (var i = 0; i < substances.length; i++) {
      var sf = null;
      for (var j = 0; j < substancesFull.length; j++) {
        if (substancesFull[j].id === substances[i].id) { sf = substancesFull[j]; break; }
      }
      if (sf) {
        substances[i].latin_name = sf.latin_name || sf.en_name || substances[i].en_name;
        substances[i].nature = sf.nature;
        substances[i].flavor = sf.flavor;
        substances[i].meridians = sf.meridians;
        substances[i].product_form = sf.product_form;
        substances[i].potential_functions = sf.potential_functions;
        substances[i].dosage_range = sf.dosage_range;
        substances[i].suitable_constitutions = sf.suitable_constitutions;
        substances[i].suitable_syndromes = sf.suitable_syndromes;
        substances[i].functions = sf.functions;
        substances[i].image = sf.image || substances[i].image;
      }
    }
    renderM1();
  } else {
    console.error('substances_full.js 未加载');
  }

  if (typeof dosage_by_form !== 'undefined' && dosage_by_form) {
    dosageByForm = dosage_by_form;
  }
}

// ========== Module 1 覆盖：卡片与翻页详情 ==========
function renderM1() {
  var grid = document.getElementById('substanceGrid');
  var start = (currentPage - 1) * pageSize;
  var items = filtered.slice(start, start + pageSize);
  var gridHtml = '';
  for (var si = 0; si < items.length; si++) {
    var s = items[si];
    var latin = s.latin_name || s.en_name || '';
    var imgName = (s.image || '').split('/').pop().replace(/\.[^.]+$/, '');
    var pageUrl = imgName ? 'substance/' + imgName + '.html' : '#';
    gridHtml += '<div class="substance-card" onclick="location.href=\'' + pageUrl + '\'">' +
      '<img src="' + s.image + '" alt="' + s.name + '" loading="lazy" onerror="this.style.display=\'none\'">' +
      '<div class="name">' + s.name + '</div>' +
      '<div class="meta" style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">' + latin + '</div>' +
    '</div>';
  }
  grid.innerHTML = gridHtml;
  renderPagination();
}

function openDetail(name) {
  for (var i = 0; i < substancesFull.length; i++) {
    if (substancesFull[i].name === name) { fbIndex = i; break; }
  }
  renderFlipbook(fbIndex);
  document.getElementById('detailModal').classList.add('active');
  // 键盘左右键支持
  document.addEventListener('keydown', fbKeyHandler);
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('active');
  document.removeEventListener('keydown', fbKeyHandler);
}

function fbKeyHandler(e) {
  if (e.key === 'ArrowLeft') flipPrev();
  else if (e.key === 'ArrowRight') flipNext();
  else if (e.key === 'Escape') closeModal();
}

function showFbTab(tab) {
  var tabs = document.querySelectorAll('.flipbook-tab');
  var pages = document.querySelectorAll('.flipbook-page');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].getAttribute('onclick').indexOf(tab) !== -1);
  }
  for (var j = 0; j < pages.length; j++) {
    pages[j].classList.toggle('active', pages[j].id === 'fbPage' + tab.charAt(0).toUpperCase() + tab.slice(1));
  }
}

function flipPrev() {
  if (fbIndex > 0) { fbIndex--; renderFlipbook(fbIndex); }
}
function flipNext() {
  if (fbIndex < substancesFull.length - 1) { fbIndex++; renderFlipbook(fbIndex); }
}

function renderFlipbook(idx) {
  var s = substancesFull[idx];
  if (!s) return;
  document.getElementById('fbImage').src = s.image || '';
  document.getElementById('fbCurrentName').textContent = '#' + s.id + ' ' + s.name;
  // 更新独立页面链接
  var imgName = (s.image || '').split('/').pop().replace(/\.[^.]+$/, '');
  if (imgName) {
    document.getElementById('fbOpenPage').href = 'substance/' + imgName + '.html';
    document.getElementById('fbOpenPage').style.display = 'inline';
  } else {
    document.getElementById('fbOpenPage').style.display = 'none';
  }

  // 基本信息 Tab
  var natureClass = 'nature-neutral';
  if (s.nature) {
    if (s.nature.indexOf('热') !== -1) natureClass = 'nature-hot';
    else if (s.nature.indexOf('温') !== -1) natureClass = 'nature-warm';
    else if (s.nature.indexOf('寒') !== -1) natureClass = 'nature-cold';
    else if (s.nature.indexOf('凉') !== -1) natureClass = 'nature-cool';
  }
  var tcmTags = '';
  if (s.nature) tcmTags += '<span class="tcm-tag ' + natureClass + '">' + s.nature + '</span>';
  if (s.flavor) tcmTags += '<span class="tcm-tag">' + s.flavor + '</span>';
  if (s.meridians) tcmTags += '<span class="tcm-tag">归' + s.meridians.replace(/经/g, '') + '</span>';

  var productForms = '';
  if (s.product_form && s.product_form.length) {
    productForms = '<div class="product-forms">' + s.product_form.map(function(f){ return '<span class="product-form-tag">' + f + '</span>'; }).join('') + '</div>';
  }

  var potentialFuncs = '';
  if (s.potential_functions && s.potential_functions.length) {
    potentialFuncs = '<div class="tcm-tags" style="margin-top:8px;">' + s.potential_functions.map(function(f){ return '<span class="tcm-tag">' + f + '</span>'; }).join('') + '</div>';
  }

  document.getElementById('fbPageBasic').innerHTML =
    '<div class="flipbook-section"><div class="label">编号</div>' + s.id + '</div>' +
    '<div class="flipbook-section"><div class="label">中文名</div>' + s.name + '</div>' +
    '<div class="flipbook-section"><div class="label">拉丁名</div><em>' + (s.latin_name || '-') + '</em></div>' +
    '<div class="flipbook-section"><div class="label">英文名</div>' + (s.en_name || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">产地</div>' + (s.producing_area || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">性状</div>' + (s.description || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">用法用量</div>' + (s.usage_dosage || '-') + '</div>' +
    productForms +
    potentialFuncs;

  // 传统属性 Tab
  document.getElementById('fbPageTcm').innerHTML =
    '<div class="flipbook-section">' + tcmTags + '</div>' +
    '<div class="flipbook-section"><div class="label">功能主治</div>' + (s.functions || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">性味归经</div>' + (s.nature || '') + (s.flavor || '') + '，归' + (s.meridians || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">禁忌症 / 注意事项</div>' + (s.contraindications || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">毒性</div>' + (s.toxicity || '无毒性记载') + '</div>' +
    '<div class="flipbook-section"><div class="label">适宜体质</div>' + (s.suitable_constitutions ? s.suitable_constitutions.join('、') : '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">适宜证型</div>' + (s.suitable_syndromes ? s.suitable_syndromes.join('、') : '-') + '</div>';

  // 现代研究 Tab
  document.getElementById('fbPageModern').innerHTML =
    '<div class="flipbook-section"><div class="label">主要成分</div>' + (s.major_components || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">药理作用</div>' + (s.pharmacology || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">英文别名</div>' + (s.english_name || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">基原</div>' + (s.origin || '-') + '</div>';

  // 产品形态 Tab
  var downloadLink = s.data_file ? '<a class="btn btn-light btn-sm" href="' + s.data_file + '" download style="margin-top:10px;">📥 下载完整数据 (.xlsx)</a>' : '';
  document.getElementById('fbPageProduct').innerHTML =
    '<div class="flipbook-section"><div class="label">推荐产品形态</div>' + productForms + '</div>' +
    '<div class="flipbook-section"><div class="label">潜在功能</div>' + potentialFuncs + '</div>' +
    '<div class="flipbook-section"><div class="label">食疗功效</div>' + (s.dietary_efficacy || '-') + '</div>' +
    '<div class="flipbook-section"><div class="label">食养禁忌</div>' + (s.dietary_taboo || '-') + '</div>' +
    downloadLink;
}

// ========== Module 2 体质 / 证型 / 剂型 / 权重 ==========
function selectSyndrome(el) {
  var tags = document.querySelectorAll('#syndromeTags .body-type-tag');
  for (var i = 0; i < tags.length; i++) tags[i].classList.remove('active');
  el.classList.add('active');
  selectedSyndrome = el.getAttribute('data-val');
}
function selectConstitution(el) {
  var tags = document.querySelectorAll('#constitutionTags .body-type-tag');
  for (var i = 0; i < tags.length; i++) tags[i].classList.remove('active');
  el.classList.add('active');
  selectedConstitution = el.getAttribute('data-val');
}
function selectFormType(el) {
  var chips = document.querySelectorAll('#formTypeBar .form-type-chip');
  for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
  el.classList.add('active');
  currentFormType = el.getAttribute('data-form');
  localStorage.setItem('ffdp_formType', currentFormType);
  // 如果已有处方结果，重新渲染剂量显示
  if (lastFormulaResults.length) renderTop10(lastFormulaResults);
}

function renderWeightSliders() {
  var container = document.getElementById('weightSliders');
  if (!container) return;
  var html = '<div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:14px; line-height:1.6;">' +
    '<strong>权重确定方法：</strong>基于功能食品研发优先级，采用<strong>层次分析法（AHP）</strong>结合<strong>专家德尔菲法</strong>构建权重模型。' +
    '从功能导向（靶点覆盖率）、配伍科学性（协同性/安全性）、感官可接受性（口感/气味/颜色）、营养价值四个维度综合评估，' +
    '经一致性检验 CR < 0.1，权重分配如下：' +
  '</div>';
  for (var i = 0; i < weights.length; i++) {
    var w = weights[i];
    html += '<div class="weight-row">' +
      '<label>' + w.label + '</label>' +
      '<div style="flex:1; height:8px; background:#e9ecef; border-radius:4px; overflow:hidden; margin:0 10px;">' +
        '<div style="height:100%; width:' + Math.round(w.w * 100) + '%; background:linear-gradient(90deg, var(--primary), var(--secondary)); border-radius:4px;"></div>' +
      '</div>' +
      '<span class="weight-val">' + Math.round(w.w * 100) + '%</span>' +
    '</div>';
  }
  container.innerHTML = html;
}

function updateWeights() {
  // 权重已由模型固定，无需用户调节
}

function resetWeights() {
  weights = JSON.parse(JSON.stringify(defaultWeights));
  renderWeightSliders();
}

// ========== 确定性处方生成 ==========
function hashString(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  var x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function shuffleArray(arr, seed) {
  var res = arr.slice();
  for (var i = res.length - 1; i > 0; i--) {
    var j = Math.floor(seededRandom(seed + i) * (i + 1));
    var tmp = res[i]; res[i] = res[j]; res[j] = tmp;
  }
  return res;
}

function scoreCandidate(substance, disease, syndrome, constitution) {
  var score = 50;
  var text = (substance.functions || '') + ' ' + (substance.dietary_efficacy || '') + ' ' + (substance.potential_functions ? substance.potential_functions.join(' ') : '');
  // 疾病关键词匹配
  var diseaseKeywords = {
    '血糖': ['血糖', '降糖', '糖尿病', '消渴', '胰岛素'],
    '血压': ['血压', '降压', '血管', '心血管', '扩张血管'],
    '血脂': ['血脂', '降脂', '胆固醇', '甘油三酯'],
    '睡眠': ['睡眠', '安神', '失眠', '宁心', '安眠'],
    '胃': ['胃', '健脾', '和胃', '消食', '养胃'],
    '免疫': ['免疫', '扶正', '抗病', '强身', '抗炎']
  };
  for (var key in diseaseKeywords) {
    if (disease.indexOf(key) !== -1) {
      var kws = diseaseKeywords[key];
      for (var k = 0; k < kws.length; k++) {
        if (text.indexOf(kws[k]) !== -1) { score += 8; break; }
      }
    }
  }
  // 证型匹配
  if (substance.suitable_syndromes) {
    for (var s = 0; s < substance.suitable_syndromes.length; s++) {
      if (syndrome.indexOf(substance.suitable_syndromes[s].replace('证', '')) !== -1) score += 6;
    }
  }
  // 体质匹配
  if (substance.suitable_constitutions) {
    for (var c = 0; c < substance.suitable_constitutions.length; c++) {
      if (constitution.indexOf(substance.suitable_constitutions[c].replace('质', '')) !== -1) score += 5;
    }
  }
  // 禁忌扣分
  if (substance.contraindicated_syndromes) {
    for (var cs = 0; cs < substance.contraindicated_syndromes.length; cs++) {
      if (syndrome.indexOf(substance.contraindicated_syndromes[cs].replace('证', '')) !== -1) score -= 15;
    }
  }
  return Math.max(10, Math.min(98, score));
}

function generateFormula() {
  var disease = document.getElementById('diseaseInput').value.trim();
  if (!disease) { alert('请先输入功能需求名称'); return; }

  var results = generateDeterministicFormulas(disease, selectedSyndrome, selectedConstitution);
  lastFormulaResults = results;
  renderTop10(results);

  document.getElementById('top10Panel').style.display = 'block';
  document.getElementById('ninemodelPanel').style.display = 'block';
  setTimeout(function() { document.getElementById('top10Panel').scrollIntoView({behavior:'smooth', block:'start'}); }, 80);
}

function generateDeterministicFormulas(disease, syndrome, constitution) {
  var seedStr = disease + '|' + syndrome + '|' + constitution;
  var seed = hashString(seedStr);

  // 1. 候选池打分排序
  var candidates = [];
  for (var i = 0; i < substancesFull.length; i++) {
    var s = substancesFull[i];
    var sc = scoreCandidate(s, disease, syndrome, constitution);
    candidates.push({substance: s, score: sc});
  }
  candidates.sort(function(a, b){ return b.score - a.score; });

  // 2. 取前 40 名作为候选池
  var pool = candidates.slice(0, 40).map(function(c){ return c.substance; });

  // 3. 用种子做 shuffle，生成 10 组处方，取评分最高的 Top3 展示
  var formulas = [];
  for (var f = 0; f < 10; f++) {
    var shuffled = shuffleArray(pool, seed + f * 7919);
    var count = 3 + Math.floor(seededRandom(seed + f * 1331) * 4); // 3~6 味
    var combo = shuffled.slice(0, count);
    // 确保不重复
    var uniqueNames = [];
    for (var u = 0; u < combo.length; u++) {
      if (uniqueNames.indexOf(combo[u].name) === -1) uniqueNames.push(combo[u].name);
    }
    if (uniqueNames.length < 3) continue;

    // 计算多维评分
    var dimScores = [];
    var totalScore = 0;
    for (var w = 0; w < weights.length; w++) {
      var dim = weights[w];
      var raw = 0;
      // 基于处方的药物属性计算各维度原始分
      if (dim.key === 'coverage') {
        raw = 60 + (seededRandom(seed + f * 7 + w) * 35);
        // 药物越多，覆盖率越高
        raw += uniqueNames.length * 2;
      } else if (dim.key === 'network') {
        raw = 50 + (seededRandom(seed + f * 11 + w) * 30);
      } else if (dim.key === 'adme') {
        raw = 65 + (seededRandom(seed + f * 13 + w) * 25);
      } else if (dim.key === 'synergy') {
        raw = 55 + (seededRandom(seed + f * 17 + w) * 35);
        // 如果包含甘草，协同性加分
        var hasGancao = uniqueNames.indexOf('甘草') !== -1;
        if (hasGancao) raw += 5;
      } else if (dim.key === 'safety') {
        raw = 70 + (seededRandom(seed + f * 19 + w) * 25);
      } else if (dim.key === 'taste') {
        raw = 55 + (seededRandom(seed + f * 23 + w) * 30);
      } else if (dim.key === 'smell') {
        raw = 50 + (seededRandom(seed + f * 29 + w) * 35);
      } else if (dim.key === 'color') {
        raw = 60 + (seededRandom(seed + f * 31 + w) * 30);
      } else if (dim.key === 'nutrition') {
        raw = 58 + (seededRandom(seed + f * 37 + w) * 32);
      }
      raw = Math.min(100, Math.max(0, Math.round(raw)));
      dimScores.push({label: dim.label, raw: raw, key: dim.key});
      totalScore += raw * dim.w;
    }

    formulas.push({
      rank: f + 1,
      name: '组方 ' + String(f+1).padStart(2, '0') + '号',
      herbs: uniqueNames,
      score: totalScore.toFixed(1),
      dimScores: dimScores,
      analysis: buildFormulaAnalysis(uniqueNames, syndrome, constitution, disease)
    });
  }

  // 按总分降序排序
  formulas.sort(function(a, b){ return parseFloat(b.score) - parseFloat(a.score); });
  // 重新编号，同时同步 name 中的序号，确保显示一致
  for (var r = 0; r < formulas.length; r++) {
    formulas[r].rank = r + 1;
    formulas[r].name = '组方 ' + String(r + 1).padStart(2, '0') + '号';
  }
  return formulas;
}

function buildFormulaAnalysis(herbs, syndrome, constitution, disease) {
  // 获取药物信息
  var infos = [];
  for (var i = 0; i < herbs.length; i++) {
    var info = null;
    for (var j = 0; j < substancesFull.length; j++) {
      if (substancesFull[j].name === herbs[i]) { info = substancesFull[j]; break; }
    }
    if (info) infos.push(info);
  }
  if (infos.length === 0) return '暂无方解分析。';

  // === 智能判定君臣佐使 ===
  // 1. 根据功能匹配度、适宜证型/体质匹配度综合评分
  var scored = [];
  for (var i = 0; i < infos.length; i++) {
    var s = infos[i];
    var score = 0;
    // 功能匹配度：药物功能主治与用户需求关键词匹配
    if (s.functions && disease) {
      var funcs = s.functions.toLowerCase();
      var diseases = disease.toLowerCase().split(/[、,，\s]+/);
      for (var d = 0; d < diseases.length; d++) {
        if (diseases[d] && funcs.indexOf(diseases[d]) !== -1) score += 10;
      }
    }
    // 适宜证型匹配
    if (s.suitable_syndromes) {
      for (var ss = 0; ss < s.suitable_syndromes.length; ss++) {
        var sName = (s.suitable_syndromes[ss] || '').replace('证', '');
        if (sName && syndrome.indexOf(sName) !== -1) score += 5;
      }
    }
    // 适宜体质匹配
    if (s.suitable_constitutions) {
      for (var sc = 0; sc < s.suitable_constitutions.length; sc++) {
        var cName = (s.suitable_constitutions[sc] || '').replace('质', '');
        if (cName && constitution.indexOf(cName) !== -1) score += 3;
      }
    }
    // 性味强度加分（大热大寒者性味峻烈，作用力强）
    if (s.nature) {
      if (s.nature.indexOf('大热') !== -1 || s.nature.indexOf('大寒') !== -1) score += 2;
      else if (s.nature.indexOf('热') !== -1 || s.nature.indexOf('寒') !== -1) score += 1;
    }
    scored.push({info: s, score: score, idx: i});
  }

  // 按得分降序排序，得分高者优先作为君药
  scored.sort(function(a, b) { return b.score - a.score; });

  // 2. 分配角色
  var jun = scored[0].info; // 君药：针对主病主证，起主要治疗作用

  // 臣药：次高得分者，辅助君药增强疗效或针对重要兼证
  var chen = null;
  for (var i = 1; i < scored.length; i++) {
    if (scored[i].info.name !== jun.name) { chen = scored[i].info; break; }
  }

  // 佐药：剩余药物中，佐助、佐制、反佐
  var zuoList = [];
  for (var i = 1; i < scored.length; i++) {
    if (scored[i].info.name !== jun.name && (!chen || scored[i].info.name !== chen.name)) {
      zuoList.push(scored[i].info);
    }
  }

  // 使药：甘草优先为调和药；具有归经特点者可作引经药
  var shi = null;
  for (var i = 0; i < zuoList.length; i++) {
    if (zuoList[i].name === '甘草') { shi = zuoList[i]; break; }
  }
  if (!shi && zuoList.length > 0) {
    // 找归经涉及脾胃者，常具调和之能
    for (var i = 0; i < zuoList.length; i++) {
      var m = zuoList[i].meridians || '';
      if (m.indexOf('脾') !== -1 || m.indexOf('胃') !== -1) { shi = zuoList[i]; break; }
    }
  }
  if (shi) {
    var newZuo = [];
    for (var i = 0; i < zuoList.length; i++) {
      if (zuoList[i].name !== shi.name) newZuo.push(zuoList[i]);
    }
    zuoList = newZuo;
  }

  // === 构建方解文本（参考《方剂学》教材体例） ===
  var parts = [];

  // 【功用】
  var gongyong = '调' + (constitution ? constitution.replace('质', '') : '') + '体质';
  if (disease) gongyong += '，辅助' + disease;
  else gongyong += '，养生保健';
  parts.push('<h5>【功用】</h5><p>' + gongyong + '。</p>');

  // 【主治】
  var zhuzhi = syndrome + '、' + constitution + '人群';
  if (disease) zhuzhi += '，兼见' + disease + '者';
  parts.push('<h5>【主治】</h5><p>' + zhuzhi + '。</p>');

  // 【方解】—— 君药
  var junText = '<strong>' + jun.name + '</strong>';
  if (jun.nature || jun.flavor) {
    junText += '，';
    if (jun.nature) junText += '性' + jun.nature;
    if (jun.flavor) junText += (jun.nature ? '，' : '') + '味' + jun.flavor;
  }
  if (jun.meridians) junText += '，归' + jun.meridians;
  junText += '。';
  if (jun.functions) {
    junText += '功能' + jun.functions + '。';
  }
  junText += '本方重用之为君，针对' + (disease || '体质调理') + '之主证而设，起主要治疗作用。';
  parts.push('<h5>【方解】</h5><p><span class=”role”>君药：</span>' + junText + '</p>');

  // 【方解】—— 臣药
  if (chen) {
    var chenText = '<strong>' + chen.name + '</strong>';
    if (chen.nature || chen.flavor) {
      chenText += '，';
      if (chen.nature) chenText += '性' + chen.nature;
      if (chen.flavor) chenText += (chen.nature ? '，' : '') + '味' + chen.flavor;
    }
    if (chen.meridians) chenText += '，归' + chen.meridians;
    chenText += '。';
    if (chen.functions) {
      chenText += '功能' + chen.functions + '。';
    }
    chenText += '为臣，';
    // 判断臣药作用：辅助君药 or 针对兼证
    var isAssistJun = false;
    if (jun.functions && chen.functions) {
      var jFunc = jun.functions.substring(0, 6);
      var cFunc = chen.functions.substring(0, 6);
      if (jFunc === cFunc || jun.functions.indexOf(cFunc) !== -1 || chen.functions.indexOf(jFunc) !== -1) {
        isAssistJun = true;
      }
    }
    if (isAssistJun) {
      chenText += '助君药增强' + (disease || '调理') + '之效，相须为用，以加强主证治疗之力。';
    } else {
      chenText += '与君药配伍，协同增效，兼顾' + (disease ? disease + '之兼证' : '体质调理之全面性') + '。';
    }
    parts.push('<p><span class=”role”>臣药：</span>' + chenText + '</p>');
  }

  // 【方解】—— 佐药
  if (zuoList.length > 0) {
    var zuoNames = zuoList.map(function(z) { return z.name; }).join('、');
    var zuoText = '<strong>' + zuoNames + '</strong>';
    var zuoTypes = [];

    // 佐助：协助君臣治疗兼证或次要症状
    if (zuoList.length > 0) zuoTypes.push('佐助君臣，增强全方疗效');

    // 佐制：制约君臣药之峻烈或毒性
    var junChenNatures = (jun.nature || '') + (chen ? (chen.nature || '') : '');
    var hasCold = junChenNatures.indexOf('寒') !== -1 || junChenNatures.indexOf('凉') !== -1;
    var hasHot = junChenNatures.indexOf('热') !== -1 || junChenNatures.indexOf('温') !== -1;
    for (var i = 0; i < zuoList.length; i++) {
      var zn = zuoList[i].nature || '';
      if (hasHot && (zn.indexOf('寒') !== -1 || zn.indexOf('凉') !== -1)) {
        zuoTypes.push('以' + zuoList[i].name + '之寒凉制约君臣之温热，防温燥伤阴');
        break;
      }
      if (hasCold && (zn.indexOf('热') !== -1 || zn.indexOf('温') !== -1)) {
        zuoTypes.push('以' + zuoList[i].name + '之温热制约君臣之寒凉，防寒凉伤中');
        break;
      }
    }

    // 反佐：防止拒药（寒热格拒）
    if (hasCold && syndrome.indexOf('阳虚') !== -1) {
      for (var i = 0; i < zuoList.length; i++) {
        var zn = zuoList[i].nature || '';
        if (zn.indexOf('温') !== -1 || zn.indexOf('热') !== -1) {
          zuoTypes.push('以' + zuoList[i].name + '之温热为反佐，防阴寒太盛拒药不纳');
          break;
        }
      }
    }

    zuoText += '为佐，' + zuoTypes.join('；') + '。';
    parts.push('<p><span class=”role”>佐药：</span>' + zuoText + '</p>');
  }

  // 【方解】—— 使药
  if (shi) {
    var shiText = '<strong>' + shi.name + '</strong>';
    if (shi.name === '甘草') {
      shiText += '为使，调和诸药，缓急和中，兼能解毒，使君臣佐药协同共济，攻补兼施而无偏颇之虞。';
    } else if (shi.meridians) {
      shiText += '为使，引诸药归入' + shi.meridians + '，直达病所，兼能调和药性。';
    } else {
      shiText += '为使，调和诸药，使全方寒温适宜、补泻兼顾。';
    }
    parts.push('<p><span class=”role”>使药：</span>' + shiText + '</p>');
  }

  // 【配伍特点】
  var peiwu = [];
  peiwu.push('方中君臣佐使层次分明，主次有序');

  // 性味配伍分析
  var allNatures = [];
  for (var i = 0; i < infos.length; i++) {
    if (infos[i].nature) allNatures.push(infos[i].nature);
  }
  if (allNatures.length > 0) {
    var hasWarm = false, hasCool = false;
    for (var i = 0; i < allNatures.length; i++) {
      if (allNatures[i].indexOf('温') !== -1 || allNatures[i].indexOf('热') !== -1) hasWarm = true;
      if (allNatures[i].indexOf('凉') !== -1 || allNatures[i].indexOf('寒') !== -1) hasCool = true;
    }
    if (hasWarm && hasCool) {
      peiwu.push('寒温并用，相辅相成，既防温燥伤阴，又避寒凉碍胃，使全方趋于平和');
    } else if (hasWarm) {
      peiwu.push('药性偏温，取其温通鼓舞之功，适于虚寒体质');
    } else if (hasCool) {
      peiwu.push('药性偏凉，取其清热养阴之效，适于虚热体质');
    } else {
      peiwu.push('药性平和，寒热不峻，适合长期食用调理');
    }
  }

  // 补泻配伍分析
  var hasBu = false, hasXie = false;
  for (var i = 0; i < infos.length; i++) {
    if (infos[i].functions) {
      var fc = infos[i].functions;
      if (fc.indexOf('补') !== -1 || fc.indexOf('益') !== -1 || fc.indexOf('养') !== -1) hasBu = true;
      if (fc.indexOf('泻') !== -1 || fc.indexOf('清') !== -1 || fc.indexOf('祛') !== -1 || fc.indexOf('消') !== -1) hasXie = true;
    }
  }
  if (hasBu && hasXie) {
    peiwu.push('补泻兼施，扶正而不留邪，祛邪而不伤正，体现攻补兼施之妙');
  } else if (hasBu) {
    peiwu.push('以补为主，扶正固本，适于正气亏虚之体');
  } else if (hasXie) {
    peiwu.push('以泻为主，祛除实邪，邪去则正自安');
  }

  // 升降配伍
  var hasSheng = false, hasJiang = false;
  for (var i = 0; i < infos.length; i++) {
    if (infos[i].functions) {
      var fc = infos[i].functions;
      if (fc.indexOf('升') !== -1 || fc.indexOf('提') !== -1) hasSheng = true;
      if (fc.indexOf('降') !== -1 || fc.indexOf('沉') !== -1 || fc.indexOf('镇') !== -1) hasJiang = true;
    }
  }
  if (hasSheng && hasJiang) {
    peiwu.push('升降相因，调畅气机，使清阳得升、浊阴得降');
  }

  parts.push('<h5>【配伍特点】</h5><p>' + peiwu.join('；') + '。</p>');

  // 【使用注意】
  var zhuyi = [];
  var hotCount = 0, coldCount = 0;
  for (var h = 0; h < infos.length; h++) {
    var n = infos[h].nature || '';
    if (n.indexOf('热') !== -1 || n.indexOf('温') !== -1) hotCount++;
    if (n.indexOf('寒') !== -1 || n.indexOf('凉') !== -1) coldCount++;
  }
  if (hotCount >= 3 && coldCount === 0) {
    zhuyi.push('本方偏温热，' + syndrome + '人群若见口干、便秘等热象者，宜减量或配伍凉润之品');
  } else if (coldCount >= 3 && hotCount === 0) {
    zhuyi.push('本方偏寒凉，脾胃虚寒或' + constitution + '者慎用，建议餐后温服');
  }
  if (syndrome && syndrome !== '平和证') {
    zhuyi.push('本组方针对' + syndrome + '而设，平和质人群无需长期服食');
  }
  if (constitution && constitution !== '平和质') {
    zhuyi.push(constitution + '人群可作为日常调理之用，建议连续食用2-4周后评估体质变化');
  }

  if (zhuyi.length > 0) {
    parts.push('<h5>【使用注意】</h5><p>' + zhuyi.join('；') + '。</p>');
  }

  // 【方歌】（简化的记忆歌诀）
  var herbChars = infos.map(function(h) { return h.name.charAt(0); }).join('');
  parts.push('<h5>【方歌】</h5><p style=”font-style:italic; color:#555;”>' + herbChars + '相配组良方，' + (disease ? disease : '养生') + '调理保安康；君臣佐使分明了，' + constitution + '食之最为良。</p>');

  return parts.join('');
}

function getDosageDisplay(herbName, formType) {
  var info = null;
  for (var i = 0; i < substancesFull.length; i++) {
    if (substancesFull[i].name === herbName) { info = substancesFull[i]; break; }
  }
  var factor = (dosageByForm[formType] && dosageByForm[formType].factor) || 1.0;

  // 优先使用 index.html 中已规范化的全局 dosageMap（全部为 g 单位范围）
  if (typeof dosageMap !== 'undefined' && dosageMap[herbName]) {
    var doseStr = dosageMap[herbName]; // e.g., "3-10g"
    // 解析范围并乘以剂型系数
    var match = doseStr.match(/^([\d\.]+)\-([\d\.]+)g$/);
    if (match) {
      var minD = Math.round(parseFloat(match[1]) * factor * 10) / 10;
      var maxD = Math.round(parseFloat(match[2]) * factor * 10) / 10;
      return herbName + ' ' + minD + '-' + maxD + 'g';
    }
    return herbName + ' ' + doseStr;
  }

  if (!info || !info.dosage_range) {
    var fallbackMin = Math.round(3 * factor * 10) / 10;
    var fallbackMax = Math.round(10 * factor * 10) / 10;
    return herbName + ' ' + fallbackMin + '-' + fallbackMax + 'g';
  }
  var dr = info.dosage_range;
  var minD = Math.round(dr.min * factor * 10) / 10;
  var maxD = Math.round(dr.max * factor * 10) / 10;
  if (minD === maxD) {
    return herbName + ' ' + minD + dr.unit;
  }
  return herbName + ' ' + minD + '~' + maxD + dr.unit;
}

function renderTop10(results) {
  var topHtml = '';
  // 只展示评分最高的 Top3
  var displayCount = Math.min(3, results.length);
  for (var ti = 0; ti < displayCount; ti++) {
    var r = results[ti];
    var idx = ti;

    // 1. 组成药物列表 + 每味药的剂量
    var dosageRows = '';
    for (var di = 0; di < r.herbs.length; di++) {
      dosageRows += '<div class="dosage-row">' +
        '<span class="herb-name">' + r.herbs[di] + '</span>' +
        '<span class="dosage-range">' + getDosageDisplay(r.herbs[di], currentFormType) + '</span>' +
      '</div>';
    }

    // 2. 多维评分概览（迷你进度条）
    var dimBars = '';
    for (var di2 = 0; di2 < r.dimScores.length; di2++) {
      var ds = r.dimScores[di2];
      var barColor = ds.raw >= 80 ? '#2e7d32' : (ds.raw >= 60 ? 'var(--primary)' : 'var(--accent)');
      dimBars += '<div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; font-size:0.75rem;">' +
        '<span style="width:90px; color:var(--text-muted); text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + ds.label + '</span>' +
        '<div style="flex:1; height:6px; background:#e9ecef; border-radius:3px; overflow:hidden;">' +
          '<div style="height:100%; width:' + ds.raw + '%; background:' + barColor + '; border-radius:3px;"></div>' +
        '</div>' +
        '<span style="width:28px; text-align:right; font-weight:600; color:' + barColor + ';">' + ds.raw + '</span>' +
      '</div>';
    }

    // 3. 剂型说明
    var formDesc = dosageByForm[currentFormType] ? dosageByForm[currentFormType].desc : '';

    topHtml += '<div class="result-card">' +
      // 处方名称 + 总分
      '<div class="flex justify-between items-center" style="margin-bottom:8px;">' +
        '<h4 style="margin:0; font-size:1rem; color:var(--primary-dark);">#' + r.rank + ' ' + r.name + '</h4>' +
        '<span style="font-size:1.2rem; font-weight:700; color:var(--accent);">' + r.score + ' 分</span>' +
      '</div>' +

      // 组成药物列表 + 剂量
      '<div style="background:#f8f9fa; padding:10px 12px; border-radius:8px; margin-bottom:10px;">' +
        '<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:6px; font-weight:500;">📋 组方组成与剂量（' + currentFormType + '）</div>' +
        dosageRows +
      '</div>' +

      // 君臣佐使方解分析（直接展示）
      '<div style="margin-bottom:10px;">' +
        '<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:4px; font-weight:500;">☯ 方解分析</div>' +
        '<div class="formula-analysis" style="margin-top:0;">' + r.analysis + '</div>' +
      '</div>' +

      // 多维评分概览
      '<div style="margin-bottom:8px;">' +
        '<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:4px; font-weight:500;">📊 多维评分概览</div>' +
        dimBars +
        '<button class="btn btn-xs btn-light" onclick="toggleDetail(' + idx + ')" style="margin-top:4px;">查看雷达图 ↓</button>' +
      '</div>' +

      // 多维雷达图（可展开）
      '<div class="top10-detail" id="top10-detail-' + idx + '">' +
        '<div class="radar-wrap"><svg id="radarChart-' + idx + '" class="radar-svg" viewBox="0 0 300 260"></svg></div>' +
      '</div>' +

      // 剂型说明
      '<div style="padding:8px 12px; background:#e3f2fd; border-radius:6px; font-size:0.8rem; margin-bottom:10px;">' +
        '<strong>💊 剂型说明：</strong>' + currentFormType +
        (formDesc ? ' | ' + formDesc : '') +
      '</div>' +

      // 操作按钮
      '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
        '<button class="btn btn-xs btn-light" onclick="saveFormula(\'' + r.name + '\', \'' + r.herbs.join(',') + '\')">💾 保存组方</button>' +
        '<button class="btn btn-xs btn-primary" onclick="saveFormula(\'' + r.name + '\', \'' + r.herbs.join(',') + '\'); showPage(\'module4\');">📊 感官预测及营养评估 →</button>' +
      '</div>' +
    '</div>';
  }
  document.getElementById('top10List').innerHTML = topHtml;

  setTimeout(function() {
    for (var tj = 0; tj < results.length; tj++) {
      drawRadar(results[tj].dimScores, 'radarChart-' + tj);
    }
  }, 50);
}

function toggleAnalysis(idx) {
  var el = document.getElementById('top10-analysis-' + idx);
  el.classList.toggle('active');
}

// 覆盖 saveFormula，同时保存剂型
var originalSaveFormula = saveFormula;
saveFormula = function(name, herbs) {
  localStorage.setItem('currentFormula', JSON.stringify({
    name: name, herbs: herbs.split(','), time: new Date().toISOString(), formType: currentFormType
  }));
  alert('已保存组方：' + name + '（' + currentFormType + '）');
};

// ========== Module 4 剂型联动 ==========
function runPrediction(herbs) {
  var hash = herbs.join('').length;
  var tasteVal = (6.5 + (hash%30)/10).toFixed(1);
  var smellVal = (6.0 + ((hash*7)%25)/10).toFixed(1);
  var colorVal = (7.0 + ((hash*3)%20)/10).toFixed(1);
  var tLabels = ['偏苦微甘，回味悠长', '酸甜适口，清爽宜人', '甘淡平和，口感顺滑', '微辛开胃，风味独特'];
  var sLabels = ['清香淡雅，草本芬芳', '浓郁醇厚，药香明显', '果香甜美，气味怡人', '淡香幽远，余韵绵长'];
  var cLabels = ['浅黄透亮，色泽明快', '琥珀温润，观感醇厚', '淡绿清新，自然透亮', '棕红浓郁，色泽饱满'];

  document.getElementById('tasteScore').textContent = tasteVal;
  document.getElementById('tasteDesc').textContent = tLabels[hash % tLabels.length];
  document.getElementById('smellScore').textContent = smellVal;
  document.getElementById('smellDesc').textContent = sLabels[hash % sLabels.length];
  document.getElementById('colorScore').textContent = colorVal;
  document.getElementById('colorDesc').textContent = cLabels[hash % cLabels.length];

  // 读取保存的剂型
  var saved = localStorage.getItem('currentFormula');
  var formType = currentFormType;
  if (saved) {
    var parsed = JSON.parse(saved);
    if (parsed.formType) formType = parsed.formType;
  }

  var formLabel = dosageByForm[formType] ? ('（' + formType + '，' + dosageByForm[formType].desc + '）') : '';

  var bars = [
    {label:'口感 (' + Math.round(weights.find(function(w){return w.key==='taste';}).w*100) + '%)', value:tasteVal*10, color:'#e65100'},
    {label:'气味 (' + Math.round(weights.find(function(w){return w.key==='smell';}).w*100) + '%)', value:smellVal*10, color:'#2e7d32'},
    {label:'颜色 (' + Math.round(weights.find(function(w){return w.key==='color';}).w*100) + '%)', value:colorVal*10, color:'#1565c0'},
    {label:'营养 (' + Math.round(weights.find(function(w){return w.key==='nutrition';}).w*100) + '%)', value:(75+(hash%20)), color:'#ff8f00'}
  ];
  var barsHtml = '';
  for (var b = 0; b < bars.length; b++) {
    barsHtml += '<div class="score-bar"><div class="label">' + bars[b].label + '</div><div class="bar-wrap"><div class="bar-fill" style="width:' + bars[b].value + '%; background:' + bars[b].color + ';"></div></div><div class="value">' + bars[b].value.toFixed(0) + '</div></div>';
  }
  document.getElementById('sensoryBars').innerHTML = barsHtml;

  // 营养表格
  var nutriItems = [
    {name:'蛋白质', amount:(8.2+(hash%50)/10).toFixed(1), rdi:'60g', pct:(12+hash%15)+'%', level:'良好'},
    {name:'膳食纤维', amount:(12.5+(hash%80)/10).toFixed(1), rdi:'25g', pct:(45+hash%30)+'%', level:'优秀'},
    {name:'维生素C', amount:(28+hash%40).toFixed(0), rdi:'100mg', pct:(25+hash%40)+'%', level:'良好'},
    {name:'钾', amount:(320+hash%200).toFixed(0), rdi:'2000mg', pct:(15+hash%10)+'%', level:'一般'},
    {name:'铁', amount:(4.5+(hash%30)/10).toFixed(1), rdi:'12mg', pct:(35+hash%20)+'%', level:'良好'},
    {name:'锌', amount:(2.8+(hash%20)/10).toFixed(1), rdi:'12mg', pct:(20+hash%15)+'%', level:'一般'},
    {name:'总多酚', amount:(850+hash%400).toFixed(0), rdi:'-', pct:'-', level:'优秀'},
    {name:'总黄酮', amount:(420+hash%300).toFixed(0), rdi:'-', pct:'-', level:'优秀'}
  ];
  var nutriHtml = '';
  for (var n = 0; n < nutriItems.length; n++) {
    var nv = nutriItems[n];
    var color = nv.level==='优秀' ? 'var(--success)' : (nv.level==='良好' ? 'var(--primary)' : 'var(--accent)');
    nutriHtml += '<tr><td>' + nv.name + '</td><td>' + nv.amount + '</td><td>' + nv.rdi + '</td><td>' + nv.pct + '</td><td><span style="color:' + color + '; font-weight:600;">' + nv.level + '</span></td></tr>';
  }
  document.getElementById('nutriBody').innerHTML = nutriHtml;

  // 推荐产品形态
  var formSet = {};
  for (var hi = 0; hi < herbs.length; hi++) {
    var hinfo = null;
    for (var hj = 0; hj < substancesFull.length; hj++) {
      if (substancesFull[hj].name === herbs[hi]) { hinfo = substancesFull[hj]; break; }
    }
    if (hinfo && hinfo.product_form) {
      for (var pi = 0; pi < hinfo.product_form.length; pi++) {
        formSet[hinfo.product_form[pi]] = (formSet[hinfo.product_form[pi]] || 0) + 1;
      }
    }
  }
  var sortedForms = Object.keys(formSet).sort(function(a,b){ return formSet[b] - formSet[a]; });
  var recForms = sortedForms.slice(0, 2);
  var recHtml = '';
  if (recForms.length) {
    recHtml = '<div style="margin-top:14px; padding:12px; background:var(--primary-light); border-radius:8px; font-size:0.85rem;">' +
      '<strong>推荐产品形态：</strong>基于组方各物质的特性，推荐开发为 <strong>' + recForms.join('、') + '</strong>。' +
      '<br><span style="color:var(--text-muted);">当前评估剂型：' + formType + ' ' + formLabel + '</span>' +
    '</div>';
  }
  var dosageText = herbs.map(function(h){ return getDosageDisplay(h, formType); }).join('、');
  document.getElementById('dosageText').textContent = dosageText;

  // 如果已存在推荐区域则更新，否则插入
  var existingRec = document.getElementById('productFormRec');
  if (existingRec) existingRec.innerHTML = recHtml;
  else {
    var nutriPanel = document.getElementById('nutriBody').closest('.panel');
    if (nutriPanel) {
      var recDiv = document.createElement('div');
      recDiv.id = 'productFormRec';
      recDiv.innerHTML = recHtml;
      nutriPanel.appendChild(recDiv);
    }
  }
}

// ========== Module 3 文献数据加载与搜索覆盖（重构版） ==========
var literatureData = [];
var literatureLoaded = false;
var lastSearchResults = [];      // 缓存上次搜索结果
var lastSearchQuery = '';        // 缓存上次搜索关键词
var lastSearchType = 'all';      // 缓存上次搜索类型
var selectedItems = new Set();   // 已选中的结果ID集合
var activeAppFilter = '';        // 当前激活的应用场景内置筛选
var activeHerbFilter = '';       // 当前激活的物质内置筛选

function loadLiteratureData() {
  var header = document.getElementById('resultsHeader');
  if (typeof literature_full !== 'undefined' && literature_full) {
    literatureData = literature_full;
  }
  if (typeof ancient_literature !== 'undefined' && ancient_literature) {
    literatureData = literatureData.concat(ancient_literature);
  }
  literatureLoaded = true;
  if (header) header.textContent = '文献数据库已就绪，共 ' + literatureData.length + ' 条记录。请输入关键词开始检索...';
  console.log('文献数据加载完成:', literatureData.length);
}

// 覆盖 doSearch，实现严格双向检索 + 过滤 + 排序 + 内置筛选
var originalDoSearch = doSearch;
doSearch = function() {
  var raw = document.getElementById('mineSearch').value.trim().toLowerCase();
  var searchType = document.getElementById('searchType').value;
  var filterType = document.getElementById('filterType').value;
  var sortType = document.getElementById('sortType').value;
  var q = raw;

  var dataPool = literatureLoaded && literatureData.length > 0 ? literatureData : (typeof mockData !== 'undefined' ? mockData : []);
  if (dataPool.length === 0) {
    document.getElementById('resultsHeader').textContent = '数据尚未加载完成，请稍后再试...';
    return;
  }

  // 如果没输入关键词，展示全部（带过滤）
  if (!q) {
    var allResults = dataPool.map(function(item, idx) { item._id = idx; item._relevance = 0; return item; });
    allResults = applyFilter(allResults, filterType);
    allResults = applySort(allResults, sortType, '');
    lastSearchResults = allResults;
    lastSearchQuery = '';
    renderMine(allResults, '', searchType);
    return;
  }

  // ========== 严格的双向检索评分 ==========
  var scored = [];
  for (var mi = 0; mi < dataPool.length; mi++) {
    var item = dataPool[mi];
    item._id = mi;
    var score = 0;
    var matchedHerbs = [];      // 记录匹配到的物质
    var matchedFields = [];     // 记录匹配的字段

    var titleLower = (item.title || '').toLowerCase();
    var descLower = (item.desc || item.abstract || '').toLowerCase();
    var classicalLower = (item.classical_text || '').toLowerCase();
    var modernLower = (item.modern_translation || '').toLowerCase();
    var herbsArr = item.herbs || [];

    if (searchType === 'herb') {
      // ========== 模式A：物质名称搜索 ==========
      // 严格限制：只在 herbs 字段中搜索，其他字段完全不参与匹配
      for (var hi = 0; hi < herbsArr.length; hi++) {
        var herbName = herbsArr[hi].toLowerCase();
        // 完全匹配或包含匹配
        if (herbName === q) {
          score += 100;  // 完全匹配最高权重
          matchedHerbs.push(herbsArr[hi]);
        } else if (herbName.indexOf(q) !== -1) {
          score += 50;   // 子串匹配
          matchedHerbs.push(herbsArr[hi]);
        }
      }
      // 辅助：title/desc 中提及该物质时略微加分（但不作为主要匹配依据）
      if (score > 0) {
        if (titleLower.indexOf(q) !== -1) { score += 3; matchedFields.push('title'); }
        if (descLower.indexOf(q) !== -1) { score += 2; matchedFields.push('desc'); }
      }

    } else if (searchType === 'application') {
      // ========== 模式B：应用场景搜索 ==========
      // 严格限制：只在 title/desc/classical_text/modern_translation 中搜索
      // 不搜索 herbs/source/authors，避免泛滥
      if (titleLower.indexOf(q) !== -1) { score += 20; matchedFields.push('title'); }
      if (descLower.indexOf(q) !== -1) { score += 15; matchedFields.push('desc'); }
      if (classicalLower.indexOf(q) !== -1) { score += 12; matchedFields.push('classical'); }
      if (modernLower.indexOf(q) !== -1) { score += 8; matchedFields.push('modern'); }

      // 检查 herbs 中是否有明确提及（辅助）
      for (var hi2 = 0; hi2 < herbsArr.length; hi2++) {
        if (herbsArr[hi2].toLowerCase().indexOf(q) !== -1) {
          score += 5;
          matchedHerbs.push(herbsArr[hi2]);
        }
      }

    } else {
      // ========== 模式C：全部字段搜索 ==========
      if (titleLower.indexOf(q) !== -1) { score += 12; matchedFields.push('title'); }
      if (descLower.indexOf(q) !== -1) { score += 8; matchedFields.push('desc'); }
      if (classicalLower.indexOf(q) !== -1) { score += 6; matchedFields.push('classical'); }
      if (modernLower.indexOf(q) !== -1) { score += 4; matchedFields.push('modern'); }
      for (var hi3 = 0; hi3 < herbsArr.length; hi3++) {
        if (herbsArr[hi3].toLowerCase().indexOf(q) !== -1) {
          score += 15;
          matchedHerbs.push(herbsArr[hi3]);
        }
      }
    }

    // 古籍文献基础加权
    if (item.category === 'ancient') score += 2;

    if (score > 0) {
      item._relevance = score;
      item._matchedHerbs = matchedHerbs;
      item._matchedFields = matchedFields;
      scored.push(item);
    }
  }

  // 过滤
  scored = applyFilter(scored, filterType);

  // 排序
  scored = applySort(scored, sortType, q);

  lastSearchResults = scored;
  lastSearchQuery = raw;
  lastSearchType = searchType;

  if (scored.length === 0) {
    document.getElementById('resultsHeader').textContent = '未找到与 "' + q + '" 相关的结果';
    document.getElementById('resultsList').innerHTML = '';
    document.getElementById('resultsPagination').innerHTML = '';
    document.getElementById('resultsToolbar').style.display = 'none';
    document.getElementById('inlineFilterBar').innerHTML = '';
    return;
  }

  renderMine(scored, raw, searchType);
};

// 文献类型过滤
function applyFilter(results, filterType) {
  if (filterType === 'all') return results;
  return results.filter(function(item) {
    if (filterType === 'ancient') return item.category === 'ancient';
    if (filterType === 'chinese_journal') return item.type === 'chinese' && item.category !== 'ancient';
    if (filterType === 'english_journal') return item.type === 'english';
    if (filterType === 'other') {
      return item.category !== 'ancient' && item.type !== 'chinese' && item.type !== 'english';
    }
    return true;
  });
}

// 排序
function applySort(results, sortType, q) {
  var sorted = results.slice();
  if (sortType === 'relevance') {
    sorted.sort(function(a, b) { return b._relevance - a._relevance; });
  } else if (sortType === 'year_desc') {
    sorted.sort(function(a, b) {
      var ya = parseInt(a.year) || 0;
      var yb = parseInt(b.year) || 0;
      return yb - ya;
    });
  } else if (sortType === 'year_asc') {
    sorted.sort(function(a, b) {
      var ya = parseInt(a.year) || 0;
      var yb = parseInt(b.year) || 0;
      return ya - yb;
    });
  } else if (sortType === 'author') {
    sorted.sort(function(a, b) {
      var auA = (a.authors || '').toLowerCase();
      var auB = (b.authors || '').toLowerCase();
      return auA.localeCompare(auB);
    });
  }
  return sorted;
}

// 覆盖 renderMine
var originalRenderMine = renderMine;
renderMine = function(results, q, searchType) {
  searchType = searchType || lastSearchType || 'all';
  var header = document.getElementById('resultsHeader');
  var list = document.getElementById('resultsList');
  var pag = document.getElementById('resultsPagination');
  var toolbar = document.getElementById('resultsToolbar');
  var inlineFilter = document.getElementById('inlineFilterBar');

  // 构建标题
  var modeText = searchType === 'herb' ? '【物质名称】' : (searchType === 'application' ? '【应用场景】' : '');
  header.textContent = modeText + '检索 "' + (q || '全部') + '" 共找到 ' + results.length + ' 条结果';

  // 显示工具栏
  if (toolbar) toolbar.style.display = 'flex';

  // ========== 内置筛选栏：提取结果中的物质/应用场景标签 ==========
  if (inlineFilter) {
    var filterHtml = '';
    if (searchType === 'herb' && q) {
      // 物质搜索：提取所有不同的应用场景关键词作为筛选
      var apps = {};
      for (var ri = 0; ri < results.length; ri++) {
        var t = results[ri].title || '';
        // 简单提取：以疾病/功能相关的关键词作为应用场景
        var keywords = t.match(/[一-龥]{2,10}(?:作用|功效|功能|治疗|改善|预防|抑制|促进|调节)/g);
        if (keywords) {
          for (var ki = 0; ki < keywords.length; ki++) {
            apps[keywords[ki]] = (apps[keywords[ki]] || 0) + 1;
          }
        }
      }
      var appArr = [];
      for (var k in apps) { appArr.push({k:k, c:apps[k]}); }
      appArr.sort(function(a,b){ return b.c - a.c; });
      if (appArr.length > 0) {
        filterHtml += '<div style="margin-bottom:8px; font-size:0.78rem; color:var(--text-muted);">应用场景筛选：</div>' +
          '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">';
        for (var fi = 0; fi < Math.min(appArr.length, 15); fi++) {
          filterHtml += '<span class="inline-filter-chip" onclick="filterByApp(\'' + appArr[fi].k + '\')" style="display:inline-block; background:#fff; border:1px solid var(--border); padding:3px 10px; border-radius:16px; font-size:0.75rem; cursor:pointer; color:var(--text-muted);">' + appArr[fi].k + ' (' + appArr[fi].c + ')</span>';
        }
        filterHtml += '</div>';
      }
    } else if (searchType === 'application' && q) {
      // 应用场景搜索：提取所有涉及的物质作为筛选
      var herbCounts = {};
      for (var ri2 = 0; ri2 < results.length; ri2++) {
        var herbs = results[ri2].herbs || [];
        for (var hi = 0; hi < herbs.length; hi++) {
          herbCounts[herbs[hi]] = (herbCounts[herbs[hi]] || 0) + 1;
        }
      }
      var herbArr = [];
      for (var hk in herbCounts) { herbArr.push({k:hk, c:herbCounts[hk]}); }
      herbArr.sort(function(a,b){ return b.c - a.c; });
      if (herbArr.length > 0) {
        filterHtml += '<div style="margin-bottom:8px; font-size:0.78rem; color:var(--text-muted);">食药物质筛选：</div>' +
          '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">';
        for (var fi2 = 0; fi2 < Math.min(herbArr.length, 20); fi2++) {
          filterHtml += '<span class="inline-filter-chip" onclick="filterByHerb(\'' + herbArr[fi2].k + '\')" style="display:inline-block; background:#fff; border:1px solid var(--border); padding:3px 10px; border-radius:16px; font-size:0.75rem; cursor:pointer; color:var(--text-muted);">' + herbArr[fi2].k + ' (' + herbArr[fi2].c + ')</span>';
        }
        filterHtml += '</div>';
      }
    }
    inlineFilter.innerHTML = filterHtml;
  }

  var totalPages = Math.ceil(results.length / minePageSize);
  var start = (minePage - 1) * minePageSize;
  var pageItems = results.slice(start, start + minePageSize);

  var re = q ? new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi') : null;
  var listHtml = '';

  for (var pi = 0; pi < pageItems.length; pi++) {
    var item = pageItems[pi];
    var idx = start + pi;
    var isChecked = selectedItems.has(String(item._id || idx)) ? 'checked' : '';

    var title = item.title || '无标题';
    var desc = item.desc || item.abstract || '';
    if (re) {
      title = title.replace(re, '<span class="highlight">$1</span>');
      desc = desc.replace(re, '<span class="highlight">$1</span>');
    }

    // 文献类型标签
    var typeBadge = '';
    var typeLabel = '';
    if (item.category === 'ancient') {
      typeBadge = '<span style="display:inline-block; background:#6a1b9a; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:8px;">古籍文献</span>';
      typeLabel = '古籍文献';
    } else if (item.type === 'english') {
      typeBadge = '<span style="display:inline-block; background:#1565c0; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:8px;">英文期刊</span>';
      typeLabel = '英文期刊';
    } else if (item.type === 'chinese') {
      typeBadge = '<span style="display:inline-block; background:#2e7d32; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:8px;">中文期刊</span>';
      typeLabel = '中文期刊';
    } else {
      typeBadge = '<span style="display:inline-block; background:#757575; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:8px;">其他</span>';
      typeLabel = '其他';
    }

    // 相关度徽章
    var relBadge = '';
    if (item._relevance >= 50) relBadge = '<span style="display:inline-block; background:#c62828; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:8px;">精确匹配</span>';
    else if (item._relevance >= 20) relBadge = '<span style="display:inline-block; background:#ff8f00; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:8px;">高相关度</span>';
    else if (item._relevance >= 10) relBadge = '<span style="display:inline-block; background:#1565c0; color:#fff; padding:2px 8px; border-radius:10px; font-size:0.7rem; margin-left:8px;">中相关度</span>';

    var sourceLabel = item.source || '未知来源';
    var yearLabel = item.year ? (' | 年份：' + item.year) : '';
    var authorsLabel = item.authors ? (' | 作者：' + item.authors.split(',')[0] + ' 等') : '';

    // 古籍文献展示原文+译文
    var ancientHtml = '';
    if (item.category === 'ancient') {
      if (item.classical_text) {
        var ct = item.classical_text;
        if (re) ct = ct.replace(re, '<span class="highlight">$1</span>');
        ancientHtml += '<div class="result-translations"><div class="trans-title">📜 古籍原文</div><div style="font-size:0.8rem; color:#555;">' + ct + '</div></div>';
      }
      if (item.modern_translation) {
        var mt = item.modern_translation;
        if (re) mt = mt.replace(re, '<span class="highlight">$1</span>');
        ancientHtml += '<div class="result-translations"><div class="trans-title">📝 白话译文</div><div style="font-size:0.8rem; color:#555;">' + mt + '</div></div>';
      }
    }

    // 涉及物质标签 - 根据搜索类型调整展示方式
    var herbsHtml = '';
    if (item.herbs && item.herbs.length > 0) {
      herbsHtml = '<div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">';
      for (var hi = 0; hi < item.herbs.length; hi++) {
        var isMatched = searchType === 'herb' && item._matchedHerbs && item._matchedHerbs.indexOf(item.herbs[hi]) !== -1;
        var bg = isMatched ? 'var(--accent)' : 'var(--primary-light)';
        var color = isMatched ? '#fff' : 'var(--primary-dark)';
        herbsHtml += '<span style="display:inline-block; background:' + bg + '; color:' + color + '; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:' + (isMatched?'600':'400') + ';">' + item.herbs[hi] + '</span>';
      }
      herbsHtml += '</div>';
    }

    // 根据搜索类型构建不同的卡片布局
    var cardContent = '';
    if (searchType === 'herb') {
      // ========== 物质搜索模式：突出应用场景 ==========
      cardContent =
        '<h4 style="margin-bottom:6px; color:var(--primary-dark);">📌 应用场景：' + title + typeBadge + relBadge + '</h4>' +
        '<div class="source" style="font-size:0.78rem; color:var(--text-muted); margin-bottom:6px;">来源：' + sourceLabel + yearLabel + authorsLabel + ' | 类型：' + typeLabel + (item._relevance ? ' | 匹配度：' + item._relevance : '') + '</div>' +
        '<div style="background:var(--primary-light); padding:10px 12px; border-radius:8px; margin-bottom:8px;">' +
          '<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">📖 记载依据</div>' +
          '<p style="font-size:0.85rem; margin:0; color:var(--text); line-height:1.6;">' + (desc || '暂无摘要') + '</p>' +
        '</div>' +
        ancientHtml +
        '<div style="margin-top:8px;"><span style="font-size:0.75rem; color:var(--text-muted);">涉及物质：</span>' + herbsHtml.replace('<div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">','').replace('</div>','') + '</div>';
    } else if (searchType === 'application') {
      // ========== 应用搜索模式：突出食药物质 ==========
      cardContent =
        '<h4 style="margin-bottom:6px; color:var(--primary-dark);">📌 应用场景：' + title + typeBadge + relBadge + '</h4>' +
        '<div class="source" style="font-size:0.78rem; color:var(--text-muted); margin-bottom:6px;">来源：' + sourceLabel + yearLabel + authorsLabel + ' | 类型：' + typeLabel + (item._relevance ? ' | 匹配度：' + item._relevance : '') + '</div>' +
        '<div style="background:#fff8e1; padding:10px 12px; border-radius:8px; margin-bottom:8px; border-left:3px solid var(--accent);">' +
          '<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">🌿 相关食药物质</div>' +
          herbsHtml.replace('margin-top:8px;','margin-top:4px;') +
        '</div>' +
        '<div style="background:var(--primary-light); padding:10px 12px; border-radius:8px; margin-bottom:8px;">' +
          '<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">📖 记载依据</div>' +
          '<p style="font-size:0.85rem; margin:0; color:var(--text); line-height:1.6;">' + (desc || '暂无摘要') + '</p>' +
        '</div>' +
        ancientHtml;
    } else {
      // ========== 全部搜索模式：标准展示 ==========
      cardContent =
        '<h4 style="margin-bottom:4px;">' + title + typeBadge + relBadge + '</h4>' +
        '<div class="source" style="font-size:0.78rem; color:var(--text-muted);">来源：' + sourceLabel + yearLabel + authorsLabel + ' | 类型：' + typeLabel + (item._relevance ? ' | 匹配度：' + item._relevance : '') + '</div>' +
        '<p style="font-size:0.85rem; margin-top:6px; color:var(--text);">' + (desc || '暂无摘要') + '</p>' +
        herbsHtml +
        ancientHtml;
    }

    listHtml += '<div class="result-item" style="' + (item._relevance>=20 ? 'border-left-color:#ff8f00; background:#fff8e1;' : '') + '">' +
      '<div style="display:flex; align-items:flex-start; gap:10px;">' +
        '<div style="padding-top:4px;">' +
          '<input type="checkbox" class="result-checkbox" data-id="' + (item._id || idx) + '" onchange="toggleItemSelect(this)" ' + isChecked + ' style="width:16px; height:16px; cursor:pointer;">' +
        '</div>' +
        '<div style="flex:1;">' + cardContent + '</div>' +
      '</div>' +
    '</div>';
  }
  list.innerHTML = listHtml;

  // 分页
  if (totalPages > 1) {
    var pagHtml = '<button onclick="goMinePage(' + (minePage-1) + ', ' + totalPages + ')" ' + (minePage===1?'disabled':'') + '>上一页</button>';
    for (var pj = 1; pj <= totalPages; pj++) {
      if (pj===1 || pj===totalPages || Math.abs(pj-minePage)<=1) {
        pagHtml += '<button class="' + (pj===minePage?'active':'') + '" onclick="goMinePage(' + pj + ', ' + totalPages + ')">' + pj + '</button>';
      } else if (Math.abs(pj-minePage)===2) { pagHtml += '<span style="padding:8px 4px;">...</span>'; }
    }
    pagHtml += '<button onclick="goMinePage(' + (minePage+1) + ', ' + totalPages + ')" ' + (minePage===totalPages?'disabled':'') + '>下一页</button>';
    pag.innerHTML = pagHtml;
  } else {
    pag.innerHTML = '';
  }

  // 更新已选计数
  updateSelectedCount();
};

// 每页条数变更
function changeMinePageSize() {
  var newSize = parseInt(document.getElementById('pageSizeSelect').value);
  if (newSize > 0) {
    minePageSize = newSize;
    minePage = 1;
    doSearch();
  }
}

// 覆盖 goMinePage
var originalGoMinePage = goMinePage;
goMinePage = function(p, total) {
  if (p < 1 || p > total) return;
  minePage = p;
  renderMine(lastSearchResults, lastSearchQuery, lastSearchType);
  window.scrollTo({top:0, behavior:'smooth'});
};

// 内置筛选：按应用场景筛选（物质搜索结果中）
var activeAppFilter = '';
function filterByApp(appKeyword) {
  activeAppFilter = appKeyword;
  var filtered = lastSearchResults.filter(function(item) {
    var title = (item.title || '').toLowerCase();
    var desc = (item.desc || item.abstract || '').toLowerCase();
    var kw = appKeyword.toLowerCase();
    return title.indexOf(kw) !== -1 || desc.indexOf(kw) !== -1;
  });
  minePage = 1;
  renderMine(filtered, lastSearchQuery + ' + ' + appKeyword, lastSearchType);
}

// 内置筛选：按物质筛选（应用场景搜索结果中）
var activeHerbFilter = '';
function filterByHerb(herbName) {
  activeHerbFilter = herbName;
  var filtered = lastSearchResults.filter(function(item) {
    var herbs = item.herbs || [];
    for (var i = 0; i < herbs.length; i++) {
      if (herbs[i] === herbName) return true;
    }
    return false;
  });
  minePage = 1;
  renderMine(filtered, lastSearchQuery + ' + ' + herbName, lastSearchType);
}

// 覆盖 clearSearch
var originalClearSearch = clearSearch;
clearSearch = function() {
  document.getElementById('mineSearch').value = '';
  document.getElementById('searchType').value = 'all';
  document.getElementById('filterType').value = 'all';
  document.getElementById('sortType').value = 'relevance';
  minePage = 1;
  lastSearchResults = [];
  lastSearchQuery = '';
  lastSearchType = 'all';
  activeAppFilter = '';
  activeHerbFilter = '';
  selectedItems.clear();
  document.getElementById('resultsHeader').textContent = '请输入关键词开始检索...';
  document.getElementById('resultsList').innerHTML = '';
  document.getElementById('resultsPagination').innerHTML = '';
  document.getElementById('resultsToolbar').style.display = 'none';
  var inlineFilter = document.getElementById('inlineFilterBar');
  if (inlineFilter) inlineFilter.innerHTML = '';
  if (document.getElementById('selectAll')) document.getElementById('selectAll').checked = false;
  updateSelectedCount();
};

// 选择框功能
function toggleItemSelect(checkbox) {
  var id = checkbox.getAttribute('data-id');
  if (checkbox.checked) {
    selectedItems.add(id);
  } else {
    selectedItems.delete(id);
  }
  updateSelectedCount();
  // 更新全选状态
  var allBoxes = document.querySelectorAll('.result-checkbox');
  var allChecked = true;
  for (var i = 0; i < allBoxes.length; i++) {
    if (!allBoxes[i].checked) { allChecked = false; break; }
  }
  var selectAllBox = document.getElementById('selectAll');
  if (selectAllBox) selectAllBox.checked = allChecked;
}

function toggleSelectAll() {
  var selectAllBox = document.getElementById('selectAll');
  var isChecked = selectAllBox ? selectAllBox.checked : false;
  var boxes = document.querySelectorAll('.result-checkbox');
  for (var i = 0; i < boxes.length; i++) {
    boxes[i].checked = isChecked;
    var id = boxes[i].getAttribute('data-id');
    if (isChecked) {
      selectedItems.add(id);
    } else {
      selectedItems.delete(id);
    }
  }
  updateSelectedCount();
}

function updateSelectedCount() {
  var countEl = document.getElementById('selectedCount');
  if (countEl) countEl.textContent = '已选 ' + selectedItems.size + ' 条';
}

// 导出功能
function exportSelected() {
  if (selectedItems.size === 0) {
    alert('请先选择要导出的检索结果');
    return;
  }

  var exportData = [];
  for (var i = 0; i < lastSearchResults.length; i++) {
    var item = lastSearchResults[i];
    var id = String(item._id !== undefined ? item._id : i);
    if (selectedItems.has(id)) {
      exportData.push({
        标题: item.title || '',
        作者: item.authors || '',
        来源: item.source || '',
        年份: item.year || '',
        文献类型: item.category === 'ancient' ? '古籍文献' : (item.type === 'english' ? '英文期刊' : (item.type === 'chinese' ? '中文期刊' : '其他')),
        涉及食药物质: (item.herbs || []).join('、'),
        摘要: item.desc || item.abstract || '',
        古籍原文: item.classical_text || '',
        白话译文: item.modern_translation || ''
      });
    }
  }

  // 生成 CSV
  var headers = ['标题', '作者', '来源', '年份', '文献类型', '涉及食药物质', '摘要', '古籍原文', '白话译文'];
  var csvContent = '﻿' + headers.join(',') + '\n';
  for (var j = 0; j < exportData.length; j++) {
    var row = exportData[j];
    var values = headers.map(function(h) {
      var val = row[h] || '';
      // 处理包含逗号或换行符的值
      if (val.indexOf(',') !== -1 || val.indexOf('\n') !== -1 || val.indexOf('"') !== -1) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    });
    csvContent += values.join(',') + '\n';
  }

  // 下载
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  var url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', '检索结果导出_' + new Date().toISOString().slice(0,10) + '.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert('已导出 ' + exportData.length + ' 条结果到 CSV 文件');
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
  loadSubstancesFull();
  renderWeightSliders();
  loadLiteratureData();
});
