import express from 'express';
import router from './routes';

const app = express();
const port = 3030;

app.use(router);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
