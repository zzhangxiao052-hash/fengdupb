// [交互修改区] 仅前端演示逻辑：菜单切换、图表渲染、弹窗操作、假筛选。
const chartInstances = new Map();
const colors = ['#1677ff', '#1f9d55', '#d9822b', '#d64545', '#7b61ff', '#13a8a8'];

function tagClass(text) {
    if (/重大|高危|延期|逾期|异常|待整改|退回|超期|维修/.test(text)) return 'tag-red';
    if (/待|中|筹备|补正|审核|空置|较大/.test(text)) return 'tag-orange';
    if (/已|正常|通过|闭环|完成|出租|A/.test(text)) return 'tag-green';
    if (/高新|专精|施工|办理|派单|规上/.test(text)) return 'tag-blue';
    return 'tag-gray';
}

function initClock() {
    const el = document.getElementById('currentTime');
    if (!el) return;
    const tick = () => {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        el.textContent = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    };
    tick();
    setInterval(tick, 1000);
}

function renderNav() {
    const nav = document.getElementById('adminNav');
    nav.innerHTML = MockData.nav.map(group => `
        <div class="admin-menu-group">${group.group}</div>
        <ul class="admin-menu-list">
            ${group.items.map(item => `<li class="admin-menu-item" data-target="${item[0]}">${item[1]}</li>`).join('')}
        </ul>
    `).join('');
    nav.addEventListener('click', (event) => {
        const item = event.target.closest('.admin-menu-item');
        if (!item) return;
        setActivePage(item.dataset.target);
    });
}

function setActivePage(id) {
    document.querySelectorAll('.admin-menu-item').forEach(item => item.classList.toggle('active', item.dataset.target === id));
    renderPage(id);
}

function renderPage(id) {
    const page = MockData.pages[id];
    if (!page) return;
    document.getElementById('breadcrumb').textContent = `${page.group} / ${page.title}`;
    document.getElementById('pageTitle').textContent = page.title;

    chartInstances.forEach(chart => chart.dispose());
    chartInstances.clear();

    const root = document.getElementById('pageRoot');
    root.innerHTML = `
        <div class="button-row">${(page.actions || []).map(action => `<button class="btn btn-default" data-modal="${action}">${action}</button>`).join('')}</div>
        ${renderKpis(page.kpis)}
        ${page.flow ? renderFlow(page.flow) : ''}
        ${page.assetMap ? renderAssetMap() : ''}
        ${page.chainMap ? renderChainMap(page.chainMap) : ''}
        ${page.reportSections ? renderReportSections(page.reportSections) : ''}
        ${page.companyProfile ? renderCompanyProfile(page.companyProfile) : ''}
        ${renderCharts(page.charts || [])}
        ${page.list ? renderList(page.list) : ''}
        ${page.table ? renderTable(page.table) : ''}
    `;
    root.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.modal, page.title)));
    root.querySelectorAll('[data-row-action]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.rowAction, btn.dataset.rowTitle)));
    root.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => fakeFilter(btn)));
    root.querySelectorAll('.room').forEach(room => room.addEventListener('click', () => openModal('房源详情', room.textContent.trim())));
    setTimeout(() => renderPageCharts(page.charts || []), 0);
}

function renderKpis(kpis = []) {
    return `<div class="kpi-grid">${kpis.map(kpi => `
        <div class="metric-card" style="--accent:${kpi[4] || colors[0]}">
            <div class="metric-label">${kpi[0]}</div>
            <div class="metric-value">${kpi[1]}<span class="metric-unit">${kpi[2]}</span></div>
            <div class="metric-trend"><strong>${kpi[3].split(' ')[0]}</strong> ${kpi[3].split(' ').slice(1).join(' ')}</div>
        </div>
    `).join('')}</div>`;
}

function renderFlow(flow) {
    return `<div class="admin-card"><div class="card-head"><h2 class="card-title">业务流转步骤</h2><span class="card-sub">点击页面按钮可查看对应办理弹窗</span></div><div class="card-body"><div class="flow-list">${flow.map((step, idx) => `
        <div class="flow-step"><b>${idx + 1}. ${step[0]}</b><p>${step[1]}</p></div>
    `).join('')}</div></div></div>`;
}


