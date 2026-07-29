import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../components/public-information-page";

export const metadata = publicInformationMetadata("faq", "ar");

export default function FaqPage() {
  return <PublicInformationPage locale="ar" page="faq" />;
}
