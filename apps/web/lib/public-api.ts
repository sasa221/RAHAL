import { publicVehicles, type PublicVehicle } from "./public-content";

type VehicleResponse = { data?: PublicVehicle };
type VehicleListResponse = { data?: PublicVehicle[] };

function apiBaseUrl() {
  return (
    process.env.API_INTERNAL_BASE_URL ??
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:4000"
  ).replace(/\/+$/, "");
}

export async function getPublicVehicles(): Promise<PublicVehicle[]> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/vehicles`, {
      cache: "no-store",
    });
    if (!response.ok) return publicVehicles;

    const payload = (await response.json()) as VehicleListResponse;
    return payload.data?.length ? payload.data : publicVehicles;
  } catch {
    return publicVehicles;
  }
}

export async function getPublicVehicle(slug: string): Promise<PublicVehicle | null> {
  const fallback = publicVehicles.find((vehicle) => vehicle.id === slug) ?? null;

  try {
    const response = await fetch(`${apiBaseUrl()}/api/vehicles/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!response.ok) return fallback;

    const payload = (await response.json()) as VehicleResponse;
    return payload.data ?? fallback;
  } catch {
    return fallback;
  }
}
