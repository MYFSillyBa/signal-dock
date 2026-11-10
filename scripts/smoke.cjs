const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, mkdir, writeFile } = require('node:fs/promises');
const { createServer } = require('node:net');
const { once } = require('node:events');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { encodeSample } = require('../src/protocol.cjs');
const { listPorts } = require('../src/transport.cjs');

async function freePort() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function connect(port) {
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/version');
      if (response.ok) return chromium.connectOverCDP((await response.json()).webSocketDebuggerUrl);
    } catch {}
    await wait(250);
  }
  throw new Error('VS Code DevTools did not start');
}

async function main() {
  assert.ok(process.env.SIGNAL_DOCK_CODE_EXE, 'Set SIGNAL_DOCK_CODE_EXE to the VS Code executable');
  const profile = process.env.SIGNAL_DOCK_SMOKE_PROFILE || await mkdtemp(join(tmpdir(), 'vofa-vscode-smoke-'));
  const userData = join(profile, 'data');
  const extensions = join(profile, 'extensions');
  const folder = join(profile, 'workspace');
  await mkdir(join(userData, 'User'), { recursive: true });
  await mkdir(folder, { recursive: true });
  await writeFile(join(userData, 'User', 'settings.json'), JSON.stringify({
    'security.workspace.trust.enabled': false, 'workbench.startupEditor': 'none',
    'update.mode': 'none', 'telemetry.telemetryLevel': 'off',
    'window.restoreWindows': 'none', 'extensions.autoUpdate': false, 'workbench.colorTheme': 'Default Dark Modern',
    'workbench.secondarySideBar.defaultVisibility': 'hidden'
  }));
  const port = await freePort();
  const dev = process.env.SIGNAL_DOCK_SMOKE_PACKAGED ? [] : ['--extensionDevelopmentPath=' + resolve('.')];
  const vscode = spawn(process.env.SIGNAL_DOCK_CODE_EXE, [
    '--new-window', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust',
    '--remote-debugging-port=' + port, '--user-data-dir=' + userData, '--extensions-dir=' + extensions,
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...dev, folder
  ], { windowsHide: true, stdio: 'ignore' });

  let browser;
  let device;
  let peer;
  try {
    browser = await connect(port);
    const context = browser.contexts()[0];
    let page;
    for (let i = 0; i < 80 && !page; i++) {
      page = context.pages().find(candidate => candidate.url().includes('workbench'));
      if (!page) await wait(250);
    }
    assert.ok(page, 'Workbench target exists');
    await page.locator('.monaco-workbench').waitFor({ state: 'visible' });
    await page.bringToFront();
    await page.setViewportSize({ width: 1320, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('requestfailed', request => {
      if (/webview|vscode-resource/.test(request.url())) errors.push(request.url().split('?')[0] + ' ' + request.failure()?.errorText);
    });
    const execute = async title => {
      await page.keyboard.press('F1');
      const input = page.locator('.quick-input-widget input:visible').first();
      await input.waitFor({ state: 'visible' });
      await input.fill('>' + title);
      await page.getByText(title, { exact: true }).last().waitFor({ state: 'visible' });
      await input.press('Enter');
    };
    await execute('Signal Dock: 运行示例 / Start Demo');
    const dashboard = page.frameLocator('iframe.webview').last().frameLocator('#active-frame');
    try {
      await dashboard.locator('#status[data-state=connected]').waitFor({ timeout: 15000 });
    } catch (error) {
      console.error('Frames:', page.frames().map(frame => [frame.name(), frame.url().split('?')[0]]));
      for (const frame of page.frames().slice(1)) {
        console.error('Frame state:', await frame.evaluate(() => ({
          ready: document.readyState, title: document.title, app: !!document.querySelector('#app'),
          nested: [...document.querySelectorAll('iframe')].map(node => [node.id, node.style.visibility]),
          script: [...document.scripts].map(node => node.src).filter(Boolean),
          stats: document.querySelector('#status')?.textContent
        })).catch(() => null));
      }
      console.error('Iframes:', await page.locator('iframe').evaluateAll(nodes => nodes.map(node => [node.id, node.className, node.title])));
      console.error('Webview errors:', errors.slice(-12));
      console.error('Notifications:', await page.locator('.notifications-toasts').innerText({ timeout: 2000 }).catch(() => ''));
      throw error;
    }
    await dashboard.getByText('4 CH', { exact: true }).waitFor();
    assert.match(await dashboard.locator('#frameStat').innerText(), /\d+ F/);
    assert.equal(await dashboard.locator('.palette button').count(), 13);
    const wave = dashboard.locator('.instrument[data-kind=wave] canvas');
    await wave.waitFor();
    assert.ok(await wave.evaluate(canvas => canvas.width > 100 && canvas.height > 100));
    await dashboard.locator('#frameStat').filter({ hasText: /\b[2-9]\d{2} F/ }).waitFor();
    const spanInput = dashboard.locator('#span');
    await spanInput.fill('100');
    await spanInput.press('Tab');
    const point = await wave.boundingBox();
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
    const hover = dashboard.locator('.telemetry-plot-hover:visible');
    await hover.waitFor();
    const readings = hover.locator('.telemetry-hover-values > div');
    assert.equal(await readings.count(), 4);
    assert.match(await readings.first().innerText(), /I0\s+[-.\d]+/);
    const i1 = dashboard.getByRole('checkbox', { name: '显示 I1 波形', exact: true });
    await i1.uncheck({ timeout: 5000 });
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
    await readings.filter({ hasText: 'I1' }).waitFor({ state: 'detached' });
    assert.equal(await readings.count(), 3);
    await dashboard.getByRole('button', { name: '全不选', exact: true }).click();
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
    await hover.waitFor({ state: 'hidden' });
    await dashboard.getByRole('button', { name: '全选', exact: true }).click();
    await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
    await readings.filter({ hasText: 'I1' }).waitFor();
    assert.equal(await readings.count(), 4);
    await page.mouse.move(point.x + 25, point.y + point.height / 2);
    await page.mouse.wheel(0, -120);
    assert.equal(await spanInput.inputValue(), '100');
    await page.mouse.move(point.x + point.width / 2, point.y + point.height - 44);
    await page.mouse.wheel(0, 120);
    await dashboard.locator('#span').evaluate(input => new Promise((resolve, reject) => {
      const started = performance.now();
      const poll = () => {
        if (Number(input.value) > 100) resolve();
        else if (performance.now() - started > 3000) reject(new Error('X-axis zoom did not expand the sample window'));
        else requestAnimationFrame(poll);
      };
      poll();
    }));
    await dashboard.getByRole('button', { name: 'Auto', exact: true }).click();
    assert.equal(await spanInput.inputValue(), '100');
    const handle = dashboard.locator('.instrument[data-kind=wave] .sizer[data-edge=w]');
    const edge = await handle.boundingBox();
    const oldWidth = (await wave.boundingBox()).width;
    await page.mouse.move(edge.x + 2, edge.y + edge.height / 2);
    await page.mouse.down();
    await page.mouse.move(edge.x + 38, edge.y + edge.height / 2, { steps: 4 });
    await page.mouse.up();
    assert.ok((await wave.boundingBox()).width < oldWidth - 20);
    await dashboard.locator('#freeze').click();
    await dashboard.locator('#freeze.is-active').waitFor();
    await dashboard.locator('#freeze').click();
    await dashboard.locator('.instrument-head span').first().click();
    await dashboard.getByLabel('同步显示分析', { exact: true }).selectOption('spectrum');
    await dashboard.locator('.telemetry-plot-secondary canvas').waitFor();
    await dashboard.getByLabel('同步显示分析', { exact: true }).selectOption('none');
    await dashboard.locator('.telemetry-plot-secondary canvas').waitFor({ state: 'detached' });
    await dashboard.locator('#connectionSettings').click();
    await dashboard.locator('#dialog[open]').waitFor();
    await dashboard.locator('#closeDialog').click();
    if (process.env.SIGNAL_DOCK_SMOKE_PNG) {
      await dashboard.locator('#board').dispatchEvent('click');
      await spanInput.fill('500');
      await spanInput.press('Tab');
      const box = await wave.boundingBox();
      await page.mouse.move(box.x + box.width * .55, box.y + box.height * .32);
      await hover.waitFor();
      await dashboard.locator('#app').screenshot({ path: process.env.SIGNAL_DOCK_SMOKE_PNG });
    }

    await dashboard.locator('.palette button[title="3D 姿态"]').click();
    const cube = dashboard.locator('.instrument[data-kind=cube]');
    await cube.locator('[data-axis="X"][data-space="world"]').waitFor({ timeout: 5000 });
    const worldAxes = cube.locator('[data-space="world"]');
    assert.deepEqual(await worldAxes.allTextContents(), ['X', 'Y', 'Z']);
    const [x, y, z] = await worldAxes.evaluateAll(labels => labels.map(label => {
      const box = label.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    }));
    assert.ok(x.x < z.x && z.x < y.x && z.y < x.y && z.y < y.y && Math.abs(x.y - y.y) <= 2,
      'Default perspective projects X lower-left, Y lower-right and Z straight up');
    await dashboard.getByRole('checkbox', { name: '显示模型坐标轴' }).check();
    const modelAxes = cube.locator('[data-space="model"]');
    await modelAxes.first().waitFor();
    assert.deepEqual(await modelAxes.allTextContents(), ['Xₘ', 'Yₘ', 'Zₘ']);
    const xLabel = worldAxes.first();
    const previousX = await xLabel.evaluate(node => node.style.transform);
    await dashboard.getByLabel('预设视角', { exact: true }).selectOption('front');
    await xLabel.evaluate((node, previous) => new Promise((resolve, reject) => {
      const started = performance.now();
      function poll() {
        if (node.style.transform !== previous) resolve();
        else if (performance.now() - started > 3000) reject(new Error('Axis label did not move with the camera'));
        else requestAnimationFrame(poll);
      }
      poll();
    }), previousX);
    await dashboard.getByRole('checkbox', { name: '显示世界坐标轴' }).uncheck();
    await xLabel.waitFor({ state: 'hidden' });
    assert.deepEqual(await modelAxes.allTextContents(), ['X', 'Y', 'Z']);
    await dashboard.getByRole('checkbox', { name: '显示世界坐标轴' }).check();
    await dashboard.getByLabel('预设视角', { exact: true }).selectOption('perspective');
    if (process.env.SIGNAL_DOCK_SMOKE_CUBE_PNG) {
      await dashboard.getByRole('checkbox', { name: '显示模型坐标轴' }).uncheck();
    }
    await cube.getByTitle('全屏控件').click();
    await dashboard.locator('.instrument[data-kind=cube].is-full').waitFor();
    if (process.env.SIGNAL_DOCK_SMOKE_CUBE_PNG) await cube.screenshot({ path: process.env.SIGNAL_DOCK_SMOKE_CUBE_PNG });

    await dashboard.locator('.palette button[title="波形图"]').click();
    const newWave = dashboard.locator('.instrument[data-kind=wave].selected');
    assert.ok(await newWave.locator('.instrument-head').evaluate(head => {
      const box = head.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit && head.contains(hit);
    }), 'New widget header is in front of the previous full-screen widget');
    assert.equal(await dashboard.locator('.instrument.is-full').count(), 0);
    const wavePicker = dashboard.getByRole('combobox', { name: '选择波形图' });
    assert.equal(await wavePicker.locator('option').count(), 2);
    assert.equal(await i1.isChecked(), false);
    await wavePicker.selectOption({ index: 0 });
    assert.equal(await i1.isChecked(), true);
    await wavePicker.selectOption({ index: 1 });
    assert.equal(await i1.isChecked(), false);

    await execute('Signal Dock: 断开连接 / Disconnect');
    await dashboard.locator('#status[data-state=idle]').waitFor();
    device = createServer(socket => {
      peer = socket;
      const frame = encodeSample('justfloat', [12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
      socket.write(frame.subarray(0, 6));
      socket.write(frame.subarray(6));
    });
    await new Promise(resolve => device.listen(0, '127.0.0.1', resolve));
    await dashboard.locator('#transport').selectOption('tcpClient');
    await dashboard.locator('#connectionSettings').click();
    await dashboard.getByRole('spinbutton', { name: '端口', exact: true }).fill(String(device.address().port));
    await dashboard.locator('#closeDialog').click();
    await dashboard.locator('#connect').click();
    await dashboard.locator('#status[data-state=connected]').waitFor();
    await dashboard.getByText('10 CH', { exact: true }).waitFor();
    assert.match(await dashboard.locator('.channel').first().innerText(), /12\.000/);
    const received = once(peer, 'data');
    await dashboard.locator('#sendText').fill('PING %d');
    await dashboard.locator('#send').click();
    const [command] = await Promise.race([received, wait(3000).then(() => { throw new Error('No TCP command received'); })]);
    assert.equal(command.toString(), 'PING %d\n');
    await dashboard.locator('#connect').click();
    await dashboard.locator('#status[data-state=idle]').waitFor();
    await dashboard.locator('#transport').selectOption('serial');
    assert.equal(await dashboard.locator('#transport').inputValue(), 'serial');
    assert.equal(await dashboard.locator('#engine').inputValue(), 'justfloat');
    await dashboard.locator('#serialPort').waitFor();
    const nativePorts = await listPorts();
    for (const port of nativePorts) await dashboard.locator('#serialPort option').filter({ hasText: port.path }).first().waitFor({ state: 'attached' });
    await dashboard.locator('#serialBaud').fill('100000');
    await dashboard.locator('#serialBaud').press('Tab');
    await dashboard.locator('#connectionSettings').click();
    const settings = dashboard.locator('#dialog');
    assert.equal(await settings.getByRole('spinbutton', { name: '波特率' }).inputValue(), '100000');
    assert.equal(await settings.locator('input[aria-label="串口号"]').count(), 0);
    await dashboard.locator('#closeDialog').click();
    assert.deepEqual(errors.filter(error => /Uncaught|Content Security Policy|signal-dock/i.test(error)), []);
    console.log('VS Code smoke passed: Demo, waveform hover and channel selection, axis zoom, 3D labels, FFT overlay, TCP RX/TX and serial options');
  } finally {
    peer?.destroy();
    device?.close();
    await browser?.close();
    vscode.kill();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
