import { notFound } from "next/navigation";
import { ReservationStart } from "../../../components/reservation-start";
import { publicVehicles } from "../../../lib/public-content";

export default async function EnglishReservationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const vehicleId = firstValue(query.vehicle);
  const vehicle = publicVehicles.find((item) => item.id === vehicleId);
  if (!vehicle) notFound();
  return (
    <ReservationStart
      locale="en"
      requestedDriver={firstValue(query.driver)}
      requestedPickup={firstValue(query.pickup)}
      requestedReturn={firstValue(query.return)}
      vehicle={vehicle}
    />
  );
}
