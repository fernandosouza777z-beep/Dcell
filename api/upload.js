// Vercel Serverless Function: a chave da API fica no servidor, nunca no JavaScript público.
export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_SIZE = 4 * 1024 * 1024;

async function readRequest(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

function parseMultipart(raw, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  if (!boundaryMatch) {
    throw new Error('Formato do envio inválido.');
  }

  const boundary = boundaryMatch[1] || boundaryMatch[2];
  const parts = raw.toString('latin1').split(`--${boundary}`);

  for (const part of parts) {
    const separator = part.indexOf('\r\n\r\n');

    if (separator === -1) continue;

    const headers = part.slice(0, separator);
    const disposition = headers.match(
      /content-disposition:\s*form-data;[^\r\n]*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i
    );

    if (!disposition || disposition[1] !== 'image' || !disposition[2]) {
      continue;
    }

    const typeMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
    const type = typeMatch ? typeMatch[1].trim().toLowerCase() : '';
    let body = part.slice(separator + 4);

    if (body.endsWith('\r\n')) {
      body = body.slice(0, -2);
    }

    return {
      type,
      filename: disposition[2] || 'imagem',
      body: Buffer.from(body, 'latin1'),
    };
  }

  throw new Error('Nenhuma imagem foi encontrada no envio.');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Use POST para enviar uma imagem.',
    });
  }

  const key = process.env.FREEIMAGE_API_KEY;

  if (!key) {
    return res.status(500).json({
      error: 'Falta configurar FREEIMAGE_API_KEY nas variáveis de ambiente da Vercel.',
    });
  }

  try {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
      return res.status(400).json({
        error: 'O envio precisa ser multipart/form-data.',
      });
    }

    const raw = await readRequest(req);

    if (raw.length > MAX_SIZE + 64 * 1024) {
      return res.status(413).json({
        error: 'A imagem ultrapassa o limite de 4 MB deste projeto.',
      });
    }

    const file = parseMultipart(raw, contentType);

    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
    ]);

    if (!allowed.has(file.type)) {
      return res.status(400).json({
        error: 'Formato não permitido. Use JPG, PNG, WEBP, GIF ou BMP.',
      });
    }

    if (!file.body.length || file.body.length > MAX_SIZE) {
      return res.status(400).json({
        error: 'A imagem está vazia ou ultrapassa 4 MB neste projeto.',
      });
    }

    const upload = new FormData();

    upload.append('key', key);
    upload.append('action', 'upload');
    upload.append('format', 'json');
    upload.append(
      'source',
      new Blob([file.body], { type: file.type }),
      file.filename
    );

    const upstream = await fetch(
      'https://freeimage.host/api/1/upload',
      {
        method: 'POST',
        body: upload,
      }
    );

    const data = await upstream.json().catch(() => null);

    if (
      !upstream.ok ||
      !data ||
      data.status_code !== 200 ||
      !data.image ||
      !data.image.url
    ) {
      return res.status(502).json({
        error:
          data?.error?.message ||
          data?.status_txt ||
          'O Freeimage.host recusou o envio. Confira a chave da API e tente novamente.',
      });
    }

    return res.status(200).json({
      url: data.image.url.replace(/^http:/, 'https:'),
      viewer: data.image.url_viewer
        ? data.image.url_viewer.replace(/^http:/, 'https:')
        : null,
      filename: data.image.filename || file.filename,
    });
  } catch (error) {
    return res.status(400).json({
      error: error.message || 'Erro ao processar o envio.',
    });
  }
}