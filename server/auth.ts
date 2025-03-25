import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SchemaUser } from "@shared/schema";
import { walletService } from "./walletService";

declare global {
  namespace Express {
    interface User extends SchemaUser {}
  }
}

export function setupAuth(app: Express) {
  // Session settings
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "blockchain-betting-app-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    },
    store: storage.sessionStore
  };

  // Setup Express to use sessions and passport
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure the local strategy for passport
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Find user by username
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username or password" });
        }

        // Verify password
        const isPasswordValid = walletService.verifyPassword(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: "Incorrect username or password" });
        }

        // Return the authenticated user
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );

  // Tell Passport how to serialize/deserialize users
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Add authentication routes
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // User will automatically be set in req.user by passport
    const user = req.user as SchemaUser;
    
    // Return user data without sensitive information
    res.json({
      id: user.id,
      username: user.username,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as SchemaUser;
    
    // Return user data without sensitive information
    res.json({
      id: user.id,
      username: user.username,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt
    });
  });
}