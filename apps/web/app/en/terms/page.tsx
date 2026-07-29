import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../../components/public-information-page";

export const metadata = publicInformationMetadata("terms", "en");

export default function EnglishTermsPage() {
  return <PublicInformationPage locale="en" page="terms" />;
}
