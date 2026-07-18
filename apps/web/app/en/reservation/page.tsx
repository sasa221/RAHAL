import { notFound } from "next/navigation";
import { ReservationStart } from "../../../components/reservation-start";
import { publicVehicles } from "../../../lib/public-content";

export default async function EnglishReservationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const vehicleId = Array.isArray(query.vehicle) ? query.vehicle[0] : query.vehicle;
  const vehicle = publicVehicles.find((item) => item.id === vehicleId);
  if (!vehicle) notFound();
  return <ReservationStart locale="en" vehicle={vehicle} />;
}
