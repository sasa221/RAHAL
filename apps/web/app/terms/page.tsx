import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../components/public-information-page";

export const metadata = publicInformationMetadata("terms", "ar");

export default function TermsPage() {
  return <PublicInformationPage locale="ar" page="terms" />;
}
