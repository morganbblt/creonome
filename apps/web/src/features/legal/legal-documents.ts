export type LegalDocumentSlug = "privacy" | "terms" | "data-deletion";

type LegalDocument = {
  title: string;
  summary: string;
  sections: readonly string[];
};

export const legalDocuments: Record<LegalDocumentSlug, LegalDocument> = {
  privacy: {
    title: "Privacy policy",
    summary:
      "How Creonome handles account, creator and connected-platform data.",
    sections: [
      "Creonome processes account details, creator profile inputs, uploaded media, generated assets and product activity to provide the service.",
      "When you connect TikTok or Instagram, Creonome only requests the permissions shown during authorization. Connection tokens are stored encrypted and can be revoked by disconnecting the account.",
      "Product data may be processed by infrastructure and AI providers required to deliver analysis and generation. Creonome does not sell personal data.",
      "This hackathon policy is a pre-launch placeholder and must be reviewed before public production use. Questions can be sent to support@creonome.app.",
    ],
  },
  terms: {
    title: "Terms of service",
    summary: "The basic rules for using the Creonome preview.",
    sections: [
      "Creonome is currently a preview product. Features, availability and generated results may change without notice.",
      "You must have the rights needed for content you upload or connect. You remain responsible for reviewing generated content before publishing it.",
      "Platform names and trend signals do not guarantee that a sound, asset or publishing action is available on TikTok or Instagram.",
      "These terms are a hackathon placeholder and require legal review before commercial launch. Contact support@creonome.app for questions.",
    ],
  },
  "data-deletion": {
    title: "Data deletion",
    summary: "How to disconnect platforms or ask us to delete your data.",
    sections: [
      "Disconnect TikTok or Instagram from Creonome settings to revoke the active product connection. You can also revoke Creonome from the connected platform's own app settings.",
      "To request deletion of your Creonome account and associated creator data, email support@creonome.app from the address used for your account with the subject “Delete my Creonome data”.",
      "We will confirm the request and remove eligible account data and connected-platform tokens. Some minimal records may be retained where required for security or legal obligations.",
      "This workflow is a pre-launch placeholder; an in-product self-service deletion flow is planned before public production use.",
    ],
  },
};
