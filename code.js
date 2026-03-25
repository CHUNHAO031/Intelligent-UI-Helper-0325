// 修改 UI 文件后：插件 → 开发 → 重新加载（manifest 的 ui 指向 ui-v3.html）
figma.showUI(__html__, { width: 360, height: 720, themeColors: true });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  } else if (msg.type === 'notify') {
    const text = String(msg.message || '').slice(0, 200);
    if (text) figma.notify(text, { error: !!msg.error, timeout: msg.timeoutMs || 4000 });
  } else if (msg.type === 'networkRequest') {
    try {
      const response = await fetch(msg.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': msg.apiKey.startsWith('Bearer ') ? msg.apiKey : `Bearer ${msg.apiKey}`
        },
        body: JSON.stringify(msg.body)
      });
      if (!response.ok) {
        const errorMsg = await response.text();
        figma.ui.postMessage({ type: 'networkResponse', error: `HTTP ${response.status} - ${errorMsg}` });
        return;
      }
      const data = await response.json();
      figma.ui.postMessage({ type: 'networkResponse', data: data });
    } catch (err) {
      figma.ui.postMessage({ type: 'networkResponse', error: err.message });
    }
  }
};
