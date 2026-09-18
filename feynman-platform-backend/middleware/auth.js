// 认证中间件：校验请求携带的 JWT，保护需要登录才能访问的接口
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. 从请求头中获取 token，兼容两种携带方式：
  //    - 自定义请求头 x-auth-token: <token>
  //    - 标准形式 Authorization: Bearer <token>（Postman 的 Bearer Token 类型）
  const token =
    req.header('x-auth-token') ||
    (req.header('authorization') || '').replace(/^Bearer\s+/i, '');

  // 2. 检查 token 是否存在
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' }); // 401: 未授权
  }

  // 3. 验证 token 是否有效、是否过期
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 将解码后的用户信息（特别是 user.id）附加到请求对象上，供后续路由使用
    req.user = decoded.user;

    // 调用 next()，将控制权交给下一个中间件或路由处理器
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
