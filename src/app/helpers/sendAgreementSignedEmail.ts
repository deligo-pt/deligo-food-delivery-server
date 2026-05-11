import { EmailHelper } from '../utils/emailSender';

type TSendAgreementSignedEmailPayload = {
  to: string;
  establishmentName: string;
  pdfUrl: string;
};

export const sendAgreementSignedEmail = async (
  payload: TSendAgreementSignedEmailPayload,
) => {
  const html = await EmailHelper.createEmailContent(
    {
      establishmentName: payload.establishmentName,
      pdfUrl: payload.pdfUrl,
    },
    'agreement-signed',
  );

  await EmailHelper.sendEmail(
    payload.to,
    html,
    'Your Signed Agreement is Ready',
  );
};
