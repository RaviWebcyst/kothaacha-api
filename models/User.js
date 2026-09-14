const mongoose = require('mongoose');

// Roles that can log into /admin-login and see the admin console.
const ADMIN_PANEL_ROLES = ['admin', 'super_admin', 'approver', 'finance'];
// Only 'super_admin' can see/open the Admins tab and manage other admin
// accounts (create/edit/suspend/delete) — 'admin' is just a regular
// admin-console role now, same tier as approver/finance.
const SUPER_ADMIN_ROLES = ['super_admin'];
// Roles that are "Clients" in the admin console's Clients table.
const CLIENT_ROLES = ['user', 'owner'];

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    // Set only for accounts created/linked via "Continue with Google" —
    // these still get a normal (random, never shown) `password` hash so
    // every other code path that assumes a bcrypt-hashed password keeps
    // working unchanged; a Google account can add a real password later
    // from the guest dashboard's Settings tab, same as any other account.
    googleId: {
      type: String,
      trim: true,
      // No default — the field must be entirely absent (not an empty
      // string) on non-Google accounts for the sparse unique index below
      // to only apply to documents that actually have one.
      sparse: true,
      unique: true,
    },

    contact: {
      type: String,
      trim: true,
      default: '',
    },

    role: {
      type: String,
      enum: ['user', 'owner', 'admin', 'super_admin', 'approver', 'finance'],
      default: 'user',
    },

    // Suspended admins/clients can't log in (see authController).
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },

    // "Forgot password" flow — resetPasswordToken stores a sha256 hash of
    // the raw token emailed to the user (never the raw token itself, same
    // reasoning as never storing a plaintext password), so a database leak
    // alone can't be used to reset anyone's password.
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Kept so anything still reading `user.name` (old register/login flows,
// email templates, etc.) keeps working without a data migration.
userSchema.virtual('name').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
});

userSchema.statics.ADMIN_PANEL_ROLES = ADMIN_PANEL_ROLES;
userSchema.statics.SUPER_ADMIN_ROLES = SUPER_ADMIN_ROLES;
userSchema.statics.CLIENT_ROLES = CLIENT_ROLES;

module.exports = mongoose.model('User', userSchema);
