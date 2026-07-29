import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../components/public-information-page";

export const metadata = publicInformationMetadata("how-it-works", "ar");

export default function HowItWorksPage() {
  return <PublicInformationPage locale="ar" page="how-it-works" />;
}
