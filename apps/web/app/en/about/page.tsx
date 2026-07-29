import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../../components/public-information-page";

export const metadata = publicInformationMetadata("about", "en");

export default function EnglishAboutPage() {
  return <PublicInformationPage locale="en" page="about" />;
}
