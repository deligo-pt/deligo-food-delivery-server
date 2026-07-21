import httpStatus from 'http-status';
import { ContactService } from './contact.service';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { createActivityLog } from '../ActivityLog/activityLog.utils';

const createContact = catchAsync(async (req, res) => {
  const result = await ContactService.createContact(req.body);

  createActivityLog({
    email: req.body?.sender,
    action: 'Submitted Contact Form',
    target: req.body?.name || req.body?.sender,
    type: 'INFO',
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    messageKey: result?.messageKey,
    data: result?.data,
  });
});
export const ContactController = {
  createContact,
};
