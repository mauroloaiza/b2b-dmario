import { IsEnum, IsArray, ArrayMinSize, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentTerm } from '../../common/enums';

export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @IsEnum(PaymentTerm)
  paymentTerm: PaymentTerm;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
