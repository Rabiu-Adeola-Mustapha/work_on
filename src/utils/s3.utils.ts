import fs from "fs";

import {
  CompleteMultipartUploadCommandOutput,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { addDays, isBefore } from "date-fns";
import Debug from "debug";
import sharp from "sharp";

import MediaModel from "../models/media.model";
import config from "../utils/config";

// eslint-disable-next-line
const debug = Debug("project:s3.utils");

function createS3Client() {
  return new S3Client({
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.accessKeySecret,
    },
    // https://github.com/aws/aws-sdk-js-v3/issues/4109
    // Need this or the Location url will be wrong
    forcePathStyle: true,
  });
}

async function uploadToS3(
  filePath: string,
  uploadKey: string,
  filename: string
): Promise<CompleteMultipartUploadCommandOutput> {
  const s3Client = createS3Client();

  const fileStream = fs.createReadStream(filePath);

  const parallelUploads3 = new Upload({
    client: s3Client,
    params: {
      Bucket: config.s3.bucket,
      Key: uploadKey,
      Body: fileStream,
      ContentDisposition: `attachment; filename=${filename}`,
    },
  });

  return (await parallelUploads3.done()) as CompleteMultipartUploadCommandOutput;
}

async function uploadToS3Stream(fileStream: fs.ReadStream, uploadKey: string, filename: string) {
  const s3Client = createS3Client();

  const parallelUploads3 = new Upload({
    client: s3Client,
    params: {
      Bucket: config.s3.bucket,
      Key: uploadKey,
      Body: fileStream,
      ContentDisposition: `attachment; filename=${filename}`,
    },
  });

  return (await parallelUploads3.done()) as CompleteMultipartUploadCommandOutput;
}

async function listObjects() {
  const s3Client = createS3Client();
  const data = await s3Client.send(new ListObjectsV2Command({ Bucket: config.s3.bucket }));

  return data.Contents;
}

async function deleteExpiredObjects() {
  if (process.env.NODE_ENV !== "test") {
    throw Error("deleteAllObjects is only permitted to run in test environment.");
  }

  const s3Client = createS3Client();

  while (true) {
    // can only get 1000 max
    // that's why we need the loop

    const objects = await listObjects();

    if (objects === undefined) return;

    const expiredDay = addDays(new Date(), -5);
    const expiredObjects = objects.filter((o) => isBefore(o.LastModified, expiredDay));

    if (expiredObjects.length === 0) {
      return;
    }

    const promises = [];
    for (const object of expiredObjects) {
      promises.push(s3Client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: object.Key })));
    }

    await Promise.all(promises);
  }
}

// This to check and optimize "ALL" already uploaded objects with size above 500kb in a store on every new upload.
// It should be used when multiple objects above a certain size exist in s3 that needs to be reduced to save users' bandwidth
// @params: shopname:string e.g. "attilio", "officeman"

async function optimizeUploadedObjects(shop: string) {
  const s3Client = createS3Client();
  const objects = await listObjects();

  if (objects === undefined) return;

  const requiredObjects = objects.filter((obj) => {
    const [shopName, image] = obj.Key.split("/");
    const [fileName] = image.split(".");

    return obj.Size > 500000 && shopName === shop && !fileName.includes("_thumb");
  });

  const promises = [];
  for (const object of requiredObjects) {
    const quality = 75;
    const [, image] = object.Key.split("/");
    const [fileName, extension] = image.split(".");
    const splitArr = fileName.split("_");
    //  remove uuid
    splitArr.pop();
    const originalFilename = `${splitArr.join("_")}.${extension}`;

    const getObjectCommand = new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: object.Key,
    });
    const getObjectResponse = await s3Client.send(getObjectCommand);
    const bodyStream = getObjectResponse.Body;
    const buffer = await getBuffer(bodyStream);
    const optimizedBuffer = await sharp(buffer)
      .png({ quality, force: false })
      .webp({ quality, force: false })
      .jpeg({ quality, mozjpeg: true, force: false })
      .toBuffer();

    const outputSize = Math.round(optimizedBuffer.byteLength);

    // setting output key equals to the original object key is what does the replacement in s3
    promises.push(
      s3Client.send(
        new PutObjectCommand({
          Bucket: config.s3.bucket,
          Key: object.Key,
          Body: optimizedBuffer,
          ContentType: getObjectResponse.ContentType,
        })
      )
    );
    promises.push(MediaModel.findOneAndUpdate({ originalFilename }, { $set: { size: outputSize } }));
  }

  await Promise.all(promises);
}

async function getBuffer(s3ResponseStream: any): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of s3ResponseStream) {
    chunks.push(chunk);
  }

  const responseBuffer = Buffer.concat(chunks);
  return responseBuffer;
}

async function deleteFromS3(keys: string[]) {
  const s3Client = createS3Client();
  const promises = [];
  for (const key of keys) {
    promises.push(s3Client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key })));
  }

  await Promise.all(promises);
}

export default {
  uploadToS3,
  deleteFromS3,
  listObjects,
  deleteExpiredObjects,
  optimizeUploadedObjects,
  uploadToS3Stream,
};
