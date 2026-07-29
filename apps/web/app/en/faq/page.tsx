import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../../components/public-information-page";

export const metadata = publicInformationMetadata("faq", "en");

export default function EnglishFaqPage() {
  return <PublicInformationPage locale="en" page="faq" />;
}
