import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID as uuidv4 } from 'crypto';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.configService.get('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.get('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('R2_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.configService.get('R2_BUCKET_NAME');
    this.publicUrl = this.configService.get('R2_PUBLIC_URL');
  }

  async uploadFile(
    buffer: Buffer,
    mimetype: string,
    folder = 'uploads',
    originalName = 'file',
  ): Promise<{ key: string; url: string }> {
    const ext = originalName.split('.').pop();
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    this.logger.log(`Uploaded file: ${key}`);
    return { key, url: `${this.publicUrl}/${key}` };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted file: ${key}`);
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    // Return public URL directly — configure R2 bucket as public for reads
    return `${this.publicUrl}/${key}`;
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
