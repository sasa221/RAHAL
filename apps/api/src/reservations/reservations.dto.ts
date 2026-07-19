import { IsBoolean, IsString, Matches, MaxLength } from "class-validator";

export class SaveReservationDraftDto {
  @IsString()
  @MaxLength(100)
  vehicleId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  pickupDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  returnDate!: string;

  @IsBoolean()
  driverRequested!: boolean;
}
