// Email sending utilities using Resend.
import { Resend } from "resend";

const RECIPIENT = "kpallin90@gmail.com";
const SENDER = "AutoGuessr <noreply@autoguessr.com>";

type SendImageReportParams = {
  imageId: string;
  imageUrl: string;
  currentVehicle: {
    make: string;
    model: string;
    year: number;
    trim: string | null;
    countryOfOrigin: string;
    bodyStyle: string;
    era: string;
    rarity: string;
  };
  certainty: number;
  comment: string | null;
  suggestedMake: string | null;
  suggestedModel: string | null;
  suggestedYear: number | null;
  suggestedTrim: string | null;
  suggestedCountryOfOrigin: string | null;
  suggestedBodyStyle: string | null;
  suggestedEra: string | null;
  suggestedRarity: string | null;
  deactivated: boolean;
};

function dl(label: string, value: string | number | null | undefined): string {
  if (value == null) return "";
  return `<dt style="font-weight:bold;margin-top:8px">${label}</dt><dd style="margin:0 0 4px 16px">${value}</dd>`;
}

export async function sendImageReport(report: SendImageReportParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set — skipping email report");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { currentVehicle: cv, certainty, deactivated } = report;

  const subject = `Image Report: ${cv.make} ${cv.model} ${cv.year} — ${certainty}% certain`;

  const suggestions: [string, string | number | null, string | number | null][] = [
    ["Make", report.suggestedMake, cv.make],
    ["Model", report.suggestedModel, cv.model],
    ["Year", report.suggestedYear, cv.year],
    ["Trim", report.suggestedTrim, cv.trim],
    ["Country of Origin", report.suggestedCountryOfOrigin, cv.countryOfOrigin],
    ["Body Style", report.suggestedBodyStyle, cv.bodyStyle],
    ["Era", report.suggestedEra, cv.era],
    ["Rarity", report.suggestedRarity, cv.rarity],
  ];

  const changedSuggestions = suggestions.filter(
    ([, suggested, current]) => suggested != null && suggested !== current
  );

  const suggestionsHtml = changedSuggestions.length
    ? `<h3>Suggested Changes</h3><dl>${changedSuggestions.map(([label, suggested]) => dl(label, suggested as string)).join("")}</dl>`
    : "";

  const commentHtml =
    report.comment
      ? `<h3>Comment</h3><p>${report.comment}</p>`
      : "";

  const html = `
    <h2>Image Report</h2>
    <h3>Image</h3>
    <dl>
      ${dl("ID", report.imageId)}
      ${dl("URL", `<a href="${report.imageUrl}">${report.imageUrl}</a>`)}
    </dl>
    <h3>Certainty</h3>
    <p>${certainty}%${deactivated ? " — <strong>image has been deactivated</strong>" : " — image remains active"}</p>
    <h3>Current Vehicle</h3>
    <dl>
      ${dl("Make", cv.make)}
      ${dl("Model", cv.model)}
      ${dl("Year", cv.year)}
      ${dl("Trim", cv.trim)}
      ${dl("Country of Origin", cv.countryOfOrigin)}
      ${dl("Body Style", cv.bodyStyle)}
      ${dl("Era", cv.era)}
      ${dl("Rarity", cv.rarity)}
    </dl>
    ${suggestionsHtml}
    ${commentHtml}
  `;

  await resend.emails.send({
    from: SENDER,
    to: RECIPIENT,
    subject,
    html,
  });
}
