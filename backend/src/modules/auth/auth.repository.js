const User = require('../../models/user.model');

class AuthRepository {
  async findByEmail(email) {
    // Explicitly select password since it's hidden by default
    return User.findOne({ email }).select('+password');
  }

  async create({ email, password, name }) {
    return User.create({ email, password, name });
  }

  async findById(id) {
    return User.findById(id);
  }

  async findByIdWithPassword(id) {
    return User.findById(id).select('+password');
  }

  async updateById(id, data) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
}

module.exports = new AuthRepository();
