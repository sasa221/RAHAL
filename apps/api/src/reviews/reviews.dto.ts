import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @Length(20, 800)
  comment!: string;
}

export class ModerateReviewDto {
  @IsIn(["APPROVE", "REJECT"])
  action!: "APPROVE" | "REJECT";

  @IsOptional()
  @IsString()
  @Length(10, 300)
  note?: string;
}
