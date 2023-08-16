import Config from "../config/config";

const env = process.env.NODE_ENV || "development";

// eslint-disable-next-line
export default require(`../config/${env}.config.js`).default as Config;
