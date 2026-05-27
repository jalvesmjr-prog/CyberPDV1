var AIAssistant = AIAssistant || {};

AIAssistant.model = null;
AIAssistant.pipeline = null;
AIAssistant.ready = false;

AIAssistant.init = function() {
  setTimeout(function() {
    AIAssistant._loadModel();
  }, 3000);
};

AIAssistant._loadModel = async function() {
  try {
    if (typeof transformers === 'undefined') {
      await AIAssistant._loadScript('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0');
    }
    await new Promise(r => setTimeout(r, 500));
    if (typeof pipeline !== 'undefined') {
      AIAssistant.pipeline = pipeline;
      AIAssistant.model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      AIAssistant.ready = true;
      console.log('AI Assistant ready');
    }
  } catch(e) {
    console.warn('AI Assistant model load failed:', e.message);
  }
};

AIAssistant._loadScript = function(url) {
  return new Promise((resolve, reject) => {
    var s = document.createElement('script');
    s.src = url;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
};

AIAssistant.getEmbedding = async function(text) {
  if (!AIAssistant.ready) return null;
  try {
    var result = await AIAssistant.model(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  } catch(e) { return null; }
};

AIAssistant.similarity = function(a, b) {
  var dot = 0, na = 0, nb = 0;
  for (var i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
};

AIAssistant.searchProducts = async function(query, products) {
  if (!AIAssistant.ready || !products || products.length === 0) return [];
  var qEmb = await AIAssistant.getEmbedding(query);
  if (!qEmb) return [];
  var results = [];
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var text = (p.nome_completo || '') + ' ' + (p.marca || '') + ' ' + (p.modelo || '') + ' ' + (p.categoria || '');
    var pEmb = await AIAssistant.getEmbedding(text);
    if (pEmb) {
      results.push({ product: p, score: AIAssistant.similarity(qEmb, pEmb) });
    }
  }
  results.sort(function(a,b) { return b.score - a.score; });
  return results.slice(0, 10);
};

AIAssistant.suggestCategory = async function(productName) {
  if (!AIAssistant.ready) return null;
  var categories = ['Eletrônicos', 'Acessórios', 'Games', 'Armazenamento', 'Redes', 'Móveis', 'Eletrodomésticos', 'Serviços', 'Administrativo'];
  var qEmb = await AIAssistant.getEmbedding(productName);
  if (!qEmb) return null;
  var best = { name: 'Outros', score: 0 };
  for (var i = 0; i < categories.length; i++) {
    var cEmb = await AIAssistant.getEmbedding(categories[i]);
    if (cEmb) {
      var s = AIAssistant.similarity(qEmb, cEmb);
      if (s > best.score) { best = { name: categories[i], score: s }; }
    }
  }
  return best.score > 0.3 ? best.name : 'Outros';
};

document.addEventListener('DOMContentLoaded', AIAssistant.init);
