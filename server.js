import express from 'express';
import uploadHandler from './api/upload.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.post('/api/upload', async (req, res) => {
  await uploadHandler(req, res);
});

app.use(express.static('.'));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`DCELL rodando na porta ${PORT}`);
});
