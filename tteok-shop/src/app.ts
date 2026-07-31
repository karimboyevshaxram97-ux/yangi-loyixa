import cors from "cors";
import express from "express";
import path from "path";
import router from "./router";
import routerAdmin from "./router-admin";
import routerMobile from "./router-mobile";
import morgan from "morgan";
import { MORGAN_FORMAT } from "./libs/types/common";
import cookieParser from "cookie-parser";
import session from "express-session";
import ConnectMongoDB from "connect-mongodb-session";
import { T } from "./libs/types/common";

const MongoDBStore = ConnectMongoDB(session);
const store = new MongoDBStore(
  {
    uri: String(process.env.MONGO_URL),
    collection: "sessions",
  },
  (error) => {
    if (error) console.error("MongoDB session store error:", error.message);
  }
);

const app = express();
const isProd = process.env.NODE_ENV === "production";

// Deploy platforms (Render/Railway/Heroku, etc.) terminate TLS at their own
// proxy and forward plain HTTP to this process — without trusting that proxy,
// Express can't tell the connection was actually HTTPS, which breaks `secure`
// cookies (the admin session cookie below) in production.
if (isProd) app.set("trust proxy", 1);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("./uploads"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(morgan(MORGAN_FORMAT));

const sessionMiddleware = session({
  secret: String(process.env.SESSION_SECRET),
  cookie: { maxAge: 1000 * 3600 * 3, secure: isProd },
  store: store,
  resave: true,
  saveUninitialized: true,
});

// Mobil API (Bearer token) stateless — /api so'rovlari uchun web-sessiya
// yaratilmaydi (aks holda har bir API chaqiruv sessions kolleksiyasini to'ldiradi)
app.use(function (req, res, next) {
  if (req.path.startsWith("/api/")) return next();
  return sessionMiddleware(req, res, next);
});

app.use(function (req, res, next) {
  const sessionInstance = req.session as T;
  res.locals.member = sessionInstance?.member;
  next();
});

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use("/api/v1", routerMobile);
// Noma'lum /api yo'llari HTML emas, JSON 404 olishi kerak (mobil mijoz parse qila olishi uchun)
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: { status: 404, message: "API endpoint not found!" },
  });
});
app.use("/admin", routerAdmin);
app.use("/", router);

export default app;
