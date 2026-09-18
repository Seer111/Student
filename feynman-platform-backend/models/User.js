// 用户数据模型
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    // 只存储 bcrypt 哈希后的密码，严禁明文入库
    password: { type: String, required: true },
  },
  { timestamps: true } // 自动维护 createdAt 与 updatedAt 字段
);

module.exports = mongoose.model('User', UserSchema);
