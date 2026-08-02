import type { AccountDeletionRequestInput } from "@creonome/contracts";
import { Equals, IsString } from "class-validator";

export class CreateAccountDeletionDto implements AccountDeletionRequestInput {
  @IsString()
  @Equals("DELETE MY ACCOUNT")
  confirmation!: "DELETE MY ACCOUNT";
}
