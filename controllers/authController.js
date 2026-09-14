// controllers/authController.js

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Affiliate = require('../models/Affiliate');
const { splitName, joinName } = require('../utils/splitName');
const mailer = require('../utils/mailer');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
};

// Some accounts predate the firstName/lastName split and only have a raw
// `name` field in the database — schema hydration keeps that on `_doc`
// even though the `name` *virtual* (which only looks at firstName/
// lastName) shadows it and silently resolves to '' for these accounts.
// Same fallback already used for legacy accounts in the admin controllers.
const publicUser = (user) => {
  const rawName = user._doc?.name;
  const legacy = !user.firstName && rawName ? splitName(rawName) : null;
  const firstName = user.firstName || (legacy && legacy.firstName) || '';
  const lastName = user.lastName || (legacy && legacy.lastName) || '';
  return {
    id: user._id,
    firstName,
    lastName,
    name: joinName(firstName, lastName) || rawName || '',
    email: user.email,
    contact: user.contact,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
};

// ===============================
// REGISTER (public guest/owner sign-up)
// ===============================
exports.register = async (req, res) => {
  try {
    const { name, email, password, contact } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Public registration only ever creates a guest account; splitting a
    // single "name" field into first/last is a best-effort guess.
    const [firstName, ...rest] = name.trim().split(/\s+/);

    const user = await User.create({
      firstName: firstName || name.trim(),
      lastName: rest.join(' '),
      email: normalizedEmail,
      contact: contact ? contact.trim() : '',
      password: hashedPassword,
      role: 'user',
    });

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Register error:', error);

    return res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

// ===============================
// GOOGLE LOGIN / SIGN-UP
// "Continue with Google" — the frontend uses Google Identity Services to
// get a signed ID token (a JWT), which is verified here against Google's
// own public keys (never trust a token's claims without this step). A
// first-time Google sign-in creates a normal 'user' account on the fly,
// matched to any existing account by email so someone who registered with
// a password can also just use Google afterward.
// ===============================
exports.googleAuth = async (req, res) => {
  try {
    if (!googleClient) {
      return res.status(501).json({
        success: false,
        message: 'Google sign-in is not configured yet — add GOOGLE_CLIENT_ID to server/.env (see the frontend VITE_GOOGLE_CLIENT_ID it must match).',
      });
    }

    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Missing Google credential' });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Google credential' });
    }

    if (!payload?.email) {
      return res.status(401).json({ success: false, message: 'Google did not share an email for this account' });
    }
    if (!payload.email_verified) {
      return res.status(401).json({ success: false, message: 'This Google account\'s email isn\'t verified' });
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (user.status === 'suspended') {
        return res.status(403).json({ success: false, message: 'This account has been suspended' });
      }
      // Link the Google account to an existing password-based account the
      // first time they use "Continue with Google" with the same email.
      if (!user.googleId) {
        user.googleId = payload.sub;
        await user.save();
      }
    } else {
      // Random, never-shown password — bcrypt-hashed like any other
      // account so nothing else in the codebase has to special-case a
      // Google-only user. They can set a real password later from
      // Settings if they ever want to log in without Google.
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      user = await User.create({
        firstName: payload.given_name || (payload.name ? payload.name.split(' ')[0] : 'Google'),
        lastName: payload.family_name || (payload.name ? payload.name.split(' ').slice(1).join(' ') : 'User'),
        email: normalizedEmail,
        password: randomPassword,
        role: 'user',
        googleId: payload.sub,
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Signed in with Google',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ success: false, message: 'Google sign-in failed' });
  }
};

// ===============================
// USER LOGIN
// ===============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};


// ===============================
// FORGOT PASSWORD — emails a time-limited reset link. Always responds
// success (whether or not the email is registered) so this can't be used
// to enumerate which emails have accounts.
// ===============================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    const genericResponse = { success: true, message: "If that email has an account, we've sent a password reset link." };

    if (!user) {
      return res.json(genericResponse);
    }

    if (!mailer.isConfigured()) {
      console.error('Forgot password requested but SMTP is not configured — no email sent.');
      return res.json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
    try {
      await mailer.sendMail({
        to: user.email,
        subject: 'Reset your Kothaa Cha password',
        text: `We received a request to reset your Kothaa Cha password. This link expires in 1 hour:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
        html: `<p>We received a request to reset your Kothaa Cha password.</p><p><a href="${resetUrl}">Click here to reset your password</a> — this link expires in 1 hour.</p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    } catch (mailError) {
      console.error('Forgot password email send error:', mailError);
      // Still respond success — same reasoning as above, and the token
      // is already invalidated on next request anyway if this keeps failing.
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process password reset request' });
  }
};

// ===============================
// RESET PASSWORD — consumes the token from the emailed link.
// ===============================
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: hashToken(token),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired' });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully — you can now log in' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
};

// ===============================
// ADMIN LOGIN
// ===============================
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await User.findOne({
      email: normalizedEmail,
    });

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials',
      });
    }

    // Check admin-panel role (super_admin / approver / finance)
    if (!User.ADMIN_PANEL_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin account required.',
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This admin account has been suspended',
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials',
      });
    }

    // Generate JWT
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Admin login successful',
      token,
      user: publicUser(user),
    });

  } catch (error) {
    console.error('Admin login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Admin login failed',
    });
  }
};




// ===============================
// GET CURRENT USER (used by the guest dashboard + AuthContext.refreshUser)
// ===============================
exports.getMe = async (req, res) => {
  return res.json({ success: true, user: publicUser(req.user) });
};

// ===============================
// UPDATE PROFILE (name/contact, and optionally password — guest dashboard
// "Settings" tab)
// ===============================
exports.updateProfile = async (req, res) => {
  try {
    const { name, contact, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) {
      const [firstName, ...rest] = name.trim().split(/\s+/);
      user.firstName = firstName || name.trim();
      user.lastName = rest.join(' ');
    }
    if (contact !== undefined) user.contact = contact.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Enter your current password to set a new one' });
      }
      const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentValid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      user.password = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    return res.json({ success: true, message: 'Profile updated', user: publicUser(user) });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// ===============================
// LOGOUT
// ===============================
exports.logout = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);

    return res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
};

// ===============================
// AFFILIATE STATUS (used to gate "List a property" — a logged-in guest who
// isn't an approved affiliate gets redirected to the "Become an Affiliate"
// page instead). Matched loosely by email since Affiliate isn't linked to
// User by any foreign key today.
// ===============================
exports.getAffiliateStatus = async (req, res) => {
  try {
    const affiliate = await Affiliate.findOne({ email: req.user.email, status: 'active' }).lean();
    return res.json({ success: true, isAffiliate: Boolean(affiliate) });
  } catch (error) {
    console.error('Get affiliate status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check affiliate status' });
  }
};
