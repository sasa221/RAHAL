import { notFound } from "next/navigation";
import { VehicleDetails } from "../../../../components/vehicle-details";
import { publicVehicles } from "../../../../lib/public-content";

export function generateStaticParams() {
  return publicVehicles.map((vehicle) => ({ slug: vehicle.id }));
}

export default async function EnglishVehicleDetailsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vehicle = publicVehicles.find((item) => item.id === slug);
  if (!vehicle) notFound();
  return <VehicleDetails locale="en" vehicle={vehicle} />;
}
