import {
  PublicInformationPage,
  publicInformationMetadata,
} from "../../components/public-information-page";

export const metadata = publicInformationMetadata("cancellation", "ar");

export default function CancellationPage() {
  return <PublicInformationPage locale="ar" page="cancellation" />;
}
