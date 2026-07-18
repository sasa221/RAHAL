import { notFound } from "next/navigation";
import { VehicleDetails } from "../../../components/vehicle-details";
import { publicVehicles } from "../../../lib/public-content";

export function generateStaticParams() {
  return publicVehicles.map((vehicle) => ({ slug: vehicle.id }));
}

export default async function VehicleDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const vehicle = publicVehicles.find((item) => item.id === slug);
  if (!vehicle) notFound();
  return (
    <VehicleDetails
      locale="ar"
      pickup={firstValue(query.pickup)}
      requestedDriver={firstValue(query.driver)}
      returnDate={firstValue(query.return)}
      vehicle={vehicle}
    />
  );
}
