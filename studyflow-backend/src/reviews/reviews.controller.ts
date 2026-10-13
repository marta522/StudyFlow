import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

interface AuthenticatedRequest {
  user: AuthenticatedUser;
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('tutor/:tutorId')
  getTutorReviews(@Param('tutorId', ParseIntPipe) tutorId: number) {
    return this.reviewsService.getTutorReviews(tutorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('student')
  @Post()
  createReview(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(request.user.id, dto);
  }
}
