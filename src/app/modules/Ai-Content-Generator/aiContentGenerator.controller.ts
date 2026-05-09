import { Request, Response } from 'express';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AIContentGeneratorService } from './aiContentGenerator.service';

const generateProductDescription = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AIContentGeneratorService.generateProductDescription(
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: 'Product description generated successfully',
      data: {
        description: result,
      },
    });
  },
);

export const AIContentGeneratorController = {
  generateProductDescription,
};
