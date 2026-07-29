import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../../components/public-information-page";

export const metadata = publicInformationMetadata("how-it-works", "en");

export default function EnglishHowItWorksPage() {
  return <PublicInformationPage locale="en" page="how-it-works" />;
}
