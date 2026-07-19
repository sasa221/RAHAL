import { notFound } from "next/navigation";
import { ReservationStart } from "../../components/reservation-start";
import { getPublicVehicle } from "../../lib/public-api";

export default async function ReservationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const firstValue = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const vehicleId = firstValue(query.vehicle);
  const vehicle = vehicleId ? await getPublicVehicle(vehicleId) : null;
  if (!vehicle) notFound();
  return (
    <ReservationStart
      locale="ar"
      requestedDriver={firstValue(query.driver)}
      requestedPickup={firstValue(query.pickup)}
      requestedReturn={firstValue(query.return)}
      vehicle={vehicle}
    />
  );
}
