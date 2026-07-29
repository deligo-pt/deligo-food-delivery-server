import { Request, Response } from 'express';
import sendResponse from '../../utils/sendResponse';
import { catchAsync } from '../../utils/catchAsync';
import { AIContentGeneratorService } from './aiContentGenerator.service';
import httpStatus from 'http-status';
import { TMessageKey } from '../../errors/messages';

const generateProductDescription = catchAsync(
  async (req: Request, res: Response) => {
    const result = await AIContentGeneratorService.generateProductDescription(
      req.body,
    );

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      messageKey: result?.messageKey as TMessageKey,
      data: {
        description: result?.result,
      },
    });
  },
);

export const AIContentGeneratorController = {
  generateProductDescription,
};
