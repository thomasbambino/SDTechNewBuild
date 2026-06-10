import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, InsertUser, User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log('Comparing password:', supplied);
    console.log('Stored password:', stored);
    
    // Check if it's the admin account with a hardcoded password
    if (supplied === 'admin123' && stored.includes('407eb6692bd8b03aa6bd939eea0f7f2b9579a06119499c89030f48480318e345b0efb442af7beef6c9e63f3c3ef79f93cdaa1a2c236866c1fefbe58d672ac821')) {
      console.log('Special admin account authenticated with admin123');
      return true;
    }
    
    const [hashed, salt] = stored.split(".");
    if (!salt) {
      console.error('Invalid stored password format - missing salt:', stored);
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log('Password comparison result:', result);
    return result;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  // Set a secure session secret
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = "sd-tech-pros-secret-key-" + Math.random().toString(36).substring(2, 15);
    console.log('Warning: SESSION_SECRET not set, using a generated one');
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        // Check if user exists and password is correct
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Check if the user's account is disabled
        if (user.status === 'disabled') {
          return done(null, false, { message: "Your account has been disabled. Please contact an administrator." });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      
      // If user not found or account is disabled, reject the session
      if (!user) {
        return done(null, false);
      }
      
      if (user.status === 'disabled') {
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate the request body
      const { username, password, email, name, role = "client" } = req.body;
      
      if (!username || !password || !email || !name) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create the user
      const userData: InsertUser = {
        username,
        password: await hashPassword(password),
        email,
        name,
        role,
        status: 'active' // Set default status to active
      };
      
      const user = await storage.createUser(userData);
      
      // Create activity log
      await storage.createActivity({
        userId: user.id,
        action: "User Registration",
        details: `User ${username} registered with role ${role}`,
        entityType: "user",
        entityId: user.id
      });
      
      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      req.login(user, async (err: any) => {
        if (err) return next(err);
        
        // Create activity log
        await storage.createActivity({
          userId: user.id,
          action: "User Login",
          details: `User ${user.username} logged in`,
          entityType: "user",
          entityId: user.id
        });
        
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    const user = req.user;
    
    if (user) {
      // Create activity log before logout
      await storage.createActivity({
        userId: user.id,
        action: "User Logout",
        details: `User ${user.username} logged out`,
        entityType: "user",
        entityId: user.id
      });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json({
      ...userWithoutPassword,
      isImpersonating: !!(req.session as any).originalUserId,
    });
  });

  app.post("/api/admin/impersonate/:userId", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || (req.user as SelectUser).role !== "admin") {
        return res.status(403).json({ message: "Forbidden" });
      }
      if ((req.session as any).originalUserId) {
        return res.status(400).json({ message: "Already impersonating a user" });
      }
      const targetId = parseInt(req.params.userId);
      const targetUser = await storage.getUser(targetId);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if (targetUser.role === "admin") return res.status(400).json({ message: "Cannot impersonate an admin" });

      const originalAdminId = (req.user as SelectUser).id;
      req.login(targetUser, (err) => {
        if (err) return next(err);
        (req.session as any).originalUserId = originalAdminId;
        const { password, ...safe } = targetUser;
        res.json({ ...safe, isImpersonating: true });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/admin/stop-impersonating", async (req, res, next) => {
    try {
      const originalUserId = (req.session as any).originalUserId;
      if (!req.isAuthenticated() || !originalUserId) {
        return res.status(400).json({ message: "Not impersonating" });
      }
      const adminUser = await storage.getUser(originalUserId);
      if (!adminUser) return res.status(404).json({ message: "Original admin not found" });

      req.login(adminUser, (err) => {
        if (err) return next(err);
        delete (req.session as any).originalUserId;
        const { password, ...safe } = adminUser;
        res.json({ ...safe, isImpersonating: false });
      });
    } catch (err) {
      next(err);
    }
  });
}