function renderChainMap(chainMap) {
    return `<div class="admin-card"><div class="card-head"><h2 class="card-title">${chainMap.title}</h2><span class="card-sub">\u4e0a\u4e0b\u6e38\u94fe\u8def\u91c7\u7528\u6f14\u793a\u578b\u9759\u6001\u56fe\u8c31\u5c55\u793a</span></div><div class="card-body"><div class="chain-legend">${chainMap.legend.map(name => `<span class="tag tag-blue">${name}</span>`).join('')}</div><div class="chain-map-grid">${chainMap.columns.map((column, columnIndex) => `<div class="chain-column chain-c${columnIndex + 1}"><div class="chain-column-title">${column.title}</div><div class="chain-node-list">${column.items.map(item => `<div class="chain-node">${item}</div>`).join('')}</div></div>`).join('')}</div><div class="chain-company-box">${chainMap.companies.map(item => `<div class="chain-company-item"><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join('')}</div></div></div>`;
}

function renderReportSections(sections) {
    return `<div class="admin-card"><div class="card-head"><h2 class="card-title">AI \u4ea7\u4e1a\u5206\u6790\u6458\u8981</h2><span class="card-sub">\u4ee5\u4e0b\u5185\u5bb9\u4e3a\u672c\u5730\u5047\u6570\u636e\u751f\u6210\u7684\u6f14\u793a\u62a5\u544a</span></div><div class="card-body"><div class="report-grid">${sections.map(section => `<article class="report-block"><h3>${section[0]}</h3><p>${section[1]}</p></article>`).join('')}</div></div></div>`;
}

function renderCompanyProfile(profile) {
    return `<div class="admin-card"><div class="card-head"><div><h2 class="card-title">\u4f01\u4e1a\u753b\u50cf\u5361\u7247</h2><span class="card-sub">\u4f01\u4e1a\u5de5\u5546\u4fe1\u606f\u4e0e\u62db\u5546\u4ef7\u503c\u5c55\u793a</span></div><div class="profile-name">${profile.name}</div></div><div class="card-body"><div class="profile-tags">${profile.tags.map(tag => `<span class="tag tag-blue">${tag}</span>`).join('')}</div><div class="profile-layout"><div class="profile-panel"><h3>\u5de5\u5546\u57fa\u7840\u4fe1\u606f</h3><div class="profile-info-list">${profile.basicInfo.map(item => `<div class="profile-info-item"><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join('')}</div></div><div class="profile-panel"><h3>AI \u4f01\u4e1a\u753b\u50cf</h3><div class="profile-portrait">${profile.portrait.map(item => `<div class="portrait-item"><label>${item[0]}</label><p>${item[1]}</p></div>`).join('')}</div></div></div></div></div>`;
}

function renderAssetMap() {
    const rooms = Array.from({ length: 40 }, (_, index) => {
        const n = index + 1;
        const status = n % 13 === 0 ? 'warn' : n % 9 === 0 ? 'repair' : n % 5 === 0 ? 'empty' : 'rented';
        return `<button class="room ${status}">A-${String(n).padStart(2, '0')}</button>`;
    }).join('');
    return `<div class="admin-card"><div class="card-head"><h2 class="card-title">科创大厦 A 座租控图</h2><div class="button-row"><span class="tag tag-blue">已出租</span><span class="tag tag-green">空置</span><span class="tag tag-orange">维修</span><span class="tag tag-red">预警</span></div></div><div class="card-body asset-map"><div class="floor-grid">${rooms}</div><ul class="info-list"><li class="info-item"><div><div class="info-title">楼宇概况</div><div class="info-desc">8 层办公载体，支持企业孵化、研发办公、展示洽谈。</div></div><span class="info-time">120 间</span></li><li class="info-item"><div><div class="info-title">招商建议</div><div class="info-desc">优先匹配智能制造、新材料研发型企业。</div></div><span class="info-time">18 间可租</span></li><li class="info-item"><div><div class="info-title">风险提醒</div><div class="info-desc">A-13 合同即将到期，A-39 存在欠费预警。</div></div><span class="info-time">2 条</span></li></ul></div></div>`;
}

function renderCharts(charts) {
    if (!charts.length) return '';
    return `<div class="panel-grid">${charts.map(chart => `
        <div class="admin-card ${chart.span ? `span-${chart.span}` : ''}">
            <div class="card-head"><h2 class="card-title">${chart.title}</h2><button class="btn btn-default btn-sm" data-modal="${chart.title}明细">明细</button></div>
            <div class="card-body"><div class="chart-container ${chart.span === 3 ? 'chart-sm' : ''}" id="${chart.id}"></div></div>
        </div>
    `).join('')}</div>`;
}

function renderList(list) {
    return `<div class="admin-card"><div class="card-head"><h2 class="card-title">${list.title}</h2><button class="btn btn-default btn-sm" data-modal="${list.title}">更多</button></div><div class="card-body"><ul class="info-list">${list.items.map(item => `
        <li class="info-item"><div><div class="info-title">${item[0]}</div><div class="info-desc">系统自动生成演示记录，可替换为真实业务文案。</div></div><span class="info-time">${item[1]}</span></li>
    `).join('')}</ul></div></div>`;
}

function renderTable(table) {
    return `<div class="admin-card">
        <div class="filter-bar">
            <div class="filter-left">
                <select class="select">${(table.filters || ['全部']).map(v => `<option>${v}</option>`).join('')}</select>
                <input class="input" placeholder="输入关键字查询">
                <button class="btn btn-primary" data-filter>查询</button>
                <button class="btn btn-default" data-filter>重置</button>
            </div>
            <button class="btn btn-success" data-modal="${table.title}导出">导出台账</button>
        </div>
        <div class="card-head"><h2 class="card-title">${table.title}</h2><span class="card-sub">共 ${table.rows.length} 条演示数据</span></div>
        <div class="table-wrap"><table class="mock-table"><thead><tr>${table.columns.map(col => `<th>${col}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row => renderRow(row)).join('')}</tbody></table></div>
    </div>`;
}

function renderRow(row) {
    return `<tr>${row.map((cell, index) => {
        const isAction = index === row.length - 1;
        if (isAction) return `<td><button class="btn btn-primary btn-sm" data-row-action="${cell}" data-row-title="${row[1] || row[0]}">${cell}</button></td>`;
        if (index >= row.length - 3 && /高危|重大|较大|一般|待|已|中|正常|空置|维修|高新|专精|A|B|成长/.test(cell)) {
            return `<td><span class="tag ${tagClass(cell)}">${cell}</span></td>`;
        }
        return `<td>${cell}</td>`;
    }).join('')}</tr>`;
}

function renderPageCharts(charts) {
    if (typeof echarts === 'undefined') return;
    charts.forEach(config => {
        const el = document.getElementById(config.id);
        if (!el) return;
        const chart = echarts.init(el);
        chart.setOption(createOption(config));
        chartInstances.set(config.id, chart);
    });
}

function createOption(config) {
    const commonGrid = { left: 38, right: 24, top: 36, bottom: 36, containLabel: true };
    const axis = { axisLine: { lineStyle: { color: '#ccd6e0' } }, axisLabel: { color: '#52616f' }, splitLine: { lineStyle: { color: '#edf2f7' } } };
    if (config.type === 'pie' || config.type === 'rose') {
        return { color: colors, tooltip: { trigger: 'item' }, legend: { bottom: 0, textStyle: { color: '#52616f' } }, series: [{ type: 'pie', radius: config.type === 'rose' ? [18, 105] : ['42%', '68%'], roseType: config.type === 'rose' ? 'area' : false, center: ['50%', '45%'], data: config.data.map(i => ({ name: i[0], value: i[1] })) }] };
    }
    if (config.type === 'gauge') {
        return { series: [{ type: 'gauge', progress: { show: true, width: 14 }, axisLine: { lineStyle: { width: 14 } }, axisTick: { show: false }, splitLine: { length: 10 }, pointer: { width: 4 }, detail: { formatter: '{value}%', color: '#1677ff', fontSize: 28 }, data: [{ value: config.value, name: '完成率' }] }] };
    }
    if (config.type === 'radar') {
        return { color: [colors[4]], tooltip: {}, radar: { indicator: config.indicators.map(name => ({ name, max: 100 })), axisName: { color: '#52616f' } }, series: [{ type: 'radar', data: [{ value: config.data, name: '综合评分', areaStyle: { opacity: 0.25 } }] }] };
    }
    if (config.type === 'funnel') {
        return { color: colors, tooltip: { trigger: 'item' }, series: [{ type: 'funnel', left: '8%', top: 20, width: '84%', bottom: 8, label: { color: '#263b4f' }, data: config.data.map(i => ({ name: i[0], value: i[1] })) }] };
    }
    if (config.type === 'scatter') {
        return { color: [colors[0]], tooltip: { formatter: p => `${p.value[3]}<br>营收：${p.value[0]} 百万元<br>纳税：${p.value[1]} 百万元` }, grid: commonGrid, xAxis: { ...axis, name: '营收' }, yAxis: { ...axis, name: '纳税' }, series: [{ type: 'scatter', symbolSize: v => Math.max(12, v[2] / 4), data: config.data }] };
    }
    if (config.type === 'hbar') {
        return { color: [colors[0]], tooltip: { trigger: 'axis' }, grid: commonGrid, xAxis: { ...axis, type: 'value' }, yAxis: { ...axis, type: 'category', data: config.x }, series: [{ name: config.name, type: 'bar', data: config.data, barWidth: 16, label: { show: true, position: 'right' }, itemStyle: { borderRadius: [0, 4, 4, 0] } }] };
    }
    if (config.type === 'barLine') {
        return { color: [colors[0], colors[2]], tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { color: '#52616f' } }, grid: { ...commonGrid, bottom: 58 }, xAxis: { ...axis, type: 'category', data: config.x }, yAxis: [{ ...axis, type: 'value' }, { ...axis, type: 'value', splitLine: { show: false } }], series: [{ name: config.barName, type: 'bar', data: config.bar, barWidth: 20, itemStyle: { borderRadius: [4,4,0,0] } }, { name: config.lineName, type: 'line', yAxisIndex: 1, smooth: true, data: config.line, symbolSize: 7 }] };
    }
    const isLine = config.type === 'line';
    return { color: [isLine ? colors[1] : colors[0]], tooltip: { trigger: 'axis' }, grid: commonGrid, xAxis: { ...axis, type: 'category', data: config.x }, yAxis: { ...axis, type: 'value' }, series: [{ name: config.name, type: isLine ? 'line' : 'bar', smooth: isLine, data: config.data, barWidth: 22, areaStyle: isLine ? { opacity: 0.08 } : undefined, itemStyle: isLine ? undefined : { borderRadius: [4,4,0,0] } }] };
}

function openModal(action, context) {
    document.getElementById('modalTitle').textContent = action;
    document.getElementById('modalSubTitle').textContent = context ? `当前对象：${context}` : '当前操作仅用于演示交互流程';
    document.getElementById('modalBody').innerHTML = `
        <div class="modal-form">
            <div class="form-field"><label>办理事项</label><input value="${action}"></div>
            <div class="form-field"><label>责任部门</label><select><option>园区管委会</option><option>安全监管专班</option><option>招商服务专班</option><option>项目建设专班</option></select></div>
            <div class="form-field"><label>办理时限</label><input value="3 个工作日"></div>
            <div class="form-field"><label>当前状态</label><select><option>待提交</option><option>待审核</option><option>处理中</option><option>已办结</option></select></div>
            <div class="form-field full"><label>处理意见</label><textarea>这里是演示弹窗，可用于展示新增、查看、审核、派单、导出等按钮操作，不会提交到后台。</textarea></div>
        </div>`;
    document.getElementById('modalMask').classList.remove('hide');
}

function closeModal() {
    document.getElementById('modalMask').classList.add('hide');
}

function showToast(text) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
}

function fakeFilter(btn) {
    const card = btn.closest('.admin-card');
    if (card) card.querySelectorAll('tbody tr').forEach((row, index) => row.style.opacity = index % 2 === 0 ? '1' : '.72');
    showToast(btn.textContent.trim() === '重置' ? '筛选条件已重置' : '已按当前条件刷新列表');
}


function initAiAssistant() {
    const launcher = document.getElementById('aiAssistantLauncher');
    const panel = document.getElementById('aiAssistantPanel');
    const close = document.getElementById('aiAssistantClose');
    const quick = document.getElementById('aiQuickQuestions');
    const body = document.getElementById('aiAssistantBody');
    const form = document.getElementById('aiAssistantForm');
    const input = document.getElementById('aiAssistantInput');
    if (!launcher || !panel || !quick || !body || !form || !input) return;

    const answerMap = {
        '\u56ed\u533a\u6709\u54ea\u4e9b\u62db\u5546\u653f\u7b56\uff1f': '\u5f53\u524d\u6f14\u793a\u53e3\u5f84\uff1a\u53ef\u54a8\u8be2\u5382\u623f\u79df\u91d1\u51cf\u514d\u3001\u8bbe\u5907\u6295\u5165\u8865\u8d34\u3001\u4eba\u624d\u5f15\u8fdb\u5956\u52b1\u3001\u79d1\u6280\u521b\u65b0\u5956\u52b1\u7b49\u653f\u7b56\uff0c\u6b63\u5f0f\u5185\u5bb9\u4ee5\u5c5e\u5730\u6700\u65b0\u53d1\u5e03\u6587\u4ef6\u4e3a\u51c6\u3002',
        '\u667a\u80fd\u5236\u9020\u4ea7\u4e1a\u9002\u5408\u62db\u5f15\u54ea\u4e9b\u4f01\u4e1a\uff1f': '\u5efa\u8bae\u4f18\u5148\u62db\u5f15\u5de5\u4e1a\u8f6f\u4ef6\u3001\u9ad8\u7aef\u4f20\u611f\u5668\u3001\u7cbe\u5bc6\u96f6\u90e8\u4ef6\u3001\u7cfb\u7edf\u96c6\u6210\u670d\u52a1\u7b49\u4f01\u4e1a\uff0c\u91cd\u70b9\u8865\u9f50\u4e0a\u6e38\u6838\u5fc3\u914d\u5957\u77ed\u677f\u3002',
        '\u4f01\u4e1a\u5165\u9a7b\u540e\u53ef\u4ee5\u4eab\u53d7\u54ea\u4e9b\u670d\u52a1\uff1f': '\u53ef\u63d0\u4f9b\u4f01\u4e1a\u6863\u6848\u5efa\u6863\u3001\u653f\u7b56\u7533\u62a5\u8f85\u5bfc\u3001\u8bc9\u6c42\u5de5\u5355\u6d41\u8f6c\u3001\u9879\u76ee\u4ee3\u529e\u3001\u4eba\u624d\u5bf9\u63a5\u3001\u878d\u8d44\u670d\u52a1\u7b49\u4e00\u7ad9\u5f0f\u670d\u52a1\u3002',
        '\u5f53\u524d\u91cd\u70b9\u4e1a\u52a1\u573a\u666f\u6709\u54ea\u4e9b\uff1f': '\u5f53\u524d\u6f14\u793a\u573a\u666f\u5305\u542b\u56ed\u533a\u6001\u52bf\u3001\u9879\u76ee\u7ba1\u7406\u3001\u5b89\u5168\u76d1\u7ba1\u3001\u4f01\u4e1a\u670d\u52a1\u3001AI \u62db\u5546\u56fe\u8c31\u4e0e\u5206\u6790\u62a5\u544a\u7b49\u4e1a\u52a1\u6a21\u5757\u3002'
    };

    const appendMessage = (role, text) => {
        const item = document.createElement('div');
        item.className = 'ai-msg ' + role;
        item.innerHTML = '<div class="ai-msg-bubble">' + text + '</div>';
        body.appendChild(item);
        body.scrollTop = body.scrollHeight;
    };

    const reply = (question) => {
        const answer = answerMap[question] || '\u8fd9\u662f\u4e00\u4e2a\u6f14\u793a\u578b AI \u95ee\u7b54\u667a\u80fd\u4f53\uff0c\u53ef\u56de\u7b54\u653f\u7b56\u54a8\u8be2\u3001\u62db\u5546\u65b9\u5411\u3001\u4f01\u4e1a\u670d\u52a1\u4e0e\u4e1a\u52a1\u573a\u666f\u7b49\u5e38\u89c1\u95ee\u9898\u3002';
        appendMessage('robot', answer);
    };

    launcher.addEventListener('click', () => panel.classList.toggle('show'));
    close.addEventListener('click', () => panel.classList.remove('show'));
    quick.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-question]');
        if (!btn) return;
        const question = btn.dataset.question;
        appendMessage('user', question);
        reply(question);
    });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const question = input.value.trim();
        if (!question) return;
        appendMessage('user', question);
        input.value = '';
        reply(question);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initAiAssistant();
    initClock();
    renderNav();
    setActivePage('p-sit-overview');

    document.querySelectorAll('[data-modal]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.modal, document.getElementById('pageTitle').textContent)));
    document.querySelectorAll('.tool-btn').forEach(btn => btn.addEventListener('click', () => openModal(btn.textContent.trim(), '顶部工具栏')));
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCancel').addEventListener('click', closeModal);
    document.getElementById('modalMask').addEventListener('click', event => { if (event.target.id === 'modalMask') closeModal(); });
    document.getElementById('modalConfirm').addEventListener('click', () => { closeModal(); showToast('操作已记录，当前为前端演示反馈'); });
    window.addEventListener('resize', () => chartInstances.forEach(chart => chart.resize()));
});
