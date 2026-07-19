import { Equals, IsBoolean, IsIn, IsString, Length, Matches, MaxLength } from "class-validator";

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

const phonePattern = /^\+?[1-9]\d{7,14}$/;

export class SaveReservationCustomerDetailsDto {
  @IsIn(["EGYPTIAN", "FOREIGN"])
  customerCategory!: "EGYPTIAN" | "FOREIGN";

  @IsString()
  @Length(2, 80)
  nationality!: string;

  @IsString()
  @Length(5, 300)
  address!: string;

  @IsString()
  @Length(2, 100)
  emergencyContactName!: string;

  @Matches(phonePattern, {
    message: "emergencyContactPhone must use a valid international number format",
  })
  emergencyContactPhone!: string;
}

export class SaveReservationConsentsDto {
  @IsString()
  @MaxLength(50)
  policyVersion!: string;

  @Equals(true)
  termsAccepted!: true;

  @Equals(true)
  privacyAccepted!: true;

  @Equals(true)
  documentAccepted!: true;

  @Equals(true)
  operationalAccepted!: true;

  @IsBoolean()
  marketingAccepted!: boolean;
}
