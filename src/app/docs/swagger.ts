import fs from 'fs';
import path from 'path';

export const getSwaggerDocument = () => {
  const filePath = path.join(process.cwd(), 'openapi.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};
