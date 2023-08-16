export default interface Config {
  env: string;
  database: string;
  adminFrontUrl: string;
  imageFolder: string;
  paypal: {
    baseUrl: string;
    accessTokenUrl: string;
  };
  s3: {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    region: string;
  };
  smtp: {
    host: string;
    port: number;
    auth: {
      user: string;
      pass: string;
    };
  };
  smtpFrom: string;
}
