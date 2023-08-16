declare namespace Express {
  export enum AdminUserType {
    superAdmin = "superAdmin",
    regular = "regular",
  }

  export interface Request {
    data: any;
    // currentUser: any;
    adminUser: {
      _id: any;
      type: AdminUserType;
      email: string;
    };
    frontUser: {
      _id: any;
    };
    shop: {
      _id: any;
      google_key_client_id: string;
      google_key_secret: string;
      default_locale: string;
      default_currency: string;
    };
    merchant: {
      _id: any;
      shop_id: any;
    };
    locale: string;
    currency: string;
  }
}
