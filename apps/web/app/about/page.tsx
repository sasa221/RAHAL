import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../components/public-information-page";

export const metadata = publicInformationMetadata("about", "ar");

export default function AboutPage() {
  return <PublicInformationPage locale="ar" page="about" />;
}
