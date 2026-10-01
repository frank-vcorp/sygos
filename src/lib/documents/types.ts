export type IssuerBrand = {
  displayName: string;
  legalName: string;
  rfc: string | null;
  companyCode: string;
  /** Data URL para correos y HTML imprimible (logo de la empresa). */
  logoDataUrl?: string | null;
};

export type QuoteRequestLine = {
  kind: string;
  description: string;
  quantity: number;
};

export type QuoteDocumentData = {
  folio: string;
  issuedAt: Date;
  status: string;
  originLabel: string;
  offerTypeLabel?: string | null;
  commercialReference: string | null;
  commercialNotes: string | null;
  equipmentSummary: string | null;
  requestLines: QuoteRequestLine[];
  clientName: string;
  clientTaxId: string | null;
  clientShippingAddress: string | null;
  subtotalMxn: number;
  discountPercent: number;
  discountMxn: number;
  totalMxn: number;
  concept: string;
  validityDays: number;
  issuer: IssuerBrand;
  documentUrl: string;
};

export type DocumentEmailPackage = {
  subject: string;
  plainText: string;
  html: string;
  /** Mensaje completo para WhatsApp (mismo formato que plainText cuando aplica). */
  whatsappBody?: string;
  attachments?: { filename: string; contentBase64: string; mimeType: string }[];
};
