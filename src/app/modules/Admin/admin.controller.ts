import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.const';
import { AdminServices } from './admin.service';

//  Admin update  Controller
const updateAdmin = catchAsync(async (req, res) => {
  const currentUser = req.user as AuthUser;
  const file = req?.file;
  const result = await AdminServices.updateAdmin(
    req.body,
    req.params.userId,
    currentUser,
    file?.path
  );
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Admin update successfully',
    data: result,
  });
});

export const AdminControllers = {
  updateAdmin,
};
