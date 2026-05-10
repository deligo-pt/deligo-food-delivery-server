import fs from 'fs-extra';
import path from 'path';

export const saveSignatureImage = async (
  signatureImage: string,
  agreementId: string,
): Promise<string> => {
  // Expected format:
  // data:image/png;base64,iVBORw0KGgoAAAANS...

  const matches = signatureImage.match(
    /^data:image\/(png|jpg|jpeg);base64,(.+)$/,
  );

  if (!matches) {
    throw new Error('Invalid signature image format');
  }

  const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];

  const base64Data = matches[2];

  const uploadDir = path.join(process.cwd(), 'uploads/signatures');

  await fs.ensureDir(uploadDir);

  const fileName = `signature-${agreementId}.${extension}`;

  const filePath = path.join(uploadDir, fileName);

  await fs.writeFile(filePath, Buffer.from(base64Data, 'base64'));

  return filePath;
};
