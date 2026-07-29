import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../../components/public-information-page";

export const metadata = publicInformationMetadata("privacy", "en");

export default function EnglishPrivacyPage() {
  return <PublicInformationPage locale="en" page="privacy" />;
}
