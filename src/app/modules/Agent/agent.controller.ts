import httpStatus from 'http-status';
import { catchAsync } from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthUser } from '../../constant/user.const';
import { AgentServices } from './agent.service';

// Agent Update Controller
const agentUpdate = catchAsync(async (req, res) => {
  const user = req.user as AuthUser;
  const result = await AgentServices.agentUpdate(req.params.id, req.body, user);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Agent updated successfully',
    data: result,
  });
});
//  agent doc image upload controller
const agentDocImageUpload = catchAsync(async (req, res) => {
  const file = req.file;
  const data = JSON.parse(req.body.data);
  const result = await AgentServices.agentDocImageUpload(
    file?.path,
    data,
    req.user as AuthUser,
    req.params.id
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingAgent,
  });
});

// submit agent for approval controller
const submitAgentForApproval = catchAsync(async (req, res) => {
  const result = await AgentServices.submitAgentForApproval(
    req.params.id,
    req.user as AuthUser
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: result?.existingAgent,
  });
});

// agent delete controller
const agentDelete = catchAsync(async (req, res) => {
  const result = await AgentServices.agentDelete(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result?.message,
    data: null,
  });
});

// get all agents
const getAllAgents = catchAsync(async (req, res) => {
  const users = await AgentServices.getAllAgentsFromDb(req.query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Agents Retrieved Successfully',
    data: users,
  });
});

// get single agent
const getSingleAgent = catchAsync(async (req, res) => {
  const user = await AgentServices.getSingleAgentFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Agent Retrieved Successfully',
    data: user,
  });
});

export const AgentControllers = {
  agentUpdate,
  agentDocImageUpload,
  submitAgentForApproval,
  agentDelete,
  getAllAgents,
  getSingleAgent,
};
