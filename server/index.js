import express from "express";
import { join } from "node:path";
import cors from "cors";

import { router } from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', router);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(import.meta.dirname, '..', 'client', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(import.meta.dirname, '..', 'client', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
