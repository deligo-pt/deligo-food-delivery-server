import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import config from '../../config';

type TAgreementPdfData = {
  establishmentName: string;
  email: string;
  contactNumber: string;
  nif: string;
  signatureImage?: string | null;

  // Company signatures
  companySignature1?: string | null;
  companySignature2?: string | null;
};

class AgreementPdfService {
  private templatePath = path.join(
    process.cwd(),
    'views',
    'agreement.template.hbs',
  );

  private outputDir = path.join(process.cwd(), 'uploads/agreements');

  /**
   * Compile Handlebars template with dynamic data
   */
  private async compileTemplate(data: TAgreementPdfData): Promise<string> {
    const templateSource = await fs.readFile(this.templatePath, 'utf-8');

    const template = Handlebars.compile(templateSource);

    return template({
      ...data,
      currentDate: new Date().toLocaleDateString('pt-PT'),
      companySignature1:
        data.companySignature1 ||
        config.signature.company_signature_1_url ||
        '',
      companySignature2:
        data.companySignature2 ||
        config.signature.company_signature_2_url ||
        '',
    });
  }

  /**
   * Generate PDF from HTML
   */
  private async generatePdf(
    data: TAgreementPdfData,
    fileName: string,
  ): Promise<string> {
    await fs.ensureDir(this.outputDir);

    const html = await this.compileTemplate(data);

    const pdfPath = path.join(this.outputDir, fileName);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
      });

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: false,
      });

      return pdfPath;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate draft agreement (without signature)
   */
  async generateDraftPdf(
    data: Omit<TAgreementPdfData, 'signatureImage'>,
    agreementId: string,
  ): Promise<string> {
    return this.generatePdf(
      {
        ...data,
        signatureImage: null,
      },
      `draft-${agreementId}.pdf`,
    );
  }

  /**
   * Generate final signed agreement
   */
  async generateSignedPdf(
    data: TAgreementPdfData,
    agreementId: string,
  ): Promise<string> {
    return this.generatePdf(data, `signed-${agreementId}.pdf`);
  }
}

export const agreementPdfService = new AgreementPdfService();
