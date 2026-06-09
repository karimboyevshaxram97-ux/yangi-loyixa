export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NOT_MODIFIED = 304,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export enum Message {
  SOMETHING_WENT_WRONG = "Something went wrong!",
  NO_DATA_FOUND = "No data is found!",
  CREATE_FAILED = "Create is failed!",
  UPDATE_FAILED = "Update is failed!",
  USED_NICK_PHONE = "You are inserting already used nick or phone!",
  TOKEN_CREATION_FAILED = "Token creation error",
  NO_MEMBER_NICK = "No member with that member nick!",
  BLOCKED_USER = "You have been blocked, contact the shop!",
  WRONG_PASSWORD = "Wrong password, please try again!",
  NOT_AUTHENTICATED = "You are not authenticated, please login first!",
  SHOP_ALREADY_EXISTS = "Shop already exists! Only one shop can be registered!",
  IMAGE_REQUIRED = "Shop image is required!",
  PAYMENT_FAILED = "Payment processing failed!",
  PAYMENT_NOT_FOUND = "Payment not found!",
  PAYMENT_ALREADY_PROCESSED = "Payment has already been processed!",
  REFUND_FAILED = "Refund processing failed!",
  INVALID_PAYMENT_METHOD = "Invalid payment method!",
  KAKAO_PAY_ERROR = "KakaoPay API error occurred!",
}

class Errors extends Error {
  public code: HttpCode;
  public message: Message;

  static standard = {
    code: HttpCode.INTERNAL_SERVER_ERROR,
    message: Message.SOMETHING_WENT_WRONG,
  };

  constructor(statusCode: HttpCode, statusMessage: Message) {
    super();
    this.code = statusCode;
    this.message = statusMessage;
  }
}

export default Errors;  