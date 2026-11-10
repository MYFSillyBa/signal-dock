const translations = {
  '连接设置': 'Connection settings', '连接': 'Connect', '连接中': 'Connecting', '断开': 'Disconnect', '离线': 'Offline',
  '在线': 'Online', '记录': 'Record', '停止记录': 'Stop recording', '文件': 'File', '视图': 'View',
  '载入采样 CSV': 'Load sample CSV', '导出采样 CSV': 'Export samples', '导出 CSV（含名义时间）': 'Export timed CSV',
  '载入配置 / VOFA+ 1.3': 'Load configuration / VOFA+ 1.3', '导出命令树': 'Export commands', '导出当前标签': 'Export tab',
  '导出窗口布局': 'Export window layout', '导出全部配置': 'Export all settings', '保存画布截图': 'Save dashboard screenshot',
  '工具侧栏': 'Tools', '通道检查器': 'Channel inspector', '串口终端': 'Serial terminal',
  '在侧边打开此标签': 'Open tab to the side', '外观与性能': 'Appearance and performance',
  '协议和控件扩展': 'Protocol and widget extensions', 'VOFA+ 协议文档': 'VOFA+ protocol documentation', '可视点': 'Points',
  '检查器': 'Inspector', '实时通道': 'Live channels', '数据终端': 'Data terminal', '清屏': 'Clear', '发送': 'Send',
  '全选': 'Select all', '全不选': 'Clear all', '在控件设置中编辑 XY 配对': 'Edit XY pairs in widget settings',
  '控件库': 'Instruments', '命令树': 'Commands', '连接与设备': 'Connections', '添加命令': 'Add command',
  '添加组': 'Add group', '串口': 'Serial', '本地端口': 'Local port', '远端端口': 'Remote port', '服务器地址': 'Host',
  '串口号': 'Serial port', '波特率': 'Baud rate', '数据位': 'Data bits', '校验': 'Parity', '停止位': 'Stop bits',
  '流控': 'Flow control', '无': 'None', '硬件': 'Hardware', '软件': 'Software', '刷新': 'Refresh', '文件夹': 'Folder',
  '期望通道数（0 自动）': 'Expected channels (0 auto)', '采样周期（ms）': 'Sample period (ms)', '通道数': 'Channels',
  '保存': 'Save', '取消': 'Cancel', '关闭': 'Close', '名称': 'Name', '注释': 'Comment', '模式': 'Mode',
  '新建标签': 'New tab', '重命名': 'Rename', '复制标签': 'Duplicate tab', '关闭标签': 'Close tab',
  '全屏控件': 'Maximize widget', '设置控件': 'Configure widget', '移除控件': 'Remove widget', '清空采样': 'Clear samples',
  '采样与时间轴': 'Samples and timebase', '缓冲容量 /ch': 'Buffer capacity /ch', '名义 Δt（ms）': 'Nominal Δt (ms)',
  '可视点对齐': 'Window point increment', '显示值': 'Display value', '通道名': 'Channel name', '颜色': 'Color',
  '显示增益': 'Display scale', 'Y 偏置': 'Y offset', 'X 偏置': 'X offset', '小数位': 'Decimals', '可见': 'Visible',
  '文本': 'Text', '换行': 'Line ending', '发送次数': 'Repetitions', '发送间隔（ms）': 'Send interval (ms)',
  '显示 RX': 'Show RX', '显示 TX': 'Show TX', '显示数据帧': 'Show numeric frames', '显示图片帧': 'Show image frames',
  '接收合并（ms）': 'Receive grouping (ms)', '时间戳': 'Timestamps', '编码': 'Encoding', '每页行数': 'Rows per page',
  '保留页数': 'Page history', '文本字号': 'Text size', 'ANSI 颜色': 'ANSI colors', 'Enter 发送': 'Enter to send',
  '主题': 'Theme', '跟随系统': 'Follow VS Code light/dark', '深色': 'Dark', '浅色': 'Light', '界面缩放': 'UI scale',
  '界面字体': 'UI font', '刷新上限（0 随屏幕）': 'FPS limit (0 = display)', '语言': 'Language', '背景图': 'Background image',
  '选择文件': 'Choose file', '清除': 'Clear', '复位外观': 'Restore appearance', '克隆当前主题': 'Clone current theme',
  '编辑颜色': 'Edit colors', '导出主题': 'Export theme', '发送历史': 'Send history', '终端设置': 'Terminal settings',
  '波形图': 'Waveform', '波形': 'Waveform', '按钮': 'Button', '延时按钮': 'Delay button', '切换按钮': 'Toggle button',
  '滑条': 'Slider', '旋钮': 'Dial', '材质旋钮': 'Material dial', '摇杆': 'Joystick', '指示灯': 'LED', '线性仪表': 'Linear gauge',
  '圆形仪表': 'Circular gauge', '三维姿态': '3D attitude', '图片': 'Image', '标题': 'Title'
};

let language = 'zh';
export const $ = selector => document.querySelector(selector);
export const $$ = selector => [...document.querySelectorAll(selector)];
export const t = text => language === 'en' ? translations[text] ?? text : text;

