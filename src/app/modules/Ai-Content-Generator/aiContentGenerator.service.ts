import { openai } from '../../config/openai';
import { TMessageKey } from '../../errors/messages';
import { TGenerateProductDescriptionPayload } from './ai-content-generator.interface';

const generateProductDescription = async (
  payload: TGenerateProductDescriptionPayload,
): Promise<{ messageKey: TMessageKey; result: string }> => {
  const { productName, productCategory, language = 'English' } = payload;

  const response = await openai.responses.create({
    model: 'gpt-5',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `
Generate an attractive and professional food description.

Product Name: ${productName}
Category: ${productCategory}

Requirements:
- Maximum 40 words
- Appetizing tone
- No false claims
- Return only the description text.
- Language: ${language}
            `,
          },
        ],
      },
    ],
  });

  const responseText = response.output_text?.trim() || '';

  return {
    messageKey: 'GENERATE_PRODUCT_DESCRIPTION_SUCCESS',
    result: responseText,
  };
};

export const AIContentGeneratorService = {
  generateProductDescription,
};
