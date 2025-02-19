import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  console.log("Comparing passwords:");
  console.log("Supplied password length:", supplied.length);
  console.log("Stored hash format:", stored.includes(".") ? "valid" : "invalid");

  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  const matches = timingSafeEqual(hashedBuf, suppliedBuf);
  console.log("Password comparison result:", matches);
  return matches;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "development_secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          console.log("Login attempt for email:", email);
          const user = await storage.getUserByEmail(email);
          console.log("User found:", !!user);

          if (!user) {
            console.log("No user found with email:", email);
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log("Stored password hash:", user.password);
          const isValid = await comparePasswords(password, user.password);
          console.log("Password validation result:", isValid);

          if (!isValid) {
            console.log("Invalid password for user:", email);
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log("Login successful for user:", email);
          return done(null, user);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await storage.getUser(id);
      console.log("Deserialized user found:", !!user);
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt with data:", { ...req.body, password: '[REDACTED]' });
      const { restaurantName, ...userData } = req.body;
      const parsed = insertUserSchema.safeParse(userData);

      if (!parsed.success) {
        console.log("Registration validation failed:", parsed.error);
        return res.status(400).json(parsed.error);
      }

      const existingUser = await storage.getUserByEmail(parsed.data.email);
      if (existingUser) {
        console.log("Registration failed - email exists:", parsed.data.email);
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(parsed.data.password);
      console.log("Generated password hash for new user");

      const user = await storage.createUser({
        ...parsed.data,
        password: hashedPassword,
      });
      console.log("Created new user:", { ...user, password: '[REDACTED]' });

      if (restaurantName) {
        const restaurant = await storage.createRestaurant({
          userId: user.id,
          name: restaurantName,
        });
        console.log("Created initial restaurant:", restaurant);
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Login after registration failed:", err);
          return next(err);
        }
        console.log("Registration and login successful");
        res.status(201).json({ ...user, password: undefined });
      });
    } catch (err) {
      console.error("Registration error:", err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: SelectUser, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed:", info?.message || "Invalid credentials");
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return next(err);
        }
        console.log("Login successful for user:", user.email);
        res.json({ ...user, password: undefined });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const email = req.user?.email;
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err);
          return next(err);
        }
        console.log("Logout successful for user:", email);
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Unauthenticated user session");
      return res.sendStatus(401);
    }
    console.log("Authenticated user session:", req.user?.email);
    res.json({ ...req.user, password: undefined });
  });
}