// 用户认证路由：注册与登录（登录成功后返回 JWT 通行证）
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 生成 JWT：载荷携带用户 ID，有效期 5 小时
function signToken(userId) {
  const payload = { user: { id: userId } };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5h' });
}

// @route   POST /api/users/register
// @desc    注册新用户（密码哈希后入库），注册成功直接返回 JWT（注册即登录）
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 参数校验：缺少必填字段时返回 400，而不是等到数据库层报错
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Name, email and password are required' });
    }

    // 1. 检查邮箱是否已注册
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // 2. 创建新用户实例
    user = new User({ name, email, password });

    // 3. 【安全核心】对密码进行哈希加密
    // 先生成随机"盐"（salt），再与原始密码混合哈希：
    // 即使两个用户设置了相同的密码，数据库中的哈希值也完全不同
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // 4. 保存用户到数据库
    await user.save();

    // 5. 注册成功，生成 JWT 并返回
    res.json({ token: signToken(user.id) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/users/login
// @desc    用户登录并获取 token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 参数校验
    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password are required' });
    }

    // 1. 检查用户是否存在
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // 2. 【安全核心】比较密码
    // bcrypt.compare 会自动处理盐值，只有密码匹配才返回 true
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // 3. 登录成功，生成 JWT 并返回
    res.json({ token: signToken(user.id) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
