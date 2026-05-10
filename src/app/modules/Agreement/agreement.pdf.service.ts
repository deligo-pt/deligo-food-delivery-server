import fs from 'fs-extra';
import path from 'path';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';

type TAgreementPdfData = {
  establishmentName: string;
  email: string;
  contactNumber: string;
  nif: string;
  signatureImage?: string | null;
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
        waitUntil: 'networkidle0',
      });

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
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
