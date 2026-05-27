function initChatWidget() {
  if (document.getElementById('ai-chat-widget')) return;

  const btn = document.createElement('div');
  btn.id = 'ai-chat-widget';
  btn.innerHTML = '💬';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:56px;height:56px;background:#2563eb;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);';

  const panel = document.createElement('div');
  panel.id = 'ai-chat-panel';
  panel.style.cssText = 'position:fixed;bottom:90px;right:20px;width:360px;height:480px;background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.15);display:none;flex-direction:column;z-index:9999;overflow:hidden;';

  panel.innerHTML = `
    <div style="background:#1a2332;color:white;padding:12px 16px;font-weight:600;display:flex;justify-content:space-between;align-items:center;">
      <span>🤖 Assistente CyberPDV</span>
      <span id="ai-chat-close" style="cursor:pointer;font-size:20px;">×</span>
    </div>
    <div id="ai-chat-messages" style="flex:1;overflow-y:auto;padding:12px;font-size:14px;">
      <div style="background:#f1f5f9;padding:8px 12px;border-radius:8px;margin-bottom:8px;">
        Olá! Sou o assistente do CyberPDV. Pergunte sobre estoque, vendas, produtos ou peça sugestões!
      </div>
    </div>
    <div style="padding:8px;border-top:1px solid #e2e8f0;display:flex;">
      <input id="ai-chat-input" type="text" placeholder="Digite sua pergunta..." style="flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:6px;outline:none;font-size:14px;">
      <button id="ai-chat-send" style="margin-left:8px;padding:8px 16px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;">Enviar</button>
    </div>
    <div style="display:flex;gap:4px;padding:4px 8px 8px;flex-wrap:wrap;">
      <button class="ai-suggestion" style="font-size:11px;padding:4px 8px;background:#f1f5f9;border:1px solid #ddd;border-radius:12px;cursor:pointer;">📦 Estoque</button>
      <button class="ai-suggestion" style="font-size:11px;padding:4px 8px;background:#f1f5f9;border:1px solid #ddd;border-radius:12px;cursor:pointer;">💰 Vendas</button>
      <button class="ai-suggestion" style="font-size:11px;padding:4px 8px;background:#f1f5f9;border:1px solid #ddd;border-radius:12px;cursor:pointer;">💡 Sugestões</button>
      <button class="ai-suggestion" style="font-size:11px;padding:4px 8px;background:#f1f5f9;border:1px solid #ddd;border-radius:12px;cursor:pointer;">❓ Ajuda</button>
    </div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  btn.onclick = () => { panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; };
  document.getElementById('ai-chat-close').onclick = () => { panel.style.display = 'none'; };

  const input = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('ai-chat-send');

  function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;
    addMessage(msg, 'user');
    input.value = '';
    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    })
    .then(r => r.json())
    .then(data => {
      addMessage(data.message, 'bot');
    })
    .catch(() => {
      addMessage('Desculpe, ocorreu um erro ao processar sua pergunta.', 'bot');
    });
  }

  sendBtn.onclick = sendMessage;
  input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

  document.querySelectorAll('.ai-suggestion').forEach(btn => {
    btn.onclick = () => { input.value = btn.textContent.replace(/[^\w\sáéíóúãõçàê]/g,'').trim(); sendMessage(); };
  });

  function addMessage(text, type) {
    const container = document.getElementById('ai-chat-messages');
    const div = document.createElement('div');
    div.style.cssText = type === 'user'
      ? 'background:#2563eb;color:white;padding:8px 12px;border-radius:8px;margin-bottom:8px;margin-left:20%;text-align:right;'
      : 'background:#f1f5f9;padding:8px 12px;border-radius:8px;margin-bottom:8px;margin-right:20%;';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
}

document.addEventListener('DOMContentLoaded', initChatWidget);
