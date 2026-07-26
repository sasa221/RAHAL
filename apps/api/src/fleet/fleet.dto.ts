import { IsIn, IsString, Length, Matches, MaxLength } from "class-validator";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class FleetCalendarQueryDto {
  @Matches(datePattern)
  from!: string;

  @Matches(datePattern)
  to!: string;
}

export class CreateFleetBlockDto {
  @IsString()
  @MaxLength(100)
  vehicleId!: string;

  @IsIn(["MAINTENANCE", "MANUAL_BLOCK"])
  type!: "MAINTENANCE" | "MANUAL_BLOCK";

  @Matches(datePattern)
  startDate!: string;

  @Matches(datePattern)
  endDate!: string;

  @IsString()
  @Length(10, 300)
  reason!: string;
}
