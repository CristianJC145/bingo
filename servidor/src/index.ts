import express from 'express';
import cors from 'cors';
import bingoRoutes from './routes/bingoRoutes';
import bingoFigureRouter from './routes/bingoFigureRoutes';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use(bingoRoutes, bingoFigureRouter);

app.get('/', async (_req, res) => {
  res.json('bingo API');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
