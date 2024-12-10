import cors from 'cors';
import express from 'express';
import router from './routes/index.js';

const app = express();
const port = 3030;

app.use(cors({
  origin: 'http://localhost:*',
}));

app.use(express.json());

app.use(router);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
