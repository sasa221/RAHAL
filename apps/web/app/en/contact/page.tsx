import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../../components/public-information-page";

export const metadata = publicInformationMetadata("contact", "en");

export default function EnglishContactPage() {
  return <PublicInformationPage locale="en" page="contact" />;
}
