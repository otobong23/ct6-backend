import { IsString, MaxLength } from 'class-validator';

export class SubmitPaymentProofDto {
  /** JSON string containing the proof image/document. */
  @IsString()
  @MaxLength(9_000_000)
  proofPaymentDocument!: string;
}
