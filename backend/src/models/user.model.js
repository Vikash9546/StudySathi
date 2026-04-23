const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
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
      select: false, // never return password by default
    },
    name: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    avatarUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
