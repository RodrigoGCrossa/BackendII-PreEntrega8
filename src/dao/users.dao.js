import User from '../models/User.js';

export const usersDAO = {
  initialize: () => User.init(),
  findOne: (filter, { includePassword = false } = {}) => {
    const query = User.findOne(filter);
    return (includePassword ? query.select('+password') : query).lean();
  },
  findById: (id) => User.findById(id).lean(),
  create: async (data) => (await User.create(data)).toObject(),
  findMany: (filter = {}) => User.find(filter).select('-password').lean(),
  update: (filter, data) => User.findOneAndUpdate(filter, { $set: data }, { new: true, runValidators: true }).lean(),
  deleteOne: (filter) => User.deleteOne(filter),
};
