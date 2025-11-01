/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { User } from '../User/user.model';
import { AuthUser } from '../../constant/user.const';
import { EmailHelper } from '../../utils/emailSender';
import { TAgent, TAgentImageDocuments } from './agent.interface';
import { Agent } from './agent.model';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { AgentSearchableFields } from './agent.constant';

// Agent Update Service
const agentUpdate = async (
  id: string,
  payload: Partial<TAgent>,
  user: AuthUser
) => {
  //   istAgentExistsById
  const existingAgent = await Agent.findOne({ agentId: id });
  if (!existingAgent) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  if (user?.id !== existingAgent?.agentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to update!'
    );
  }
  const updatedAgent = await Agent.findOneAndUpdate(
    { agentId: existingAgent.agentId },
    payload,
    { new: true }
  );
  return updatedAgent;
};

// agent doc image upload service
const agentDocImageUpload = async (
  file: string | undefined,
  data: TAgentImageDocuments,
  user: AuthUser,
  id: string
) => {
  const existingAgent = await Agent.findOne({ agentId: id });
  if (!existingAgent) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  if (user?.id !== existingAgent?.agentId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'You are not authorize to upload document image!'
    );
  }

  if (data.docImageTitle && file) {
    existingAgent.documents = {
      ...existingAgent.documents,
      [data.docImageTitle]: file,
    };
    await existingAgent.save();
  }

  return {
    message: 'Image upload successfully',
    existingAgent,
  };
};

// submit agent for approval service
const submitAgentForApproval = async (id: string, user: AuthUser) => {
  //   istAgentExistsById
  const existingAgent = await Agent.findOne({ agentId: id });
  if (!existingAgent) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agent not found');
  }

  existingAgent.status = 'PENDING';
  await existingAgent.save();

  // Prepare & send email to admin for agent approval
  const emailHtml = await EmailHelper.createEmailContent(
    {
      vendorName: existingAgent.companyDetails?.companyName,
      vendorId: existingAgent.agentId,
      currentYear: new Date().getFullYear(),
    },
    'agent-submission-notification'
  );

  await EmailHelper.sendEmail(
    user?.email,
    emailHtml,
    'New Vendor Submission for Approval'
  );

  return {
    message: 'Agent submitted for approval',
    existingAgent,
  };
};

// agent delete service
const agentDelete = async (id: string) => {
  //   isUserExistsById
  const isUserExistsById = await User.findOne({ id, role: 'AGENT' });
  if (!isUserExistsById) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }
  //   istAgentExistsById
  const isAgentExistsById = await Agent.findOne({ agentId: id });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    // delete user
    await User.deleteOne(
      { id: isUserExistsById?.id, role: 'VENDOR' },
      { session }
    );
    // delete agent
    if (isAgentExistsById) {
      await Agent.deleteOne(
        { agentId: isAgentExistsById?.agentId },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }

  return {
    message: 'Vendor deleted successfully',
  };
};

// get all agents
const getAllAgentsFromDb = async (query: Record<string, unknown>) => {
  const agents = new QueryBuilder(Agent.find(), query)
    .fields()
    .paginate()
    .sort()
    .filter()
    .search(AgentSearchableFields);

  const result = await agents.modelQuery;
  return result;
};

// get single agent
const getSingleAgentFromDB = async (id: string) => {
  const existingAgent = await Agent.findOne({ agentId: id });
  if (!existingAgent) {
    throw new AppError(httpStatus.NOT_FOUND, 'Agent not found!');
  }

  return existingAgent;
};

export const AgentServices = {
  agentUpdate,
  agentDocImageUpload,
  submitAgentForApproval,
  agentDelete,
  getAllAgentsFromDb,
  getSingleAgentFromDB,
};