export function setLanguage(value) {
  language = value;
  document.documentElement.lang = value === 'en' ? 'en' : 'zh-CN';
  for (const el of $$('[data-t]')) el.textContent = t(el.dataset.t);
  for (const el of $$('[data-placeholder]')) el.placeholder = t(el.dataset.placeholder);
}

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(text, action, className, title) {
  const node = el('button', className, t(text));
  node.type = 'button';
  if (title) node.title = t(title);
  node.addEventListener('click', action);
  return node;
}

export function options(node, entries, current) {
  node.replaceChildren(...entries.map(([value, label]) => new Option(t(label), String(value))));
  node.value = String(current ?? '');
  return node;
}

export function field(spec, value, change, choose) {
  const wrapper = el('label', 'field' + (spec.type === 'textarea' || spec.type === 'channels' ? ' wide' : ''));
  wrapper.append(el('span', '', t(spec.label)));
  let input;
  if (spec.type === 'file') {
    const row = el('div', 'field-actions');
    row.append(button(value?.name || '选择文件', async () => {
      const selected = await choose(spec);
      if (selected) change(selected);
    }), button('×', () => change(null), '', '清除'));
    wrapper.append(row);
    return wrapper;
  }
  if (spec.options || ['select', 'channels'].includes(spec.type)) {
    input = el('select');
    const entries = spec.options ?? [];
    options(input, entries, value);
    if (spec.type === 'channels') {
      input.multiple = true;
      for (const option of input.options) option.selected = Array.isArray(value) && value.some(item => String(item) === option.value);
    }
    input.addEventListener('change', () => {
      const findValue = option => entries.find(([key]) => String(key) === option.value)?.[0];
      change(input.multiple ? [...input.selectedOptions].map(findValue) : findValue(input));
    });
  } else {
    input = el(spec.type === 'textarea' ? 'textarea' : 'input');
    if (spec.type !== 'textarea') input.type = spec.type || 'text';
    if (spec.type === 'number') input.step = spec.step ?? 'any';
    for (const key of ['min', 'max', 'step', 'placeholder']) if (spec[key] !== undefined) input[key] = spec[key];
    if (spec.type === 'checkbox') input.checked = !!value;
    else input.value = value ?? '';
    input.addEventListener('change', () => {
      if (!input.checkValidity()) { input.reportValidity(); return; }
      change(input.type === 'checkbox' ? input.checked : input.type === 'number'
        ? (input.value === '' ? undefined : input.valueAsNumber) : input.value);
    });
  }
  input.setAttribute('aria-label', t(spec.label));
  wrapper.append(input);
  return wrapper;
}

export function form(specs, values, onChange, choose = async () => undefined) {
  const node = el('div', 'form-grid');
  for (const spec of specs) node.append(field(spec, values[spec.key], value => onChange(spec.key, value), choose));
  return node;
}

export function modal(title, body, buttons = []) {
  const dialog = $('#dialog');
  $('#dialogTitle').textContent = t(title);
  $('#dialogBody').replaceChildren(body);
  $('#dialogFoot').replaceChildren(...buttons, button('关闭', () => dialog.close()));
  if (!dialog.open) dialog.showModal();
  return dialog;
}

export function contextMenu(event, items) {
  event.preventDefault();
  const menu = $('#contextMenu');
  menu.replaceChildren(...items.map(([text, fn]) => button(text, () => {
    menu.hidden = true;
    fn();
  })));
  menu.hidden = false;
  const { clientX, clientY } = event;
  menu.style.left = Math.max(3, Math.min(clientX, innerWidth - menu.offsetWidth - 3)) + 'px';
  menu.style.top = Math.max(3, Math.min(clientY, innerHeight - menu.offsetHeight - 3)) + 'px';
}

const ansi = ['#777', '#ff867f', '#77e3a2', '#f1cb73', '#87aaff', '#dfa8ff', '#7ae7e2', '#ededed'];

export function logContent(text, styled) {
  const content = document.createDocumentFragment();
  const pattern = /\x1b\[([\d;]*)([A-Za-z])/g;
  let offset = 0;
  let color = '';
  let bold = false;
  const append = raw => {
    if (!raw) return;
    const span = el('span', '', raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, c => '␛' + c.charCodeAt(0).toString(16).padStart(2, '0')));
    if (styled && color) span.style.color = color;
    if (styled && bold) span.style.fontWeight = '700';
    content.append(span);
  };
  for (const match of text.matchAll(pattern)) {
    append(text.slice(offset, match.index));
    offset = match.index + match[0].length;
    if (match[2] !== 'm') continue;
    for (const part of match[1].split(';').map(Number)) {
      if (part === 0) { color = ''; bold = false; }
      else if (part === 1) bold = true;
      else if (part === 22) bold = false;
      else if (part === 39) color = '';
      else if (part >= 30 && part <= 37) color = ansi[part - 30];
      else if (part >= 90 && part <= 97) color = ansi[part - 90];
    }
  }
  append(text.slice(offset));
  return content;
}
