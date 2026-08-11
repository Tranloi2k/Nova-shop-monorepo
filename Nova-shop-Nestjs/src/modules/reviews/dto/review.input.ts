import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateReviewInput {
  @Field()
  comment: string;

  @Field(() => Int)
  rating: number;

  @Field(() => Int)
  productId: number; // ID của sản phẩm liên quan
}

@InputType()
export class UpdateReviewInput {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  comment?: string;

  @Field(() => Int, { nullable: true })
  rating?: number;
}
