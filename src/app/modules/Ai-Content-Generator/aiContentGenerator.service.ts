import { genAi } from '../../config/genAi';
import { TGenerateProductDescriptionPayload } from './ai-content-generator.interface';

// const generateProductDescription = async (
//   payload: TGenerateProductDescriptionPayload,
// ): Promise<string> => {
//   const { productName, productCategory, productImageUrl } = payload;

//   const response = await openai.responses.create({
//     model: 'gpt-5',
//     input: [
//       {
//         role: 'user',
//         content: [
//           {
//             type: 'input_text',
//             text: `
// Generate an attractive and professional food description.

// Product Name: ${productName}
// Category: ${productCategory}

// Requirements:
// - Maximum 40 words
// - Appetizing tone
// - No false claims
// - Return only the description text.
//             `,
//           },
//           {
//             type: 'input_image',
//             image_url: productImageUrl,
//             detail: 'auto',
//           },
//         ],
//       },
//     ],
//   });

//   return response.output_text?.trim() || '';
// };

const generateProductDescription = async (
  payload: TGenerateProductDescriptionPayload,
): Promise<string> => {
  const {
    productName,
    productCategory,
    productImageUrl,
    language = 'English',
  } = payload;

  const prompt = `
Generate an attractive and professional food description.

Product Name: ${productName}
Category: ${productCategory}

Requirements:
- Maximum 40 words
- Appetizing tone
- No false claims
- Return only the description text.
- Language: ${language}
`;

  const response = await genAi.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        text: prompt,
      },
      {
        fileData: {
          fileUri: productImageUrl,
        },
      },
    ],
  });

  return response.text?.trim() || '';
};
export const AIContentGeneratorService = {
  generateProductDescription,
};
