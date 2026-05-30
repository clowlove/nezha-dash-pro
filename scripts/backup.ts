/**
 * Database backup script for NezhaDash Pro
 * Run: npx tsx scripts/backup.ts
 *
 * Features:
 * - SQLite database backup
 * - gzip compression
 * - Rotation (keeps last N backups)
 * - S3 upload interface
 */

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';

interface BackupConfig {
  dbPath: string;
  backupDir: string;
  maxBackups: number;
  compress: boolean;
  s3?: {
    bucket: string;
    region: string;
    prefix: string;
  };
}

const config: BackupConfig = {
  dbPath: process.env.DB_PATH || './data/nezha.db',
  backupDir: process.env.BACKUP_DIR || './backups',
  maxBackups: parseInt(process.env.MAX_BACKUPS || '7', 10),
  compress: true,
  s3: process.env.S3_BUCKET
    ? {
        bucket: process.env.S3_BUCKET,
        region: process.env.S3_REGION || 'us-east-1',
        prefix: process.env.S3_PREFIX || 'nezha-backups/',
      }
    : undefined,
};

async function createBackup(cfg: BackupConfig): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const ext = cfg.compress ? '.db.gz' : '.db';
  const filename = `nezha-backup-${timestamp}${ext}`;
  const backupPath = path.join(cfg.backupDir, filename);

  // Ensure backup directory exists
  if (!fs.existsSync(cfg.backupDir)) {
    fs.mkdirSync(cfg.backupDir, { recursive: true });
  }

  console.log(`📦 Creating backup: ${filename}`);

  if (!fs.existsSync(cfg.dbPath)) {
    throw new Error(`Database file not found: ${cfg.dbPath}`);
  }

  const source = fs.createReadStream(cfg.dbPath);

  if (cfg.compress) {
    const gzip = zlib.createGzip({ level: 9 });
    const dest = fs.createWriteStream(backupPath);
    await pipeline(source, gzip, dest);
  } else {
    const dest = fs.createWriteStream(backupPath);
    await pipeline(source, dest);
  }

  const stats = fs.statSync(backupPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Backup created: ${backupPath} (${sizeMB} MB)`);

  return backupPath;
}

async function rotateBackups(cfg: BackupConfig): Promise<void> {
  console.log(`🔄 Rotating backups (keeping last ${cfg.maxBackups})...`);

  const files = fs.readdirSync(cfg.backupDir)
    .filter(f => f.startsWith('nezha-backup-'))
    .sort()
    .reverse();

  if (files.length <= cfg.maxBackups) {
    console.log(`   No rotation needed (${files.length} backups)`);
    return;
  }

  const toDelete = files.slice(cfg.maxBackups);
  for (const file of toDelete) {
    const filePath = path.join(cfg.backupDir, file);
    fs.unlinkSync(filePath);
    console.log(`   🗑 Deleted: ${file}`);
  }

  console.log(`   Removed ${toDelete.length} old backup(s)`);
}

interface S3Client {
  upload(filePath: string, key: string): Promise<void>;
}

function createS3Uploader(bucket: string, region: string, prefix: string): S3Client {
  return {
    async upload(filePath: string, key: string): Promise<void> {
      // S3 upload interface — implement with AWS SDK
      // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      // const client = new S3Client({ region });
      // const body = fs.createReadStream(filePath);
      // await client.send(new PutObjectCommand({ Bucket: bucket, Key: prefix + key, Body: body }));
      console.log(`☁️  S3 upload interface: s3://${bucket}/${prefix}${key}`);
      console.log(`   (Implement with @aws-sdk/client-s3)`);
    },
  };
}

async function main() {
  console.log('🚀 NezhaDash Pro Backup Script\n');

  try {
    // 1. Create backup
    const backupPath = await createBackup(config);

    // 2. Rotate old backups
    await rotateBackups(config);

    // 3. Upload to S3 if configured
    if (config.s3) {
      const uploader = createS3Uploader(config.s3.bucket, config.s3.region, config.s3.prefix);
      const filename = path.basename(backupPath);
      await uploader.upload(backupPath, filename);
    }

    console.log('\n✨ Backup complete!');
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    process.exit(1);
  }
}

main();
