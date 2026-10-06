import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { SearchTutorsDto } from './dto/search-tutors.dto';
import { TutorsService } from './tutors.service';

@Controller('tutors')
export class PublicTutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Get('search')
  search(@Query() query: SearchTutorsDto) {
    return this.tutorsService.searchTutors(query);
  }

  @Get(':tutorId/profile')
  getProfile(@Param('tutorId', ParseIntPipe) tutorId: number) {
    return this.tutorsService.getPublicProfile(tutorId);
  }

  @Get(':tutorId/availability')
  getAvailability(@Param('tutorId', ParseIntPipe) tutorId: number) {
    return this.tutorsService.getPublicAvailability(tutorId);
  }
}
