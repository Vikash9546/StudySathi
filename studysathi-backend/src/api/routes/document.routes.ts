import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentService } from '../../services/document.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { createUploadMiddleware } from '../middlewares/upload.middleware';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('api/documents')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a study document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file', createUploadMiddleware(100)))
  async upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentService.uploadDocument(user.id, file, user.plan);
  }

  @Get()
  @ApiOperation({ summary: 'List user documents' })
  async list(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.documentService.getUserDocuments(user.id, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single document details' })
  async getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documentService.getDocument(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documentService.deleteDocument(user.id, id);
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'Get questions for a document' })
  async getQuestions(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('type') type?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.documentService.getDocumentQuestions(user.id, id, type, limit);
  }

  @Get(':id/flashcards')
  @ApiOperation({ summary: 'Get flashcards for a document' })
  async getFlashcards(@CurrentUser() user: any, @Param('id') id: string) {
    return this.documentService.getDocumentFlashcards(user.id, id);
  }
}
