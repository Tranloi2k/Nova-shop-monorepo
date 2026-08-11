import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReviewService } from './reviews.service';
import { Review } from './entities/review.entity';
import { CreateReviewInput, UpdateReviewInput } from './dto/review.input';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Review)
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  @Query(() => [Review], { name: 'reviews' })
  findAll() {
    return this.reviewService.findAll();
  }

  @Query(() => Review, { name: 'findOneReview' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.reviewService.findOne(id);
  }

  @Mutation(() => Review, { name: 'createReview' })
  @UseGuards(JwtAuthGuard)
  create(
    @Args('createReviewInput') createReviewInput: CreateReviewInput,
    @CurrentUser() user: any,
  ) {
    return this.reviewService.create(createReviewInput, user);
  }

  @Mutation(() => Review, { name: 'updateReview' })
  @UseGuards(JwtAuthGuard)
  update(
    @Args('updateReviewInput') updateReviewInput: UpdateReviewInput,
    @CurrentUser() user: any,
  ) {
    return this.reviewService.update(updateReviewInput.id, updateReviewInput, user);
  }

  @Mutation(() => Boolean, { name: 'deleteReview' })
  @UseGuards(JwtAuthGuard)
  delete(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: any,
  ) {
    return this.reviewService.remove(id, user);
  }
}
