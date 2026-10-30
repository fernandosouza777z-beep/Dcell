const fileInput = document.querySelector('#fileInput');
const dropZone = document.querySelector('#dropZone');
const previewWrap = document.querySelector('#previewWrap');
const preview = document.querySelector('#preview');
const fileName = document.querySelector('#fileName');
const fileSize = document.querySelector('#fileSize');
const uploadBtn = document.querySelector('#uploadBtn');
const removeBtn = document.querySelector('#removeBtn');
const progressArea = document.querySelector('#progressArea');
const progressBar = document.querySelector('#progressBar');
const statusText = document.querySelector('#statusText');
const errorBox = document.querySelector('#errorBox');
const result = document.querySelector('#result');
const resultUrl = document.querySelector('#resultUrl');
const copyBtn = document.querySelector('#copyBtn');
const openLink = document.querySelector('#openLink');
const anotherBtn = document.querySelector('#anotherBtn');
let selectedFile = null;
let previewUrl = null;
document.querySelector('#year').textContent = new Date().getFullYear();

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
function showError(message) { errorBox.textContent = message; errorBox.hidden = false; }
function resetMessages() { errorBox.hidden = true; errorBox.textContent = ''; result.hidden = true; }
function chooseFile(file) {
  resetMessages();
  if (!file) return;
  const allowed = ['image/jpeg','image/png','image/webp','image/gif','image/bmp'];
  if (!allowed.includes(file.type)) { showError('Formato não aceito. Escolha JPG, PNG, WEBP, GIF ou BMP.'); return; }
  if (file.size > 4 * 1024 * 1024) { showError('A imagem ultrapassa 4 MB. Para este projeto na Vercel, escolha um arquivo menor.'); return; }
  selectedFile = file;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  preview.src = previewUrl;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  previewWrap.hidden = false;
  uploadBtn.disabled = false;
  uploadBtn.innerHTML = '<span>↑</span> Enviar imagem';
}
fileInput.addEventListener('change', () => chooseFile(fileInput.files[0]));
removeBtn.addEventListener('click', () => clearSelection());
function clearSelection() {
  selectedFile = null; fileInput.value = ''; previewWrap.hidden = true; uploadBtn.disabled = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null; preview.removeAttribute('src'); resetMessages(); progressArea.hidden = true; progressBar.style.width = '0%';
}
['dragenter','dragover'].forEach(eventName => dropZone.addEventListener(eventName, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
['dragleave','drop'].forEach(eventName => dropZone.addEventListener(eventName, e => { e.preventDefault(); dropZone.classList.remove('dragover'); }));
dropZone.addEventListener('drop', e => chooseFile(e.dataTransfer.files[0]));

uploadBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  resetMessages();
  uploadBtn.disabled = true; fileInput.disabled = true; removeBtn.disabled = true;
  progressArea.hidden = false; progressBar.style.width = '25%'; statusText.textContent = 'Enviando imagem com segurança…';
  uploadBtn.innerHTML = '<span>…</span> Enviando';
  try {
    const form = new FormData();
    form.append('image', selectedFile);
    const response = await fetch('/api/upload', { method: 'POST', body: form });
    progressBar.style.width = '85%';
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível enviar a imagem. Confira se a chave da API foi configurada na Vercel.');
    progressBar.style.width = '100%'; statusText.textContent = 'Envio concluído!';
    resultUrl.value = data.url; openLink.href = data.url; result.hidden = false;
    result.scrollIntoView({behavior:'smooth',block:'nearest'});
  } catch (err) {
    showError(err.message || 'Falha no envio. Tente novamente.');
    statusText.textContent = 'O envio não foi concluído.';
  } finally {
    uploadBtn.disabled = !selectedFile; fileInput.disabled = false; removeBtn.disabled = false;
    uploadBtn.innerHTML = '<span>↑</span> Enviar imagem';
  }
});
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultUrl.value);
    copyBtn.textContent = 'Copiado ✓';
  } catch {
    resultUrl.select(); resultUrl.setSelectionRange(0, resultUrl.value.length);
    const ok = document.execCommand('copy');
    copyBtn.textContent = ok ? 'Copiado ✓' : 'Selecione e copie';
  }
  setTimeout(() => copyBtn.textContent = 'Copiar link', 1800);
});
anotherBtn.addEventListener('click', () => { clearSelection(); fileInput.click(); });
