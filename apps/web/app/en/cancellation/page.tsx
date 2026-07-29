import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../../components/public-information-page";

export const metadata = publicInformationMetadata("cancellation", "en");

export default function EnglishCancellationPage() {
  return <PublicInformationPage locale="en" page="cancellation" />;
}
