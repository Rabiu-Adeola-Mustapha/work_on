import fsPromises from "fs/promises";
import path from "path";

import Debug from "debug";
import { UploadFile } from "media";
import sharp from "sharp";
import short from "short-uuid";

import { AdminUserRequestType } from "../models/adminUser.model";
import MediaModel, { MediaDocLean } from "../models/media.model";
import { ShopDocLean } from "../models/shop.model";
import { UserRequestType } from "../models/user.model";
import config from "../utils/config";
import s3Util from "../utils/s3.utils";

// eslint-disable-next-line
const debug = Debug("project:media.core");

async function uploadToS3AndSaveDb(file: UploadFile, shop: ShopDocLean, user: AdminUserRequestType | UserRequestType) {
  const { thumbFilePath, thumbFilename } = await createThumbnail(file, 200, 200);
  const { output, compressedFilePath } = await compressFile(file);

  const rstThumb = await s3Util.uploadToS3(
    thumbFilePath,
    `${shop.code}/${appendUuidToFilename(thumbFilename)}`,
    thumbFilename
  );

  const rst = await s3Util.uploadToS3(
    compressedFilePath,
    `${shop.code}/${appendUuidToFilename(file.originalname)}`,
    file.originalname
  );

  await fsPromises.unlink(thumbFilePath);
  await fsPromises.unlink(compressedFilePath);

  return await MediaModel.create({
    shopId: shop._id,
    width: output.width,
    height: output.height,
    url: rst.Location,
    filename: path.basename(rst.Location),
    originalFilename: file.originalname,
    size: output.size,
    thumbnailUrl: rstThumb.Location,
    thumbnailHeight: 200,
    thumbnailWidth: 200,
    createdBy: user._id,
  });
}

function appendUuidToFilename(filename: string) {
  const pathParse = path.parse(filename);
  return `${pathParse.name}_${short.generate()}${pathParse.ext}`;
}

async function createThumbnail(file: UploadFile, width: number, height: number) {
  const originalName = file.originalname;

  const parsePath = path.parse(originalName);
  const thumbFilename = `${parsePath.name}_thumb${parsePath.ext}`;
  const thumbFilePath = path.join(config.imageFolder, thumbFilename);
  const output = await sharp(file.path).resize(width, height).toFile(thumbFilePath);

  return { output, thumbFilePath, thumbFilename };
}

async function compressFile(file: UploadFile) {
  const quality = 70;
  const parsePath = path.parse(file.originalname);
  const compressedFilename = `${parsePath.name}_compressed${parsePath.ext}`;
  const compressedFilePath = path.join(config.imageFolder, compressedFilename);

  const output = await sharp(file.path)
    .png({ quality, force: false })
    .jpeg({ quality, mozjpeg: true, force: false })
    .webp({ quality, force: false })
    .toFile(compressedFilePath);

  return { output, compressedFilePath };
}

async function deleteFromS3AndDb(shopId: string, media: MediaDocLean) {
  const mediaKey = media.url.split("/").slice(-2).join("/");
  const thumbKey = media.thumbnailUrl.split("/").slice(-2).join("/");

  await s3Util.deleteFromS3([mediaKey, thumbKey]);

  const res = await MediaModel.deleteOne({
    shopId,
    _id: media._id,
  });

  return res;
}

function changeMediaUrl(shop: ShopDocLean, from: MediaDocLean): MediaDocLean {
  return {
    ...from,
    url: getS3Url(shop, path.basename(from.url)),
    thumbnailUrl: getS3Url(shop, path.basename(from.thumbnailUrl)),
  };
}

function getS3Url(shop: ShopDocLean, filename: string) {
  return `https://s3.${config.s3.region}.amazonaws.com/${config.s3.bucket}/${shop.code}/${filename}`;
}

// async function importMedia(shop: ShopDocLean, from: MediaDocLean): Promise<MediaDocLean> {
//   const rstOriginal = await importMediaSingle(shop.code, from.url);
//   const rstThumbnail = await importMediaSingle(shop.code, from.thumbnailUrl);

//   return {
//     ...from,
//     url: rstOriginal.Location,
//     thumbnailUrl: rstThumbnail.Location,
//   };
// }

// async function importMediaSingle(shopCode: string, url: string) {
//   debug("Downloading URL", url);
//   const data = await axios.get<fs.ReadStream>(url, { responseType: "stream" });
//   const stream = data.data;

//   const fileName = path.basename(url);
//   const uploadKey = `${shopCode}/${fileName}`;

//   debug("Uploading S3", { uploadKey, fileName });
//   return await s3Util.uploadToS3Stream(stream, uploadKey, fileName);
// }

export default { uploadToS3AndSaveDb, deleteFromS3AndDb, changeMediaUrl };
