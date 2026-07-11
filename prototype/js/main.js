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

document.addEventListener('DOMContentLoaded', () => {
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
