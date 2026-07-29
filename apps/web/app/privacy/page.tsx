import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../components/public-information-page";

export const metadata = publicInformationMetadata("privacy", "ar");

export default function PrivacyPage() {
  return <PublicInformationPage locale="ar" page="privacy" />;
}
