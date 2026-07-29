import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../components/public-information-page";

export const metadata = publicInformationMetadata("contact", "ar");

export default function ContactPage() {
  return <PublicInformationPage locale="ar" page="contact" />;
}
