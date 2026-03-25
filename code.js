// 修改 UI 文件后：插件 → 开发 → 重新加载（manifest 的 ui 指向 ui-v3.html）
figma.showUI(__html__, { width: 360, height: 720, themeColors: true });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'resize') {
    figma.ui.resize(msg.width, msg.height);
  } else if (msg.type === 'notify') {
    const text = String(msg.message || '').slice(0, 200);
    if (text) figma.notify(text, { error: !!msg.error, timeout: msg.timeoutMs || 4000 });
  } else if (msg.type === 'getSelectedImage') {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'selectedImage', error: '请先在 Figma 画布中选中一个图层' });
      return;
    }
    const node = selection[0];
    try {
      const bytes = await node.exportAsync({ format: 'PNG' });
      figma.ui.postMessage({ type: 'selectedImage', bytes: Array.from(bytes) });
    } catch (err) {
      figma.ui.postMessage({ type: 'selectedImage', error: '导出图层失败，请确保图层可以被导出' });
    }
  } else if (msg.type === 'networkRequestImageEdit') {
    try {
      // 硅基流动文档要求图生图使用 application/json 格式，image 传 base64
      const imgBytes = new Uint8Array(msg.imageBytes);
      const base64Image = figma.base64Encode(imgBytes);
      
      const requestBody = {
        model: msg.model,
        prompt: msg.prompt,
        image: `data:image/png;base64,${base64Image}`
      };

      const response = await fetch(msg.url, {
        method: 'POST',
        headers: {
          'Authorization': msg.apiKey.startsWith('Bearer ') ? msg.apiKey : `Bearer ${msg.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
